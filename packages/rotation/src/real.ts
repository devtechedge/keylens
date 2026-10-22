import { eq } from "drizzle-orm";
import { keys } from "@keylens/db";
import type { KeyLensDb, KeyRow } from "@keylens/db";
import { fingerprint } from "@keylens/core";
import { createServiceAccountKey, createServiceAccountWithKey } from "@keylens/connectors";

export interface RealRotateResult {
  ok: boolean;
  result?: string;
  error?: string;
}

function credentialError(): Error {
  return new Error("real openai rotation requires OPENAI_ADMIN_KEY and OPENAI_PROJECT_ID");
}

/**
 * Real OpenAI key swap: create a new service-account key, mark the old key
 * rotating, then active with the new fingerprint/masked value. Only runs
 * when MOCK_MODE=false and OPENAI_ADMIN_KEY + OPENAI_PROJECT_ID are set.
 * Other providers keep a "guided rotation" placeholder result.
 */
export async function realRotateKey(
  db: KeyLensDb,
  key: KeyRow,
): Promise<RealRotateResult> {
  if (key.provider !== "openai") {
    return {
      ok: true,
      result: `guided rotation: ${key.provider} - rotate manually in provider console`,
    };
  }

  const token = process.env.OPENAI_ADMIN_KEY;
  const projectId = process.env.OPENAI_PROJECT_ID;
  if (!token || !projectId) return { ok: false, error: credentialError().message };

  const serviceAccountId =
    typeof key.meta?.serviceAccountId === "string" ? key.meta.serviceAccountId : undefined;
  const label = key.label ?? key.id;

  try {
    // Mark old key rotating while the swap is in flight.
    await db.update(keys).set({ status: "rotating" }).where(eq(keys.id, key.id)).run();

    let created: Awaited<ReturnType<typeof createServiceAccountKey>>;
    let newSaId: string | undefined = serviceAccountId;
    if (serviceAccountId) {
      created = await createServiceAccountKey({
        token,
        projectId,
        serviceAccountId,
        name: label,
      });
    } else {
      const full = await createServiceAccountWithKey({
        token,
        projectId,
        name: label,
      });
      created = full;
      newSaId = full.id;
    }

    const now = Date.now();
    await db
      .update(keys)
      .set({
        status: "active",
        lastRotatedAt: now,
        fingerprint: fingerprint(created.rawKey),
        masked: created.masked,
        meta: {
          ...key.meta,
          _rotatedFromFingerprint: key.fingerprint,
          serviceAccountId: newSaId,
          rotatedKeyId: created.keyId,
        },
      })
      .where(eq(keys.id, key.id))
      .run();

    return {
      ok: true,
      result: `real openai rotate: created key ${created.keyId} masked ${created.masked}`,
    };
  } catch (err) {
    // Revert to active so a failed swap never leaves the key stuck rotating.
    await db.update(keys).set({ status: "active" }).where(eq(keys.id, key.id)).run();
    return { ok: false, error: (err as Error).message };
  }
}

/** Whether real rotation is available for a key with current env/config. */
export function realRotationAvailable(key: Pick<KeyRow, "provider">): boolean {
  return (
    process.env.MOCK_MODE === "false" &&
    key.provider === "openai" &&
    !!process.env.OPENAI_ADMIN_KEY &&
    !!process.env.OPENAI_PROJECT_ID
  );
}
