import { MENTALITY_MULTIPLIERS, FORMATIONS, type PlayerAttributes, type TeamRatings, type TacticsMultipliers } from "@/types/game";

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
 * Formation multiplier: how well the squad fits the chosen formation.
 * Having the right number of players per position gives a bonus.
 */
export function getFormationMultiplier(
  players: PlayerAttributes[],
  formation: string
): { attackMult: number; defenceMult: number; midfieldMult: number } {
  const f = FORMATIONS[formation] ?? FORMATIONS["4-4-2"];
  const defs = players.filter((p) => p.position === "DEF").length;
  const mids = players.filter((p) => p.position === "MID").length;
  const fwds = players.filter((p) => p.position === "FWD").length;

  // Bonus/penalty based on how many players match formation slots
  // More forwards than formation = attack boost, defence penalty
  const fwdDiff = fwds - f.fwd;
  const defDiff = defs - f.def;
  const midDiff = mids - f.mid;

  return {
    attackMult: 1.0 + fwdDiff * 0.03 + Math.max(0, midDiff) * 0.01,
    defenceMult: 1.0 + defDiff * 0.03 + Math.max(0, midDiff) * 0.01,
    midfieldMult: 1.0 + midDiff * 0.02,
  };
}

/**
 * Calculate attack rating for a team.
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
 * Calculate full team ratings from a squad + active tactic + formation.
 */
export function calcTeamRatings(
  players: PlayerAttributes[],
  mentality: number,
  formation?: string
): TeamRatings {
  const gk = players.find((p) => p.position === "GK") ?? null;
  const defs = players.filter((p) => p.position === "DEF");
  const mids = players.filter((p) => p.position === "MID");
  const fwds = players.filter((p) => p.position === "FWD");

  const tactics = getTacticsMultipliers(mentality);
  const mMult = moraleMult(players);
  const fMult = formMult(players);

  const formMults = formation
    ? getFormationMultiplier(players, formation)
    : { attackMult: 1.0, defenceMult: 1.0, midfieldMult: 1.0 };

  const attack = calcAttackRating(fwds, mids, tactics.attack, mMult, fMult) * formMults.attackMult;
  const defence = calcDefenceRating(defs, gk, tactics.defence, mMult) * formMults.defenceMult;
  const midfield = weightedAvg(mids, {
    passing: 0.35,
    dribbling: 0.25,
    composure: 0.20,
    positioning: 0.20,
  }) * formMults.midfieldMult;
  const overall = (attack + defence + midfield) / 3;

  return { attack, defence, midfield, overall };
}
