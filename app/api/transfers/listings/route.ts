import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { browseListings, createListing, withdrawListing } from "@/server/transfers/listings";
import type { ListingType } from "@prisma/client";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const position = searchParams.get("position") ?? undefined;
  const minOverall = searchParams.get("minOverall")
    ? Number(searchParams.get("minOverall"))
    : undefined;
  const maxPrice = searchParams.get("maxPrice")
    ? Number(searchParams.get("maxPrice"))
    : undefined;
  const listingType = searchParams.get("type") as ListingType | undefined;
  const page = Number(searchParams.get("page") ?? 1);

  const result = await browseListings({
    position,
    minOverall,
    maxPrice,
    listingType,
    page,
  });

  return NextResponse.json(result);
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
    const listing = await createListing({
      playerId: body.playerId,
      sellerClubId: club.id,
      askingPrice: body.askingPrice,
      listingType: body.listingType ?? "SALE",
      loanDuration: body.loanDuration,
      loanFee: body.loanFee,
      wagePct: body.wagePct,
    });
    return NextResponse.json(listing);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("id");
  if (!listingId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    await withdrawListing(listingId, club.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
