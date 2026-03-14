import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  startStadiumUpgrade,
  startFacilityUpgrade,
  speedUpStadiumUpgrade,
  STANDS,
  FACILITIES,
} from "@/server/stadium/upgrades";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  const stadiumUpgrades = await db.stadiumUpgrade.findMany({
    where: { clubId: club.id },
    orderBy: { startedAt: "desc" },
  });

  const facilityUpgrades = await db.facilityUpgrade.findMany({
    where: { clubId: club.id },
    orderBy: { startedAt: "desc" },
  });

  // Calculate current levels per stand
  const standLevels: Record<string, number> = {};
  for (const stand of Object.keys(STANDS)) {
    standLevels[stand] = stadiumUpgrades.filter(
      (u) => u.stand === stand && u.status === "COMPLETED"
    ).length;
  }

  return NextResponse.json({
    club: {
      stadiumCapacity: club.stadiumCapacity,
      trainingLevel: club.trainingLevel,
      medicalLevel: club.medicalLevel,
      academyLevel: club.academyLevel,
      analyticsLevel: club.analyticsLevel,
      budget: club.budget,
    },
    standLevels,
    stadiumUpgrades: stadiumUpgrades.filter((u) => u.status === "IN_PROGRESS"),
    facilityUpgrades: facilityUpgrades.filter((u) => u.status === "IN_PROGRESS"),
    stands: STANDS,
    facilities: FACILITIES,
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

    if (body.action === "speedup") {
      const result = await speedUpStadiumUpgrade(body.upgradeId, club.id, session.user.id);
      return NextResponse.json(result);
    }

    if (body.type === "facility") {
      const upgrade = await startFacilityUpgrade(club.id, body.facility);
      return NextResponse.json(upgrade);
    }

    const upgrade = await startStadiumUpgrade(club.id, body.stand);
    return NextResponse.json(upgrade);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
