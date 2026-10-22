import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { anomalies } from "@keylens/db";
import { readyDb } from "@/db";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

/**
 * Scaffold convenience route (beyond the frozen contract list): resolves an
 * open anomaly by stamping resolvedAt. Pure state write, no analysis logic.
 * The contract has no resolve function, so this lives here for now; happy to
 * hand it to @keylens/worker or a package if the team prefers.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return withGate(req, async () => {
    const { id } = await params;
    const db = await readyDb();
    const result = await db
      .update(anomalies)
      .set({ resolvedAt: Date.now() })
      .where(eq(anomalies.id, id))
      .run();
    if (result.rowsAffected === 0) {
      return NextResponse.json({ error: "Anomaly not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  });
}
