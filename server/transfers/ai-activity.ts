import { db } from "@/lib/db";
import { calculateMarketValue, calculateAskingPrice, isOfferAcceptable } from "./valuation";
import { acceptOffer } from "./offers";

/**
 * AI transfer activity: AI clubs list players and respond to offers.
 * Called every 6 hours by cron.
 */
export async function processAiTransferActivity() {
  let listed = 0;
  let responded = 0;

  // 1. AI clubs randomly list players for sale
  const aiClubs = await db.club.findMany({
    where: { isAi: true },
    include: {
      players: { orderBy: { overall: "asc" } },
    },
  });

  for (const club of aiClubs) {
    // ~10% chance per cycle that an AI club lists a player
    if (Math.random() > 0.1) continue;
    if (club.players.length <= 14) continue; // Don't sell if squad is thin

    // List the worst non-GK player
    const sellable = club.players.filter((p) => p.position !== "GK");
    if (sellable.length === 0) continue;

    const playerToSell = sellable[0];
    const marketValue = calculateMarketValue(playerToSell);
    const askingPrice = calculateAskingPrice(marketValue);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Check if already listed
    const existing = await db.transferListing.findFirst({
      where: {
        playerId: playerToSell.id,
        status: "ACTIVE",
      },
    });

    if (!existing) {
      await db.transferListing.create({
        data: {
          playerId: playerToSell.id,
          sellerClubId: club.id,
          askingPrice,
          listingType: "SALE",
          expiresAt,
        },
      });
      listed++;
    }
  }

  // 2. AI clubs respond to pending offers on their listings
  const pendingOffers = await db.transferOffer.findMany({
    where: {
      status: "PENDING",
      listing: {
        sellerClub: { isAi: true },
        status: "ACTIVE",
      },
    },
    include: {
      listing: {
        include: { player: true, sellerClub: true },
      },
    },
  });

  for (const offer of pendingOffers) {
    const player = offer.listing.player;
    const marketValue = calculateMarketValue(player);

    if (isOfferAcceptable(offer.offerFee, marketValue)) {
      try {
        await acceptOffer(offer.id, offer.listing.sellerClubId);
        responded++;
      } catch {
        // Player may have rejected terms — that's fine
      }
    } else {
      // Counter with market value + 10%
      const counterFee = Math.round(marketValue * 1.1);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await db.transferOffer.update({
        where: { id: offer.id },
        data: {
          status: "COUNTERED",
          counterFee,
          expiresAt,
        },
      });
      responded++;
    }
  }

  // 3. AI clubs bid on attractive listings
  const activeListings = await db.transferListing.findMany({
    where: {
      status: "ACTIVE",
      sellerClub: { isAi: false }, // Only bid on human listings
      expiresAt: { gt: new Date() },
    },
    include: { player: true },
    take: 20,
  });

  for (const listing of activeListings) {
    // ~5% chance any AI club bids
    if (Math.random() > 0.05) continue;

    // Find an AI club that could afford this and needs this position
    const potentialBuyer = await db.club.findFirst({
      where: {
        isAi: true,
        budget: { gte: listing.askingPrice },
        divisionId: listing.player.clubId ? undefined : undefined, // any division
      },
      orderBy: { budget: "desc" },
    });

    if (!potentialBuyer) continue;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Offer slightly below asking price
    const offerFee = Math.round(listing.askingPrice * (0.85 + Math.random() * 0.15));
    const offerWage = Math.round(listing.player.wage * 1.15);

    await db.transferOffer.create({
      data: {
        listingId: listing.id,
        buyerClubId: potentialBuyer.id,
        offerFee,
        offerWage,
        expiresAt,
      },
    });
  }

  return { listed, responded };
}
