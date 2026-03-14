import { db } from "@/lib/db";

interface Trophy {
  type: "league" | "cup" | "continental";
  season: number;
  clubId: string;
}

interface HistoryEntry {
  clubId: string;
  season: number;
  position: number;
}

interface Badge {
  badgeId: string;
  earnedAt: string;
}

const BADGE_DEFINITIONS: Record<string, { name: string; check: (profile: ManagerStats) => boolean }> = {
  first_win: { name: "First Victory", check: (p) => p.totalWins >= 1 },
  ten_wins: { name: "10 Wins", check: (p) => p.totalWins >= 10 },
  fifty_wins: { name: "50 Wins", check: (p) => p.totalWins >= 50 },
  promoted: { name: "Promoted", check: (p) => p.promotions >= 1 },
  triple_promotion: { name: "Triple Promotion", check: (p) => p.promotions >= 3 },
  league_winner: { name: "League Champion", check: (p) => p.leagueTitles >= 1 },
  cup_winner: { name: "Cup Winner", check: (p) => p.cupWins >= 1 },
  continental_winner: { name: "Continental Champion", check: (p) => p.continentalWins >= 1 },
  level_10: { name: "Veteran Manager", check: (p) => p.level >= 10 },
  level_25: { name: "Elite Manager", check: (p) => p.level >= 25 },
};

interface ManagerStats {
  totalWins: number;
  totalDraws: number;
  totalLosses: number;
  promotions: number;
  leagueTitles: number;
  cupWins: number;
  continentalWins: number;
  level: number;
}

/** XP required for each level (cumulative) */
function xpForLevel(level: number): number {
  return level * level * 100;
}

/**
 * Get or create a manager profile for a user.
 */
export async function getOrCreateProfile(userId: string) {
  let profile = await db.managerProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    profile = await db.managerProfile.create({
      data: { userId },
    });
  }

  return profile;
}

/**
 * Award XP and handle level-ups.
 */
export async function awardXP(userId: string, amount: number) {
  const profile = await getOrCreateProfile(userId);
  const newXP = profile.xp + amount;
  let newLevel = profile.level;

  while (newXP >= xpForLevel(newLevel + 1)) {
    newLevel++;
  }

  await db.managerProfile.update({
    where: { userId },
    data: { xp: newXP, level: newLevel },
  });

  return { newXP, newLevel, leveledUp: newLevel > profile.level };
}

/**
 * Update match stats after a fixture result.
 */
export async function updateMatchStats(
  userId: string,
  result: "win" | "draw" | "loss"
) {
  const profile = await getOrCreateProfile(userId);

  const updates: Record<string, number> = {};
  let xpGain = 0;

  switch (result) {
    case "win":
      updates.totalWins = profile.totalWins + 1;
      xpGain = 30;
      break;
    case "draw":
      updates.totalDraws = profile.totalDraws + 1;
      xpGain = 10;
      break;
    case "loss":
      updates.totalLosses = profile.totalLosses + 1;
      xpGain = 5;
      break;
  }

  await db.managerProfile.update({
    where: { userId },
    data: updates,
  });

  await awardXP(userId, xpGain);
  await checkAndAwardBadges(userId);
}

/**
 * Update reputation based on events.
 */
export async function updateReputation(
  userId: string,
  delta: number
) {
  const profile = await getOrCreateProfile(userId);
  const newRep = Math.max(0, Math.min(100, profile.reputation + delta));

  await db.managerProfile.update({
    where: { userId },
    data: { reputation: newRep },
  });

  return newRep;
}

/**
 * Award a trophy to the manager.
 */
export async function awardTrophy(
  userId: string,
  type: Trophy["type"],
  season: number,
  clubId: string
) {
  const profile = await getOrCreateProfile(userId);
  const trophies = (profile.trophies as unknown as Trophy[]) ?? [];

  trophies.push({ type, season, clubId });

  await db.managerProfile.update({
    where: { userId },
    data: { trophies: JSON.parse(JSON.stringify(trophies)) },
  });

  // Reputation boost for trophies
  const repBoost = type === "continental" ? 15 : type === "cup" ? 10 : 12;
  await updateReputation(userId, repBoost);

  // XP for trophy
  const xpBoost = type === "continental" ? 500 : type === "cup" ? 300 : 400;
  await awardXP(userId, xpBoost);

  await checkAndAwardBadges(userId);
}

/**
 * Add a season history entry.
 */
export async function addSeasonHistory(
  userId: string,
  clubId: string,
  season: number,
  position: number
) {
  const profile = await getOrCreateProfile(userId);
  const history = (profile.history as unknown as HistoryEntry[]) ?? [];

  history.push({ clubId, season, position });

  await db.managerProfile.update({
    where: { userId },
    data: { history: JSON.parse(JSON.stringify(history)) },
  });

  // Reputation changes based on position
  if (position <= 2) {
    await updateReputation(userId, 5); // Promotion zone
  } else if (position <= 5) {
    await updateReputation(userId, 2);
  } else if (position >= 9) {
    await updateReputation(userId, -5); // Relegation zone
  }
}

/**
 * Check and award any earned badges.
 */
async function checkAndAwardBadges(userId: string) {
  const profile = await getOrCreateProfile(userId);
  const existingBadges = (profile.badges as unknown as Badge[]) ?? [];
  const existingIds = new Set(existingBadges.map((b) => b.badgeId));

  const trophies = (profile.trophies as unknown as Trophy[]) ?? [];
  const history = (profile.history as unknown as HistoryEntry[]) ?? [];

  const stats: ManagerStats = {
    totalWins: profile.totalWins,
    totalDraws: profile.totalDraws,
    totalLosses: profile.totalLosses,
    promotions: history.filter((h) => h.position <= 2).length,
    leagueTitles: trophies.filter((t) => t.type === "league").length,
    cupWins: trophies.filter((t) => t.type === "cup").length,
    continentalWins: trophies.filter((t) => t.type === "continental").length,
    level: profile.level,
  };

  const newBadges: Badge[] = [];

  for (const [badgeId, def] of Object.entries(BADGE_DEFINITIONS)) {
    if (!existingIds.has(badgeId) && def.check(stats)) {
      newBadges.push({ badgeId, earnedAt: new Date().toISOString() });
    }
  }

  if (newBadges.length > 0) {
    const allBadges = [...existingBadges, ...newBadges];
    await db.managerProfile.update({
      where: { userId },
      data: { badges: JSON.parse(JSON.stringify(allBadges)) },
    });
  }

  return newBadges;
}

/**
 * Get reputation effects for transfers and sponsors.
 */
export function getReputationEffects(reputation: number) {
  if (reputation >= 81) {
    return { transferMult: 1.15, sponsorBonus: 0.25 };
  } else if (reputation >= 61) {
    return { transferMult: 1.05, sponsorBonus: 0.10 };
  } else if (reputation <= 30) {
    return { transferMult: 0.90, sponsorBonus: -0.10 };
  }
  return { transferMult: 1.0, sponsorBonus: 0.0 };
}
