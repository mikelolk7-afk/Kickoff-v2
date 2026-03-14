import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateWeeklyFinancials } from "@/server/finances/weekly";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({
    where: { userId: session.user.id },
    include: { players: { select: { wage: true } } },
  });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  const totalWages = club.players.reduce((sum, p) => sum + p.wage, 0);

  const weeklyFinancials = calculateWeeklyFinancials({
    ...club,
    weeklyWages: totalWages,
  });

  const recentTransactions = await db.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    budget: club.budget,
    wageBudget: club.wageBudget,
    weeklyWages: totalWages,
    weeklyFinancials,
    recentTransactions,
  });
}
