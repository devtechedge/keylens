import { createHmac, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, subscriptions } from "@keylens/db";
import type { KeyLensDb, SubscriptionPlan, SubscriptionRow, SubscriptionStatus } from "@keylens/db";
import { StripeApiError, StripeNotConfiguredError } from "./errors";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

function requireSecretKey(): string {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new StripeNotConfiguredError("STRIPE_SECRET_KEY is not set");
  return secret;
}

function priceForPlan(plan: SubscriptionPlan): string {
  const price =
    plan === "annual" ? process.env.STRIPE_PRICE_ANNUAL : process.env.STRIPE_PRICE_MONTHLY;
  if (!price) {
    throw new StripeNotConfiguredError(
      plan === "annual" ? "STRIPE_PRICE_ANNUAL is not set" : "STRIPE_PRICE_MONTHLY is not set",
    );
  }
  return price;
}

/**
 * Minimal fetch-based Stripe API call. POST bodies are form-urlencoded.
 */
async function stripeCall<T>(
  path: string,
  secret: string,
  body?: Record<string, string>,
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${secret}`,
  };
  const init: RequestInit = { method: body ? "POST" : "GET", headers };
  if (body) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = new URLSearchParams(body).toString();
  }
  let res: Response;
  try {
    res = await fetch(`${STRIPE_API_BASE}${path}`, init);
  } catch (err) {
    throw new StripeApiError(`stripe network error: ${(err as Error).message}`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg = json && typeof json === "object" && "error" in json
      ? String((json as { error: { message?: string } }).error?.message ?? "")
      : text;
    throw new StripeApiError(`stripe API error ${res.status}: ${msg}`, res.status);
  }
  return json as T;
}

function formValue(obj: unknown): string {
  return JSON.stringify(obj);
}

export interface CheckoutSessionResult {
  url: string;
  sessionId: string;
}

export interface CreateCheckoutSessionArgs {
  orgId: string;
  plan: SubscriptionPlan;
  successUrl: string;
  cancelUrl: string;
}

function normalizePlan(plan: string): SubscriptionPlan {
  return plan === "annual" ? "annual" : "monthly";
}

function mapStatus(status: string): SubscriptionStatus {
  const s = status.toLowerCase();
  const valid: SubscriptionStatus[] = [
    "none", "trialing", "active", "past_due", "canceled", "incomplete", "unpaid",
  ];
  return valid.includes(s as SubscriptionStatus) ? (s as SubscriptionStatus) : "none";
}

/**
 * Create a Stripe Checkout Session for the org's plan. Finds or creates a
 * Stripe customer for the org (customer id is remembered in the
 * subscriptions row so subsequent sessions reuse it).
 */
export async function createCheckoutSession({
  orgId,
  plan,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionArgs): Promise<CheckoutSessionResult> {
  const secret = requireSecretKey();
  const price = priceForPlan(plan);

  let sub = await getSubscriptionByOrg(orgId);
  let customerId = sub?.stripeCustomerId ?? null;

  if (!customerId) {
    const customer = await stripeCall<{
      id?: string;
      object?: string;
    }>("/v1/customers", secret, {
      description: `KeyLens org ${orgId}`,
      metadata: formValue({ keylensOrgId: orgId }),
    });
    if (typeof customer.id !== "string") {
      throw new StripeApiError("stripe customer response missing id");
    }
    customerId = customer.id;
    const now = Date.now();
    await dbInsertSubscription({
      id: randomUUID(),
      orgId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: null,
      plan,
      status: "none",
      currentPeriodEnd: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  const session = await stripeCall<{
    id?: string;
    url?: string;
  }>("/v1/checkout/sessions", secret, {
    mode: "subscription",
    customer: customerId,
    line_items: formValue([{ quantity: 1, price }]),
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: orgId,
    metadata: formValue({ orgId, plan }),
  });

  if (typeof session.id !== "string" || typeof session.url !== "string") {
    throw new StripeApiError("stripe checkout session response missing id/url");
  }
  return { url: session.url, sessionId: session.id };
}

/**
 * Standard Stripe webhook signature verification: parse the
 * `stripe-signature` header (`t=...,v1=...`), recompute the HMAC-SHA256
 * over `${t}.${payload}`, compare timing-safe, and reject signatures older
 * than `toleranceMs`.
 */
export function verifyWebhookSignature(
  secret: string,
  payload: string | Buffer,
  signatureHeader: string,
  toleranceMs = 300_000,
): boolean {
  try {
    let t: number | null = null;
    let v1: string | null = null;
    for (const part of signatureHeader.split(",")) {
      const eqIdx = part.indexOf("=");
      if (eqIdx < 0) continue;
      const key = part.slice(0, eqIdx).trim();
      const value = part.slice(eqIdx + 1).trim();
      if (key === "t") t = Number(value);
      if (key === "v1") v1 = value;
    }
    if (t === null || !v1 || !Number.isFinite(t)) return false;
    if (Math.abs(Date.now() / 1000 - t) * 1000 > toleranceMs) return false;

    const body = typeof payload === "string" ? payload : payload.toString("utf8");
    const expected = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(v1, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface StripeEvent {
  type?: string;
  data?: {
    object?: Record<string, any>;
  };
  metadata?: Record<string, string>;
}

/**
 * Persist a Stripe webhook event into the subscriptions table (upsert by
 * stripeCustomerId). orgId is resolved from the event metadata, the
 * client_reference_id, or an existing row for the customer.
 */
export async function recordWebhookEvent({
  db,
  orgId,
  stripeEvent,
}: {
  db: KeyLensDb;
  orgId?: string;
  stripeEvent: StripeEvent;
}): Promise<void> {
  const obj = stripeEvent?.data?.object ?? {};
  const metadata = obj.metadata ?? stripeEvent?.metadata ?? {};

  let resolvedOrgId = orgId;
  if (!resolvedOrgId && typeof metadata.orgId === "string") resolvedOrgId = metadata.orgId;
  if (!resolvedOrgId && typeof obj.client_reference_id === "string") {
    resolvedOrgId = obj.client_reference_id;
  }

  const customerId =
    typeof obj.customer === "string" ? obj.customer : null;
  const subscriptionId =
    typeof obj.subscription === "string"
      ? obj.subscription
      : typeof obj.id === "string" && String(stripeEvent?.type ?? "").startsWith("customer.subscription")
        ? obj.id
        : null;

  if (!resolvedOrgId && customerId) {
    const existing = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .get();
    resolvedOrgId = existing?.orgId;
  }
  if (!resolvedOrgId) return; // cannot link event to an org

  const interval =
    obj?.items?.data?.[0]?.price?.interval ??
    obj?.plan?.interval ??
    obj?.price?.interval;
  const plan = normalizePlan(
    typeof metadata.plan === "string" ? metadata.plan : interval === "year" ? "annual" : "monthly",
  );
  const status = mapStatus(typeof obj.status === "string" ? obj.status : "none");
  const currentPeriodEnd =
    typeof obj.current_period_end === "number" ? Math.round(obj.current_period_end * 1000) : null;

  const existing = customerId
    ? await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, customerId)).get()
    : await db.select().from(subscriptions).where(eq(subscriptions.orgId, resolvedOrgId)).get();

  const now = Date.now();
  if (existing) {
    await db
      .update(subscriptions)
      .set({
        orgId: resolvedOrgId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        plan,
        status,
        currentPeriodEnd,
        updatedAt: now,
      })
      .where(eq(subscriptions.id, existing.id))
      .run();
  } else {
    await db
      .insert(subscriptions)
      .values({
        id: randomUUID(),
        orgId: resolvedOrgId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        plan,
        status,
        currentPeriodEnd,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }
}

/** Fetch the subscription row for an org. */
export async function getSubscription({
  db,
  orgId,
}: {
  db: KeyLensDb;
  orgId: string;
}): Promise<SubscriptionRow | null> {
  return (await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).get()) ?? null;
}

async function getSubscriptionByOrg(orgId: string): Promise<SubscriptionRow | null> {
  // Uses the shared default db client; the checkout flow does not receive a
  // db handle in its contract signature.
  return (await getDb().select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).get()) ?? null;
}

async function dbInsertSubscription(row: SubscriptionRow): Promise<void> {
  await getDb().insert(subscriptions).values(row).run();
}
