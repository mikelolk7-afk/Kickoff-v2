import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { simulateMatch, calcMoraleChanges, calcFormChange, checkInjury } from "@/server/engine/simulate";
import type { PlayerAttributes } from "@/types/game";
import type { Player } from "@prisma/client";

function toPlayerAttributes(player: Player): PlayerAttributes {
  return {
    id: player.id,
    name: player.name,
    position: player.position,
    pace: player.pace,
    shooting: player.shooting,
    passing: player.passing,
    dribbling: player.dribbling,
    defending: player.defending,
    physicality: player.physicality,
    composure: player.composure,
    positioning: player.positioning,
    overall: player.overall,
    morale: player.morale,
    form: player.form,
  };
}

/**
 * Daily cron: simulate all scheduled fixtures for today.
 * Triggered at 20:00 UTC.
 */
export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Find all scheduled fixtures for today
  const fixtures = await db.fixture.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      homeClub: {
        include: {
          players: { where: { injuredUntil: null } },
          tactics: { where: { isActive: true }, take: 1 },
        },
      },
      awayClub: {
        include: {
          players: { where: { injuredUntil: null } },
          tactics: { where: { isActive: true }, take: 1 },
        },
      },
    },
  });

  if (fixtures.length === 0) {
    return NextResponse.json({ message: "No fixtures to simulate", count: 0 });
  }

  let simulated = 0;

  for (const fixture of fixtures) {
    const homePlayers = fixture.homeClub.players.map(toPlayerAttributes);
    const awayPlayers = fixture.awayClub.players.map(toPlayerAttributes);
    const homeMentality = fixture.homeClub.tactics[0]?.mentality ?? 3;
    const awayMentality = fixture.awayClub.tactics[0]?.mentality ?? 3;

    if (homePlayers.length === 0 || awayPlayers.length === 0) {
      continue;
    }

    const result = simulateMatch({
      homePlayers,
      awayPlayers,
      homeMentality,
      awayMentality,
      fixtureId: fixture.id,
    });

    // Save results in a transaction
    await db.$transaction(async (tx) => {
      // Update fixture
      await tx.fixture.update({
        where: { id: fixture.id },
        data: {
          status: "COMPLETED",
          playedAt: now,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          homePoss: result.homePossession,
          awayPoss: result.awayPossession,
          homeShots: result.homeShots,
          awayShots: result.awayShots,
        },
      });

      // Save match events
      if (result.events.length > 0) {
        await tx.matchEvent.createMany({
          data: result.events.map((e) => ({
            fixtureId: fixture.id,
            minute: e.minute,
            type: e.type,
            team: e.team,
            playerId: e.playerId ?? null,
            detail: e.detail ?? null,
            xPos: e.xPos ?? null,
            yPos: e.yPos ?? null,
          })),
        });
      }

      // Update league table
      const homeRow = await tx.leagueTableRow.findFirst({
        where: { seasonId: fixture.seasonId, clubId: fixture.homeClubId },
      });
      const awayRow = await tx.leagueTableRow.findFirst({
        where: { seasonId: fixture.seasonId, clubId: fixture.awayClubId },
      });

      if (homeRow) {
        const homeWon = result.homeScore > result.awayScore;
        const drawn = result.homeScore === result.awayScore;
        await tx.leagueTableRow.update({
          where: { id: homeRow.id },
          data: {
            played: { increment: 1 },
            won: { increment: homeWon ? 1 : 0 },
            drawn: { increment: drawn ? 1 : 0 },
            lost: { increment: !homeWon && !drawn ? 1 : 0 },
            goalsFor: { increment: result.homeScore },
            goalsAgainst: { increment: result.awayScore },
            points: { increment: homeWon ? 3 : drawn ? 1 : 0 },
          },
        });
      }

      if (awayRow) {
        const awayWon = result.awayScore > result.homeScore;
        const drawn = result.homeScore === result.awayScore;
        await tx.leagueTableRow.update({
          where: { id: awayRow.id },
          data: {
            played: { increment: 1 },
            won: { increment: awayWon ? 1 : 0 },
            drawn: { increment: drawn ? 1 : 0 },
            lost: { increment: !awayWon && !drawn ? 1 : 0 },
            goalsFor: { increment: result.awayScore },
            goalsAgainst: { increment: result.homeScore },
            points: { increment: awayWon ? 3 : drawn ? 1 : 0 },
          },
        });
      }

      // Post-match morale + form updates
      const moraleChanges = calcMoraleChanges(result.homeScore, result.awayScore);
      const homeWon = result.homeScore > result.awayScore;
      const drawn = result.homeScore === result.awayScore;

      for (const player of fixture.homeClub.players) {
        const newMorale = Math.max(20, Math.min(99, player.morale + moraleChanges.homeDelta));
        const newForm = calcFormChange(player.form, homeWon, drawn);
        const injury = checkInjury(player.physicality, player.id.charCodeAt(0) + now.getTime());

        await tx.player.update({
          where: { id: player.id },
          data: {
            morale: newMorale,
            form: newForm,
            injuredUntil: injury.injured
              ? new Date(now.getTime() + injury.daysOut * 24 * 60 * 60 * 1000)
              : null,
          },
        });
      }

      for (const player of fixture.awayClub.players) {
        const awayWon2 = result.awayScore > result.homeScore;
        const newMorale = Math.max(20, Math.min(99, player.morale + moraleChanges.awayDelta));
        const newForm = calcFormChange(player.form, awayWon2, drawn);
        const injury = checkInjury(player.physicality, player.id.charCodeAt(0) + now.getTime());

        await tx.player.update({
          where: { id: player.id },
          data: {
            morale: newMorale,
            form: newForm,
            injuredUntil: injury.injured
              ? new Date(now.getTime() + injury.daysOut * 24 * 60 * 60 * 1000)
              : null,
          },
        });
      }
    });

    simulated++;
  }

  return NextResponse.json({
    message: `Simulated ${simulated} matches`,
    count: simulated,
  });
}
