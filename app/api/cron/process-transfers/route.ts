import { NextResponse } from "next/server";
import { expireListings } from "@/server/transfers/listings";
import { expireOffers } from "@/server/transfers/offers";
import { resolveAuctions } from "@/server/transfers/auctions";
import { processAiTransferActivity } from "@/server/transfers/ai-activity";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiredListings = await expireListings();
  const expiredOffers = await expireOffers();
  const resolvedAuctions = await resolveAuctions();
  const aiActivity = await processAiTransferActivity();

  return NextResponse.json({
    expiredListings,
    expiredOffers,
    resolvedAuctions,
    aiActivity,
  });
}
