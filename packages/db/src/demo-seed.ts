/**
 * KeyLens demo seed engine.
 *
 * `seedDemoData(db)` inserts the deterministic demo story into an ALREADY
 * OPEN database (data path or :memory:). It never wipes files itself: callers
 * decide when to wipe (CLI `pnpm seed`) or when to seed an empty store
 * (serverless boot, `SEED_DEMO_ON_EMPTY`).
 *
 * Story shape (identical to the CLI seed):
 *   - 1 org: Acme Labs
 *   - 8 keys (key-001..key-008) across providers with a status mix
 *   - Hourly usage for the last 14 days on keys 001-006, including a spend
 *     spike on the leaked key (key-001) ~3 days ago (~$293 that day vs
 *     ~$5 baseline, ~10x call volume, half the spike hours region "unknown")
 *   - 2 open anomalies (spend-spike on key-001, new-key-found on key-008)
 *   - 1 rotation job queued for key-001 (next Monday 09:00 local)
 *
 * Deterministic: all jitter comes from a fixed-seed PRNG, so repeated runs
 * produce the same story shape.
 */
import { fingerprint, mask } from "@keylens/core";
import type { KeyLensDb } from "./client";
import {
  orgs,
  keys,
  usagePoints,
  anomalies,
  rotationJobs,
  type KeyRow,
} from "./schema";

export const ORG_ID = "org-acme";
export const ORG_NAME = "Acme Labs";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
export const USAGE_DAYS = 14;
const USAGE_HOURS = USAGE_DAYS * 24; // 336 hourly points per key

export interface SeedReport {
  orgId: string;
  keys: number;
  usagePoints: number;
  anomalies: number;
  rotationJobs: number;
}

/** Fixed-seed PRNG (mulberry32) so the story is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic jitter in [-spread, +spread] around 0. */
function jitter(rng: () => number, spread: number): number {
  return (rng() - 0.5) * 2 * spread;
}

interface KeyUsageSpec {
  callsPerHour: number;
  tokensPerCall: number;
  spendUsdPerHour: number;
}

/** Hourly usage baselines for the keys that get usage points (001-006). */
const KEY_USAGE_SPEC: Record<string, KeyUsageSpec> = {
  "key-001": { callsPerHour: 48, tokensPerCall: 1800, spendUsdPerHour: 0.2 },
  "key-002": { callsPerHour: 40, tokensPerCall: 1500, spendUsdPerHour: 0.1 },
  "key-003": { callsPerHour: 30, tokensPerCall: 1000, spendUsdPerHour: 0.05 },
  "key-004": { callsPerHour: 8, tokensPerCall: 1600, spendUsdPerHour: 0.012 },
  "key-005": { callsPerHour: 6, tokensPerCall: 1200, spendUsdPerHour: 0.01 },
  "key-006": { callsPerHour: 14, tokensPerCall: 900, spendUsdPerHour: 0.015 },
};

interface UsageSeedRow {
  id: string;
  keyId: string;
  periodStart: number;
  spendUsd: number; // micro-dollars
  tokens: number;
  calls: number;
  errors: number;
  region: string | null;
}

/** Fake raw key strings (never persisted raw - only fingerprint/masked). */
const RAW_KEYS: Record<string, string> = {
  "key-001": "sk-proj-9f3aB7cD2eF1gH8iJ0kL4mN6oP2qR5sT7uV9wX1yZ",
  "key-002": "sk-proj-A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U",
  "key-003": "sk-ant-api03-V7w8X9y0Z1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o",
  "key-004": "AKIAIOSFODNN7EXAMPLE",
  "key-005": "AIzaSyD-9x8y7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f",
  "key-006": "sk-proj-K0l1M2n3O4p5Q6r7S8t9U0v1W2x3Y4z5A6b7C8d9E0",
  "key-007": "sk-proj-P1q2R3s4T5u6V7w8X9y0Z1a2B3c4D5e6F7g8H9i0J",
  "key-008": "3f5c9a1b7d2e8f4a6c0b9d1e2f3a4b5c6d7e8f9a0b1c",
};

