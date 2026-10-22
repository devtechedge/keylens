import { NextResponse } from "next/server";
import { recordWebhookEvent, verifyWebhookSignature } from "@keylens/billing";
import { readyDb } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Deliberately NOT portal-gated: Stripe does not send
 * x-portal-token; authenticity comes from the Stripe signature verification
 * itself (secret from STRIPE_WEBHOOK_SECRET).
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  const body = await req.text(); // raw body, required for HMAC verification

  if (!secret || !signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }
  if (!verifyWebhookSignature(secret, body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  interface StripeEventShape {
    type?: string;
    data?: {
      object?: Record<string, unknown>;
    };
    metadata?: Record<string, string>;
  }

  let event: StripeEventShape;
  try {
    event = JSON.parse(body) as StripeEventShape;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = await readyDb();
  await recordWebhookEvent({ db, stripeEvent: event });
  return NextResponse.json({ ok: true });
}
