import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  clubName: z.string().min(2).max(30),
  kitHome: z.string(),
  kitAway: z.string(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const { hash } = await import("bcryptjs");
    const passwordHash = await hash(data.password, 12);

    // Find the lowest division with fewer than 10 clubs
    const division = await db.division.findFirst({
      where: { tier: 10 },
      include: { clubs: { select: { id: true } } },
    });

    if (!division) {
      return NextResponse.json(
        { error: "No divisions available" },
        { status: 500 }
      );
    }

    // Create user + club + squad in transaction
    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
        },
      });

      const club = await tx.club.create({
        data: {
          userId: user.id,
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

      // Generate 18 players for the new club (tier 10 stats)
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

      const players = positions.map((pos, i) => {
        const min = 25;
        const max = 45;
        const rand = (lo: number, hi: number) =>
          Math.floor(Math.random() * (hi - lo + 1)) + lo;

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
          pace,
          shooting,
          passing,
          dribbling,
          defending,
          physicality,
          composure,
          positioning,
          overall,
          potential: Math.min(99, overall + rand(5, 25)),
          wage: overall * overall * 2 + rand(500, 1500),
          contractEnd,
        };
      });

      await tx.player.createMany({ data: players });

      // Create default tactic
      await tx.tactic.create({
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

      // Add club to active season's league table
      const activeSeason = await tx.season.findFirst({
        where: { divisionId: division.id, isActive: true },
      });

      if (activeSeason) {
        await tx.leagueTableRow.create({
          data: {
            seasonId: activeSeason.id,
            clubId: club.id,
          },
        });
      }

      return { user, club };
    });

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      clubId: result.club.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}
