import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateCupDraw } from "@/server/cup/draw";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the active cup with all rounds and fixtures
    const cup = await db.cup.findFirst({
      where: { isActive: true, seasonNum: { gt: 0 } },
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

    return NextResponse.json({ cup });
  } catch (error) {
    console.error("Cup fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cup" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { seasonNum } = await req.json();
    const result = await generateCupDraw(seasonNum);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cup draw error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate cup draw" },
      { status: 500 }
    );
  }
}
