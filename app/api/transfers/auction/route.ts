import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { browseAuctionMarket, placeAuctionBid } from "@/server/transfers/auction";
import type { Position } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const position = searchParams.get("position") as Position | undefined;
  const minOverall = searchParams.get("minOverall")
    ? Number(searchParams.get("minOverall"))
    : undefined;
  const maxOverall = searchParams.get("maxOverall")
    ? Number(searchParams.get("maxOverall"))
    : undefined;
  const page = Number(searchParams.get("page") ?? 1);
  const pageSize = Number(searchParams.get("pageSize") ?? 20);

  const result = await browseAuctionMarket({
    position: position ?? undefined,
    minOverall,
    maxOverall,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) {
    return NextResponse.json({ error: "No club found" }, { status: 404 });
  }

  try {
    const body = (await req.json()) as {
      listingId: string;
      bidAmount: number;
      offerWage: number;
    };

    if (!body.listingId || !body.bidAmount || !body.offerWage) {
      return NextResponse.json(
        { error: "Missing required fields: listingId, bidAmount, offerWage" },
        { status: 400 },
      );
    }

    const bid = await placeAuctionBid({
      listingId: body.listingId,
      buyerClubId: club.id,
      bidAmount: body.bidAmount,
      offerWage: body.offerWage,
    });

    return NextResponse.json(bid);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}
