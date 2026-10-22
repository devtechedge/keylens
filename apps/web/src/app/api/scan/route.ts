import { NextResponse } from "next/server";
import { scanOrg } from "@keylens/connectors";
import { getAppDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return withGate(req, async () => {
    const db = getAppDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }
    const body = await req.json().catch(() => ({}));
    const sources = Array.isArray(body.sources) ? body.sources : undefined;
    const summary = await scanOrg({ db, orgId: org.id, sources });
    return NextResponse.json(summary);
  });
}
