import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { resolveReport } from "@/server/moderation";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const check = await requireAdmin();
  if (check instanceof NextResponse) return check;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";

  const reports = await db.moderationReport.findMany({
    where: { status: status as "PENDING" | "REVIEWED" | "ACTION_TAKEN" | "DISMISSED" },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      reportedBy: { select: { name: true, email: true } },
      targetUser: { select: { name: true, email: true, isBanned: true } },
    },
  });

  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  const check = await requireAdmin();
  if (check instanceof NextResponse) return check;

  const body = await req.json();
  const { reportId, action, duration } = body;

  if (!reportId || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await resolveReport(reportId, check.userId, action, duration);
  return NextResponse.json(result);
}
