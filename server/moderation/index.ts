import { db } from "@/lib/db";

const BANNED_WORDS: string[] = [
  // Add offensive words here as needed
];

/**
 * Check if a message contains banned words.
 */
export function containsBannedWords(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
}

/**
 * Create a moderation report.
 */
export async function createReport(input: {
  reportedById: string;
  targetUserId: string;
  reason: string;
  messageId?: string;
}) {
  return db.moderationReport.create({
    data: {
      reportedById: input.reportedById,
      targetUserId: input.targetUserId,
      reason: input.reason,
      messageId: input.messageId,
    },
  });
}

/**
 * Resolve a moderation report (admin action).
 */
export async function resolveReport(
  reportId: string,
  adminId: string,
  action: "dismiss" | "warn" | "mute" | "ban",
  duration?: number // days for mute/ban
) {
  const report = await db.moderationReport.findUnique({
    where: { id: reportId },
  });
  if (!report) throw new Error("Report not found");

  let resolution: string = action;

  if (action === "ban" || action === "mute") {
    const bannedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;

    await db.user.update({
      where: { id: report.targetUserId },
      data: {
        isBanned: true,
        banReason: `${action}: ${report.reason}`,
        bannedUntil,
      },
    });

    resolution = `${action} for ${duration ?? "permanent"} days`;
  }

  await db.moderationReport.update({
    where: { id: reportId },
    data: {
      status: action === "dismiss" ? "DISMISSED" : "ACTION_TAKEN",
      resolution,
      resolvedAt: new Date(),
    },
  });

  // Log admin action
  await db.adminAuditLog.create({
    data: {
      adminId,
      action: `moderation_${action}`,
      target: report.targetUserId,
      detail: { reportId, reason: report.reason, duration },
    },
  });

  return { success: true };
}

/**
 * Unban a user.
 */
export async function unbanUser(userId: string, adminId: string) {
  await db.user.update({
    where: { id: userId },
    data: {
      isBanned: false,
      banReason: null,
      bannedUntil: null,
    },
  });

  await db.adminAuditLog.create({
    data: {
      adminId,
      action: "unban_user",
      target: userId,
    },
  });
}
