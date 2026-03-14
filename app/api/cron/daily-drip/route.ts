import { NextResponse } from "next/server";
import { processDailyDrip } from "@/server/credits";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dripped = await processDailyDrip();
  return NextResponse.json({ message: `Dripped credits to ${dripped} subscribers`, count: dripped });
}
