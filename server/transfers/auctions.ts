import { db } from "@/lib/db";

interface CreateAuctionInput {
  playerId: string;
  sellerClubId: string;
  startingPrice: number;
  durationHours: number;
}

/**
 * Create a blind auction listing for a player.
 */
export async function createAuction(input: CreateAuctionInput) {
  const player = await db.player.findUnique({
    where: { id: input.playerId },
  });

  if (!player) throw new Error("Player not found");
  if (player.clubId !== input.sellerClubId) throw new Error("Not your player");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + input.durationHours);

  return db.transferListing.create({
    data: {
      playerId: input.playerId,
      sellerClubId: input.sellerClubId,
      askingPrice: input.startingPrice,
      listingType: "AUCTION",
      expiresAt,
    },
  });
}

/**
 * Place a bid on an auction (stored as a TransferOffer).
 * Blind auction: bidders don't see each other's bids.
 */
export async function placeBid(
  listingId: string,
  buyerClubId: string,
  bidAmount: number,
  offerWage: number
) {
  const listing = await db.transferListing.findUnique({
    where: { id: listingId },
  });

  if (!listing) throw new Error("Auction not found");
  if (listing.listingType !== "AUCTION") throw new Error("Not an auction");
  if (listing.status !== "ACTIVE") throw new Error("Auction not active");
  if (listing.sellerClubId === buyerClubId) throw new Error("Cannot bid on own auction");
  if (bidAmount < listing.askingPrice) throw new Error("Bid below starting price");

  // Check buyer budget
  const buyer = await db.club.findUnique({ where: { id: buyerClubId } });
  if (!buyer || buyer.budget < bidAmount) throw new Error("Insufficient budget");

  // Check for existing bid and update or create
  const existingBid = await db.transferOffer.findFirst({
    where: {
      listingId,
      buyerClubId,
      status: "PENDING",
    },
  });

  if (existingBid) {
    return db.transferOffer.update({
      where: { id: existingBid.id },
      data: { offerFee: bidAmount, offerWage },
    });
  }

  const expiresAt = listing.expiresAt;

  return db.transferOffer.create({
    data: {
      listingId,
      buyerClubId,
      offerFee: bidAmount,
      offerWage,
      expiresAt,
    },
  });
}

/**
 * Resolve expired auctions: highest bidder wins.
 * Called by cron.
 */
export async function resolveAuctions() {
  const expiredAuctions = await db.transferListing.findMany({
    where: {
      listingType: "AUCTION",
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    include: {
      offers: {
        where: { status: "PENDING" },
        orderBy: { offerFee: "desc" },
      },
      player: true,
    },
  });

  let resolved = 0;

  for (const auction of expiredAuctions) {
    if (auction.offers.length === 0) {
      // No bids — expire
      await db.transferListing.update({
        where: { id: auction.id },
        data: { status: "EXPIRED" },
      });
      continue;
    }

    const winningBid = auction.offers[0];
    const losingBids = auction.offers.slice(1);

    await db.$transaction(async (tx) => {
      // Accept winning bid
      await tx.transferOffer.update({
        where: { id: winningBid.id },
        data: { status: "ACCEPTED" },
      });

      // Reject losing bids
      if (losingBids.length > 0) {
        await tx.transferOffer.updateMany({
          where: { id: { in: losingBids.map((b) => b.id) } },
          data: { status: "REJECTED" },
        });
      }

      // Mark listing as sold
      await tx.transferListing.update({
        where: { id: auction.id },
        data: { status: "SOLD" },
      });

      // Transfer player
      await tx.player.update({
        where: { id: auction.playerId },
        data: {
          clubId: winningBid.buyerClubId,
          wage: winningBid.offerWage,
        },
      });

      // Transfer funds
      await tx.club.update({
        where: { id: winningBid.buyerClubId },
        data: { budget: { decrement: winningBid.offerFee } },
      });

      await tx.club.update({
        where: { id: auction.sellerClubId },
        data: { budget: { increment: winningBid.offerFee } },
      });
    });

    resolved++;
  }

  return resolved;
}
