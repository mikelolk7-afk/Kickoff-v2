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

  const table = await db.leagueTableRow.findMany({
    where: { seasonId: season.id },
    include: {
      club: { select: { id: true, name: true, badgeId: true, kitHome: true, isAi: true } },
    },
    orderBy: [{ points: "desc" }, { goalsFor: "desc" }],
  });

  const fixtures = await db.fixture.findMany({
    where: { seasonId: season.id },
    include: {
      homeClub: { select: { id: true, name: true } },
      awayClub: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({
    division: club.division,
    season,
    table,
    fixtures,
    clubId: club.id,
  });
}
