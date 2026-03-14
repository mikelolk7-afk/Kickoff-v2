/**
 * Stadium visual levels 1-20.
 * Each level has a name, capacity, description, and visual properties
 * used by the StadiumCanvas component.
 */

export interface StadiumLevel {
  level: number;
  name: string;
  capacity: number;
  description: string;
  /** Number of stand tiers visible (1-4) */
  tiers: number;
  /** Roof coverage: 0=none, 1=partial, 2=full, 3=retractable */
  roof: number;
  /** Pitch quality color */
  pitchColor: string;
  /** Number of floodlight towers (0-4) */
  floodlights: number;
  /** Has scoreboard */
  scoreboard: boolean;
  /** Has VIP section */
  vip: boolean;
  /** Has corner screens */
  screens: boolean;
  /** Stand fill percentage for crowd */
  crowdFill: number;
  /** Primary stand color */
  standColor: string;
  /** Accent seat color */
  seatColor: string;
}

export const STADIUM_LEVELS: StadiumLevel[] = [
  {
    level: 1, name: "Village Pitch", capacity: 1000,
    description: "A roped-off field with a few wooden benches",
    tiers: 1, roof: 0, pitchColor: "#3a8a2a", floodlights: 0,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.3,
    standColor: "#8a7a6a", seatColor: "#a09080",
  },
  {
    level: 2, name: "Parish Ground", capacity: 2500,
    description: "Basic metal stands on one side",
    tiers: 1, roof: 0, pitchColor: "#3a8a2a", floodlights: 0,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.4,
    standColor: "#787878", seatColor: "#909090",
  },
  {
    level: 3, name: "Community Stadium", capacity: 5000,
    description: "Covered main stand with terracing",
    tiers: 1, roof: 1, pitchColor: "#3a9a2a", floodlights: 2,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.5,
    standColor: "#5a7a5a", seatColor: "#78aa78",
  },
  {
    level: 4, name: "Town Arena", capacity: 8000,
    description: "Stands on three sides with basic floodlights",
    tiers: 1, roof: 1, pitchColor: "#3a9a2a", floodlights: 4,
    scoreboard: true, vip: false, screens: false, crowdFill: 0.55,
    standColor: "#4a6a8a", seatColor: "#6a9aca",
  },
  {
    level: 5, name: "Borough Park", capacity: 12000,
    description: "Enclosed ground with seats all around",
    tiers: 1, roof: 1, pitchColor: "#30a020", floodlights: 4,
    scoreboard: true, vip: false, screens: false, crowdFill: 0.6,
    standColor: "#4a6a8a", seatColor: "#5a8aba",
  },
  {
    level: 6, name: "City Ground", capacity: 16000,
    description: "Proper all-seater stadium with partial roof",
    tiers: 1, roof: 1, pitchColor: "#30a020", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.65,
    standColor: "#3a5a7a", seatColor: "#4a7aaa",
  },
  {
    level: 7, name: "Regional Arena", capacity: 20000,
    description: "Two-tier main stand with modern facilities",
    tiers: 2, roof: 1, pitchColor: "#28b018", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.7,
    standColor: "#3a5a7a", seatColor: "#4a7aaa",
  },
  {
    level: 8, name: "Metropolitan Stadium", capacity: 25000,
    description: "Full two-tier bowl with covered seating",
    tiers: 2, roof: 2, pitchColor: "#28b018", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.72,
    standColor: "#3a5878", seatColor: "#4878b0",
  },
  {
    level: 9, name: "Grand Arena", capacity: 30000,
    description: "Modern double-decker with VIP lounges",
    tiers: 2, roof: 2, pitchColor: "#28b018", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.75,
    standColor: "#3a5878", seatColor: "#3870c0",
  },
  {
    level: 10, name: "Premier Park", capacity: 36000,
    description: "Top-flight quality with corner screens",
    tiers: 2, roof: 2, pitchColor: "#20c010", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.78,
    standColor: "#305070", seatColor: "#3068b0",
  },
  {
    level: 11, name: "National Stadium", capacity: 42000,
    description: "Three-tier stands behind both goals",
    tiers: 3, roof: 2, pitchColor: "#20c010", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.8,
    standColor: "#2e4e6e", seatColor: "#2e60a8",
  },
  {
    level: 12, name: "Champions Arena", capacity: 50000,
    description: "Full three-tier bowl with executive boxes",
    tiers: 3, roof: 2, pitchColor: "#20c010", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.82,
    standColor: "#2e4e6e", seatColor: "#2a5ca0",
  },
  {
    level: 13, name: "Elite Ground", capacity: 58000,
    description: "Fully enclosed roof with retractable sections",
    tiers: 3, roof: 2, pitchColor: "#18d008", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.85,
    standColor: "#2a4868", seatColor: "#2658a0",
  },
  {
    level: 14, name: "Grand Coliseum", capacity: 65000,
    description: "Iconic silhouette with arched roof design",
    tiers: 3, roof: 2, pitchColor: "#18d008", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.87,
    standColor: "#2a4868", seatColor: "#2658a0",
  },
  {
    level: 15, name: "Imperial Stadium", capacity: 72000,
    description: "Four-tier monster with panoramic VIP ring",
    tiers: 4, roof: 2, pitchColor: "#10e000", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.88,
    standColor: "#284060", seatColor: "#205098",
  },
  {
    level: 16, name: "Titans Arena", capacity: 80000,
    description: "World-class venue with LED-lit facade",
    tiers: 4, roof: 2, pitchColor: "#10e000", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.9,
    standColor: "#284060", seatColor: "#1e4890",
  },
  {
    level: 17, name: "Sovereign Park", capacity: 90000,
    description: "Futuristic design with full retractable roof",
    tiers: 4, roof: 3, pitchColor: "#10e800", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.92,
    standColor: "#243858", seatColor: "#1a4488",
  },
  {
    level: 18, name: "Zenith Arena", capacity: 100000,
    description: "Continental showpiece with integrated hotel",
    tiers: 4, roof: 3, pitchColor: "#10e800", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.94,
    standColor: "#243858", seatColor: "#184080",
  },
  {
    level: 19, name: "Legends Colosseum", capacity: 110000,
    description: "Mega-stadium with 360-degree LED ribbon",
    tiers: 4, roof: 3, pitchColor: "#08f000", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.96,
    standColor: "#203050", seatColor: "#163c78",
  },
  {
    level: 20, name: "The Eternal", capacity: 120000,
    description: "The ultimate cathedral of football",
    tiers: 4, roof: 3, pitchColor: "#08f000", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.98,
    standColor: "#203050", seatColor: "#143870",
  },
];

/**
 * Get the stadium level from capacity.
 * Finds the highest level whose capacity <= the club's capacity.
 */
export function getStadiumLevel(capacity: number): StadiumLevel {
  let best = STADIUM_LEVELS[0];
  for (const level of STADIUM_LEVELS) {
    if (capacity >= level.capacity) best = level;
  }
  return best;
}
