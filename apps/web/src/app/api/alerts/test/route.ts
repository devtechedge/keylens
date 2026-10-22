import { NextResponse } from "next/server";
import { sendAlert } from "@keylens/alerts";
import type { AnomalyEvent } from "@keylens/core";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withGate(req, async () => {
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }
    const event: AnomalyEvent = {
      id: `test-${Date.now()}`,
      orgId: org.id,
      kind: "other",
      severity: "info",
      title: "Test alert",
      detail: "Canned test event sent from Settings.",
      detectedAt: Date.now(),
      meta: { test: true },
    };
    const result = await sendAlert({ db, orgId: org.id, event });
    return NextResponse.json({ ok: true, delivered: result.delivered });
  });
}
