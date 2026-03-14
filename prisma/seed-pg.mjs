/**
 * Seed script using pg directly (no Prisma engine needed).
 * Works on ARM Windows where Prisma query engine fails.
 *
 * Usage: node prisma/seed-pg.mjs
 */
import pg from "pg";
import crypto from "crypto";

const uuid = () => crypto.randomUUID();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const FIRST_NAMES = [
  "James","Marcus","Daniel","Carlos","Pedro","Lucas","Andre",
  "Rafael","Bruno","Diego","Ivan","Sergei","Yuki","Omar",
  "Erik","Liam","Noah","Stefan","Mateo","Felix","Hugo",
  "Oscar","Leo","Max","Finn","Kai","Rui","Nuno","Axel","Emil",
];
const LAST_NAMES = [
  "Silva","Martinez","Johnson","Williams","Brown","Garcia","Miller",
  "Anderson","Taylor","Thomas","Jackson","White","Harris","Clark",
  "Lopez","Santos","Fernandez","Costa","Pereira","Almeida",
  "Berg","Larsen","Fischer","Weber","Schulz","Meyer","Wolf",
  "Petrov","Novak","Horvat",
];
const NATIONALITIES = [
  "England","Spain","France","Germany","Italy","Brazil","Argentina",
  "Portugal","Netherlands","Belgium","Croatia","Japan","South Korea",
  "USA","Mexico","Colombia","Sweden","Norway","Denmark","Poland",
];
const CLUB_PREFIXES = ["FC","United","City","Athletic","Sporting","Real","Dynamo","Olympic","Racing","Inter"];
const CLUB_NAMES = [
  "Ironclad","Wolves","Phoenix","Thunder","Falcons","Hawks",
  "Lions","Tigers","Bears","Eagles","Sharks","Panthers",
  "Cobras","Stallions","Vipers","Raptors","Titans","Spartan",
  "Viking","Nomad","Blaze","Storm","Frost","Shadow",
  "Crimson","Azure","Emerald","Golden","Silver","Onyx",
  "Zenith","Apex","Nova","Pulse","Surge","Bolt",
  "Crest","Ridge","Vale","Glen","Brook","Heath",
  "Stone","Drake","Forge","Crown","Atlas","Orion",
  "Comet","Flare","Dusk","Dawn","Reef","Peak",
  "Harbour","Bay","Coast","Cliff","Meadow","Grove",
  "Haven","Port","Dale","Moor","Tor","Wold",
  "Cross","Bridge","Gate","Tower","Castle","Fort",
  "Shield","Sword","Arrow","Lance","Helm","Banner",
  "Cinder","Ember","Flame","Spark","Ash","Thorn",
  "Oak","Elm","Pine","Cedar","Birch","Maple",
];
const BADGE_IDS = ["badge-01","badge-02","badge-03","badge-04","badge-05","badge-06","badge-07","badge-08","badge-09","badge-10"];
const KIT_COLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#264653","#6a0572","#1a7a3c","#d53a3a","#3a7bd5"];
const DIVISION_NAMES = {
  1:"Premier League",2:"Championship",3:"League One",4:"League Two",
  5:"National League",6:"National League North",7:"Northern Premier",
  8:"Northern One",9:"County League",10:"Sunday League",
};

function statRange(tier) {
  const base = Math.max(30, 85 - (tier - 1) * 5);
  return { min: base - 10, max: base + 10 };
}

function generatePlayer(clubId, position, tier) {
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

  let overall;
  switch (position) {
    case "GK":
      overall = Math.round(composure*0.25+positioning*0.25+physicality*0.2+pace*0.1+passing*0.1+defending*0.1);
      break;
    case "DEF":
      overall = Math.round(defending*0.35+physicality*0.2+positioning*0.2+composure*0.1+pace*0.1+passing*0.05);
      break;
    case "MID":
      overall = Math.round(passing*0.3+dribbling*0.2+composure*0.15+positioning*0.15+shooting*0.1+physicality*0.1);
      break;
    case "FWD":
      overall = Math.round(shooting*0.3+pace*0.2+dribbling*0.2+positioning*0.15+composure*0.1+physicality*0.05);
      break;
  }

  const potential = Math.min(99, overall + (age <= 23 ? rand(5, 20) : rand(0, 5)));
  const wage = Math.round(overall * overall * 2 + rand(500, 2000));
  const contractEnd = new Date();
  contractEnd.setFullYear(contractEnd.getFullYear() + rand(1, 4));

  return {
    id: uuid(), clubId,
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    nationality: pick(NATIONALITIES),
    age, position, pace, shooting, passing, dribbling, defending,
    physicality, composure, positioning, overall, potential,
    morale: rand(60, 85), form: rand(55, 85), wage,
    contractEnd, isYouth: age <= 19,
  };
}

function generateSquad(clubId, tier) {
  const positions = [
    "GK","GK","DEF","DEF","DEF","DEF","DEF",
    "MID","MID","MID","MID","MID","FWD","FWD","FWD","FWD",
    pick(["DEF","MID","FWD"]), pick(["DEF","MID","FWD"]),
  ];
  return positions.map(pos => generatePlayer(clubId, pos, tier));
}

