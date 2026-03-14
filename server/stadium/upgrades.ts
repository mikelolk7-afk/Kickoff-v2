import { db } from "@/lib/db";

/**
 * Stadium & facility upgrade definitions from blueprint:
 *
 * Upgrade        | Levels | Effect                        | Time/Level
 * Main Stand     | 5      | +1,000 capacity/level         | 24h
 * North Stand    | 5      | +800 capacity/level           | 18h
 * East Stand     | 5      | +800 capacity/level           | 18h
 * West Stand     | 5      | +600 capacity/level           | 12h
 * Training Ground| 5      | +5% development speed/level   | 36h
 * Medical Centre | 5      | -15% injury duration/level    | 24h
 * Youth Academy  | 5      | Better youth intake quality   | 48h
 * Analytics Centre| 3     | +1 star to all staff          | 72h
 */

interface StandConfig {
  capacityPerLevel: number;
  hoursPerLevel: number;
  baseCost: number;
}

interface FacilityConfig {
  hoursPerLevel: number;
  baseCost: number;
  maxLevel: number;
  clubField: string;
}

const STANDS: Record<string, StandConfig> = {
  main: { capacityPerLevel: 1000, hoursPerLevel: 24, baseCost: 100000 },
  north: { capacityPerLevel: 800, hoursPerLevel: 18, baseCost: 80000 },
  east: { capacityPerLevel: 800, hoursPerLevel: 18, baseCost: 80000 },
  west: { capacityPerLevel: 600, hoursPerLevel: 12, baseCost: 60000 },
};

const FACILITIES: Record<string, FacilityConfig> = {
  training: { hoursPerLevel: 36, baseCost: 150000, maxLevel: 5, clubField: "trainingLevel" },
  medical: { hoursPerLevel: 24, baseCost: 120000, maxLevel: 5, clubField: "medicalLevel" },
  academy: { hoursPerLevel: 48, baseCost: 200000, maxLevel: 5, clubField: "academyLevel" },
  analytics: { hoursPerLevel: 72, baseCost: 300000, maxLevel: 3, clubField: "analyticsLevel" },
};

/**
 * Start a stadium stand upgrade.
 */
export async function startStadiumUpgrade(clubId: string, stand: string) {
  const config = STANDS[stand];
  if (!config) throw new Error("Invalid stand");

  const club = await db.club.findUnique({ where: { id: clubId } });
  if (!club) throw new Error("Club not found");

  // Check for in-progress upgrades on this stand
  const inProgress = await db.stadiumUpgrade.findFirst({
    where: { clubId, stand, status: "IN_PROGRESS" },
  });
  if (inProgress) throw new Error("Upgrade already in progress for this stand");

  // Determine current level from past upgrades
  const completedUpgrades = await db.stadiumUpgrade.count({
    where: { clubId, stand, status: "COMPLETED" },
  });
  const currentLevel = completedUpgrades;
  if (currentLevel >= 5) throw new Error("Stand already at max level");

  const cost = config.baseCost * (currentLevel + 1);
  if (club.budget < cost) throw new Error("Insufficient budget");

  const completesAt = new Date();
  completesAt.setHours(completesAt.getHours() + config.hoursPerLevel);

  const [upgrade] = await db.$transaction([
    db.stadiumUpgrade.create({
      data: {
        clubId,
        stand,
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
    const config = STANDS[upgrade.stand];
    if (!config) continue;

    await db.$transaction([
      db.stadiumUpgrade.update({
        where: { id: upgrade.id },
        data: { status: "COMPLETED" },
      }),
      db.club.update({
        where: { id: upgrade.clubId },
        data: {
          stadiumCapacity: { increment: config.capacityPerLevel },
        },
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

/**
 * Speed up an upgrade with credits.
 * Costs 10 credits per hour remaining.
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

  await db.$transaction([
    db.stadiumUpgrade.update({
      where: { id: upgradeId },
      data: { completesAt: new Date() }, // Complete immediately
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
        description: `Speed up ${upgrade.stand} stand upgrade`,
      },
    }),
  ]);

  return { creditCost };
}

export { STANDS, FACILITIES };
