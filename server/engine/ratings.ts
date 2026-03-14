import { MENTALITY_MULTIPLIERS, type PlayerAttributes, type TeamRatings, type TacticsMultipliers } from "@/types/game";

/**
 * Calculate weighted average of an attribute across a list of players.
 */
function weightedAvg(
  players: PlayerAttributes[],
  weights: Record<string, number>
): number {
  if (players.length === 0) return 0;

  const total = players.reduce((sum, p) => {
    let val = 0;
    for (const [attr, weight] of Object.entries(weights)) {
      val += (p[attr as keyof PlayerAttributes] as number) * weight;
    }
    return sum + val;
  }, 0);

  return total / players.length;
}

/**
 * Calculate morale multiplier (0.85 to 1.15).
 * Average morale of 70 = 1.0 (neutral).
 */
export function moraleMult(players: PlayerAttributes[]): number {
  if (players.length === 0) return 1;
  const avgMorale = players.reduce((s, p) => s + p.morale, 0) / players.length;
  return 0.85 + (avgMorale / 70) * 0.15;
}

/**
 * Calculate form multiplier (0.90 to 1.10).
 * Average form of 70 = 1.0 (neutral).
 */
export function formMult(players: PlayerAttributes[]): number {
  if (players.length === 0) return 1;
  const avgForm = players.reduce((s, p) => s + p.form, 0) / players.length;
  return 0.90 + (avgForm / 70) * 0.10;
}

/**
 * Get tactics multipliers from mentality (1-5).
 */
export function getTacticsMultipliers(mentality: number): TacticsMultipliers {
  return MENTALITY_MULTIPLIERS[mentality] ?? MENTALITY_MULTIPLIERS[3];
}

/**
 * Calculate attack rating for a team.
 * Uses FWD weighted stats + MID contribution * 0.5.
 */
export function calcAttackRating(
  forwards: PlayerAttributes[],
  midfielders: PlayerAttributes[],
  tacticsMultiplier: number,
  moraleFactor: number,
  formFactor: number
): number {
  const fwdRating = weightedAvg(forwards, {
    shooting: 0.35,
    pace: 0.20,
    dribbling: 0.20,
    positioning: 0.15,
    composure: 0.10,
  });

  const midContrib = weightedAvg(midfielders, {
    passing: 0.40,
    dribbling: 0.30,
    shooting: 0.30,
  });

  return (fwdRating + midContrib * 0.5) * tacticsMultiplier * moraleFactor * formFactor;
}

/**
 * Calculate defence rating for a team.
 * Uses DEF weighted stats + GK contribution.
 */
export function calcDefenceRating(
  defenders: PlayerAttributes[],
  goalkeeper: PlayerAttributes | null,
  tacticsMultiplier: number,
  moraleFactor: number
): number {
  const defRating = weightedAvg(defenders, {
    defending: 0.40,
    physicality: 0.25,
    positioning: 0.25,
    composure: 0.10,
  });

  const gkContrib = goalkeeper ? goalkeeper.overall * 0.30 : 30;

  return (defRating + gkContrib) * tacticsMultiplier * moraleFactor;
}

/**
 * Calculate full team ratings from a squad + active tactic.
 */
export function calcTeamRatings(
  players: PlayerAttributes[],
  mentality: number
): TeamRatings {
  const gk = players.find((p) => p.position === "GK") ?? null;
  const defs = players.filter((p) => p.position === "DEF");
  const mids = players.filter((p) => p.position === "MID");
  const fwds = players.filter((p) => p.position === "FWD");

  const tactics = getTacticsMultipliers(mentality);
  const mMult = moraleMult(players);
  const fMult = formMult(players);

  const attack = calcAttackRating(fwds, mids, tactics.attack, mMult, fMult);
  const defence = calcDefenceRating(defs, gk, tactics.defence, mMult);
  const midfield = weightedAvg(mids, {
    passing: 0.35,
    dribbling: 0.25,
    composure: 0.20,
    positioning: 0.20,
  });
  const overall = (attack + defence + midfield) / 3;

  return { attack, defence, midfield, overall };
}
