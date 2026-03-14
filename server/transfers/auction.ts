import { db } from "@/lib/db";
import type { Position, PrismaClient } from "@prisma/client";
import { calculateMarketValue } from "./valuation";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// ─── Name & Nationality Pools ────────────────────────────

const FIRST_NAMES = [
  "Marcus", "João", "Pierre", "Luca", "Mohamed",
  "Kenji", "Andriy", "Diego", "Finn", "Oscar",
  "Riku", "Sven", "Tomáš", "Youssef", "Kwame",
  "Dmitri", "Ezra", "Hugo", "Nabil", "Santiago",
] as const;

const LAST_NAMES = [
  "Silva", "Müller", "Tanaka", "Andersson", "Okafor",
  "Petrov", "Fernández", "De Jong", "Kowalski", "Ibrahim",
  "Nakamura", "Olsen", "Barbosa", "Kuznetsov", "Mensah",
  "Novak", "Rodriguez", "Kim", "Larsson", "Diallo",
] as const;

const NATIONALITIES = [
  "Brazil", "Germany", "Japan", "Nigeria", "France",
  "Argentina", "England", "Netherlands", "Spain", "South Korea",
] as const;

// ─── Position Weights ────────────────────────────────────
// GK: 10%, DEF: 30%, MID: 35%, FWD: 25%

const POSITION_WEIGHTS: { position: Position; cumWeight: number }[] = [
  { position: "GK", cumWeight: 0.10 },
  { position: "DEF", cumWeight: 0.40 },
  { position: "MID", cumWeight: 0.75 },
  { position: "FWD", cumWeight: 1.00 },
];

// ─── Constants ───────────────────────────────────────────

const TARGET_AUCTION_COUNT = 100;
const AUCTION_DURATION_MINUTES = 5;
const FREE_AGENT_CLUB_NAME = "Free Agents";
const MIN_BID_INCREMENT = 1.05;
const STARTING_BID_RATIO = 0.60;
const BUY_NOW_RATIO = 1.50;

// ─── Helpers ─────────────────────────────────────────────

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate an overall rating weighted toward the 50-70 range.
 * Uses the average of two uniform samples to create a bell-curve effect.
 */
function generateWeightedOverall(): number {
  const sample1 = randomInt(40, 90);
  const sample2 = randomInt(40, 90);
  const avg = Math.round((sample1 + sample2) / 2);
  // Clamp to range
  return Math.max(40, Math.min(90, avg));
}

function pickPosition(): Position {
  const roll = Math.random();
  for (const entry of POSITION_WEIGHTS) {
    if (roll <= entry.cumWeight) return entry.position;
  }
  return "MID";
}

/**
 * Generate a single attribute value from an overall baseline with variance.
 */
function generateAttribute(overall: number): number {
  const variance = randomInt(-8, 8);
  return Math.max(1, Math.min(99, overall + variance));
}

/**
 * Calculate wage from overall: wage = overall^2 * 0.5 + 500
 */
function calculateWage(overall: number): number {
  return Math.round(overall * overall * 0.5 + 500);
}

// ─── Player Generation ───────────────────────────────────

interface GeneratedPlayerData {
  name: string;
  nationality: string;
  age: number;
  position: Position;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
  composure: number;
  positioning: number;
  overall: number;
  potential: number;
  wage: number;
  form: number;
  morale: number;
}

/**
 * Generate random player data with realistic attributes.
 */
export function generateAuctionPlayerData(): GeneratedPlayerData {
  const firstName = pickRandom(FIRST_NAMES);
  const lastName = pickRandom(LAST_NAMES);
  const name = `${firstName} ${lastName}`;

  const nationality = pickRandom(NATIONALITIES);
  const age = randomInt(17, 35);
  const position = pickPosition();
  const overall = generateWeightedOverall();

  // Potential depends on age
  const potentialBonus = age <= 23
    ? randomInt(5, 25)
    : randomInt(0, 5);
  const potential = Math.min(99, overall + potentialBonus);

  return {
    name,
    nationality,
    age,
    position,
    pace: generateAttribute(overall),
    shooting: generateAttribute(overall),
    passing: generateAttribute(overall),
    dribbling: generateAttribute(overall),
    defending: generateAttribute(overall),
    physicality: generateAttribute(overall),
    composure: generateAttribute(overall),
    positioning: generateAttribute(overall),
    overall,
    potential,
    wage: calculateWage(overall),
    form: randomInt(55, 85),
    morale: randomInt(60, 80),
  };
}