/** Build the key row definitions (schema-shaped, no raw secrets). */
function buildKeys(now: number, lastSeenAt: number): KeyRow[] {
  const day = DAY_MS;
  const rows: KeyRow[] = [
    {
      id: "key-001",
      orgId: ORG_ID,
      provider: "openai",
      label: "Prod GPT-4 key (exposed in GitHub)",
      fingerprint: fingerprint(RAW_KEYS["key-001"]!),
      masked: mask(RAW_KEYS["key-001"]!),
      status: "leaked",
      sourceType: "github-repo",
      sourceRef: "acme/prod-web:src/lib/ai.ts#L42",
      ownerEmail: "dev@acme.dev",
      createdAt: now - 30 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true, demoKind: "leaked-high-burn" },
    },
    {
      id: "key-002",
      orgId: ORG_ID,
      provider: "openai",
      label: "Prod assistant API key",
      fingerprint: fingerprint(RAW_KEYS["key-002"]!),
      masked: mask(RAW_KEYS["key-002"]!),
      status: "active",
      sourceType: "gateway",
      sourceRef: null,
      ownerEmail: "platform@acme.dev",
      createdAt: now - 60 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
    {
      id: "key-003",
      orgId: ORG_ID,
      provider: "anthropic",
      label: "Claude agent key",
      fingerprint: fingerprint(RAW_KEYS["key-003"]!),
      masked: mask(RAW_KEYS["key-003"]!),
      status: "active",
      sourceType: "gateway",
      sourceRef: null,
      ownerEmail: "agents@acme.dev",
      createdAt: now - 45 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
    {
      id: "key-004",
      orgId: ORG_ID,
      provider: "aws-bedrock",
      label: null,
      fingerprint: fingerprint(RAW_KEYS["key-004"]!),
      masked: mask(RAW_KEYS["key-004"]!),
      status: "active",
      sourceType: "aws-secrets",
      sourceRef: "arn:aws:secretsmanager:us-east-1:123456789012:secret:acme/bedrock",
      ownerEmail: "platform@acme.dev",
      createdAt: now - 90 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
    {
      id: "key-005",
      orgId: ORG_ID,
      provider: "gemini",
      label: null,
      fingerprint: fingerprint(RAW_KEYS["key-005"]!),
      masked: mask(RAW_KEYS["key-005"]!),
      status: "active",
      sourceType: "gcp-secrets",
      sourceRef: "projects/acme-labs/secrets/gemini-key",
      ownerEmail: "platform@acme.dev",
      createdAt: now - 75 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
    {
      id: "key-006",
      orgId: ORG_ID,
      provider: "openai",
      label: "Staging key",
      fingerprint: fingerprint(RAW_KEYS["key-006"]!),
      masked: mask(RAW_KEYS["key-006"]!),
      status: "active",
      sourceType: "github-actions",
      sourceRef: "acme/ci:.github/workflows/ci.yml",
      ownerEmail: "dev@acme.dev",
      createdAt: now - 14 * day,
      lastSeenAt,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
    {
      id: "key-007",
      orgId: ORG_ID,
      provider: "openai",
      label: null,
      fingerprint: fingerprint(RAW_KEYS["key-007"]!),
      masked: mask(RAW_KEYS["key-007"]!),
      status: "retired",
      sourceType: "manual",
      sourceRef: null,
      ownerEmail: null,
      createdAt: now - 120 * day,
      lastSeenAt: now - 40 * day,
      lastRotatedAt: now - 40 * day,
      meta: { _demo: true },
    },
    {
      id: "key-008",
      orgId: ORG_ID,
      provider: "azure-openai",
      label: null,
      fingerprint: fingerprint(RAW_KEYS["key-008"]!),
      masked: mask(RAW_KEYS["key-008"]!),
      status: "unknown",
      sourceType: "vercel",
      sourceRef: "vercel-project/acme-prod:env/AZURE_OPENAI_API_KEY",
      ownerEmail: null,
      createdAt: now - 1 * day,
      lastSeenAt: now - 1 * day,
      lastRotatedAt: null,
      meta: { _demo: true },
    },
  ];
  return rows;
}

/** Generate the 14-day hourly usage for keys 001-006. */
function buildUsage(hourBase: number): UsageSeedRow[] {
  const rng = mulberry32(0x5eed_cafe);
  const spikeStartHour = 72; // 3 days ago
  const spikeEndHour = 95; // inclusive; exactly 24 hours
  const rows: UsageSeedRow[] = [];

  for (const keyId of ["key-001", "key-002", "key-003", "key-004", "key-005", "key-006"]) {
    const spec = KEY_USAGE_SPEC[keyId]!;
    for (let h = 0; h < USAGE_HOURS; h++) {
      const periodStart = hourBase - h * HOUR_MS;
      const isSpikeHour = keyId === "key-001" && h >= spikeStartHour && h <= spikeEndHour;

      let calls: number;
      let tokens: number;
      let spendUsd: number; // dollars (float, converted to micros later)
      let errors: number;
      let region: string | null;

      if (isSpikeHour) {
        // ~10x normal call volume; spend lands in ~$12-13/hour range.
        calls = Math.round(480 * (1 + jitter(rng, 0.1)));
        tokens = Math.round(calls * 1800 * (1 + jitter(rng, 0.1)));
        spendUsd = 12.2 * (1 + jitter(rng, 0.06));
        errors = rng() < 0.5 ? 1 + Math.floor(rng() * 4) : 0;
        region = h % 2 === 0 ? "unknown" : "us-east-1";
      } else {
        calls = Math.max(1, Math.round(spec.callsPerHour * (1 + jitter(rng, 0.12))));
        tokens = Math.round(calls * spec.tokensPerCall * (1 + jitter(rng, 0.15)));
        spendUsd = Math.max(
          0.0005,
          spec.spendUsdPerHour * (1 + jitter(rng, 0.15)),
        );
        errors = rng() < 0.04 ? Math.floor(rng() * 3) : 0;
        region = "us-east-1";
      }

      rows.push({
        id: `usage-${String(rows.length).padStart(6, "0")}`,
        keyId,
        periodStart,
        spendUsd: Math.round(spendUsd * 1e6),
        tokens,
        calls,
        errors,
        region,
      });
    }
  }

  // Normalize the spike day (key-001, hours 72..95) to exactly $293.00 so the
  // anomaly detail ("$293 vs ~$5 baseline") matches the data byte-for-byte.
  const spikeMicros = 293_000_000;
  const spikeRows = rows.filter(
    (r) =>
      r.keyId === "key-001" &&
      r.periodStart >= hourBase - spikeEndHour * HOUR_MS &&
      r.periodStart <= hourBase - spikeStartHour * HOUR_MS,
  );
  const rawSpikeSum = spikeRows.reduce((sum, r) => sum + r.spendUsd, 0);
  if (rawSpikeSum > 0 && spikeRows.length === 24) {
    const factor = spikeMicros / rawSpikeSum;
    let rounded = 0;
    for (const r of spikeRows) {
      r.spendUsd = Math.round(r.spendUsd * factor);
      rounded += r.spendUsd;
    }
    // Fix rounding drift on the highest-spend hour so the total is exact.
    const delta = spikeMicros - rounded;
    if (delta !== 0) {
      let richest = spikeRows[0]!;
      for (const r of spikeRows) if (r.spendUsd > richest.spendUsd) richest = r;
      richest.spendUsd += delta;
    }
  }

  return rows;
}

function buildAnomalies(hourBase: number) {
  // Spike hours span ages 72..95; the spike day starts at the oldest spike hour.
  const spikeDayStart = hourBase - 95 * HOUR_MS;
  const yesterday = hourBase - 24 * HOUR_MS;
  return [
    {
      id: "anom-001",
      orgId: ORG_ID,
      keyId: "key-001",
      kind: "spend-spike" as const,
      severity: "high" as const,
      title: "Spend spike detected on Prod GPT-4 key",
      detail:
        "Spend spike detected on Prod GPT-4 key: $293.00 in a single day vs ~$5 daily baseline, with ~10x normal call volume. Check for misuse or continued exposure.",
      detectedAt: spikeDayStart,
      resolvedAt: null,
      meta: { _demo: true, day: new Date(spikeDayStart).toISOString() },
    },
    {
      id: "anom-002",
      orgId: ORG_ID,
      keyId: "key-008",
      kind: "new-key-found" as const,
      severity: "medium" as const,
      title: "New key discovered: azure-openai on Vercel",
      detail:
        "Discovered an azure-openai API key in Vercel environment variables for acme-prod. Status unknown; verify ownership and rotate if not recognized.",
      detectedAt: yesterday,
      resolvedAt: null,
      meta: { _demo: true },
    },
  ];
}

/** Next Monday at 09:00 in local time (unix ms). */
function nextMondayNineLocal(now: Date): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=Sun .. 6=Sat
  const daysUntilMonday = ((8 - dow) % 7) || 7; // Mon(1) -> 7; Sun(0) -> 1; Tue(2) -> 6
  d.setDate(d.getDate() + daysUntilMonday);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}

/**
 * Insert the full demo story into an open database. Caller is responsible
 * for the database being empty or for accepting a duplicate-key failure.
 */
export async function seedDemoData(
  db: KeyLensDb,
  opts: { now?: number } = {},
): Promise<SeedReport> {
  const now = opts.now ?? Date.now();
  const hourBase = now - (now % HOUR_MS); // align to an hour boundary
  const lastSeenAt = hourBase;
  const createdAt = now - 120 * DAY_MS;

  // 1. Org (libsql client is async - always await .run())
  await db.insert(orgs)
    .values({
      id: ORG_ID,
      name: ORG_NAME,
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: ["slack"],
      createdAt,
    })
    .run();

  // 2. Keys
  const keyRows = buildKeys(now, lastSeenAt);
  await db.insert(keys).values(keyRows).run();

  // 3. Usage (14 days x 24h x 6 keys)
  const usageRows = buildUsage(hourBase);
  for (let i = 0; i < usageRows.length; i += 250) {
    await db.insert(usagePoints).values(usageRows.slice(i, i + 250)).run();
  }

  // 4. Anomalies
  await db.insert(anomalies).values(buildAnomalies(hourBase)).run();

  // 5. Rotation job (queued for the leaked key, next Monday 09:00 local)
  await db.insert(rotationJobs)
    .values({
      id: "rot-001",
      orgId: ORG_ID,
      keyId: "key-001",
      provider: "openai",
      status: "queued",
      scheduledFor: nextMondayNineLocal(new Date(now)),
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null,
    })
    .run();

  return {
    orgId: ORG_ID,
    keys: keyRows.length,
    usagePoints: usageRows.length,
    anomalies: 2,
    rotationJobs: 1,
  };
}
