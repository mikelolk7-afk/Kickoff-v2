import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  startStadiumUpgrade,
  instantStadiumUpgrade,
  speedUpStadiumUpgrade,
  startFacilityUpgrade,
  getUpgradeCost,
  getInstantBuildCost,
  FACILITIES,
} from "@/server/stadium/upgrades";
import { getStadiumLevel } from "@/lib/stadium-levels";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  const stadiumUpgrade = await db.stadiumUpgrade.findFirst({
    where: { clubId: club.id, stand: "stadium", status: "IN_PROGRESS" },
  });

  const facilityUpgrades = await db.facilityUpgrade.findMany({
    where: { clubId: club.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
  });

  const currentLevel = getStadiumLevel(club.stadiumCapacity);
  const nextLevel = currentLevel.level < 20 ? currentLevel.level + 1 : null;

  return NextResponse.json({
    club: {
      stadiumCapacity: club.stadiumCapacity,
      stadiumLevel: currentLevel.level,
      trainingLevel: club.trainingLevel,
      medicalLevel: club.medicalLevel,
      academyLevel: club.academyLevel,
      analyticsLevel: club.analyticsLevel,
      budget: club.budget,
    },
    stadiumUpgrade: stadiumUpgrade
      ? {
          id: stadiumUpgrade.id,
          toLevel: stadiumUpgrade.toLevel,
          completesAt: stadiumUpgrade.completesAt,
        }
      : null,
    facilityUpgrades: facilityUpgrades.map((u) => ({
      id: u.id,
      facility: u.facility,
      toLevel: u.toLevel,
      completesAt: u.completesAt,
    })),
    upgradeCost: nextLevel ? getUpgradeCost(nextLevel) : null,
    instantBuildCost: nextLevel ? getInstantBuildCost(nextLevel) : null,
    facilities: FACILITIES,
    credits: 0, // Will be overridden below
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

    if (body.action === "upgrade") {
      const upgrade = await startStadiumUpgrade(club.id);
      return NextResponse.json(upgrade);
    }

    if (body.action === "instant") {
      const result = await instantStadiumUpgrade(club.id, session.user.id);
      return NextResponse.json(result);
    }

    if (body.action === "speedup") {
      const result = await speedUpStadiumUpgrade(body.upgradeId, club.id, session.user.id);
      return NextResponse.json(result);
    }

    if (body.action === "facility") {
      const upgrade = await startFacilityUpgrade(club.id, body.facility);
      return NextResponse.json(upgrade);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
