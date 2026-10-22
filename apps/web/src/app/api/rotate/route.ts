import { NextResponse } from "next/server";
import { runRotation } from "@keylens/rotation";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withGate(req, async () => {
    const body = await req.json().catch(() => ({}));
    const keyId = typeof body.keyId === "string" ? body.keyId : "";
    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }
    const dryRun = body.dryRun === false ? false : true;
    const summary = await runRotation({
      db,
      orgId: org.id,
      keyIds: [keyId],
      dryRun,
    });
    return NextResponse.json(summary);
  });
}