// ─── Pricing ─────────────────────────────────────────────

/**
 * Starting bid = 60% of market value.
 */
export function calculateStartingBid(player: {
  overall: number;
  potential: number;
  age: number;
  position: Position;
  form: number;
}): number {
  const marketValue = calculateMarketValue(player);
  return Math.round(marketValue * STARTING_BID_RATIO);
}

/**
 * Minimum bid = current highest bid * 1.05 (5% increment).
 * If no bids yet, returns the starting bid (askingPrice on the listing).
 */
export function calculateMinBid(currentBid: number | null, askingPrice: number): number {
  if (currentBid === null) return askingPrice;
  return Math.ceil(currentBid * MIN_BID_INCREMENT);
}

/**
 * Buy-now price = 150% of market value.
 */
export function calculateBuyNow(player: {
  overall: number;
  potential: number;
  age: number;
  position: Position;
  form: number;
}): number {
  const marketValue = calculateMarketValue(player);
  return Math.round(marketValue * BUY_NOW_RATIO);
}

// ─── Free Agent Club ─────────────────────────────────────

/**
 * Find or create the "Free Agents" club used to hold auction-generated players.
 */
async function getOrCreateFreeAgentClub(): Promise<string> {
  const existing = await db.club.findFirst({
    where: { isAi: true, name: FREE_AGENT_CLUB_NAME },
    select: { id: true },
  });

  if (existing) return existing.id;

  // Find the lowest-tier division to attach the club to
  const division = await db.division.findFirst({
    orderBy: { tier: "desc" },
  });

  if (!division) {
    throw new Error("No divisions found — cannot create Free Agents club");
  }

  const club = await db.club.create({
    data: {
      name: FREE_AGENT_CLUB_NAME,
      isAi: true,
      aiLevel: 1,
      divisionId: division.id,
      badgeId: "free-agents",
      kitHome: "#888888",
      kitAway: "#444444",
      budget: 0,
      wageBudget: 0,
    },
  });

  return club.id;
}

// ─── Auction Market Refresh ──────────────────────────────

/**
 * Ensure there are TARGET_AUCTION_COUNT active auction listings.
 * Generates new players and listings for any shortfall.
 */
export async function refreshAuctionMarket(): Promise<number> {
  const freeAgentClubId = await getOrCreateFreeAgentClub();

  const activeCount = await db.transferListing.count({
    where: {
      listingType: "AUCTION",
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      sellerClubId: freeAgentClubId,
    },
  });

  const toGenerate = TARGET_AUCTION_COUNT - activeCount;
  if (toGenerate <= 0) return 0;

  let created = 0;

  for (let i = 0; i < toGenerate; i++) {
    const data = generateAuctionPlayerData();

    const contractEnd = new Date();
    contractEnd.setFullYear(contractEnd.getFullYear() + randomInt(1, 4));

    const player = await db.player.create({
      data: {
        clubId: freeAgentClubId,
        name: data.name,
        nationality: data.nationality,
        age: data.age,
        position: data.position,
        pace: data.pace,
        shooting: data.shooting,
        passing: data.passing,
        dribbling: data.dribbling,
        defending: data.defending,
        physicality: data.physicality,
        composure: data.composure,
        positioning: data.positioning,
        overall: data.overall,
        potential: data.potential,
        wage: data.wage,
        form: data.form,
        morale: data.morale,
        contractEnd,
      },
    });

    const startingBid = calculateStartingBid(player);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + AUCTION_DURATION_MINUTES);

    await db.transferListing.create({
      data: {
        playerId: player.id,
        sellerClubId: freeAgentClubId,
        askingPrice: startingBid,
        listingType: "AUCTION",
        expiresAt,
      },
    });

    created++;
  }

  return created;
}

