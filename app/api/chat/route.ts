import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserRooms,
  getMessages,
  sendMessage,
  getDivisionRoom,
  getGlobalRoom,
  getDirectRoom,
  getMatchRoom,
  reportMessage,
} from "@/server/chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // List rooms
    if (action === "rooms") {
      const rooms = await getUserRooms((session.user.id as string) as string);
      return NextResponse.json({ rooms });
    }

    // Get messages for a room
    const roomId = searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "roomId required" }, { status: 400 });
    }

    const before = searchParams.get("before") ?? undefined;
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);

    const messages = await getMessages(roomId, { limit, before });
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Chat fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Send a message
    if (action === "send") {
      const { roomId, message } = body;
      if (!roomId || !message) {
        return NextResponse.json(
          { error: "roomId and message required" },
          { status: 400 }
        );
      }
      const msg = await sendMessage(roomId, (session.user.id as string), message);
      return NextResponse.json({ message: msg });
    }

    // Get/create a specific room
    if (action === "room") {
      const { type, refId } = body;
      const clubId = (session.user as { clubId?: string }).clubId;

      let room;
      switch (type) {
        case "division":
          if (!clubId) {
            return NextResponse.json({ error: "No club" }, { status: 400 });
          }
          room = await getDivisionRoom(clubId);
          break;
        case "global":
          room = await getGlobalRoom();
          break;
        case "direct":
          if (!refId) {
            return NextResponse.json(
              { error: "refId (userId) required for DM" },
              { status: 400 }
            );
          }
          room = await getDirectRoom((session.user.id as string), refId);
          break;
        case "match":
          if (!refId) {
            return NextResponse.json(
              { error: "refId (fixtureId) required" },
              { status: 400 }
            );
          }
          room = await getMatchRoom(refId);
          break;
        default:
          return NextResponse.json(
            { error: "Invalid room type" },
            { status: 400 }
          );
      }
      return NextResponse.json({ room });
    }

    // Report a message
    if (action === "report") {
      const { messageId, reason } = body;
      if (!messageId) {
        return NextResponse.json(
          { error: "messageId required" },
          { status: 400 }
        );
      }
      const result = await reportMessage(
        messageId,
        (session.user.id as string),
        reason ?? "No reason given"
      );
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Chat action error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat action failed" },
      { status: 500 }
    );
  }
}
