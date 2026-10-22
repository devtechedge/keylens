import { NextResponse } from "next/server";
import { createCheckoutSession, StripeNotConfiguredError } from "@keylens/billing";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

const ERROR_NOT_CONFIGURED = "Stripe not configured";

export async function POST(req: Request) {
  return withGate(req, async () => {
    const body = await req.json().catch(() => ({}));
    const plan = body.plan === "annual" ? "annual" : "monthly";
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { ok: false, error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }
    const origin = new URL(req.url).origin;
    try {
      const session = await createCheckoutSession({
        orgId: org.id,
        plan,
        successUrl: `${origin}/settings?checkout=success`,
        cancelUrl: `${origin}/pricing?checkout=canceled`,
      });
      return NextResponse.json({ ok: true, url: session.url, sessionId: session.sessionId });
    } catch (e) {
      if (e instanceof StripeNotConfiguredError) {
        return NextResponse.json({ ok: false, error: ERROR_NOT_CONFIGURED }, { status: 503 });
      }
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }
  });
}
