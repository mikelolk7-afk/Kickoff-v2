import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getOrCreatePrefs,
  updatePrefs,
} from "@/server/notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const result = await getUserNotifications((session.user.id as string), {
      limit,
      offset,
      unreadOnly,
    });

    const prefs = await getOrCreatePrefs((session.user.id as string));

    return NextResponse.json({ ...result, prefs });
  } catch (error) {
    console.error("Notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Mark single notification as read
    if (body.notificationId) {
      await markAsRead(body.notificationId, (session.user.id as string));
      return NextResponse.json({ success: true });
    }

    // Mark all as read
    if (body.markAllRead) {
      await markAllAsRead((session.user.id as string));
      return NextResponse.json({ success: true });
    }

    // Update preferences
    if (body.prefs) {
      const updated = await updatePrefs((session.user.id as string), body.prefs);
      return NextResponse.json({ prefs: updated });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Notifications update error:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
