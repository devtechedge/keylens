import { inArray } from "drizzle-orm";
import { keys } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import type { AIKey } from "@keylens/core";

/**
 * Persist findings from real connectors: skip fingerprints already known to
 * the org (touch lastSeenAt instead) and insert the rest as status "unknown".
 */
export async function persistFindings(db: KeyLensDb, orgId: string, findings: AIKey[]): Promise<AIKey[]> {
  if (findings.length === 0) return [];
  const fingerprints = [...new Set(findings.map((f) => f.fingerprint))];

  const existing = await db
    .select({ fingerprint: keys.fingerprint, id: keys.id })
    .from(keys)
    .where(inArray(keys.fingerprint, fingerprints))
    .all();
  const existingFingerprints = new Set(existing.map((e) => e.fingerprint));
  const now = Date.now();

  if (existing.length > 0) {
    const existingIds = existing.map((e) => e.id);
    await db.update(keys).set({ lastSeenAt: now }).where(inArray(keys.id, existingIds)).run();
  }

  const fresh = findings.filter((f) => !existingFingerprints.has(f.fingerprint));
  if (fresh.length > 0) {
    const rows = fresh.map((f) => ({
      id: `real-${f.fingerprint.slice(0, 24)}-${orgId.slice(-6)}`,
      orgId,
      provider: f.provider,
      label: f.label ?? null,
      fingerprint: f.fingerprint,
      masked: f.masked,
      status: "unknown" as const,
      sourceType: f.sourceType,
      sourceRef: f.sourceRef ?? null,
      ownerEmail: null,
      createdAt: now,
      lastSeenAt: now,
      lastRotatedAt: null,
      meta: f.meta ?? {},
    }));
    await db.insert(keys).values(rows).run();
  }

  return fresh;
}