// ─── Resolve Expired Auctions ────────────────────────────

/**
 * Settle all expired auction listings from the free-agent market.
 * Highest bid wins; if no bids, the player is deleted.
 */
export async function resolveExpiredAuctions(): Promise<{
  sold: number;
  expired: number;
}> {
  const freeAgentClubId = await getOrCreateFreeAgentClub();

  const expiredAuctions = await db.transferListing.findMany({
    where: {
      listingType: "AUCTION",
      status: "ACTIVE",
      expiresAt: { lt: new Date() },
      sellerClubId: freeAgentClubId,
    },
    include: {
      offers: {
        where: { status: "PENDING" },
        orderBy: { offerFee: "desc" },
      },
      player: true,
    },
  });

  let sold = 0;
  let expired = 0;

  for (const auction of expiredAuctions) {
    if (auction.offers.length === 0) {
      // No bids — expire listing and delete the generated player
      await db.$transaction(async (tx: TxClient) => {
        await tx.transferListing.update({
          where: { id: auction.id },
          data: { status: "EXPIRED" },
        });
        await tx.player.delete({
          where: { id: auction.playerId },
        });
      });
      expired++;
      continue;
    }

    const winningBid = auction.offers[0];
    const losingBids = auction.offers.slice(1);

    // Verify the winner still has budget
    const winnerClub = await db.club.findUnique({
      where: { id: winningBid.buyerClubId },
      select: { budget: true },
    });

    if (!winnerClub || winnerClub.budget < winningBid.offerFee) {
      // Winner can no longer afford it — try next bidder or expire
      // For simplicity, expire the whole auction
      const offerIds = auction.offers.map((o: { id: string }) => o.id);
      await db.$transaction(async (tx: TxClient) => {
        await tx.transferOffer.updateMany({
          where: { id: { in: offerIds } },
          data: { status: "EXPIRED" },
        });
        await tx.transferListing.update({
          where: { id: auction.id },
          data: { status: "EXPIRED" },
        });
        await tx.player.delete({
          where: { id: auction.playerId },
        });
      });
      expired++;
      continue;
    }

    const losingBidIds = losingBids.map((b: { id: string }) => b.id);
    await db.$transaction(async (tx: TxClient) => {
      // Accept winning bid
      await tx.transferOffer.update({
        where: { id: winningBid.id },
        data: { status: "ACCEPTED" },
      });

      // Reject losing bids
      if (losingBidIds.length > 0) {
        await tx.transferOffer.updateMany({
          where: { id: { in: losingBidIds } },
          data: { status: "REJECTED" },
        });
      }

      // Mark listing as sold
      await tx.transferListing.update({
        where: { id: auction.id },
        data: { status: "SOLD" },
      });

      // Transfer player to winner
      await tx.player.update({
        where: { id: auction.playerId },
        data: {
          clubId: winningBid.buyerClubId,
          wage: winningBid.offerWage,
        },
      });

      // Deduct from buyer (no increment for free-agent seller)
      await tx.club.update({
        where: { id: winningBid.buyerClubId },
        data: { budget: { decrement: winningBid.offerFee } },
      });
    });

    sold++;
  }

  return { sold, expired };
}

// ─── Place Auction Bid ───────────────────────────────────

/**
 * Place a bid on a rolling auction listing.
 * Validates budget, minimum bid, and listing state.
 */
