import { db } from "@/lib/db";
import type { Position } from "@prisma/client";

/**
 * Scout star accuracy table from blueprint:
 * 1★: ±10 noise, 2 players, 5% hidden gem
 * 2★: ±6 noise, 3 players, 10% hidden gem
 * 3★: ±3 noise, 4 players, 18% hidden gem
 * 4★: ±1 noise, 4-5 players, 28% hidden gem
 * 5★: Exact, 5 players, 40% hidden gem
 */
const SCOUT_CONFIG: Record<number, { noise: number; count: number; gemChance: number }> = {
  1: { noise: 10, count: 2, gemChance: 0.05 },
  2: { noise: 6, count: 3, gemChance: 0.10 },
  3: { noise: 3, count: 4, gemChance: 0.18 },
  4: { noise: 1, count: 5, gemChance: 0.28 },
  5: { noise: 0, count: 5, gemChance: 0.40 },
};

const FIRST_NAMES = [
  "Marco", "Thiago", "Kenji", "Omar", "Lars", "Dmitri",
  "Santiago", "Kwame", "Youssef", "Chen", "Andre", "Viktor",
];
const LAST_NAMES = [
  "Rossi", "Fernandez", "Tanaka", "Al-Said", "Bergström", "Petrov",
  "Reyes", "Mensah", "Bouaziz", "Wei", "Sousa", "Horvat",
];
const NATIONALITIES_BY_REGION: Record<string, string[]> = {
  Europe: ["Spain", "France", "Germany", "Italy", "Portugal", "Netherlands", "Belgium", "Croatia"],
  "South America": ["Brazil", "Argentina", "Colombia", "Uruguay", "Chile"],
  Africa: ["Nigeria", "Ghana", "Senegal", "Cameroon", "Egypt", "Morocco"],
  Asia: ["Japan", "South Korea", "Australia", "Iran", "Saudi Arabia"],
  "North America": ["USA", "Mexico", "Canada", "Jamaica"],
  Oceania: ["New Zealand", "Australia"],
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface ScoutedPlayer {
  name: string;
  nationality: string;
  age: number;
  position: Position;
  reportedOverall: number;
  actualOverall: number;
  potential: number;
  isHiddenGem: boolean;
  attributes: {
    pace: number;
    shooting: number;
    passing: number;
    dribbling: number;
    defending: number;
    physicality: number;
    composure: number;
    positioning: number;
  };
  estimatedValue: number;
}

/**
 * Generate a scout report with discovered players.
 */
function generateScoutReport(
  scoutStars: number,
  region: string,
  clubDivisionTier: number
): ScoutedPlayer[] {
  const config = SCOUT_CONFIG[scoutStars] ?? SCOUT_CONFIG[1];
  const count = scoutStars >= 4 ? rand(config.count - 1, config.count) : config.count;

  const players: ScoutedPlayer[] = [];
  const nationalities = NATIONALITIES_BY_REGION[region] ?? ["England"];

  // Player quality scales inversely with division tier (higher division = better finds)
  const baseQuality = Math.max(30, 80 - (clubDivisionTier - 1) * 4);

  for (let i = 0; i < count; i++) {
    const isGem = Math.random() < config.gemChance;
    const age = rand(17, 28);

    const quality = isGem
      ? baseQuality + rand(10, 25) // Hidden gems are significantly better
      : baseQuality + rand(-10, 10);

    const clampedQuality = Math.max(25, Math.min(95, quality));

    const attributes = {
      pace: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      shooting: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      passing: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      dribbling: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      defending: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      physicality: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      composure: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
      positioning: Math.max(1, Math.min(99, clampedQuality + rand(-8, 8))),
    };

    const actualOverall = Math.round(
      Object.values(attributes).reduce((s, v) => s + v, 0) / 8
    );

    // Apply noise to reported overall
    const noise = config.noise > 0 ? rand(-config.noise, config.noise) : 0;
    const reportedOverall = Math.max(1, Math.min(99, actualOverall + noise));

    const potential = Math.min(99, actualOverall + (age <= 23 ? rand(5, 20) : rand(0, 5)));

    players.push({
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      nationality: pick(nationalities),
      age,
      position: pick(["GK", "DEF", "MID", "FWD"] as Position[]),
      reportedOverall,
      actualOverall,
      potential,
      isHiddenGem: isGem,
      attributes,
      estimatedValue: actualOverall * actualOverall * 150,
    });
  }

  return players.sort((a, b) => b.reportedOverall - a.reportedOverall);
}

/**
 * Process completed scout assignments.
 * Called every hour by cron.
 */
export async function processCompletedAssignments() {
  const completed = await db.scoutAssignment.findMany({
    where: {
      status: "IN_PROGRESS",
      completesAt: { lte: new Date() },
    },
    include: {
      scout: true,
      club: { include: { division: true } },
    },
  });

  let processed = 0;

  for (const assignment of completed) {
    const report = generateScoutReport(
      assignment.scout.stars,
      assignment.region,
      assignment.club.division.tier
    );

    await db.$transaction(async (tx) => {
      await tx.scoutAssignment.update({
        where: { id: assignment.id },
        data: { status: "COMPLETED" },
      });

      await tx.scoutReport.create({
        data: {
          assignmentId: assignment.id,
          players: JSON.parse(JSON.stringify(report)),
        },
      });
    });

    processed++;
  }

  return processed;
}

/**
 * Sign a scouted player from a report (creates a new player in the club).
 */
export async function signScoutedPlayer(
  reportId: string,
  playerIndex: number,
  clubId: string,
  offerWage: number
) {
  const report = await db.scoutReport.findUnique({
    where: { id: reportId },
    include: { assignment: true },
  });

  if (!report) throw new Error("Report not found");
  if (report.assignment.clubId !== clubId) throw new Error("Not your report");

  const players = report.players as unknown as ScoutedPlayer[];
  const scoutedPlayer = players[playerIndex];
  if (!scoutedPlayer) throw new Error("Player not found in report");

  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + 3);

  // Create the player in the club
  const newPlayer = await db.player.create({
    data: {
      clubId,
      name: scoutedPlayer.name,
      nationality: scoutedPlayer.nationality,
      age: scoutedPlayer.age,
      position: scoutedPlayer.position,
      pace: scoutedPlayer.attributes.pace,
      shooting: scoutedPlayer.attributes.shooting,
      passing: scoutedPlayer.attributes.passing,
      dribbling: scoutedPlayer.attributes.dribbling,
      defending: scoutedPlayer.attributes.defending,
      physicality: scoutedPlayer.attributes.physicality,
      composure: scoutedPlayer.attributes.composure,
      positioning: scoutedPlayer.attributes.positioning,
      overall: scoutedPlayer.actualOverall,
      potential: scoutedPlayer.potential,
      wage: offerWage,
      contractEnd,
    },
  });

  // Deduct signing fee from budget (estimated value)
  await db.club.update({
    where: { id: clubId },
    data: { budget: { decrement: scoutedPlayer.estimatedValue } },
  });

  return newPlayer;
}