function generateFixtures(clubIds, seasonId, startDate) {
  const n = clubIds.length;
  const fixtures = [];
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
      fixtures.push({ id: uuid(), seasonId, homeClubId: home, awayClubId: away, matchWeek, scheduledAt: date });
      const returnDate = new Date(date);
      returnDate.setDate(returnDate.getDate() + rounds * 7);
      fixtures.push({ id: uuid(), seasonId, homeClubId: away, awayClubId: home, matchWeek: matchWeek + rounds, scheduledAt: returnDate });
    }
    const last = teams.pop();
    teams.splice(1, 0, last);
  }
  return fixtures;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Make sure .env exists.");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  console.log("Connected to database. Seeding...");

  // Clear existing data (order matters for FK constraints)
  const tables = [
    '"MatchEvent"','"Fixture"','"LeagueTableRow"','"Season"',
    '"ScoutReport"','"ScoutAssignment"','"TransferOffer"','"TransferListing"',
    '"StadiumUpgrade"','"FacilityUpgrade"',
    '"Tactic"','"Staff"','"Player"','"Transaction"','"Club"','"Division"','"User"',
  ];
  for (const t of tables) {
    await client.query(`DELETE FROM ${t}`);
  }
  console.log("Cleared existing data.");

  // Create 10 divisions
  const divisions = [];
  for (let tier = 1; tier <= 10; tier++) {
    const id = uuid();
    await client.query(
      `INSERT INTO "Division" (id, tier, name) VALUES ($1, $2, $3)`,
      [id, tier, DIVISION_NAMES[tier]]
    );
    divisions.push({ id, tier, name: DIVISION_NAMES[tier] });
  }
  console.log("Created 10 divisions.");

  let clubIndex = 0;
  let totalPlayers = 0;
  let totalFixtures = 0;

  for (const division of divisions) {
    const clubIds = [];

    for (let c = 0; c < 9; c++) {
      const clubId = uuid();
      const prefix = CLUB_PREFIXES[clubIndex % CLUB_PREFIXES.length];
      const cname = CLUB_NAMES[clubIndex % CLUB_NAMES.length];
      const clubFullName = `${cname} ${prefix}`;

      await client.query(
        `INSERT INTO "Club" (id, name, "badgeId", "kitHome", "kitAway", "isAi", "aiLevel", "divisionId", reputation, budget, "wageBudget", "stadiumCapacity", "trainingLevel", "medicalLevel", "academyLevel", "analyticsLevel", "weeklyWages", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          clubId, clubFullName,
          BADGE_IDS[clubIndex % BADGE_IDS.length],
          KIT_COLORS[clubIndex % KIT_COLORS.length],
          KIT_COLORS[(clubIndex + 5) % KIT_COLORS.length],
          true, division.tier, division.id,
          Math.max(10, 100 - (division.tier - 1) * 10 + rand(-5, 5)),
          Math.max(100000, 2000000 - (division.tier - 1) * 180000 + rand(-50000, 50000)),
          Math.max(10000, 200000 - (division.tier - 1) * 18000),
          5000, 1, 1, 1, 0, 0, new Date(),
        ]
      );
      clubIds.push(clubId);

      // Generate 18 players
      const players = generateSquad(clubId, division.tier);
      for (const p of players) {
        await client.query(
          `INSERT INTO "Player" (id, "clubId", name, nationality, age, position, pace, shooting, passing, dribbling, defending, physicality, composure, positioning, overall, potential, morale, form, wage, "contractEnd", "isYouth", "createdAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
          [p.id, p.clubId, p.name, p.nationality, p.age, p.position,
           p.pace, p.shooting, p.passing, p.dribbling, p.defending,
           p.physicality, p.composure, p.positioning, p.overall, p.potential,
           p.morale, p.form, p.wage, p.contractEnd, p.isYouth, new Date()]
        );
        totalPlayers++;
      }

      // Default tactic
      await client.query(
        `INSERT INTO "Tactic" (id, "clubId", name, formation, mentality, "pressingLevel", positions, "setPieces", "isActive", "createdAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [uuid(), clubId, "Default", "4-4-2", 3, 3, "{}", "{}", true, new Date()]
      );

      clubIndex++;
    }

    // Create Season 1
    const seasonId = uuid();
    const seasonStart = new Date();
    seasonStart.setUTCHours(20, 0, 0, 0);

    await client.query(
      `INSERT INTO "Season" (id, "divisionId", number, "startDate", "isActive")
       VALUES ($1,$2,$3,$4,$5)`,
      [seasonId, division.id, 1, seasonStart, true]
    );

    // League table rows
    for (const cid of clubIds) {
      await client.query(
        `INSERT INTO "LeagueTableRow" (id, "seasonId", "clubId") VALUES ($1,$2,$3)`,
        [uuid(), seasonId, cid]
      );
    }

    // Fixtures
    if (clubIds.length >= 2) {
      const fixtures = generateFixtures(clubIds, seasonId, seasonStart);
      for (const f of fixtures) {
        await client.query(
          `INSERT INTO "Fixture" (id, "seasonId", "homeClubId", "awayClubId", "matchWeek", "scheduledAt", status)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [f.id, f.seasonId, f.homeClubId, f.awayClubId, f.matchWeek, f.scheduledAt, "SCHEDULED"]
        );
        totalFixtures++;
      }
    }

    console.log(`Division ${division.tier} (${division.name}): 9 clubs, ${clubIds.length * 18} players`);
  }

  console.log(`\nSeed complete: 90 clubs, ${totalPlayers} players, ${totalFixtures} fixtures`);
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
