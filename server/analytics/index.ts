import { db } from "@/lib/db";

/**
 * Track a login event.
 */
export async function trackLogin(
  userId: string,
  ip?: string,
  userAgent?: string
) {
  return db.loginEvent.create({
    data: { userId, ip, userAgent },
  });
}

/**
 * Track a generic analytics event.
 */
export async function trackEvent(
  event: string,
  userId?: string,
  data?: Record<string, unknown>
) {
  return db.analyticsEvent.create({
    data: { event, userId, data: (data as import("@prisma/client").Prisma.InputJsonValue) ?? undefined },
  });
}

/**
 * Get dashboard stats for admin.
 */
export async function getAdminStats() {
  const [
    totalUsers,
    totalClubs,
    totalMatches,
    activeSeasons,
    recentLogins,
    pendingReports,
  ] = await Promise.all([
    db.user.count(),
    db.club.count(),
    db.fixture.count({ where: { status: "COMPLETED" } }),
    db.season.count({ where: { isActive: true } }),
    db.loginEvent.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    db.moderationReport.count({ where: { status: "PENDING" } }),
  ]);

  return {
    totalUsers,
    totalClubs,
    totalMatches,
    activeSeasons,
    recentLogins,
    pendingReports,
  };
}

/**
 * Get login events for a date range.
 */
export async function getLoginHistory(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db.loginEvent.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { user: { select: { name: true, email: true } } },
  });
}
