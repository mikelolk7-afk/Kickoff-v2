import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitOffer, acceptOffer, rejectOffer, counterOffer } from "@/server/transfers/offers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  try {
    const body = await req.json();
    const offer = await submitOffer({
      listingId: body.listingId,
      buyerClubId: club.id,
      offerFee: body.offerFee,
      offerWage: body.offerWage,
      isLoan: body.isLoan,
    });
    return NextResponse.json(offer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  try {
    const body = await req.json();
    const { offerId, action, counterFee } = body;

    if (action === "accept") {
      await acceptOffer(offerId, club.id);
    } else if (action === "reject") {
      await rejectOffer(offerId, club.id);
    } else if (action === "counter" && counterFee) {
      await counterOffer(offerId, club.id, counterFee);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const club = await db.club.findFirst({ where: { userId: session.user.id } });
  if (!club) return NextResponse.json({ error: "No club" }, { status: 404 });

  // Get offers received on my listings
  const receivedOffers = await db.transferOffer.findMany({
    where: {
      listing: { sellerClubId: club.id },
      status: { in: ["PENDING", "COUNTERED"] },
    },
    include: {
      listing: { include: { player: true } },
      buyerClub: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get my outgoing offers
  const sentOffers = await db.transferOffer.findMany({
    where: {
      buyerClubId: club.id,
      status: { in: ["PENDING", "COUNTERED"] },
    },
    include: {
      listing: { include: { player: true, sellerClub: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ receivedOffers, sentOffers });
}
