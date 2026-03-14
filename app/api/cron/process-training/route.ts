import { NextResponse } from "next/server";
import { processWeeklyTraining } from "@/server/training/weekly-tick";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playersUpdated = await processWeeklyTraining();
  return NextResponse.json({ message: `Updated ${playersUpdated} players`, count: playersUpdated });
}
