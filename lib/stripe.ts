// Stripe configuration placeholder
// In production, import Stripe and configure with your secret key
// import Stripe from 'stripe';
// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/**
 * Verify Stripe webhook signature.
 * In production, use stripe.webhooks.constructEvent().
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<{ type: string; data: { object: Record<string, unknown> } } | null> {
  // Placeholder: in production, verify with Stripe SDK
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn("STRIPE_WEBHOOK_SECRET not set — skipping verification");
    return null;
  }

  try {
    // const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    // return event;
    return JSON.parse(body);
  } catch {
    return null;
  }
}
