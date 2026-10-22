import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { getDb, orgs, resetDbCache, subscriptions } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import {
  createCheckoutSession,
  getSubscription,
  recordWebhookEvent,
  verifyWebhookSignature,
} from "./client";
import { StripeNotConfiguredError } from "./errors";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let fetchCalls: { url: string; init?: RequestInit }[] = [];
let realFetch: typeof fetch;
let tmpDbPath: string;

beforeEach(() => {
  realFetch = globalThis.fetch;
  fetchCalls = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCalls.push({ url: String(url), init });
    const u = String(url);
    if (u.includes("/v1/customers")) {
      return jsonResponse(200, { id: "cus_test123", object: "customer" });
    }
    if (u.includes("/v1/checkout/sessions")) {
      return jsonResponse(200, {
        id: "cs_test123",
        url: "https://checkout.stripe.com/c/pay/cs_test123",
        object: "checkout.session",
      });
    }
    return jsonResponse(404, { error: { message: "unexpected url" } });
  }) as typeof fetch;

  tmpDbPath = path.join(os.tmpdir(), `keylens-billing-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  process.env.DATABASE_URL = `file:${tmpDbPath}`;
  resetDbCache();
});

afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.DATABASE_URL;
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_MONTHLY;
  delete process.env.STRIPE_PRICE_ANNUAL;
  resetDbCache();
  if (tmpDbPath) {
    for (const suffix of ["", "-wal", "-shm"]) {
      try { fs.unlinkSync(tmpDbPath + suffix); } catch { /* ignore */ }
    }
  }
});

describe("createCheckoutSession", () => {
  it("throws StripeNotConfiguredError when STRIPE_SECRET_KEY is missing", async () => {
    await expect(
      createCheckoutSession({
        orgId: "org-1",
        plan: "monthly",
        successUrl: "https://app/success",
        cancelUrl: "https://app/cancel",
      }),
    ).rejects.toBeInstanceOf(StripeNotConfiguredError);
  });

  it("creates a customer then a checkout session with the right payload", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_secret";
    process.env.STRIPE_PRICE_MONTHLY = "price_monthly_1";

    const db = getDb();
    await db.insert(orgs).values({
      id: "org-1",
      name: "Acme",
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: [],
      createdAt: Date.now(),
    }).run();

    const result = await createCheckoutSession({
      orgId: "org-1",
      plan: "monthly",
      successUrl: "https://app/success",
      cancelUrl: "https://app/cancel",
    });

    expect(result.sessionId).toBe("cs_test123");
    expect(result.url).toContain("checkout.stripe.com");

    const customerCall = fetchCalls.find((c) => c.url.includes("/v1/customers"));
    const sessionCall = fetchCalls.find((c) => c.url.includes("/v1/checkout/sessions"));
    expect(customerCall).toBeDefined();
    expect(sessionCall).toBeDefined();
    expect(customerCall!.init?.headers).toMatchObject({ Authorization: "Bearer sk_test_secret" });
    expect(customerCall!.init?.headers).toMatchObject({ "Content-Type": "application/x-www-form-urlencoded" });

    const sessionBody = new URLSearchParams(sessionCall!.init?.body as string);
    expect(sessionBody.get("mode")).toBe("subscription");
    expect(sessionBody.get("customer")).toBe("cus_test123");
    expect(sessionBody.get("success_url")).toBe("https://app/success");
    expect(sessionBody.get("cancel_url")).toBe("https://app/cancel");
    expect(sessionBody.get("client_reference_id")).toBe("org-1");
    const lineItems = JSON.parse(sessionBody.get("line_items") ?? "[]") as { price: string }[];
    expect(lineItems[0]?.price).toBe("price_monthly_1");

    // Customer id was remembered; a second session reuses it.
    const customerCount = fetchCalls.filter((c) => c.url.includes("/v1/customers")).length;
    const second = await createCheckoutSession({
      orgId: "org-1",
      plan: "monthly",
      successUrl: "https://app/success",
      cancelUrl: "https://app/cancel",
    });
    expect(second.sessionId).toBe("cs_test123");
    expect(fetchCalls.filter((c) => c.url.includes("/v1/customers")).length).toBe(customerCount);
  });
});

describe("verifyWebhookSignature", () => {
  function makeHeader(secret: string, payload: string, t: number): string {
    const hex = createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex");
    return `t=${t},v1=${hex}`;
  }

  it("accepts a valid signature", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const t = Math.floor(Date.now() / 1000);
    expect(verifyWebhookSignature(secret, payload, makeHeader(secret, payload, t))).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ type: "checkout.session.completed" });
    const t = Math.floor(Date.now() / 1000);
    const header = makeHeader(secret, payload, t);
    expect(verifyWebhookSignature(secret, payload + "x", header)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const payload = "hello";
    const t = Math.floor(Date.now() / 1000);
    const header = makeHeader("whsec_correct", payload, t);
    expect(verifyWebhookSignature("whsec_wrong", payload, header)).toBe(false);
  });

  it("rejects malformed headers", () => {
    expect(verifyWebhookSignature("s", "payload", "not-a-signature")).toBe(false);
    expect(verifyWebhookSignature("s", "payload", "t=abc,v1=nope")).toBe(false);
  });
});

describe("recordWebhookEvent / getSubscription", () => {
  it("upserts a subscription by stripeCustomerId", async () => {
    const db = getDb();
    const orgId = "org-wh";
    await db.insert(orgs).values({
      id: orgId,
      name: "Wh Org",
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: [],
      createdAt: Date.now(),
    }).run();

    await recordWebhookEvent({
      db,
      stripeEvent: {
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_1",
            customer: "cus_1",
            subscription: "sub_1",
            metadata: { orgId, plan: "annual" },
          },
        },
      },
    });

    let sub = await getSubscription({ db, orgId });
    expect(sub).not.toBeNull();
    expect(sub?.stripeCustomerId).toBe("cus_1");
    expect(sub?.stripeSubscriptionId).toBe("sub_1");
    expect(sub?.plan).toBe("annual");
    expect(sub?.status).toBe("none");

    // Upsert: same customer, status change.
    await recordWebhookEvent({
      db,
      stripeEvent: {
        type: "customer.subscription.updated",
        data: {
          object: {
            id: "sub_1",
            customer: "cus_1",
            status: "active",
            current_period_end: 2000000000,
            items: { data: [{ price: { interval: "year" } }] },
          },
        },
      },
    });

    sub = await getSubscription({ db, orgId });
    expect(sub?.status).toBe("active");
    expect(sub?.currentPeriodEnd).toBe(2000000000 * 1000);
    const rows = await db.select().from(subscriptions).where(eq(subscriptions.orgId, orgId)).all();
    expect(rows).toHaveLength(1);
  });

  it("links by existing customer when orgId is absent", async () => {
    const db = getDb();
    const orgId = "org-wh2";
    await db.insert(orgs).values({
      id: orgId,
      name: "Wh Org 2",
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: [],
      createdAt: Date.now(),
    }).run();

    await recordWebhookEvent({
      db,
      stripeEvent: {
        type: "checkout.session.completed",
        data: {
          object: { id: "cs_2", customer: "cus_2", subscription: "sub_2", metadata: { orgId } },
        },
      },
    });
    await recordWebhookEvent({
      db,
      stripeEvent: {
        type: "customer.subscription.updated",
        data: { object: { id: "sub_2", customer: "cus_2", status: "past_due" } },
      },
    });

    const sub = await getSubscription({ db, orgId });
    expect(sub?.status).toBe("past_due");
  });
});
