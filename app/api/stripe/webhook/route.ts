import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/stripe";
import { addCredits } from "@/server/credits";
import { db } from "@/lib/db";
import { CREDIT_PACKAGES } from "@/server/credits";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const event = await verifyWebhookSignature(body, signature);
  if (!event) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Record<string, unknown>;
      const metadata = session.metadata as Record<string, string> | undefined;
      const userId = metadata?.userId;
      const packageId = metadata?.packageId;

      if (!userId || !packageId) break;

      const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
      if (pkg) {
        await addCredits(
          userId,
          pkg.credits,
          session.id as string,
          `Purchased ${pkg.name} pack`
        );
      }
      break;
    }

    case "invoice.paid": {
      // Monthly Pass subscription renewal
      const invoice = event.data.object as Record<string, unknown>;
      const customerId = invoice.customer as string | undefined;
      if (!customerId) break;

      // Look up user by stripe customer ID (would need a stripeCustomerId field)
      // For now, mark the subscription as active via transaction
      break;
    }

    case "customer.subscription.deleted": {
      // Monthly Pass cancelled — stop daily drip
      break;
    }
  }

  return NextResponse.json({ received: true });
}
