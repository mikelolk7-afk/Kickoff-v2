import { NextResponse } from "next/server";
import { processCompletedAssignments } from "@/server/scouting/reports";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processCompletedAssignments();
  return NextResponse.json({ message: `Processed ${processed} assignments`, count: processed });
}
