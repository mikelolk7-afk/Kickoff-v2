import { db } from "@/lib/db";
import { calculateMarketValue, isOfferAcceptable, isWageAcceptable } from "./valuation";

interface SubmitOfferInput {
  listingId: string;
  buyerClubId: string;
  offerFee: number;
  offerWage: number;
  isLoan?: boolean;
}

/**
 * Submit a transfer offer.
 */
export async function submitOffer(input: SubmitOfferInput) {
  const listing = await db.transferListing.findUnique({
    where: { id: input.listingId },
    include: { player: true },
  });

  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "ACTIVE") throw new Error("Listing not active");
  if (listing.sellerClubId === input.buyerClubId) throw new Error("Cannot bid on own player");

  // Check buyer can afford it
  const buyerClub = await db.club.findUnique({
    where: { id: input.buyerClubId },
  });
  if (!buyerClub) throw new Error("Buyer club not found");
  if (buyerClub.budget < input.offerFee) throw new Error("Insufficient budget");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return db.transferOffer.create({
    data: {
      listingId: input.listingId,
      buyerClubId: input.buyerClubId,
      offerFee: input.offerFee,
      offerWage: input.offerWage,
      isLoan: input.isLoan ?? false,
      expiresAt,
    },
  });
}

/**
 * Accept an offer (seller action or AI auto-decision).
 */
export async function acceptOffer(offerId: string, sellerClubId: string) {
  const offer = await db.transferOffer.findUnique({
    where: { id: offerId },
    include: {
      listing: { include: { player: true } },
      buyerClub: true,
    },
  });

  if (!offer) throw new Error("Offer not found");
  if (offer.listing.sellerClubId !== sellerClubId) throw new Error("Not your listing");
  if (offer.status !== "PENDING") throw new Error("Offer not pending");

  // Check wage acceptance by player
  if (!isWageAcceptable(offer.offerWage, offer.listing.player.wage)) {
    await db.transferOffer.update({
      where: { id: offerId },
      data: { status: "REJECTED" },
    });
    throw new Error("Player rejected personal terms");
  }

  // Execute transfer in a transaction
  await db.$transaction(async (tx) => {
    // Update offer status
    await tx.transferOffer.update({
      where: { id: offerId },
      data: { status: "ACCEPTED" },
    });

    // Mark listing as sold
    await tx.transferListing.update({
      where: { id: offer.listingId },
      data: { status: "SOLD" },
    });

    // Reject all other offers on this listing
    await tx.transferOffer.updateMany({
      where: {
        listingId: offer.listingId,
        id: { not: offerId },
        status: "PENDING",
      },
      data: { status: "REJECTED" },
    });

    if (offer.isLoan) {
      // Loan: temporarily move player (simplified — full loan tracking is Phase 3+)
      await tx.player.update({
        where: { id: offer.listing.playerId },
        data: {
          clubId: offer.buyerClubId,
          wage: offer.offerWage,
        },
      });
    } else {
      // Permanent transfer: move player, transfer funds
      await tx.player.update({
        where: { id: offer.listing.playerId },
        data: {
          clubId: offer.buyerClubId,
          wage: offer.offerWage,
        },
      });

      // Deduct from buyer
      await tx.club.update({
        where: { id: offer.buyerClubId },
        data: { budget: { decrement: offer.offerFee } },
      });

      // Add to seller
      await tx.club.update({
        where: { id: offer.listing.sellerClubId },
        data: { budget: { increment: offer.offerFee } },
      });
    }
  });

  return { success: true };
}

/**
 * Reject an offer.
 */
export async function rejectOffer(offerId: string, sellerClubId: string) {
  const offer = await db.transferOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });

  if (!offer) throw new Error("Offer not found");
  if (offer.listing.sellerClubId !== sellerClubId) throw new Error("Not your listing");

  return db.transferOffer.update({
    where: { id: offerId },
    data: { status: "REJECTED" },
  });
}

/**
 * Counter an offer with a new fee.
 */
export async function counterOffer(
  offerId: string,
  sellerClubId: string,
  counterFee: number
) {
  const offer = await db.transferOffer.findUnique({
    where: { id: offerId },
    include: { listing: true },
  });

  if (!offer) throw new Error("Offer not found");
  if (offer.listing.sellerClubId !== sellerClubId) throw new Error("Not your listing");
  if (offer.status !== "PENDING") throw new Error("Offer not pending");

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  return db.transferOffer.update({
    where: { id: offerId },
    data: {
      status: "COUNTERED",
      counterFee,
      expiresAt,
    },
  });
}

/**
 * Accept a counter-offer (buyer action).
 */
export async function acceptCounter(offerId: string, buyerClubId: string) {
  const offer = await db.transferOffer.findUnique({
    where: { id: offerId },
    include: { listing: { include: { player: true } } },
  });

  if (!offer) throw new Error("Offer not found");
  if (offer.buyerClubId !== buyerClubId) throw new Error("Not your offer");
  if (offer.status !== "COUNTERED" || !offer.counterFee) throw new Error("No counter to accept");

  // Update the offer fee to the counter and accept
  await db.transferOffer.update({
    where: { id: offerId },
    data: {
      offerFee: offer.counterFee,
      status: "PENDING",
    },
  });

  return acceptOffer(offerId, offer.listing.sellerClubId);
}

/**
 * Expire all pending offers past their expiration date.
 */
export async function expireOffers() {
  const result = await db.transferOffer.updateMany({
    where: {
      status: { in: ["PENDING", "COUNTERED"] },
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return result.count;
}
