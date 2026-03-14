import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Continental cups have negative seasonNum
    const cup = await db.cup.findFirst({
      where: { isActive: true, seasonNum: { lt: 0 } },
      include: {
        rounds: {
          include: {
            fixtures: {
              include: {
                homeClub: { select: { id: true, name: true, badgeId: true } },
                awayClub: { select: { id: true, name: true, badgeId: true } },
              },
            },
          },
          orderBy: { roundNum: "asc" },
        },
      },
    });

    if (!cup) {
      return NextResponse.json({ cup: null });
    }

    // Separate group stage and knockout
    const groupStage = cup.rounds.filter((r) => r.roundNum <= 4);
    const knockout = cup.rounds.filter((r) => r.roundNum > 4);

    return NextResponse.json({ cup, groupStage, knockout });
  } catch (error) {
    console.error("Continental fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch continental cup" },
      { status: 500 }
    );
  }
}
