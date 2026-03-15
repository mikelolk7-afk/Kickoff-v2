import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const clubId = (session.user as { clubId?: string | null }).clubId;

  // Try finding club by userId first, then fall back to clubId from JWT
  let club = await db.club.findFirst({
    where: { userId },
    include: { division: true },
  });

  if (!club && clubId) {
    club = await db.club.findFirst({
      where: { id: clubId },
      include: { division: true },
    });
    // Re-link club to user if found by clubId but userId was missing
    if (club && !club.userId) {
      await db.club.update({ where: { id: club.id }, data: { userId } });
    }
  }

  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  // Season — may not exist yet (graceful)
  const season = await db.season.findFirst({
    where: { divisionId: club.divisionId, isActive: true },
  });

  // Next scheduled fixture
  const nextFixture = season
    ? await db.fixture.findFirst({
        where: {
          seasonId: season.id,
          status: "SCHEDULED",
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        },
        include: {
          homeClub: { select: { id: true, name: true, kitHome: true } },
          awayClub: { select: { id: true, name: true, kitHome: true } },
        },
        orderBy: { scheduledAt: "asc" },
      })
    : null;

  // Last 5 completed fixtures (for form)
  const recentFixtures = season
    ? await db.fixture.findMany({
        where: {
          seasonId: season.id,
          status: "COMPLETED",
          OR: [{ homeClubId: club.id }, { awayClubId: club.id }],
        },
        include: {
          homeClub: { select: { id: true, name: true } },
          awayClub: { select: { id: true, name: true } },
        },
        orderBy: { playedAt: "desc" },
        take: 5,
      })
    : [];

  const lastResult = recentFixtures.length > 0 ? recentFixtures[0] : null;

  // Form string (W/D/L for last 5)
  const form = recentFixtures.map((f) => {
    const isHome = f.homeClubId === club.id;
    const myGoals = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
    const theirGoals = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
    if (myGoals > theirGoals) return "W";
    if (myGoals < theirGoals) return "L";
    return "D";
  });

  // League position
  const tableRows = season
    ? await db.leagueTableRow.findMany({
        where: { seasonId: season.id },
        orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
        include: { club: { select: { id: true, name: true } } },
      })
    : [];
  const position = tableRows.findIndex((r) => r.clubId === club.id) + 1;
  const myRow = tableRows.find((r) => r.clubId === club.id);

  // Top 5 of league table for mini-table widget
  const miniTable = tableRows.slice(0, 5).map((r, i) => ({
    position: i + 1,
    clubId: r.clubId,
    clubName: r.club.name,
    played: r.played,
    won: r.won,
    drawn: r.drawn,
    lost: r.lost,
    goalsFor: r.goalsFor,
    goalsAgainst: r.goalsAgainst,
    points: r.points,
    isUser: r.clubId === club.id,
  }));

  // If user not in top 5, append their row
  if (position > 5 && myRow) {
    const myTableClub = tableRows.find((r) => r.clubId === club.id);
    if (myTableClub) {
      miniTable.push({
        position,
        clubId: club.id,
        clubName: club.name,
        played: myRow.played,
        won: myRow.won,
        drawn: myRow.drawn,
        lost: myRow.lost,
        goalsFor: myRow.goalsFor,
        goalsAgainst: myRow.goalsAgainst,
        points: myRow.points,
        isUser: true,
      });
    }
  }

  // Squad summary
  const players = await db.player.findMany({
    where: { clubId: club.id },
    select: {
      id: true,
      name: true,
      position: true,
      overall: true,
      age: true,
      morale: true,
      form: true,
      wage: true,
      injuredUntil: true,
    },
    orderBy: { overall: "desc" },
  });

  const now = new Date();
  const squadSize = players.length;
  const avgOverall = squadSize > 0 ? Math.round(players.reduce((s, p) => s + p.overall, 0) / squadSize) : 0;
  const avgAge = squadSize > 0 ? +(players.reduce((s, p) => s + p.age, 0) / squadSize).toFixed(1) : 0;
  const avgMorale = squadSize > 0 ? Math.round(players.reduce((s, p) => s + p.morale, 0) / squadSize) : 0;
  const injuredCount = players.filter((p) => p.injuredUntil && p.injuredUntil > now).length;
  const weeklyWages = players.reduce((s, p) => s + p.wage, 0);
  const topPlayers = players.slice(0, 3);

  const positionCounts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of players) {
    if (p.position in positionCounts) positionCounts[p.position as keyof typeof positionCounts]++;
  }

  // Transfer activity — pending offers
  const pendingOffers = await db.transferOffer.count({
    where: {
      listing: { sellerClubId: club.id },
      status: "PENDING",
    },
  });

  const sentOffers = await db.transferOffer.count({
    where: {
      buyerClubId: club.id,
      status: "PENDING",
    },
  });

  // Active upgrades
  const activeUpgrades = await db.facilityUpgrade.count({
    where: { clubId: club.id, completesAt: { gt: now } },
  });
  const stadiumUpgrade = await db.stadiumUpgrade.findFirst({
    where: { clubId: club.id, completesAt: { gt: now } },
    select: { toLevel: true, completesAt: true },
  });

  return NextResponse.json({
    club: {
      id: club.id,
      name: club.name,
      budget: club.budget,
      reputation: club.reputation,
      stadiumCapacity: club.stadiumCapacity,
      trainingLevel: club.trainingLevel,
      medicalLevel: club.medicalLevel,
      academyLevel: club.academyLevel,
    },
    division: { name: club.division.name, tier: club.division.tier },
    season: season ? { id: season.id, number: season.number } : null,
    nextFixture,
    lastResult,
    recentFixtures,
    form,
    leaguePosition: position || null,
    leagueStats: myRow
      ? {
          played: myRow.played,
          won: myRow.won,
          drawn: myRow.drawn,
          lost: myRow.lost,
          goalsFor: myRow.goalsFor,
          goalsAgainst: myRow.goalsAgainst,
          points: myRow.points,
        }
      : null,
    totalTeams: tableRows.length,
    miniTable,
    squad: {
      size: squadSize,
      avgOverall,
      avgAge,
      avgMorale,
      injuredCount,
      weeklyWages,
      topPlayers,
      positionCounts,
    },
    transfers: {
      pendingOffers,
      sentOffers,
    },
    facilities: {
      activeUpgrades,
      stadiumUpgrade,
    },
  });
}
