import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const check = await requireAdmin();
  if (check instanceof NextResponse) return check;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = 50;
  const skip = (page - 1) * limit;
  const search = searchParams.get("search") ?? "";

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBanned: true,
        banReason: true,
        createdAt: true,
        club: { select: { id: true, name: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

export async function PATCH(req: Request) {
  const check = await requireAdmin();
  if (check instanceof NextResponse) return check;

  const body = await req.json();
  const { userId, action, duration } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action === "ban") {
    const bannedUntil = duration
      ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
      : null;
    await db.user.update({
      where: { id: userId },
      data: { isBanned: true, banReason: "Admin ban", bannedUntil },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: check.userId,
        action: "ban_user",
        target: userId,
        detail: { duration },
      },
    });
  } else if (action === "unban") {
    await db.user.update({
      where: { id: userId },
      data: { isBanned: false, banReason: null, bannedUntil: null },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: check.userId,
        action: "unban_user",
        target: userId,
      },
    });
  } else if (action === "promote") {
    await db.user.update({
      where: { id: userId },
      data: { role: "admin" },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: check.userId,
        action: "promote_admin",
        target: userId,
      },
    });
  } else if (action === "demote") {
    await db.user.update({
      where: { id: userId },
      data: { role: "user" },
    });
    await db.adminAuditLog.create({
      data: {
        adminId: check.userId,
        action: "demote_admin",
        target: userId,
      },
    });
  }

  return NextResponse.json({ success: true });
}
