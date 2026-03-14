import { db } from "@/lib/db";

/**
 * Full season-end pipeline:
 * 1. Verify all fixtures are COMPLETED
 * 2. Calculate final standings
 * 3. Award trophies to division winners
 * 4. Handle promotions (top 2) and relegations (bottom 2)
 * 5. Close current season
 * 6. Generate new season with fixtures
 */
export async function runSeasonEnd(divisionId: string) {
  const season = await db.season.findFirst({
    where: { divisionId, isActive: true },
    include: {
      fixtures: true,
      tableRows: {
        include: { club: true },
        orderBy: [
          { points: "desc" },
          { goalsFor: "desc" },
        ],
      },
    },
  });

  if (!season) throw new Error("No active season found");

  // Check all fixtures completed
  const pending = season.fixtures.filter((f) => f.status !== "COMPLETED");
  if (pending.length > 0) {
    throw new Error(`${pending.length} fixtures still pending`);
  }

  const division = await db.division.findUnique({
    where: { id: divisionId },
  });
  if (!division) throw new Error("Division not found");

  const standings = season.tableRows;

  // Award trophy to winner
  if (standings.length > 0) {
    const winnerId = standings[0].clubId;
    const winnerClub = standings[0].club;

    // Update manager profile trophy
    if (!winnerClub.isAi && winnerClub.userId) {
      const profile = await db.managerProfile.findUnique({
        where: { userId: winnerClub.userId },
      });
      if (profile) {
        const existing = (profile.trophies as unknown[]) || [];
        const trophies = [
          ...existing,
          {
            type: "league",
            division: division.name,
            tier: division.tier,
            season: season.number,
            date: new Date().toISOString(),
          },
        ];
        await db.managerProfile.update({
          where: { userId: winnerClub.userId },
          data: { trophies: trophies as unknown as import("@prisma/client/runtime/library").InputJsonValue },
        });
      }
    }

    // Boost winner reputation
    await db.club.update({
      where: { id: winnerId },
      data: { reputation: { increment: 10 } },
    });
  }

  // Promotions: top 2 move up (if not tier 1)
  const promotions: string[] = [];
  if (division.tier > 1) {
    const higherDiv = await db.division.findUnique({
      where: { tier: division.tier - 1 },
    });
    if (higherDiv) {
      for (let i = 0; i < Math.min(2, standings.length); i++) {
        promotions.push(standings[i].clubId);
        await db.club.update({
          where: { id: standings[i].clubId },
          data: {
            divisionId: higherDiv.id,
            reputation: { increment: 5 },
          },
        });
      }
    }
  }

  // Relegations: bottom 2 move down (if not tier 10)
  const relegations: string[] = [];
  if (division.tier < 10) {
    const lowerDiv = await db.division.findUnique({
      where: { tier: division.tier + 1 },
    });
    if (lowerDiv) {
      for (let i = standings.length - 1; i >= Math.max(0, standings.length - 2); i--) {
        relegations.push(standings[i].clubId);
        await db.club.update({
          where: { id: standings[i].clubId },
          data: {
            divisionId: lowerDiv.id,
            reputation: { decrement: 3 },
          },
        });
      }
    }
  }

  // Close current season
  await db.season.update({
    where: { id: season.id },
    data: { isActive: false, endDate: new Date() },
  });

  // Generate new season
  const newSeason = await generateNewSeason(divisionId, season.number + 1);

  return {
    divisionId,
    divisionName: division.name,
    winner: standings[0]?.club.name,
    promotions,
    relegations,
    newSeasonId: newSeason.id,
  };
}

/**
 * Generate a new season with round-robin fixtures for all clubs in the division.
 */
async function generateNewSeason(divisionId: string, seasonNumber: number) {
  const clubs = await db.club.findMany({
    where: { divisionId },
    select: { id: true },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Start in 1 week

  const season = await db.season.create({
    data: {
      divisionId,
      number: seasonNumber,
      startDate,
      isActive: true,
    },
  });

  // Create league table rows for all clubs
  await db.leagueTableRow.createMany({
    data: clubs.map((c) => ({
      seasonId: season.id,
      clubId: c.id,
    })),
  });

  // Generate round-robin fixtures
  const clubIds = clubs.map((c) => c.id);
  const fixtures = generateRoundRobin(clubIds, season.id, startDate);

  if (fixtures.length > 0) {
    await db.fixture.createMany({ data: fixtures });
  }

  return season;
}

/**
 * Round-robin schedule: each club plays every other club home and away.
 */
function generateRoundRobin(
  clubIds: string[],
  seasonId: string,
  startDate: Date
) {
  const fixtures: Array<{
    seasonId: string;
    homeClubId: string;
    awayClubId: string;
    matchWeek: number;
    scheduledAt: Date;
  }> = [];

  const n = clubIds.length;
  if (n < 2) return fixtures;

  // Use standard round-robin algorithm
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push("BYE");
  const total = teams.length;
  const rounds = total - 1;

  let matchWeek = 1;

  // First half: home matches
  for (let round = 0; round < rounds; round++) {
    const scheduled = new Date(startDate);
    scheduled.setDate(scheduled.getDate() + round * 7);
    scheduled.setUTCHours(20, 0, 0, 0);

    for (let i = 0; i < total / 2; i++) {
      const home = teams[i];
      const away = teams[total - 1 - i];
      if (home === "BYE" || away === "BYE") continue;

      fixtures.push({
        seasonId,
        homeClubId: home,
        awayClubId: away,
        matchWeek,
        scheduledAt: scheduled,
      });
    }

    // Rotate teams (keep first team fixed)
    const last = teams.pop()!;
    teams.splice(1, 0, last);
    matchWeek++;
  }

  // Second half: reverse fixtures (away becomes home)
  const firstHalf = [...fixtures];
  for (const f of firstHalf) {
    const scheduled = new Date(f.scheduledAt);
    scheduled.setDate(scheduled.getDate() + rounds * 7);

    fixtures.push({
      seasonId,
      homeClubId: f.awayClubId,
      awayClubId: f.homeClubId,
      matchWeek: f.matchWeek + rounds,
      scheduledAt: scheduled,
    });
  }

  return fixtures;
}

/**
 * Run season end for ALL divisions at once.
 */
export async function runAllSeasonEnds() {
  const divisions = await db.division.findMany({
    orderBy: { tier: "asc" },
  });

  const results = [];
  for (const div of divisions) {
    try {
      const result = await runSeasonEnd(div.id);
      results.push(result);
    } catch (err) {
      results.push({
        divisionId: div.id,
        divisionName: div.name,
        error: (err as Error).message,
      });
    }
  }

  return results;
}
