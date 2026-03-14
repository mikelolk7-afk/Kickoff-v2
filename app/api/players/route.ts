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
  });

  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  const players = await db.player.findMany({
    where: { clubId: club.id },
    orderBy: [{ position: "asc" }, { overall: "desc" }],
  });

  return NextResponse.json(players);
}
