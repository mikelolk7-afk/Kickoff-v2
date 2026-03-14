import { PrismaClient, Position } from "@prisma/client";

const prisma = new PrismaClient();

const FIRST_NAMES = [
  "James", "Marcus", "Daniel", "Carlos", "Pedro", "Lucas", "Andre",
  "Rafael", "Bruno", "Diego", "Ivan", "Sergei", "Yuki", "Omar",
  "Erik", "Liam", "Noah", "Stefan", "Mateo", "Felix", "Hugo",
  "Oscar", "Leo", "Max", "Finn", "Kai", "Rui", "Nuno", "Axel", "Emil",
];

const LAST_NAMES = [
  "Silva", "Martinez", "Johnson", "Williams", "Brown", "Garcia", "Miller",
  "Anderson", "Taylor", "Thomas", "Jackson", "White", "Harris", "Clark",
  "Lopez", "Santos", "Fernandez", "Costa", "Pereira", "Almeida",
  "Berg", "Larsen", "Fischer", "Weber", "Schulz", "Meyer", "Wolf",
  "Petrov", "Novak", "Horvat",
];

const NATIONALITIES = [
  "England", "Spain", "France", "Germany", "Italy", "Brazil", "Argentina",
  "Portugal", "Netherlands", "Belgium", "Croatia", "Japan", "South Korea",
  "USA", "Mexico", "Colombia", "Sweden", "Norway", "Denmark", "Poland",
];

const CLUB_PREFIXES = [
  "FC", "United", "City", "Athletic", "Sporting", "Real", "Dynamo",
  "Olympic", "Racing", "Inter",
];

const CLUB_NAMES = [
  "Ironclad", "Wolves", "Phoenix", "Thunder", "Falcons", "Hawks",
  "Lions", "Tigers", "Bears", "Eagles", "Sharks", "Panthers",
  "Cobras", "Stallions", "Vipers", "Raptors", "Titans", "Spartan",
  "Viking", "Nomad", "Blaze", "Storm", "Frost", "Shadow",
  "Crimson", "Azure", "Emerald", "Golden", "Silver", "Onyx",
  "Zenith", "Apex", "Nova", "Pulse", "Surge", "Bolt",
  "Crest", "Ridge", "Vale", "Glen", "Brook", "Heath",
  "Stone", "Drake", "Forge", "Crown", "Atlas", "Orion",
  "Comet", "Flare", "Dusk", "Dawn", "Reef", "Peak",
  "Harbour", "Bay", "Coast", "Cliff", "Meadow", "Grove",
  "Haven", "Port", "Dale", "Moor", "Tor", "Wold",
  "Cross", "Bridge", "Gate", "Tower", "Castle", "Fort",
  "Shield", "Sword", "Arrow", "Lance", "Helm", "Banner",
  "Cinder", "Ember", "Flame", "Spark", "Ash", "Thorn",
  "Oak", "Elm", "Pine", "Cedar", "Birch", "Maple",
];

const BADGE_IDS = [
  "badge-01", "badge-02", "badge-03", "badge-04", "badge-05",
  "badge-06", "badge-07", "badge-08", "badge-09", "badge-10",
];

const KIT_COLORS = [
  "#e63946", "#457b9d", "#2a9d8f", "#e9c46a", "#f4a261",
  "#264653", "#6a0572", "#1a7a3c", "#d53a3a", "#3a7bd5",
];

const DIVISION_NAMES: Record<number, string> = {
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

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePlayerName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function generateClubName(index: number): string {
  const prefix = CLUB_PREFIXES[index % CLUB_PREFIXES.length];
  const name = CLUB_NAMES[index % CLUB_NAMES.length];
  return `${name} ${prefix}`;
}

/** Higher tier = better base stats. Tier 1 is best, tier 10 is worst. */
function statRange(tier: number): { min: number; max: number } {
  const base = Math.max(30, 85 - (tier - 1) * 5);
  return { min: base - 10, max: base + 10 };
}

function generatePlayer(
  clubId: string,
  position: Position,
  tier: number,
  index: number
): {
  clubId: string;
  name: string;
  nationality: string;
  age: number;
  position: Position;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physicality: number;
  composure: number;
  positioning: number;
  overall: number;
  potential: number;
  morale: number;
  form: number;
  wage: number;
  contractEnd: Date;
  isYouth: boolean;
} {
  const { min, max } = statRange(tier);
  const age = rand(18, 34);

  const pace = rand(min, max);
  const shooting = rand(min, max);
  const passing = rand(min, max);
  const dribbling = rand(min, max);
  const defending = rand(min, max);
  const physicality = rand(min, max);
  const composure = rand(min, max);
  const positioning = rand(min, max);

  // Weight stats by position for overall calc
  let overall: number;
  switch (position) {
    case "GK":
      overall = Math.round(
        composure * 0.25 + positioning * 0.25 + physicality * 0.2 +
        pace * 0.1 + passing * 0.1 + defending * 0.1
      );
      break;
    case "DEF":
      overall = Math.round(
        defending * 0.35 + physicality * 0.2 + positioning * 0.2 +
        composure * 0.1 + pace * 0.1 + passing * 0.05
      );
      break;
    case "MID":
      overall = Math.round(
        passing * 0.3 + dribbling * 0.2 + composure * 0.15 +
        positioning * 0.15 + shooting * 0.1 + physicality * 0.1
      );
      break;
    case "FWD":
      overall = Math.round(
        shooting * 0.3 + pace * 0.2 + dribbling * 0.2 +
        positioning * 0.15 + composure * 0.1 + physicality * 0.05
      );
      break;
  }

  const potential = Math.min(99, overall + (age <= 23 ? rand(5, 20) : rand(0, 5)));
  const wage = Math.round(overall * overall * 2 + rand(500, 2000));

  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + rand(1, 4));

  return {
    clubId,
    name: generatePlayerName(),
    nationality: pick(NATIONALITIES),
    age,
    position,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physicality,
    composure,
    positioning,
    overall,
    potential,
    morale: rand(60, 85),
    form: rand(55, 85),
    wage,
    contractEnd,
    isYouth: age <= 19,
  };
}

