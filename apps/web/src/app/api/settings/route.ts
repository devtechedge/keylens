import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { orgs } from "@keylens/db";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

const VALID_SCHEDULES = ["weekly", "monthly", "manual"];

/**
 * Scaffold convenience route (beyond the frozen contract list): persists org
 * settings (rotation schedule, autoRotateExposed). Pure state write, no
 * business logic. Happy to move into a package if the team prefers.
 */
export async function PATCH(req: Request) {
  return withGate(req, async () => {
    const body = await req.json().catch(() => ({}));
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (
      typeof body.rotationSchedule === "string" &&
      VALID_SCHEDULES.includes(body.rotationSchedule)
    ) {
      patch.rotationSchedule = body.rotationSchedule;
    }
    if (typeof body.autoRotateExposed === "boolean") {
      patch.autoRotateExposed = body.autoRotateExposed;
    }

    if (Object.keys(patch).length > 0) {
      await db.update(orgs).set(patch).where(eq(orgs.id, org.id)).run();
    }

    const updated = await db.select().from(orgs).where(eq(orgs.id, org.id)).get();
    return NextResponse.json({
      org: {
        id: updated?.id ?? org.id,
        name: updated?.name ?? org.name,
        rotationSchedule: updated?.rotationSchedule ?? org.rotationSchedule,
        autoRotateExposed:
          updated?.autoRotateExposed ?? org.autoRotateExposed,
      },
    });
  });
}
