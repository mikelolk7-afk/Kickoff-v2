import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getAdminStats } from "@/server/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const check = await requireAdmin();
  if (check instanceof NextResponse) return check;

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
