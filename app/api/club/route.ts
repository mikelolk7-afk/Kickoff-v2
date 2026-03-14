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
    include: {
      division: true,
      players: { orderBy: { position: "asc" } },
      tactics: { where: { isActive: true }, take: 1 },
    },
  });

  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  return NextResponse.json(club);
}
