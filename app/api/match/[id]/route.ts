import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const fixture = await db.fixture.findUnique({
    where: { id: params.id },
    include: {
      homeClub: { select: { id: true, name: true, kitHome: true, kitAway: true, badgeId: true } },
      awayClub: { select: { id: true, name: true, kitHome: true, kitAway: true, badgeId: true } },
      events: { orderBy: { minute: "asc" } },
    },
  });

  if (!fixture) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...fixture,
    playerRatings: fixture.playerRatings ?? null,
    heatMapData: fixture.heatMapData ?? null,
  });
}
