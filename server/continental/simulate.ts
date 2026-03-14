import { db } from "@/lib/db";
import { simulateMatch } from "@/server/engine/simulate";
import { generateContinentalKnockout } from "./draw";

/**
 * Simulate all scheduled continental cup fixtures that are due.
 * Called by cron every Thursday at 20:00 UTC.
 */
export async function simulateContinentalFixtures() {
  const now = new Date();

  // Continental cups have negative seasonNum
  const activeCup = await db.cup.findFirst({
    where: { isActive: true, seasonNum: { lt: 0 } },
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

      // For group stage (rounds 1-4), draws are allowed
      // For knockout (rounds 5+), winner must be determined
      const isKnockout = round.roundNum >= 5;
      let winnerId: string | null = null;

      if (result.homeScore > result.awayScore) {
        winnerId = fixture.homeClubId;
      } else if (result.awayScore > result.homeScore) {
        winnerId = fixture.awayClubId;
      } else if (isKnockout) {
        // Tiebreaker: away team wins
        winnerId = fixture.awayClubId;
      }

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

  // After group stage completes, generate knockout
  if (simulated > 0) {
    const allGroupsComplete = activeCup.rounds
      .filter((r) => r.roundNum <= 4)
      .every((r) =>
        r.fixtures.every(
          (f) => f.status === "COMPLETED" || f.scheduledAt > now
        )
      );

    if (allGroupsComplete) {
      const knockoutExists = activeCup.rounds.some((r) => r.roundNum >= 5);
      if (!knockoutExists) {
        await generateContinentalKnockout(activeCup.id);
      }
    }

    // Check if knockout is done — generate final if needed
    const knockoutRound = activeCup.rounds.find((r) => r.roundNum === 5);
    if (knockoutRound) {
      const allKnockoutDone = knockoutRound.fixtures.every(
        (f) => f.status === "COMPLETED"
      );
      if (allKnockoutDone && knockoutRound.fixtures.length > 1) {
        // Generate final
        const winners = knockoutRound.fixtures
          .filter((f) => f.winnerId)
          .map((f) => f.winnerId as string);

        if (winners.length === 2) {
          const nextThursday = new Date(now);
          const daysUntilThu = (4 - now.getUTCDay() + 7) % 7 || 7;
          nextThursday.setUTCDate(now.getUTCDate() + daysUntilThu);
          nextThursday.setUTCHours(20, 0, 0, 0);

          const finalRound = await db.cupRound.create({
            data: {
              cupId: activeCup.id,
              roundNum: 6,
              name: "Final",
            },
          });

          await db.cupFixture.create({
            data: {
              roundId: finalRound.id,
              homeClubId: winners[0],
              awayClubId: winners[1],
              scheduledAt: nextThursday,
            },
          });
        }
      }
    }

    // Check if final is done
    const finalRound = activeCup.rounds.find((r) => r.roundNum === 6);
    if (finalRound) {
      const finalDone = finalRound.fixtures.every(
        (f) => f.status === "COMPLETED"
      );
      if (finalDone) {
        await db.cup.update({
          where: { id: activeCup.id },
          data: { isActive: false },
        });
      }
    }
  }

  return { simulated };
}
