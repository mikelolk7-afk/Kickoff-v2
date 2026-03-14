import { db } from "@/lib/db";
import { simulateMatch } from "@/server/engine/simulate";
import { generateNextCupRound } from "./draw";

/**
 * Simulate all scheduled cup fixtures that are due.
 * Called by cron every Wednesday at 20:00 UTC.
 */
export async function simulateCupFixtures() {
  const now = new Date();

  const activeCup = await db.cup.findFirst({
    where: { isActive: true },
    include: {
      rounds: {
        include: {
          fixtures: {
            where: {
              status: "SCHEDULED",
              scheduledAt: { lte: now },
            },
            include: {
              homeClub: {
                include: {
                  players: true,
                  tactics: { where: { isActive: true }, take: 1 },
                },
              },
              awayClub: {
                include: {
                  players: true,
                  tactics: { where: { isActive: true }, take: 1 },
                },
              },
            },
          },
        },
        orderBy: { roundNum: "asc" },
      },
    },
  });

  if (!activeCup) return { simulated: 0 };

  let simulated = 0;

  for (const round of activeCup.rounds) {
    for (const fixture of round.fixtures) {
      const homePlayers = fixture.homeClub.players;
      const awayPlayers = fixture.awayClub.players;
      const homeTactic = fixture.homeClub.tactics[0];
      const awayTactic = fixture.awayClub.tactics[0];

      if (!homeTactic || !awayTactic) continue;
      if (homePlayers.length < 11 || awayPlayers.length < 11) continue;

      const result = simulateMatch({
        homePlayers,
        awayPlayers,
        homeMentality: homeTactic.mentality,
        awayMentality: awayTactic.mentality,
        fixtureId: fixture.id,
      });

      // Determine winner (no draws in cup — if tied, away team wins on "away goals" rule)
      const winnerId =
        result.homeScore > result.awayScore
          ? fixture.homeClubId
          : fixture.awayClubId;

      await db.cupFixture.update({
        where: { id: fixture.id },
        data: {
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          winnerId,
          status: "COMPLETED",
        },
      });

      simulated++;
    }
  }

  // After simulating, try to generate next round if all fixtures in current round are done
  if (simulated > 0) {
    await generateNextCupRound(activeCup.id);
  }

  return { simulated };
}
