import { NextResponse } from "next/server";
import { getAppDb } from "@/db";
import { getFirstOrg, usageSeries } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withGate(req, async () => {
    const url = new URL(req.url);
    const keyId = url.searchParams.get("keyId");
    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }
    const db = getAppDb();
    const org = await getFirstOrg(db);
    return NextResponse.json({ points: await usageSeries(db, org, keyId) });
  });
}
