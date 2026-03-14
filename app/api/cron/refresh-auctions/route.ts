import { NextResponse } from "next/server";
import { resolveExpiredAuctions, refreshAuctionMarket } from "@/server/transfers/auction";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Settle expired auctions first
  const resolved = await resolveExpiredAuctions();

  // 2. Fill back up to 100 active auctions
  const generated = await refreshAuctionMarket();

  return NextResponse.json({
    resolved,
    generated,
  });
}
