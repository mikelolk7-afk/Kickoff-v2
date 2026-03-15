import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createClubSchema = z.object({
  clubName: z.string().min(2).max(30),
  kitHome: z.string(),
  kitAway: z.string(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a club
  const existing = await db.club.findFirst({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a club" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const data = createClubSchema.parse(body);

    // Find Division 10 (Sunday League)
    const division = await db.division.findFirst({
      where: { tier: 10 },
    });

    if (!division) {
      return NextResponse.json(
        { error: "No divisions available. The database needs to be seeded." },
        { status: 500 }
      );
    }

    // Create club
    const club = await db.club.create({
      data: {
        userId: session.user.id,
        name: data.clubName,
        badgeId: "badge-01",
        kitHome: data.kitHome,
        kitAway: data.kitAway,
        isAi: false,
        divisionId: division.id,
        budget: 500000,
        wageBudget: 50000,
      },
    });

    // Generate 18 players (tier 10 stats)
    const positions: Array<"GK" | "DEF" | "MID" | "FWD"> = [
      "GK", "GK",
      "DEF", "DEF", "DEF", "DEF", "DEF",
      "MID", "MID", "MID", "MID", "MID",
      "FWD", "FWD", "FWD", "FWD",
      "DEF", "MID",
    ];

    const firstNames = [
      "James", "Marcus", "Daniel", "Carlos", "Pedro", "Lucas", "Andre",
      "Rafael", "Bruno", "Diego", "Ivan", "Sergei", "Yuki", "Omar",
      "Erik", "Liam", "Noah", "Stefan",
    ];
    const lastNames = [
      "Silva", "Martinez", "Johnson", "Williams", "Brown", "Garcia",
      "Miller", "Anderson", "Taylor", "Thomas", "Jackson", "White",
      "Harris", "Clark", "Lopez", "Santos", "Fernandez", "Costa",
    ];
    const nationalities = [
      "England", "Spain", "France", "Germany", "Italy", "Brazil",
      "Argentina", "Portugal", "Netherlands", "Belgium",
    ];

    const rand = (lo: number, hi: number) =>
      Math.floor(Math.random() * (hi - lo + 1)) + lo;

    const players = positions.map((pos, i) => {
      const min = 25;
      const max = 45;
      const pace = rand(min, max);
      const shooting = rand(min, max);
      const passing = rand(min, max);
      const dribbling = rand(min, max);
      const defending = rand(min, max);
      const physicality = rand(min, max);
      const composure = rand(min, max);
      const positioning = rand(min, max);
      const overall = Math.round(
        (pace + shooting + passing + dribbling + defending + physicality + composure + positioning) / 8
      );
      const age = rand(18, 30);
      const contractEnd = new Date();
      contractEnd.setFullYear(contractEnd.getFullYear() + rand(2, 4));

      return {
        clubId: club.id,
        name: `${firstNames[i]} ${lastNames[i]}`,
        nationality: nationalities[i % nationalities.length],
        age,
        position: pos,
        pace, shooting, passing, dribbling, defending,
        physicality, composure, positioning, overall,
        potential: Math.min(99, overall + rand(5, 25)),
        wage: overall * overall * 2 + rand(500, 1500),
        contractEnd,
      };
    });

    await db.player.createMany({ data: players });

    // Create default tactic
    await db.tactic.create({
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

    // Add to active season league table if one exists
    const activeSeason = await db.season.findFirst({
      where: { divisionId: division.id, isActive: true },
    });

    if (activeSeason) {
      await db.leagueTableRow.create({
        data: {
          seasonId: activeSeason.id,
          clubId: club.id,
        },
      });
    }

    return NextResponse.json({ success: true, clubId: club.id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Club creation error:", error);
    return NextResponse.json(
      { error: "Failed to create club" },
      { status: 500 }
    );
  }
}
