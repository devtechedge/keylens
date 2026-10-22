import { NextResponse } from "next/server";
import { getSubscription } from "@keylens/billing";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withGate(req, async () => {
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json({ plan: null, status: "none", currentPeriodEnd: null });
    }
    const sub = await getSubscription({ db, orgId: org.id });
    if (!sub) {
      return NextResponse.json({ plan: null, status: "none", currentPeriodEnd: null });
    }
    return NextResponse.json({
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
    });
  });
}
