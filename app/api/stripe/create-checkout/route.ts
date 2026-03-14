import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CREDIT_PACKAGES, MONTHLY_PASS } from "@/server/credits";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { packageId } = body;

  // Find the package
  const creditPkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  const isMonthlyPass = packageId === "monthly_pass";

  if (!creditPkg && !isMonthlyPass) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  // In production: create a Stripe Checkout session
  // const session = await stripe.checkout.sessions.create({
  //   line_items: [{ price: pkg.stripePriceId, quantity: 1 }],
  //   mode: isMonthlyPass ? 'subscription' : 'payment',
  //   success_url: `${process.env.NEXTAUTH_URL}/store?success=true`,
  //   cancel_url: `${process.env.NEXTAUTH_URL}/store?cancelled=true`,
  //   metadata: { userId: session.user.id, packageId },
  // });

  // Placeholder response
  return NextResponse.json({
    url: `/store?success=true&package=${packageId}`,
    message: "Stripe integration placeholder — configure STRIPE_SECRET_KEY for live payments",
  });
}
