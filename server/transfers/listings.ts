import { db } from "@/lib/db";
import { calculateMarketValue, calculateAskingPrice } from "./valuation";
import type { ListingType } from "@prisma/client";

interface CreateListingInput {
  playerId: string;
  sellerClubId: string;
  askingPrice?: number;
  listingType: ListingType;
  loanDuration?: number;
  loanFee?: number;
  wagePct?: number;
  expiresInHours?: number;
}

/**
 * Create a new transfer listing.
 */
export async function createListing(input: CreateListingInput) {
  const player = await db.player.findUnique({
    where: { id: input.playerId },
  });

  if (!player) throw new Error("Player not found");
  if (player.clubId !== input.sellerClubId) throw new Error("Not your player");

  const marketValue = calculateMarketValue(player);
  const askingPrice = input.askingPrice ?? calculateAskingPrice(marketValue);

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (input.expiresInHours ?? 72));

  return db.transferListing.create({
    data: {
      playerId: input.playerId,
      sellerClubId: input.sellerClubId,
      askingPrice,
      listingType: input.listingType,
      expiresAt,
      loanDuration: input.loanDuration,
      loanFee: input.loanFee,
      wagePct: input.wagePct,
    },
  });
}

/**
 * Browse active transfer listings with optional filters.
 */
export async function browseListings(filters?: {
  position?: string;
  minOverall?: number;
  maxPrice?: number;
  listingType?: ListingType;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  const where: Record<string, unknown> = {
    status: "ACTIVE",
    expiresAt: { gt: new Date() },
  };

  if (filters?.listingType) where.listingType = filters.listingType;
  if (filters?.maxPrice) where.askingPrice = { lte: filters.maxPrice };

  const playerWhere: Record<string, unknown> = {};
  if (filters?.position) playerWhere.position = filters.position;
  if (filters?.minOverall) playerWhere.overall = { gte: filters.minOverall };

  if (Object.keys(playerWhere).length > 0) {
    where.player = playerWhere;
  }

  const [listings, total] = await Promise.all([
    db.transferListing.findMany({
      where,
      include: {
        player: true,
        sellerClub: { select: { id: true, name: true } },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transferListing.count({ where }),
  ]);

  return { listings, total, page, pageSize };
}

/**
 * Withdraw a listing (seller action).
 */
export async function withdrawListing(listingId: string, clubId: string) {
  const listing = await db.transferListing.findUnique({
    where: { id: listingId },
  });

  if (!listing) throw new Error("Listing not found");
  if (listing.sellerClubId !== clubId) throw new Error("Not your listing");
  if (listing.status !== "ACTIVE") throw new Error("Listing not active");

  return db.transferListing.update({
    where: { id: listingId },
    data: { status: "WITHDRAWN" },
  });
}

/**
 * Expire all listings past their expiration date.
 * Called by cron.
 */
export async function expireListings() {
  const result = await db.transferListing.updateMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return result.count;
}