/** Generate 18 players: 2 GK, 5 DEF, 5 MID, 4 FWD, 2 subs (random) */
function generateSquad(clubId: string, tier: number) {
  const positions: Position[] = [
    "GK", "GK",
    "DEF", "DEF", "DEF", "DEF", "DEF",
    "MID", "MID", "MID", "MID", "MID",
    "FWD", "FWD", "FWD", "FWD",
    // 2 random subs
    pick(["DEF", "MID", "FWD"] as Position[]),
    pick(["DEF", "MID", "FWD"] as Position[]),
  ];

  return positions.map((pos, i) => generatePlayer(clubId, pos, tier, i));
}

/** Generate round-robin fixtures for a list of club IDs (18 match weeks) */
function generateFixtures(
  clubIds: string[],
  seasonId: string,
  startDate: Date
): {
  seasonId: string;
  homeClubId: string;
  awayClubId: string;
  matchWeek: number;
  scheduledAt: Date;
}[] {
  const n = clubIds.length;
  const fixtures: {
    seasonId: string;
    homeClubId: string;
    awayClubId: string;
    matchWeek: number;
    scheduledAt: Date;
  }[] = [];

  // Round-robin: n-1 rounds for first half, n-1 for second (home/away swap)
  const teams = [...clubIds];
  const rounds = n - 1;

  for (let round = 0; round < rounds; round++) {
    const matchWeek = round + 1;
    const date = new Date(startDate);
    date.setDate(date.getDate() + round * 7);
    date.setUTCHours(20, 0, 0, 0);

    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];

      // First half
      fixtures.push({
        seasonId,
        homeClubId: home,
        awayClubId: away,
        matchWeek,
        scheduledAt: date,
      });

      // Second half (reverse fixtures)
      const returnDate = new Date(date);
      returnDate.setDate(returnDate.getDate() + rounds * 7);
      fixtures.push({
        seasonId,
        homeClubId: away,
        awayClubId: home,
        matchWeek: matchWeek + rounds,
        scheduledAt: returnDate,
      });
    }

    // Rotate teams (keep first fixed)
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }

  return fixtures;
}

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.matchEvent.deleteMany();
  await prisma.fixture.deleteMany();
  await prisma.leagueTableRow.deleteMany();
  await prisma.season.deleteMany();
  await prisma.tactic.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.player.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.club.deleteMany();
  await prisma.division.deleteMany();
  await prisma.user.deleteMany();

  // Create 10 divisions
  const divisions = [];
  for (let tier = 1; tier <= 10; tier++) {
    const division = await prisma.division.create({
      data: {
        tier,
        name: DIVISION_NAMES[tier],
      },
    });
    divisions.push(division);
  }
  console.log("Created 10 divisions");

  // Create 9 AI clubs per division (90 total), slot 10 reserved for humans
  let clubIndex = 0;
  for (const division of divisions) {
    const clubIds: string[] = [];

    for (let c = 0; c < 9; c++) {
      const club = await prisma.club.create({
        data: {
          name: generateClubName(clubIndex),
          badgeId: BADGE_IDS[clubIndex % BADGE_IDS.length],
          kitHome: KIT_COLORS[clubIndex % KIT_COLORS.length],
          kitAway: KIT_COLORS[(clubIndex + 5) % KIT_COLORS.length],
          isAi: true,
          aiLevel: division.tier,
          divisionId: division.id,
          reputation: Math.max(10, 100 - (division.tier - 1) * 10 + rand(-5, 5)),
          budget: Math.max(100000, 2000000 - (division.tier - 1) * 180000 + rand(-50000, 50000)),
          wageBudget: Math.max(10000, 200000 - (division.tier - 1) * 18000),
        },
      });
      clubIds.push(club.id);

      // Generate 18 players per club
      const players = generateSquad(club.id, division.tier);
      await prisma.player.createMany({ data: players });

      // Create default tactic
      await prisma.tactic.create({
        data: {
          clubId: club.id,
          name: "Default",
          formation: "4-4-2",
          mentality: 3,
          pressingLevel: 3,
          positions: {},
          setPieces: {},
          isActive: true,
        },
      });

      clubIndex++;
    }

    // Create Season 1 for this division
    const seasonStart = new Date();
    seasonStart.setUTCHours(20, 0, 0, 0);

    const season = await prisma.season.create({
      data: {
        divisionId: division.id,
        number: 1,
        startDate: seasonStart,
        isActive: true,
      },
    });

    // Create league table rows for each AI club
    for (const clubId of clubIds) {
      await prisma.leagueTableRow.create({
        data: {
          seasonId: season.id,
          clubId,
        },
      });
    }

    // Generate fixtures (only if we have enough clubs for round-robin)
    if (clubIds.length >= 2) {
      const fixtures = generateFixtures(clubIds, season.id, seasonStart);
      await prisma.fixture.createMany({ data: fixtures });
    }

    console.log(
      `Division ${division.tier} (${division.name}): 9 AI clubs, ${clubIds.length * 18} players, fixtures generated`
    );
  }

  const totalClubs = await prisma.club.count();
  const totalPlayers = await prisma.player.count();
  const totalFixtures = await prisma.fixture.count();
  console.log(`\nSeed complete: ${totalClubs} clubs, ${totalPlayers} players, ${totalFixtures} fixtures`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
