import { db } from "@/lib/db";
import { STADIUM_LEVELS, getStadiumLevel } from "@/lib/stadium-levels";

/**
 * Simplified stadium upgrade system.
 *
 * - 20 stadium levels, each with a fixed capacity.
 * - Upgrade to next level: flat 24-hour build time.
 * - Instant build available for credits (scales with level).
 * - Facilities remain unchanged.
 */

interface FacilityConfig {
  hoursPerLevel: number;
  baseCost: number;
  maxLevel: number;
  clubField: string;
}

const FACILITIES: Record<string, FacilityConfig> = {
  training: { hoursPerLevel: 36, baseCost: 150000, maxLevel: 5, clubField: "trainingLevel" },
  medical: { hoursPerLevel: 24, baseCost: 120000, maxLevel: 5, clubField: "medicalLevel" },
  academy: { hoursPerLevel: 48, baseCost: 200000, maxLevel: 5, clubField: "academyLevel" },
  analytics: { hoursPerLevel: 72, baseCost: 300000, maxLevel: 3, clubField: "analyticsLevel" },
};

const BUILD_HOURS = 24;

/**
 * Cost to upgrade from current level to next level (coins/budget).
 * Scales exponentially: 50k * nextLevel^1.4
 */
export function getUpgradeCost(nextLevel: number): number {
  return Math.round(50000 * Math.pow(nextLevel, 1.4));
}

/**
 * Credit cost for instant build. Scales with target level.
 */
export function getInstantBuildCost(nextLevel: number): number {
  return 5 + nextLevel * 5; // Level 2 = 15, Level 10 = 55, Level 20 = 105
}

/**
 * Start a stadium level upgrade (24h build time).
 */
export async function startStadiumUpgrade(clubId: string) {
  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club not found");

  // Check for in-progress stadium upgrade
  const inProgress = await db.stadiumUpgrade.findFirst({
    where: { clubId, stand: "stadium", status: "IN_PROGRESS" },
  });
  if (inProgress) throw new Error("Stadium upgrade already in progress");

  const current = getStadiumLevel(club.stadiumCapacity);
  if (current.level >= 20) throw new Error("Stadium already at max level");

  const nextLevel = current.level + 1;
  const cost = getUpgradeCost(nextLevel);
  if (club.budget < cost) throw new Error("Insufficient budget");

  const completesAt = new Date();
  completesAt.setHours(completesAt.getHours() + BUILD_HOURS);

  const [upgrade] = await db.$transaction([
    db.stadiumUpgrade.create({
      data: {
        clubId,
        stand: "stadium",
        fromLevel: current.level,
        toLevel: nextLevel,
        cost,
        completesAt,
      },
    }),
    db.club.update({
      where: { id: clubId },
      data: { budget: { decrement: cost } },
    }),
  ]);

  return upgrade;
}

/**
 * Instant-build a stadium upgrade using credits.
 * Pays the coin cost AND the credit cost, but skips the wait.
 */
export async function instantStadiumUpgrade(
  clubId: string,
  userId: string
) {
  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club not found");

  // Check for in-progress stadium upgrade
  const inProgress = await db.stadiumUpgrade.findFirst({
    where: { clubId, stand: "stadium", status: "IN_PROGRESS" },
  });
  if (inProgress) throw new Error("Stadium upgrade already in progress");

  const current = getStadiumLevel(club.stadiumCapacity);
  if (current.level >= 20) throw new Error("Stadium already at max level");

  const nextLevel = current.level + 1;
  const nextLevelData = STADIUM_LEVELS[nextLevel - 1];
  const coinCost = getUpgradeCost(nextLevel);
  const creditCost = getInstantBuildCost(nextLevel);

  if (club.budget < coinCost) throw new Error("Insufficient budget");

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < creditCost) throw new Error("Insufficient credits");

  // Instant: create upgrade already COMPLETED, apply capacity immediately
  const [upgrade] = await db.$transaction([
    db.stadiumUpgrade.create({
      data: {
        clubId,
        stand: "stadium",
        fromLevel: current.level,
        toLevel: nextLevel,
        cost: coinCost,
        completesAt: new Date(), // already done
        status: "COMPLETED",
      },
    }),
    db.club.update({
      where: { id: clubId },
      data: {
        budget: { decrement: coinCost },
        stadiumCapacity: nextLevelData.capacity,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditCost } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "INSTANT_BUILD",
        credits: -creditCost,
        description: `Instant stadium upgrade to Level ${nextLevel}`,
      },
    }),
  ]);

  return { upgrade, creditCost };
}

