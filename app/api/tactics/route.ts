import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const tacticsSchema = z.object({
  formation: z.string(),
  mentality: z.number().min(1).max(5),
  pressingLevel: z.number().min(1).max(5),
  positions: z.any().optional(),
  setPieces: z.any().optional(),
});

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

  const tactic = await db.tactic.findFirst({
    where: { clubId: club.id, isActive: true },
  });

  return NextResponse.json(tactic);
}

export async function PUT(req: Request) {
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

  const body = await req.json();
  const data = tacticsSchema.parse(body);

  const tactic = await db.tactic.findFirst({
    where: { clubId: club.id, isActive: true },
  });

  if (tactic) {
    const updated = await db.tactic.update({
      where: { id: tactic.id },
      data: {
        formation: data.formation,
        mentality: data.mentality,
        pressingLevel: data.pressingLevel,
        positions: data.positions ?? {},
        setPieces: data.setPieces ?? {},
      },
    });
    return NextResponse.json(updated);
  }

  const created = await db.tactic.create({
    data: {
      clubId: club.id,
      name: "Default",
      formation: data.formation,
      mentality: data.mentality,
      pressingLevel: data.pressingLevel,
      positions: data.positions ?? {},
      setPieces: data.setPieces ?? {},
      isActive: true,
    },
  });

  return NextResponse.json(created);
}
