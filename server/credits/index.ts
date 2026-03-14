import { db } from "@/lib/db";

/**
 * Credit packages from blueprint:
 * Starter: 100 credits — €2.99
 * Pro: 350 credits — €7.99
 * Elite: 1,000 credits — €19.99
 * Monthly Pass: 30/day — €4.99/mo
 */

export const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", credits: 100, priceEur: 2.99, stripePriceId: "price_starter" },
  { id: "pro", name: "Pro", credits: 350, priceEur: 7.99, stripePriceId: "price_pro" },
  { id: "elite", name: "Elite", credits: 1000, priceEur: 19.99, stripePriceId: "price_elite" },
] as const;

export const MONTHLY_PASS = {
  id: "monthly_pass",
  name: "Monthly Pass",
  creditsPerDay: 30,
  priceEur: 4.99,
  stripePriceId: "price_monthly_pass",
} as const;

/**
 * Add credits to a user (after verified Stripe payment).
 */
export async function addCredits(
  userId: string,
  credits: number,
  stripeId: string,
  description: string
) {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { increment: credits } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "CREDIT_PURCHASE",
        credits,
        description,
        stripeId,
      },
    }),
  ]);
}

/**
 * Spend credits (server-side validation).
 * Returns true if successful, false if insufficient.
 */
export async function spendCredits(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.credits < amount) return false;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "CREDIT_SPEND",
        credits: -amount,
        description,
      },
    }),
  ]);

  return true;
}

/**
 * Add coins (earned in-game currency).
 */
export async function addCoins(
  userId: string,
  coins: number,
  description: string
) {
  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { coins: { increment: coins } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "COIN_EARN",
        coins,
        description,
      },
    }),
  ]);
}

/**
 * Spend coins (server-side validation).
 */
export async function spendCoins(
  userId: string,
  amount: number,
  description: string
): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.coins < amount) return false;

  await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { coins: { decrement: amount } },
    }),
    db.transaction.create({
      data: {
        userId,
        type: "COIN_SPEND",
        coins: -amount,
        description,
      },
    }),
  ]);

  return true;
}

/**
 * Daily drip: add 30 credits to Monthly Pass subscribers.
 * Called by cron at 00:00 UTC daily.
 */
export async function processDailyDrip() {
  // Find users with active Monthly Pass (tracked via Stripe subscription status)
  // For now, identify by checking for a recent monthly_pass transaction
  // In production this would check Stripe subscription status
  const recentPassUsers = await db.transaction.findMany({
    where: {
      type: "MONTHLY_PASS_ACTIVE",
      createdAt: { gte: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) },
    },
    select: { userId: true },
    distinct: ["userId"],
  });

  let dripped = 0;

  for (const { userId } of recentPassUsers) {
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { credits: { increment: MONTHLY_PASS.creditsPerDay } },
      }),
      db.transaction.create({
        data: {
          userId,
          type: "DAILY_DRIP",
          credits: MONTHLY_PASS.creditsPerDay,
          description: "Monthly Pass daily drip",
        },
      }),
    ]);
    dripped++;
  }

  return dripped;
}

/**
 * Get transaction history for a user.
 */
export async function getTransactionHistory(userId: string, page = 1, pageSize = 20) {
  const [transactions, total] = await Promise.all([
    db.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.transaction.count({ where: { userId } }),
  ]);

  return { transactions, total, page, pageSize };
}
