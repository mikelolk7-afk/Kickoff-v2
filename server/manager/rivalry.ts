import { db } from "@/lib/db";

/**
 * Auto-generate rivalries between clubs in the same division
 * that have played each other 3+ consecutive seasons.
 * Called at the end of each season.
 */
export async function updateRivalries() {
  // Get all divisions with their clubs
  const divisions = await db.division.findMany({
    include: {
      clubs: { select: { id: true } },
      seasons: {
        orderBy: { number: "desc" },
        take: 3,
        select: { id: true, number: true },
      },
    },
  });

  let created = 0;
  let updated = 0;

  for (const division of divisions) {
    if (division.seasons.length < 3) continue;

    const clubIds = division.clubs.map((c) => c.id);

    // Check each pair of clubs in the division
    for (let i = 0; i < clubIds.length; i++) {
      for (let j = i + 1; j < clubIds.length; j++) {
        const clubA = clubIds[i];
        const clubB = clubIds[j];

        // Check if they played in all 3 recent seasons
        let matchedSeasons = 0;
        for (const season of division.seasons) {
          const fixture = await db.fixture.findFirst({
            where: {
              seasonId: season.id,
              OR: [
                { homeClubId: clubA, awayClubId: clubB },
                { homeClubId: clubB, awayClubId: clubA },
              ],
            },
          });
          if (fixture) matchedSeasons++;
        }

        if (matchedSeasons >= 3) {
          // Ensure consistent ordering (smaller ID first)
          const [idA, idB] = clubA < clubB ? [clubA, clubB] : [clubB, clubA];

          const existing = await db.rivalry.findUnique({
            where: { clubAId_clubBId: { clubAId: idA, clubBId: idB } },
          });

          if (existing) {
            // Increase intensity (max 5)
            if (existing.intensity < 5) {
              await db.rivalry.update({
                where: { id: existing.id },
                data: { intensity: Math.min(5, existing.intensity + 1) },
              });
              updated++;
            }
          } else {
            await db.rivalry.create({
              data: { clubAId: idA, clubBId: idB, intensity: 1 },
            });
            created++;
          }
        }
      }
    }
  }

  return { created, updated };
}

/**
 * Get all rivalries for a club.
 */
export async function getClubRivalries(clubId: string) {
  const rivalries = await db.rivalry.findMany({
    where: {
      OR: [{ clubAId: clubId }, { clubBId: clubId }],
    },
    include: {
      clubA: { select: { id: true, name: true, badgeId: true } },
      clubB: { select: { id: true, name: true, badgeId: true } },
    },
    orderBy: { intensity: "desc" },
  });

  return rivalries.map((r) => ({
    id: r.id,
    rival: r.clubAId === clubId ? r.clubB : r.clubA,
    intensity: r.intensity,
    createdAt: r.createdAt,
  }));
}

/**
 * Get head-to-head record between two clubs.
 */
export async function getHeadToHead(clubAId: string, clubBId: string) {
  const fixtures = await db.fixture.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { homeClubId: clubAId, awayClubId: clubBId },
        { homeClubId: clubBId, awayClubId: clubAId },
      ],
    },
    orderBy: { playedAt: "desc" },
    take: 10,
  });

  let winsA = 0;
  let winsB = 0;
  let draws = 0;

  for (const f of fixtures) {
    const homeScore = f.homeScore ?? 0;
    const awayScore = f.awayScore ?? 0;

    if (homeScore === awayScore) {
      draws++;
    } else if (
      (f.homeClubId === clubAId && homeScore > awayScore) ||
      (f.awayClubId === clubAId && awayScore > homeScore)
    ) {
      winsA++;
    } else {
      winsB++;
    }
  }

  return {
    totalMatches: fixtures.length,
    winsA,
    winsB,
    draws,
    recentFixtures: fixtures.slice(0, 5),
  };
}
