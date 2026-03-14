import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setIndividualTraining, TRAINING_FOCUSES } from "@/server/training/individual";

export async function GET() {
  return NextResponse.json({
    focuses: Object.entries(TRAINING_FOCUSES).map(([key, attrs]) => ({
      id: key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
      attributes: attrs,
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  try {
    const body = await req.json();
    const result = await setIndividualTraining({
      playerId: body.playerId,
      clubId: club.id,
      focus: body.focus,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
