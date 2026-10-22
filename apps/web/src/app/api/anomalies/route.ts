import { NextResponse } from "next/server";
import { readyDb } from "@/db";
import { getFirstOrg, listOpenAnomalies } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withGate(req, async () => {
    const db = await readyDb();
    const org = await getFirstOrg(db);
    return NextResponse.json({ anomalies: await listOpenAnomalies(db, org) });
  });
}
