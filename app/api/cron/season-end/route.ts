import { NextResponse } from "next/server";
import { runAllSeasonEnds } from "@/server/season/end";

export const dynamic = "force-dynamic";

/**
 * Cron: End of season — runs after all match weeks complete.
 * Vercel Cron or manual trigger.
 * POST /api/cron/season-end
 */
export async function POST(req: Request) {
  try {
    // Simple auth check for cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await runAllSeasonEnds();
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Season end error:", error);
    return NextResponse.json(
      { error: "Season end failed" },
      { status: 500 }
    );
  }
}
