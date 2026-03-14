import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOrCreateProfile } from "@/server/manager/profile";
import { getClubRivalries } from "@/server/manager/rivalry";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") ?? (session.user.id as string);

    const profile = await getOrCreateProfile(userId);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        club: { select: { id: true, name: true, badgeId: true, division: { select: { name: true, tier: true } } } },
      },
    });

    const clubId = (session.user as { clubId?: string }).clubId;
    let rivalries: Awaited<ReturnType<typeof getClubRivalries>> = [];
    if (clubId) {
      rivalries = await getClubRivalries(clubId);
    }

    return NextResponse.json({ profile, user, rivalries });
  } catch (error) {
    console.error("Manager profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
