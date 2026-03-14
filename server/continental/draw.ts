import { db } from "@/lib/db";

/**
 * Generate the Continental Cup draw.
 * Top 3 clubs from each division qualify.
 * Format: 4 groups of ~8, then knockout from group winners.
 */
export async function generateContinentalDraw(seasonNum: number) {
  // Get top 3 clubs from each division based on league table
  const seasons = await db.season.findMany({
    where: { isActive: true },
    include: {
      tableRows: {
        orderBy: { points: "desc" },
        take: 3,
        include: { club: { include: { division: true } } },
      },
    },
  });

  const qualifiedClubIds: string[] = [];
  for (const season of seasons) {
    for (const row of season.tableRows) {
      qualifiedClubIds.push(row.clubId);
    }
  }

  if (qualifiedClubIds.length < 8) {
    throw new Error("Not enough qualified clubs for Continental Cup");
  }

  // Shuffle for group assignment
  const shuffled = [...qualifiedClubIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Create the Continental Cup (reuse Cup model with a naming convention)
  const cup = await db.cup.create({
    data: {
      seasonNum: seasonNum * -1, // Negative seasonNum = continental
      isActive: true,
    },
  });

  // Assign to 4 groups (round-robin within each group)
  const groupCount = 4;
  const groups: string[][] = Array.from({ length: groupCount }, () => []);
  shuffled.forEach((clubId, i) => {
    groups[i % groupCount].push(clubId);
  });

  // Create group stage rounds (each group as a separate round)
  // Schedule for next Thursday 20:00 UTC
  const now = new Date();
  const nextThursday = new Date(now);
  const daysUntilThu = (4 - now.getUTCDay() + 7) % 7 || 7;
  nextThursday.setUTCDate(now.getUTCDate() + daysUntilThu);
  nextThursday.setUTCHours(20, 0, 0, 0);

  let totalFixtures = 0;

  for (let g = 0; g < groupCount; g++) {
    const groupClubs = groups[g];
    const groupRound = await db.cupRound.create({
      data: {
        cupId: cup.id,
        roundNum: g + 1, // Rounds 1-4 are group stages
        name: `Group ${String.fromCharCode(65 + g)}`, // A, B, C, D
      },
    });

    // Round-robin fixtures within the group
    const fixtures: {
      roundId: string;
      homeClubId: string;
      awayClubId: string;
      scheduledAt: Date;
    }[] = [];

    for (let i = 0; i < groupClubs.length; i++) {
      for (let j = i + 1; j < groupClubs.length; j++) {
        const matchDate = new Date(nextThursday);
        // Spread fixtures across weeks
        const weekOffset = Math.floor(
          (fixtures.length / Math.max(1, groupClubs.length / 2))
        );
        matchDate.setDate(matchDate.getDate() + weekOffset * 7);

        fixtures.push({
          roundId: groupRound.id,
          homeClubId: groupClubs[i],
          awayClubId: groupClubs[j],
          scheduledAt: matchDate,
        });
      }
    }

    if (fixtures.length > 0) {
      await db.cupFixture.createMany({ data: fixtures });
      totalFixtures += fixtures.length;
    }
  }

  return {
    cupId: cup.id,
    groupCount,
    qualifiedClubs: qualifiedClubIds.length,
    totalFixtures,
  };
}

/**
 * After group stage completes, generate knockout round from group winners.
 * Top 1 from each group advances. Then semi-final and final.
 */
export async function generateContinentalKnockout(cupId: string) {
  const cup = await db.cup.findUnique({
    where: { id: cupId },
    include: {
      rounds: {
        include: { fixtures: true },
        orderBy: { roundNum: "asc" },
      },
    },
  });

  if (!cup) throw new Error("Continental cup not found");

  // Check all group stage fixtures are completed
  const groupRounds = cup.rounds.filter((r) => r.roundNum <= 4);
  const allComplete = groupRounds.every((r) =>
    r.fixtures.every((f) => f.status === "COMPLETED")
  );
  if (!allComplete) return null;

  // Calculate group standings: count wins per club in each group
  const groupWinners: string[] = [];

  for (const round of groupRounds) {
    const clubWins: Record<string, number> = {};
    const clubGoalDiff: Record<string, number> = {};

    for (const fixture of round.fixtures) {
      // Initialize
      if (!clubWins[fixture.homeClubId]) {
        clubWins[fixture.homeClubId] = 0;
        clubGoalDiff[fixture.homeClubId] = 0;
      }
      if (!clubWins[fixture.awayClubId]) {
        clubWins[fixture.awayClubId] = 0;
        clubGoalDiff[fixture.awayClubId] = 0;
      }

      const hs = fixture.homeScore ?? 0;
      const as = fixture.awayScore ?? 0;

      if (hs > as) {
        clubWins[fixture.homeClubId] += 3;
      } else if (as > hs) {
        clubWins[fixture.awayClubId] += 3;
      } else {
        clubWins[fixture.homeClubId] += 1;
        clubWins[fixture.awayClubId] += 1;
      }
      clubGoalDiff[fixture.homeClubId] += hs - as;
      clubGoalDiff[fixture.awayClubId] += as - hs;
    }

    // Sort by points then goal diff
    const sorted = Object.entries(clubWins).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return (clubGoalDiff[b[0]] ?? 0) - (clubGoalDiff[a[0]] ?? 0);
    });

    if (sorted.length > 0) {
      groupWinners.push(sorted[0][0]);
    }
  }

  if (groupWinners.length < 2) return null;

  // Schedule knockout for next Thursday
  const now = new Date();
  const nextThursday = new Date(now);
  const daysUntilThu = (4 - now.getUTCDay() + 7) % 7 || 7;
  nextThursday.setUTCDate(now.getUTCDate() + daysUntilThu);
  nextThursday.setUTCHours(20, 0, 0, 0);

  const roundName =
    groupWinners.length === 2 ? "Final" : "Semi Final";

  const knockoutRound = await db.cupRound.create({
    data: {
      cupId,
      roundNum: 5,
      name: roundName,
    },
  });

  // Pair group winners: A vs D, B vs C (or just sequential for 2)
  const fixtures: {
    roundId: string;
    homeClubId: string;
    awayClubId: string;
    scheduledAt: Date;
  }[] = [];

  if (groupWinners.length === 4) {
    fixtures.push({
      roundId: knockoutRound.id,
      homeClubId: groupWinners[0],
      awayClubId: groupWinners[3],
      scheduledAt: nextThursday,
    });
    fixtures.push({
      roundId: knockoutRound.id,
      homeClubId: groupWinners[1],
      awayClubId: groupWinners[2],
      scheduledAt: nextThursday,
    });
  } else {
    for (let i = 0; i < groupWinners.length - 1; i += 2) {
      fixtures.push({
        roundId: knockoutRound.id,
        homeClubId: groupWinners[i],
        awayClubId: groupWinners[i + 1],
        scheduledAt: nextThursday,
      });
    }
  }

  await db.cupFixture.createMany({ data: fixtures });

  return {
    roundId: knockoutRound.id,
    roundName,
    fixtureCount: fixtures.length,
  };
}
