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
    tiers: 1, roof: 0, pitchColor: "#4caf50", floodlights: 0,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.3,
    standColor: "#a08060", seatColor: "#c0a070",
  },
  {
    level: 2, name: "Parish Ground", capacity: 2500,
    description: "Basic metal stands on one side",
    tiers: 1, roof: 0, pitchColor: "#4caf50", floodlights: 0,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.4,
    standColor: "#888888", seatColor: "#aaaaaa",
  },
  {
    level: 3, name: "Community Stadium", capacity: 5000,
    description: "Covered main stand with terracing",
    tiers: 1, roof: 1, pitchColor: "#43a047", floodlights: 2,
    scoreboard: false, vip: false, screens: false, crowdFill: 0.5,
    standColor: "#607860", seatColor: "#88b888",
  },
  {
    level: 4, name: "Town Arena", capacity: 8000,
    description: "Stands on three sides with basic floodlights",
    tiers: 1, roof: 1, pitchColor: "#43a047", floodlights: 4,
    scoreboard: true, vip: false, screens: false, crowdFill: 0.55,
    standColor: "#5577aa", seatColor: "#77aadd",
  },
  {
    level: 5, name: "Borough Park", capacity: 12000,
    description: "Enclosed ground with seats all around",
    tiers: 1, roof: 1, pitchColor: "#388e3c", floodlights: 4,
    scoreboard: true, vip: false, screens: false, crowdFill: 0.6,
    standColor: "#5577aa", seatColor: "#6699cc",
  },
  {
    level: 6, name: "City Ground", capacity: 16000,
    description: "Proper all-seater stadium with partial roof",
    tiers: 1, roof: 1, pitchColor: "#388e3c", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.65,
    standColor: "#4466aa", seatColor: "#5588cc",
  },
  {
    level: 7, name: "Regional Arena", capacity: 20000,
    description: "Two-tier main stand with modern facilities",
    tiers: 2, roof: 1, pitchColor: "#2e7d32", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.7,
    standColor: "#4466aa", seatColor: "#5588cc",
  },
  {
    level: 8, name: "Metropolitan Stadium", capacity: 25000,
    description: "Full two-tier bowl with covered seating",
    tiers: 2, roof: 2, pitchColor: "#2e7d32", floodlights: 4,
    scoreboard: true, vip: true, screens: false, crowdFill: 0.72,
    standColor: "#3b5ea0", seatColor: "#4d80c8",
  },
  {
    level: 9, name: "Grand Arena", capacity: 30000,
    description: "Modern double-decker with VIP lounges",
    tiers: 2, roof: 2, pitchColor: "#2e7d32", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.75,
    standColor: "#3b5ea0", seatColor: "#4478c0",
  },
  {
    level: 10, name: "Premier Park", capacity: 36000,
    description: "Top-flight quality with corner screens",
    tiers: 2, roof: 2, pitchColor: "#1b5e20", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.78,
    standColor: "#335598", seatColor: "#3d70b8",
  },
  {
    level: 11, name: "National Stadium", capacity: 42000,
    description: "Three-tier stands behind both goals",
    tiers: 3, roof: 2, pitchColor: "#1b5e20", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.8,
    standColor: "#2e4e90", seatColor: "#3868b0",
  },
  {
    level: 12, name: "Champions Arena", capacity: 50000,
    description: "Full three-tier bowl with executive boxes",
    tiers: 3, roof: 2, pitchColor: "#1b5e20", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.82,
    standColor: "#2e4e90", seatColor: "#3460a8",
  },
  {
    level: 13, name: "Elite Ground", capacity: 58000,
    description: "Fully enclosed roof with retractable sections",
    tiers: 3, roof: 2, pitchColor: "#0d4a10", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.85,
    standColor: "#284888", seatColor: "#3058a0",
  },
  {
    level: 14, name: "Grand Coliseum", capacity: 65000,
    description: "Iconic silhouette with arched roof design",
    tiers: 3, roof: 2, pitchColor: "#0d4a10", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.87,
    standColor: "#284888", seatColor: "#3058a0",
  },
  {
    level: 15, name: "Imperial Stadium", capacity: 72000,
    description: "Four-tier monster with panoramic VIP ring",
    tiers: 4, roof: 2, pitchColor: "#0a3d0a", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.88,
    standColor: "#224080", seatColor: "#2c5098",
  },
  {
    level: 16, name: "Titans Arena", capacity: 80000,
    description: "World-class venue with LED-lit facade",
    tiers: 4, roof: 2, pitchColor: "#0a3d0a", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.9,
    standColor: "#224080", seatColor: "#284890",
  },
  {
    level: 17, name: "Sovereign Park", capacity: 90000,
    description: "Futuristic design with full retractable roof",
    tiers: 4, roof: 3, pitchColor: "#083008", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.92,
    standColor: "#1e3878", seatColor: "#244488",
  },
  {
    level: 18, name: "Zenith Arena", capacity: 100000,
    description: "Continental showpiece with integrated hotel",
    tiers: 4, roof: 3, pitchColor: "#083008", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.94,
    standColor: "#1e3878", seatColor: "#224080",
  },
  {
    level: 19, name: "Legends Colosseum", capacity: 110000,
    description: "Mega-stadium with 360-degree LED ribbon",
    tiers: 4, roof: 3, pitchColor: "#062a06", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.96,
    standColor: "#1a3470", seatColor: "#203c80",
  },
  {
    level: 20, name: "The Eternal", capacity: 120000,
    description: "The ultimate cathedral of football",
    tiers: 4, roof: 3, pitchColor: "#062a06", floodlights: 4,
    scoreboard: true, vip: true, screens: true, crowdFill: 0.98,
    standColor: "#1a3470", seatColor: "#1e3878",
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