/**
 * Speed up an in-progress stadium upgrade (completes it instantly).
 */
export async function speedUpStadiumUpgrade(
  upgradeId: string,
  clubId: string,
  userId: string
) {
  const upgrade = await db.stadiumUpgrade.findUnique({
    where: { id: upgradeId },
  });

  if (!upgrade) throw new Error("Upgrade not found");
  if (upgrade.clubId !== clubId) throw new Error("Not your upgrade");
  if (upgrade.status !== "IN_PROGRESS") throw new Error("Upgrade not in progress");

  const hoursLeft = Math.ceil(
    (upgrade.completesAt.getTime() - Date.now()) / (1000 * 60 * 60)
  );
  const creditCost = Math.max(1, hoursLeft * 10);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < creditCost) throw new Error("Insufficient credits");

  const nextLevelData = STADIUM_LEVELS[upgrade.toLevel - 1];

  await db.$transaction([
    db.stadiumUpgrade.update({
      where: { id: upgradeId },
      data: { completesAt: new Date(), status: "COMPLETED" },
    }),
    db.club.update({
      where: { id: clubId },
      data: { stadiumCapacity: nextLevelData.capacity },
    }),
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: creditCost } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "SPEED_UP",
        credits: -creditCost,
        description: `Speed up stadium upgrade to Level ${upgrade.toLevel}`,
      },
    }),
  ]);

  return { creditCost };
}

/**
 * Start a facility upgrade.
 */
export async function startFacilityUpgrade(clubId: string, facility: string) {
  const config = FACILITIES[facility];
  if (!config) throw new Error("Invalid facility");

  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club not found");

  const inProgress = await db.facilityUpgrade.findFirst({
    where: { clubId, facility, status: "IN_PROGRESS" },
  });
  if (inProgress) throw new Error("Upgrade already in progress for this facility");

  const currentLevel = (club as Record<string, unknown>)[config.clubField] as number;
  if (currentLevel >= config.maxLevel) throw new Error("Facility already at max level");

  const cost = config.baseCost * (currentLevel + 1);
  if (club.budget < cost) throw new Error("Insufficient budget");

  const completesAt = new Date();
  completesAt.setHours(completesAt.getHours() + config.hoursPerLevel);

  const [upgrade] = await db.$transaction([
    db.facilityUpgrade.create({
      data: {
        clubId,
        facility,
        fromLevel: currentLevel,
        toLevel: currentLevel + 1,
        cost,
        completesAt,
      },
    }),
    db.club.update({
      where: { id: clubId },
      data: { budget: { decrement: cost } },
    }),
  ]);

  return upgrade;
}

/**
 * Process completed upgrades — called every hour by cron.
 */
export async function processCompletedUpgrades() {
  let completed = 0;

  // Stadium upgrades
  const stadiumDone = await db.stadiumUpgrade.findMany({
    where: { status: "IN_PROGRESS", completesAt: { lte: new Date() } },
  });

  for (const upgrade of stadiumDone) {
    const nextLevelData = STADIUM_LEVELS[upgrade.toLevel - 1];
    if (!nextLevelData) continue;

    await db.$transaction([
      db.stadiumUpgrade.update({
        where: { id: upgrade.id },
        data: { status: "COMPLETED" },
      }),
      db.club.update({
        where: { id: upgrade.clubId },
        data: { stadiumCapacity: nextLevelData.capacity },
      }),
    ]);
    completed++;
  }

  // Facility upgrades
  const facilityDone = await db.facilityUpgrade.findMany({
    where: { status: "IN_PROGRESS", completesAt: { lte: new Date() } },
  });

  for (const upgrade of facilityDone) {
    const config = FACILITIES[upgrade.facility];
    if (!config) continue;

    await db.$transaction([
      db.facilityUpgrade.update({
        where: { id: upgrade.id },
        data: { status: "COMPLETED" },
      }),
      db.club.update({
        where: { id: upgrade.clubId },
        data: {
          [config.clubField]: upgrade.toLevel,
        },
      }),
    ]);
    completed++;
  }

  return completed;
}

export { FACILITIES };
