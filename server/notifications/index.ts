import { db } from "@/lib/db";

type NotificationType =
  | "match_result"
  | "transfer_offer"
  | "scout_report"
  | "upgrade_complete"
  | "offer_expiring"
  | "promotion"
  | "relegation"
  | "cup_draw"
  | "youth_intake";

/**
 * Create a notification for a user (respects preferences).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  // Check user's notification preferences
  const prefs = await db.notificationPrefs.findUnique({
    where: { userId },
  });

  // Map notification type to preference key
  const prefMap: Record<string, keyof Omit<NonNullable<typeof prefs>, "userId">> = {
    match_result: "matchResults",
    transfer_offer: "transfers",
    offer_expiring: "transfers",
    scout_report: "scouting",
    upgrade_complete: "upgrades",
    cup_draw: "cup",
    promotion: "matchResults",
    relegation: "matchResults",
    youth_intake: "scouting",
  };

  const prefKey = prefMap[type];
  if (prefs && prefKey && !prefs[prefKey]) {
    return null; // User has this notification type disabled
  }

  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    },
  });

  return notification;
}

/**
 * Bulk create notifications for multiple users.
 */
export async function createBulkNotifications(
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const results = [];
  for (const userId of userIds) {
    const notif = await createNotification(userId, type, title, body, data);
    if (notif) results.push(notif);
  }
  return results;
}

/**
 * Get notifications for a user (paginated).
 */
export async function getUserNotifications(
  userId: string,
  options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  const where: { userId: string; isRead?: boolean } = { userId };
  if (unreadOnly) where.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    db.notification.count({ where }),
    db.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, total, unreadCount };
}

/**
 * Mark a single notification as read.
 */
export async function markAsRead(notificationId: string, userId: string) {
  return db.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for a user.
 */
export async function markAllAsRead(userId: string) {
  return db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

/**
 * Get or create notification preferences for a user.
 */
export async function getOrCreatePrefs(userId: string) {
  let prefs = await db.notificationPrefs.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await db.notificationPrefs.create({
      data: { userId },
    });
  }

  return prefs;
}

/**
 * Update notification preferences.
 */
export async function updatePrefs(
  userId: string,
  updates: Partial<{
    matchResults: boolean;
    transfers: boolean;
    scouting: boolean;
    upgrades: boolean;
    cup: boolean;
  }>
) {
  await getOrCreatePrefs(userId);

  return db.notificationPrefs.update({
    where: { userId },
    data: updates,
  });
}

// ─── Notification Helpers ────────────────────────────────

export async function notifyMatchResult(
  userId: string,
  homeClub: string,
  awayClub: string,
  homeScore: number,
  awayScore: number,
  fixtureId: string
) {
  return createNotification(
    userId,
    "match_result",
    "Full Time!",
    `${homeClub} ${homeScore}–${awayScore} ${awayClub}`,
    { fixtureId }
  );
}

export async function notifyTransferOffer(
  userId: string,
  buyerClub: string,
  playerName: string,
  fee: number,
  offerId: string
) {
  const feeStr = `€${(fee / 1000).toFixed(0)}K`;
  return createNotification(
    userId,
    "transfer_offer",
    "Transfer Offer Received",
    `${buyerClub} want ${playerName}. ${feeStr} offered.`,
    { offerId }
  );
}

export async function notifyScoutReport(userId: string, region: string) {
  return createNotification(
    userId,
    "scout_report",
    "Scout Report Ready",
    `Your scout returned from ${region}.`,
    {}
  );
}

export async function notifyCupDraw(
  userId: string,
  opponentName: string,
  roundName: string
) {
  return createNotification(
    userId,
    "cup_draw",
    "Cup Draw",
    `Cup draw: you face ${opponentName} in the ${roundName}.`,
    {}
  );
}

export async function notifyPromotion(userId: string, divisionName: string) {
  return createNotification(
    userId,
    "promotion",
    "Promoted!",
    `You've been promoted to ${divisionName}!`,
    {}
  );
}

export async function notifyRelegation(userId: string, divisionName: string) {
  return createNotification(
    userId,
    "relegation",
    "Relegated",
    `You've been relegated to ${divisionName}.`,
    {}
  );
}
