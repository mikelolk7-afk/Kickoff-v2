import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({
    where: { userId: session.user.id },
    include: { division: true },
  });

  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  const season = await db.season.findFirst({
    where: { divisionId: club.divisionId, isActive: true },
  });

  if (!season) {
    return NextResponse.json({ error: "No active season" }, { status: 404 });
  }

  // Next scheduled fixture
  const nextFixture = await db.fixture.findFirst({
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
  });

  // Last completed fixture
  const lastResult = await db.fixture.findFirst({
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
  });

  // League position
  const tableRows = await db.leagueTableRow.findMany({
    where: { seasonId: season.id },
    orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
  });
  const position = tableRows.findIndex((r) => r.clubId === club.id) + 1;
  const myRow = tableRows.find((r) => r.clubId === club.id);

  return NextResponse.json({
    club,
    division: club.division,
    season,
    nextFixture,
    lastResult,
    leaguePosition: position,
    leagueStats: myRow,
    totalTeams: tableRows.length,
  });
}
