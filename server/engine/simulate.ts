import { calcTeamRatings } from "./ratings";
import { generateMatchEvents } from "./events";
import type { PlayerAttributes, MatchResult } from "@/types/game";

interface SimulateMatchInput {
  homePlayers: PlayerAttributes[];
  awayPlayers: PlayerAttributes[];
  homeMentality: number;
  awayMentality: number;
  homeFormation?: string;
  awayFormation?: string;
  homeSubs?: PlayerAttributes[];
  awaySubs?: PlayerAttributes[];
  fixtureId: string;
  /** If true, allows extra time + penalties when drawn (cup/continental). */
  isCupMatch?: boolean;
}

/**
 * Simulate a single match. Pure function — no DB, no side effects.
 * Returns a complete MatchResult with all events for replay.
 */
export function simulateMatch(input: SimulateMatchInput): MatchResult {
  const {
    homePlayers,
    awayPlayers,
    homeMentality,
    awayMentality,
    homeFormation,
    awayFormation,
    homeSubs = [],
    awaySubs = [],
    fixtureId,
    isCupMatch = false,
  } = input;

  // Calculate team ratings with formation effects
  const homeRatings = calcTeamRatings(homePlayers, homeMentality, homeFormation);
  const awayRatings = calcTeamRatings(awayPlayers, awayMentality, awayFormation);

  // Generate a seed from fixtureId for deterministic results
  let seed = 0;
  for (let i = 0; i < fixtureId.length; i++) {
    seed = ((seed << 5) - seed + fixtureId.charCodeAt(i)) | 0;
  }

  function toPlayerInfo(p: PlayerAttributes) {
    return {
      id: p.id,
      name: p.name,
      position: p.position,
      overall: p.overall,
      shooting: p.shooting,
      composure: p.composure,
    };
  }

  return generateMatchEvents({
    homeRatings,
    awayRatings,
    homePlayers: homePlayers.map(toPlayerInfo),
    awayPlayers: awayPlayers.map(toPlayerInfo),
    homeSubs: homeSubs.map(toPlayerInfo),
    awaySubs: awaySubs.map(toPlayerInfo),
    seed: Math.abs(seed),
    isCupMatch,
    homeFormation,
    awayFormation,
  });
}

/**
 * Calculate post-match morale changes.
 * Winners get +5, losers get -5, draws +1.
 */
export function calcMoraleChanges(
  homeScore: number,
  awayScore: number
): { homeDelta: number; awayDelta: number } {
  if (homeScore > awayScore) {
    return { homeDelta: 5, awayDelta: -5 };
  } else if (awayScore > homeScore) {
    return { homeDelta: -5, awayDelta: 5 };
  }
  return { homeDelta: 1, awayDelta: 1 };
}

/**
 * Calculate post-match form changes based on result.
 * Winning streaks boost form, losing streaks reduce it.
 */
export function calcFormChange(
  currentForm: number,
  won: boolean,
  drawn: boolean
): number {
  let delta = 0;
  if (won) delta = 3;
  else if (drawn) delta = 0;
  else delta = -3;

  return Math.max(30, Math.min(99, currentForm + delta));
}

/**
 * Check for post-match injury.
 * ~5% chance per player per match, higher if physicality is low.
 */
export function checkInjury(
  physicality: number,
  seed: number
): { injured: boolean; daysOut: number } {
  const rng = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const injuryChance = 0.05 - physicality * 0.0003;
  if (rng < injuryChance) {
    const severity = ((seed * 7 + 13) >>> 0) % 21 + 3; // 3-23 days
    return { injured: true, daysOut: severity };
  }
  return { injured: false, daysOut: 0 };
}
