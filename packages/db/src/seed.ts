/**
 * KeyLens demo seed CLI (`pnpm seed`).
 *
 * Wipes any existing DB file and reseeds a deterministic demo story:
 *   - 1 org: Acme Labs
 *   - 8 keys (key-001..key-008) across providers with a status mix
 *   - Hourly usage for the last 14 days on keys 001-006, including a spend
 *     spike on the leaked key (key-001) ~3 days ago (~$293 that day vs
 *     ~$5 baseline, ~10x call volume, half the spike hours region "unknown")
 *   - 2 open anomalies (spend-spike on key-001, new-key-found on key-008)
 *   - 1 rotation job queued for key-001 (next Monday 09:00 local)
 *
 * Idempotent: wipe + reseed. Deterministic: all jitter comes from a fixed-
 * seed PRNG, so repeated runs produce the same story shape.
 *
 * The insertion logic itself lives in `./demo-seed.ts` (`seedDemoData`):
 * serverless boot shares the same story via SEED_DEMO_ON_EMPTY.
 */
import fs from "node:fs";
import path from "node:path";
import { getDb, resolveDbPath, resetDbCache } from "./client";
import { seedDemoData, ORG_ID, ORG_NAME, USAGE_DAYS } from "./demo-seed";

async function main(): Promise<void> {
  const now = Date.now();

  // Idempotent wipe: close any cached handle, then remove DB + WAL/SHM files
  // *before* opening, so a standalone reseed always starts clean.
  resetDbCache();
  const dbPath = resolveDbPath();
  for (const suffix of ["", "-wal", "-shm"]) {
    fs.rmSync(path.join(path.dirname(dbPath), path.basename(dbPath) + suffix), {
      force: true,
    });
  }

  const db = getDb(dbPath);
  const report = await seedDemoData(db, { now });

  const fmt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  console.log(`[seed] demo DB wiped + reseeded at ${dbPath}`);
  console.log(`[seed] org: ${ORG_ID} (${ORG_NAME})`);
  console.log(`[seed] keys: ${report.keys} (key-001..key-008)`);
  console.log(
    `[seed] usage points: ${report.usagePoints} (${USAGE_DAYS} days, hourly, keys 001-006)`,
  );
  console.log(`[seed] anomalies: ${report.anomalies} (spend-spike@key-001, new-key-found@key-008)`);
  console.log(`[seed] rotation job: rot-001 key-001 queued for next Monday 09:00 local`);
  console.log(`[seed] spike day total for key-001: $293.00 (normalized)`);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exitCode = 1;
});
