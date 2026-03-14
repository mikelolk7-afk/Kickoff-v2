import { db } from "@/lib/db";

/**
 * Weekly financial processing for all clubs.
 * Calculates income (match day + sponsors) and expenses (wages + maintenance).
 */

interface WeeklyFinancials {
  matchDayIncome: number;
  sponsorIncome: number;
  totalIncome: number;
  wages: number;
  maintenance: number;
  totalExpenses: number;
  netIncome: number;
}

/**
 * Calculate weekly financials for a club.
 */
export function calculateWeeklyFinancials(club: {
  stadiumCapacity: number;
  reputation: number;
  trainingLevel: number;
  medicalLevel: number;
  academyLevel: number;
  analyticsLevel: number;
  weeklyWages: number;
}): WeeklyFinancials {
  // Match day income: capacity * avg ticket price * avg attendance rate
  const ticketPrice = 15 + club.reputation * 0.3;
  const attendanceRate = 0.6 + club.reputation * 0.003;
  const matchDayIncome = Math.round(
    club.stadiumCapacity * ticketPrice * Math.min(1, attendanceRate)
  );

  // Sponsor income: based on reputation
  const sponsorIncome = Math.round(club.reputation * 500 + 5000);

  // Wages
  const wages = club.weeklyWages;

  // Maintenance: all facilities have upkeep
  const maintenance = Math.round(
    (club.trainingLevel * 2000) +
    (club.medicalLevel * 1500) +
    (club.academyLevel * 2500) +
    (club.analyticsLevel * 3000) +
    (club.stadiumCapacity * 0.5) // Ground upkeep
  );

  const totalIncome = matchDayIncome + sponsorIncome;
  const totalExpenses = wages + maintenance;
  const netIncome = totalIncome - totalExpenses;

  return {
    matchDayIncome,
    sponsorIncome,
    totalIncome,
    wages,
    maintenance,
    totalExpenses,
    netIncome,
  };
}

/**
 * Process weekly finances for all clubs.
 * Called by cron (or integrated into match day processing).
 */
export async function processWeeklyFinances() {
  const clubs = await db.club.findMany({
    include: {
      players: { select: { wage: true } },
    },
  });

  let processed = 0;

  for (const club of clubs) {
    // Calculate actual weekly wages from player wages
    const totalWages = club.players.reduce((sum, p) => sum + p.wage, 0);

    const financials = calculateWeeklyFinancials({
      ...club,
      weeklyWages: totalWages,
    });

    await db.club.update({
      where: { id: club.id },
      data: {
        budget: { increment: financials.netIncome },
        weeklyWages: totalWages,
      },
    });

    processed++;
  }

  return processed;
}

export { type WeeklyFinancials };
