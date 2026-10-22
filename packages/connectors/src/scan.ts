import { eq, inArray } from "drizzle-orm";
import { keys } from "@keylens/db";
import type { KeyLensDb, KeyRow } from "@keylens/db";
import type { AIKey, KeySourceType, ScanSummary } from "@keylens/core";
import { isMockMode } from "./mock";
import { connectorFor } from "./registry";

export interface ScanOrgArgs {
  db: KeyLensDb;
  orgId: string;
  sources?: KeySourceType[];
}

function rowToKey(row: KeyRow): AIKey {
  return {
    id: row.id,
    orgId: row.orgId,
    provider: row.provider,
    label: row.label ?? undefined,
    fingerprint: row.fingerprint,
    masked: row.masked,
    status: row.status,
    sourceType: row.sourceType,
    sourceRef: row.sourceRef ?? undefined,
    ownerEmail: row.ownerEmail ?? undefined,
    createdAt: new Date(row.createdAt).toISOString(),
    lastSeenAt: row.lastSeenAt != null ? new Date(row.lastSeenAt).toISOString() : undefined,
    lastRotatedAt: row.lastRotatedAt != null ? new Date(row.lastRotatedAt).toISOString() : undefined,
    meta: row.meta,
  };
}

/** Mock scan: return the org's seeded `_demo` keys (no network). */
async function mockScanOrg(
  db: KeyLensDb,
  orgId: string,
  sources?: KeySourceType[],
): Promise<ScanSummary> {
  const rows = await db.select().from(keys).where(eq(keys.orgId, orgId)).all();
  const now = Date.now();
  const found: AIKey[] = [];
  for (const row of rows) {
    if (row.meta?._demo !== true) continue;
    if (sources && sources.length > 0 && !sources.includes(row.sourceType)) continue;
    found.push(rowToKey(row));
  }
  for (const row of rows) {
    await db.update(keys).set({ lastSeenAt: now }).where(eq(keys.id, row.id)).run();
  }
  const providersFound = [...new Set(found.map((k) => k.provider))];
  return {
    orgId,
    scannedAt: now,
    scannedRepos: 0,
    candidateSecrets: found.length,
    newKeys: found,
    providersFound,
  };
}

const DEFAULT_SOURCES: KeySourceType[] = [
  "github-repo",
  "github-actions",
  "vercel",
  "netlify",
  "aws-secrets",
  "gcp-secrets",
  "gateway",
];

/**
 * Persist findings from real connectors: skip fingerprints already known to
 * the org (touch lastSeenAt instead) and insert the rest as status "unknown".
 */
async function persistFindings(db: KeyLensDb, orgId: string, findings: AIKey[]): Promise<AIKey[]> {
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

/**
 * Orchestrate connectors for an org. In mock mode returns seeded demo keys.
 * In real mode each registered connector runs and findings are persisted,
 * deduped by fingerprint.
 */
export async function scanOrg({ db, orgId, sources }: ScanOrgArgs): Promise<ScanSummary> {
  if (isMockMode()) return mockScanOrg(db, orgId, sources);

  const sourceTypes = sources && sources.length > 0 ? sources : DEFAULT_SOURCES;
  const found: AIKey[] = [];
  let scannedRepos = 0;
  for (const sourceType of sourceTypes) {
    const connector = connectorFor(sourceType);
    if (!connector) continue;
    const result = await connector.scan({ db, orgId });
    found.push(...result);
    if (sourceType === "github-repo") {
      scannedRepos = Math.max(scannedRepos, result.length);
    }
  }

  const persisted = await persistFindings(db, orgId, found);
  const providersFound = [...new Set(found.map((k) => k.provider))];
  return {
    orgId,
    scannedAt: Date.now(),
    scannedRepos,
    candidateSecrets: found.length,
    newKeys: persisted,
    providersFound,
  };
}
