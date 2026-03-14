import { db } from "@/lib/db";
import type { RoomType } from "@prisma/client";

// Basic word filter for moderation
const BANNED_WORDS: string[] = [];

function filterMessage(body: string): string {
  let filtered = body;
  for (const word of BANNED_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    filtered = filtered.replace(regex, "***");
  }
  return filtered;
}

/**
 * Get or create a chat room.
 */
export async function getOrCreateRoom(type: RoomType, refId?: string) {
  const where = refId
    ? { type, refId }
    : { type, refId: null };

  let room = await db.chatRoom.findFirst({ where });

  if (!room) {
    room = await db.chatRoom.create({
      data: { type, refId: refId ?? null },
    });
  }

  return room;
}

/**
 * Get the division chat room for a club.
 */
export async function getDivisionRoom(clubId: string) {
  const club = await db.club.findUnique({
    where: { id: clubId },
    select: { divisionId: true },
  });

  if (!club) throw new Error("Club not found");

  return getOrCreateRoom("DIVISION", club.divisionId);
}

/**
 * Get the global chat room.
 */
export async function getGlobalRoom() {
  return getOrCreateRoom("GLOBAL");
}

/**
 * Get or create a direct message room between two users.
 * Use a consistent refId by sorting user IDs.
 */
export async function getDirectRoom(userIdA: string, userIdB: string) {
  const refId = [userIdA, userIdB].sort().join(":");
  return getOrCreateRoom("DIRECT", refId);
}

/**
 * Get or create a match thread room for a fixture.
 */
export async function getMatchRoom(fixtureId: string) {
  return getOrCreateRoom("MATCH", fixtureId);
}

/**
 * Send a message to a chat room.
 */
export async function sendMessage(
  roomId: string,
  userId: string,
  body: string
) {
  if (!body.trim()) throw new Error("Message cannot be empty");
  if (body.length > 500) throw new Error("Message too long (max 500 chars)");

  const filteredBody = filterMessage(body.trim());

  const message = await db.message.create({
    data: {
      roomId,
      userId,
      body: filteredBody,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return message;
}

/**
 * Get messages from a chat room (paginated, most recent first).
 */
export async function getMessages(
  roomId: string,
  options: { limit?: number; before?: string } = {}
) {
  const { limit = 50, before } = options;

  const where: { roomId: string; createdAt?: { lt: Date } } = { roomId };

  if (before) {
    const cursor = await db.message.findUnique({ where: { id: before } });
    if (cursor) {
      where.createdAt = { lt: cursor.createdAt };
    }
  }

  const messages = await db.message.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  // Return in chronological order
  return messages.reverse();
}

/**
 * Get all rooms a user has access to.
 */
export async function getUserRooms(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { club: { select: { divisionId: true } } },
  });

  if (!user) throw new Error("User not found");

  const rooms = [];

  // Global room
  const globalRoom = await getOrCreateRoom("GLOBAL");
  rooms.push({ ...globalRoom, label: "Global Chat" });

  // Division room (if user has a club)
  if (user.club) {
    const divRoom = await getOrCreateRoom("DIVISION", user.club.divisionId);
    rooms.push({ ...divRoom, label: "Division Chat" });
  }

  // Direct message rooms
  const dmRooms = await db.chatRoom.findMany({
    where: {
      type: "DIRECT",
      refId: { contains: userId },
    },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { user: { select: { name: true } } },
      },
    },
  });

  for (const dm of dmRooms) {
    const otherUserId = dm.refId
      ?.split(":")
      .find((id) => id !== userId);
    if (otherUserId) {
      const otherUser = await db.user.findUnique({
        where: { id: otherUserId },
        select: { name: true },
      });
      rooms.push({
        ...dm,
        label: otherUser?.name ?? "Direct Message",
      });
    }
  }

  return rooms;
}

/**
 * Report a message for moderation.
 */
export async function reportMessage(
  messageId: string,
  reporterUserId: string,
  reason: string
) {
  // For now, just log it. Phase 5 adds full moderation queue.
  console.log(
    `Message ${messageId} reported by ${reporterUserId}: ${reason}`
  );
  return { reported: true };
}
