import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createAuction, placeBid } from "@/server/transfers/auctions";

export async function GET() {
  const auctions = await db.transferListing.findMany({
    where: {
      listingType: "AUCTION",
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
    },
    include: {
      player: true,
      sellerClub: { select: { id: true, name: true } },
      _count: { select: { offers: true } },
    },
    orderBy: { expiresAt: "asc" },
  });

  return NextResponse.json(auctions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  try {
    const body = await req.json();

    if (body.action === "bid") {
      const bid = await placeBid(body.listingId, club.id, body.bidAmount, body.offerWage);
      return NextResponse.json(bid);
    }

    const auction = await createAuction({
      playerId: body.playerId,
      sellerClubId: club.id,
      startingPrice: body.startingPrice,
      durationHours: body.durationHours ?? 24,
    });
    return NextResponse.json(auction);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
