import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CREDIT_PACKAGES, MONTHLY_PASS, getTransactionHistory } from "@/server/credits";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { credits: true, coins: true },
  });

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") ?? 1);

  const history = await getTransactionHistory(session.user.id, page);

  return NextResponse.json({
    credits: user?.credits ?? 0,
    coins: user?.coins ?? 0,
    packages: CREDIT_PACKAGES,
    monthlyPass: MONTHLY_PASS,
    history,
  });
}