export async function placeAuctionBid(input: {
  listingId: string;
  buyerClubId: string;
  bidAmount: number;
  offerWage: number;
}) {
  const listing = await db.transferListing.findUnique({
    where: { id: input.listingId },
    include: {
      offers: {
        where: { status: "PENDING" },
        orderBy: { offerFee: "desc" },
        take: 1,
      },
    },
  });

  if (!listing) throw new Error("Auction not found");
  if (listing.listingType !== "AUCTION") throw new Error("Not an auction listing");
  if (listing.status !== "ACTIVE") throw new Error("Auction is no longer active");
  if (listing.expiresAt <= new Date()) throw new Error("Auction has expired");
  if (listing.sellerClubId === input.buyerClubId) throw new Error("Cannot bid on own auction");

  // Determine current highest bid
  const currentHighest = listing.offers.length > 0
    ? listing.offers[0].offerFee
    : null;

  const minBid = calculateMinBid(currentHighest, listing.askingPrice);

  if (input.bidAmount < minBid) {
    throw new Error(`Bid must be at least ${minBid}`);
  }

  // Check buyer budget
  const buyer = await db.club.findUnique({
    where: { id: input.buyerClubId },
    select: { budget: true },
  });
  if (!buyer) throw new Error("Club not found");
  if (buyer.budget < input.bidAmount) throw new Error("Insufficient budget");

  // Check if buyer already has a pending bid on this auction — update it instead
  const existingBid = await db.transferOffer.findFirst({
    where: {
      listingId: input.listingId,
      buyerClubId: input.buyerClubId,
      status: "PENDING",
    },
  });

  if (existingBid) {
    return db.transferOffer.update({
      where: { id: existingBid.id },
      data: {
        offerFee: input.bidAmount,
        offerWage: input.offerWage,
        expiresAt: listing.expiresAt,
      },
    });
  }

  return db.transferOffer.create({
    data: {
      listingId: input.listingId,
      buyerClubId: input.buyerClubId,
      offerFee: input.bidAmount,
      offerWage: input.offerWage,
      expiresAt: listing.expiresAt,
    },
  });
}

// ─── Browse Auction Market ───────────────────────────────

/**
 * Return active auction listings with current highest bid and time remaining.
 */
export async function browseAuctionMarket(filters?: {
  position?: Position;
  minOverall?: number;
  maxOverall?: number;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page ?? 1;
  const pageSize = filters?.pageSize ?? 20;

  const now = new Date();

  const playerWhere: Record<string, unknown> = {};
  if (filters?.position) playerWhere.position = filters.position;
  if (filters?.minOverall !== undefined || filters?.maxOverall !== undefined) {
    const overallFilter: Record<string, number> = {};
    if (filters?.minOverall !== undefined) overallFilter.gte = filters.minOverall;
    if (filters?.maxOverall !== undefined) overallFilter.lte = filters.maxOverall;
    playerWhere.overall = overallFilter;
  }

  const where: Record<string, unknown> = {
    listingType: "AUCTION" as const,
    status: "ACTIVE" as const,
    expiresAt: { gt: now },
  };

  if (Object.keys(playerWhere).length > 0) {
    where.player = playerWhere;
  }

  const [listings, total] = await Promise.all([
    db.transferListing.findMany({
      where,
      include: {
        player: true,
        sellerClub: { select: { id: true, name: true } },
        offers: {
          where: { status: "PENDING" },
          orderBy: { offerFee: "desc" },
          take: 1,
          select: { offerFee: true },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { expiresAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transferListing.count({ where }),
  ]);

  const results = listings.map((listing) => {
    const currentBid = listing.offers.length > 0 ? listing.offers[0].offerFee : null;
    const minBid = calculateMinBid(currentBid, listing.askingPrice);
    const buyNow = calculateBuyNow(listing.player);
    const timeRemainingMs = listing.expiresAt.getTime() - now.getTime();

    return {
      id: listing.id,
      player: listing.player,
      sellerClub: listing.sellerClub,
      askingPrice: listing.askingPrice,
      currentBid,
      minBid,
      buyNow,
      bidCount: listing._count.offers,
      expiresAt: listing.expiresAt.toISOString(),
      timeRemainingMs: Math.max(0, timeRemainingMs),
    };
  });

  return { auctions: results, total, page, pageSize };
}
