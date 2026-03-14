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
  events: MatchEventData[];
}

export interface MatchEventData {
  minute: number;
  type: EventType;
  team: "home" | "away";
  playerId?: string;
  playerName?: string;
  detail?: string;
  xPos?: number;
  yPos?: number;
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
