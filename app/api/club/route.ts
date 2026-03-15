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

  let club = await db.club.findFirst({
    where: { userId },
    include: {
      division: true,
      players: { orderBy: { position: "asc" } },
      tactics: { where: { isActive: true }, take: 1 },
    },
  });

  if (!club && clubId) {
    club = await db.club.findFirst({
      where: { id: clubId },
      include: {
        division: true,
        players: { orderBy: { position: "asc" } },
        tactics: { where: { isActive: true }, take: 1 },
      },
    });
    if (club && !club.userId) {
      await db.club.update({ where: { id: club.id }, data: { userId } });
    }
  }

  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  return NextResponse.json(club);
}
