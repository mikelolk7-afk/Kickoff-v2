import type { Position, EventType, FixtureStatus } from "@prisma/client";

export type { Position, EventType, FixtureStatus };

export interface TeamRatings {
  attack: number;
  defence: number;
  midfield: number;
  overall: number;
}

export interface MatchResult {
  homeScore: number;
  awayScore: number;
  homePossession: number;
  awayPossession: number;
  homeShots: number;
  awayShots: number;
  homeShotsOnTarget: number;
  awayShotsOnTarget: number;
  homeFouls: number;
  awayFouls: number;
  homeCorners: number;
  awayCorners: number;
  homeYellows: number;
  awayYellows: number;
  homeReds: number;
  awayReds: number;
  events: MatchEventData[];
  playerRatings: Record<string, PlayerMatchRating>;
  heatMap: Record<string, Array<{ minute: number; x: number; y: number }>>;
  extraTime: boolean;
  penalties: boolean;
  homePenScore?: number;
  awayPenScore?: number;
}

export interface MatchEventData {
  minute: number;
  type: EventType;
  team: "home" | "away";
  playerId?: string;
  playerName?: string;
  assistId?: string;
  assistName?: string;
  detail?: string;
  xPos?: number;
  yPos?: number;
}

export interface PlayerMatchRating {
  playerId: string;
  playerName: string;
  team: "home" | "away";
  position: string;
  rating: number; // 1.0 - 10.0
  goals: number;
  assists: number;
  shotsOnTarget: number;
  shotsOff: number;
  tackles: number;
  fouls: number;
  saves: number;
  minutesPlayed: number;
  substitutedOff?: number; // minute subbed off
  substitutedOn?: number;  // minute subbed on
}

export interface TacticsMultipliers {
  attack: number;
  defence: number;
}

export const MENTALITY_MULTIPLIERS: Record<number, TacticsMultipliers> = {
  1: { attack: 0.80, defence: 1.20 },
  2: { attack: 0.90, defence: 1.10 },
  3: { attack: 1.00, defence: 1.00 },
  4: { attack: 1.10, defence: 0.92 },
  5: { attack: 1.22, defence: 0.80 },
};

/**
 * Formation definitions: number of DEF, MID, FWD.
 * Affects team ratings via position count bonuses.
 */
export const FORMATIONS: Record<string, { def: number; mid: number; fwd: number }> = {
  "4-4-2": { def: 4, mid: 4, fwd: 2 },
  "4-3-3": { def: 4, mid: 3, fwd: 3 },
  "3-5-2": { def: 3, mid: 5, fwd: 2 },
  "4-5-1": { def: 4, mid: 5, fwd: 1 },
  "3-4-3": { def: 3, mid: 4, fwd: 3 },
  "5-3-2": { def: 5, mid: 3, fwd: 2 },
  "5-4-1": { def: 5, mid: 4, fwd: 1 },
  "4-2-3-1": { def: 4, mid: 5, fwd: 1 },
  "4-1-4-1": { def: 4, mid: 5, fwd: 1 },
};

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
  composure: number;
  positioning: number;
  overall: number;
  morale: number;
  form: number;
  position: Position;
  id: string;
  name: string;
}

export const DIVISION_NAMES: Record<number, string> = {
  1: "Premier League",
  2: "Championship",
  3: "League One",
  4: "League Two",
  5: "National League",
  6: "National League North",
  7: "Northern Premier",
  8: "Northern One",
  9: "County League",
  10: "Sunday League",
};
