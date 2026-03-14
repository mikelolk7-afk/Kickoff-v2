import { NextResponse } from "next/server";
import { processCompletedUpgrades } from "@/server/stadium/upgrades";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const completed = await processCompletedUpgrades();
  return NextResponse.json({ message: `Completed ${completed} upgrades`, count: completed });
}
