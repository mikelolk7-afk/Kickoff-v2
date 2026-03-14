import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { signScoutedPlayer } from "@/server/scouting/reports";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  try {
    const body = await req.json();
    const player = await signScoutedPlayer(
      body.reportId,
      body.playerIndex,
      club.id,
      body.offerWage
    );
    return NextResponse.json(player);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
