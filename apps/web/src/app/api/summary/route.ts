import { NextResponse } from "next/server";
import { readyDb } from "@/db";
import { getFirstOrg, getSummary } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return withGate(req, async () => {
    const db = await readyDb();
    const org = await getFirstOrg(db);
    return NextResponse.json(await getSummary(db, org));
  });
}
