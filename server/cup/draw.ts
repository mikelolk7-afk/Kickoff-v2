import { db } from "@/lib/db";

const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Round of 16",
  4: "Quarter Final",
  5: "Semi Final",
  6: "Final",
};

/**
 * Determine how many rounds are needed for a given number of clubs.
 * We round up to the nearest power of 2.
 */
function getRoundCount(clubCount: number): number {
  let rounds = 0;
  let slots = 1;
  while (slots < clubCount) {
    slots *= 2;
    rounds++;
  }
  return rounds;
}

/**
 * Shuffle an array using Fisher-Yates with seeded ordering.
 * Higher-division clubs are placed in separate halves of the bracket
 * to avoid early clashes.
 */
function seededShuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a cup draw for the current season.
 * All clubs across all divisions enter. Higher-tier clubs are seeded
 * to avoid each other in early rounds.
 */
export async function generateCupDraw(seasonNum: number) {
  // Check if cup already exists for this season
  const existing = await db.cup.findFirst({
    where: { seasonNum },
  });
  if (existing) {
    throw new Error(`Cup already exists for season ${seasonNum}`);
  }

  // Get all clubs grouped by division tier
  const clubs = await db.club.findMany({
    include: { division: true },
    orderBy: { division: { tier: "asc" } },
  });

  if (clubs.length < 2) {
    throw new Error("Not enough clubs for a cup draw");
  }

  // Seed the draw: split clubs into top half (tiers 1-5) and bottom half (tiers 6-10)
  const topHalf = seededShuffle(clubs.filter((c) => c.division.tier <= 5));
  const bottomHalf = seededShuffle(clubs.filter((c) => c.division.tier > 5));

  // Interleave to create matchups: top vs bottom where possible
  const allClubs: typeof clubs = [];
  const maxLen = Math.max(topHalf.length, bottomHalf.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < topHalf.length) allClubs.push(topHalf[i]);
    if (i < bottomHalf.length) allClubs.push(bottomHalf[i]);
  }

  // Pad to nearest power of 2 (byes for missing slots)
  const totalRounds = getRoundCount(allClubs.length);
  const bracketSize = Math.pow(2, totalRounds);

  // Create the cup
  const cup = await db.cup.create({
    data: { seasonNum, isActive: true },
  });

  // Create round 1 with fixtures
  const roundName =
    ROUND_NAMES[totalRounds] ?? `Round of ${bracketSize}`;

  // Schedule first round for next Wednesday at 20:00 UTC
  const now = new Date();
  const nextWednesday = new Date(now);
  const daysUntilWed = (3 - now.getUTCDay() + 7) % 7 || 7;
  nextWednesday.setUTCDate(now.getUTCDate() + daysUntilWed);
  nextWednesday.setUTCHours(20, 0, 0, 0);

  const round1 = await db.cupRound.create({
    data: {
      cupId: cup.id,
      roundNum: 1,
      name: roundName,
    },
  });

  // Create fixtures for round 1
  // Clubs without a pair get a bye (handled by having odd clubs get auto-advanced)
  const fixtures: {
    roundId: string;
    homeClubId: string;
    awayClubId: string;
    scheduledAt: Date;
  }[] = [];

  for (let i = 0; i < allClubs.length - 1; i += 2) {
    fixtures.push({
      roundId: round1.id,
      homeClubId: allClubs[i].id,
      awayClubId: allClubs[i + 1].id,
      scheduledAt: nextWednesday,
    });
  }

  if (fixtures.length > 0) {
    await db.cupFixture.createMany({ data: fixtures });
  }

  // If odd number of clubs, last club gets a bye — create them as a "winner" in a fixture
  // with themselves. We'll handle byes by auto-advancing in the next round draw.

  return {
    cupId: cup.id,
    roundId: round1.id,
    fixtureCount: fixtures.length,
    totalClubs: allClubs.length,
  };
}

/**
 * Generate the next round of the cup from completed fixtures.
 */
export async function generateNextCupRound(cupId: string) {
  const cup = await db.cup.findUnique({
    where: { id: cupId },
    include: {
      rounds: {
        include: { fixtures: true },
        orderBy: { roundNum: "desc" },
      },
    },
  });

  if (!cup) throw new Error("Cup not found");

  const latestRound = cup.rounds[0];
  if (!latestRound) throw new Error("No rounds found");

  // Check all fixtures are completed
  const incomplete = latestRound.fixtures.filter(
    (f) => f.status !== "COMPLETED"
  );
  if (incomplete.length > 0) {
    return null; // Not all fixtures completed yet
  }

  // Get winners
  const winners = latestRound.fixtures
    .filter((f) => f.winnerId)
    .map((f) => f.winnerId as string);

  if (winners.length <= 1) {
    // Cup is over — the single winner (or no fixtures left)
    await db.cup.update({
      where: { id: cupId },
      data: { isActive: false },
    });
    return { complete: true, winnerId: winners[0] ?? null };
  }

  // Schedule next round for next Wednesday
  const now = new Date();
  const nextWednesday = new Date(now);
  const daysUntilWed = (3 - now.getUTCDay() + 7) % 7 || 7;
  nextWednesday.setUTCDate(now.getUTCDate() + daysUntilWed);
  nextWednesday.setUTCHours(20, 0, 0, 0);

  const nextRoundNum = latestRound.roundNum + 1;
  const roundName =
    winners.length === 2
      ? "Final"
      : winners.length <= 4
        ? "Semi Final"
        : winners.length <= 8
          ? "Quarter Final"
          : `Round of ${winners.length}`;

  const nextRound = await db.cupRound.create({
    data: {
      cupId,
      roundNum: nextRoundNum,
      name: roundName,
    },
  });

  // Pair winners for next round
  const shuffledWinners = seededShuffle(winners);
  const fixtures: {
    roundId: string;
    homeClubId: string;
    awayClubId: string;
    scheduledAt: Date;
  }[] = [];

  for (let i = 0; i < shuffledWinners.length - 1; i += 2) {
    fixtures.push({
      roundId: nextRound.id,
      homeClubId: shuffledWinners[i],
      awayClubId: shuffledWinners[i + 1],
      scheduledAt: nextWednesday,
    });
  }

  if (fixtures.length > 0) {
    await db.cupFixture.createMany({ data: fixtures });
  }

  return {
    roundId: nextRound.id,
    roundName,
    fixtureCount: fixtures.length,
  };
}
