import fs from "node:fs";
import path from "node:path";
import { getDb, type KeyLensDb, seedDemoData, orgs } from "@keylens/db";

/**
 * The seed writes to packages/db/data/keylens.db (relative to the db package
 * cwd). The web app runs from apps/web, so we anchor the DB path to the
 * monorepo root instead of relying on cwd-relative resolution. If the host
 * explicitly sets DATABASE_URL, we respect it (getDb() picks it up).
 */

let cachedPath: string | null = null;

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

export function appDbPath(): string {
  if (cachedPath) return cachedPath;
  const root = findRepoRoot(process.cwd());
  const p = path.join(root, "packages", "db", "data", "keylens.db");
  cachedPath = p;
  return p;
}

let db: KeyLensDb | null = null;
let seedPromise: Promise<void> | null = null;

/**
 * On serverless hosts (Vercel) the SQLite file is ephemeral: a fresh instance
 * starts with an empty database. When SEED_DEMO_ON_EMPTY is not "false", we
 * seed the demo story once per cold start so the public demo always shows
 * data. The seed is idempotent by guard: only runs when the org table is
 * empty.
 */
async function ensureDemoSeed(target: KeyLensDb): Promise<void> {
  const enabled = process.env.SEED_DEMO_ON_EMPTY !== "false";
  if (!enabled) return;
  const orgRows = await target.select({ id: orgs.id }).from(orgs).limit(1);
  if (orgRows.length > 0) return;
  await seedDemoData(target);
}

export function getAppDb(): KeyLensDb {
  if (!db) {
    db = process.env.DATABASE_URL ? getDb() : getDb(appDbPath());
  }
  if (!seedPromise) {
    seedPromise = ensureDemoSeed(db).catch((err) => {
      console.error("[keylens:db] demo seed failed:", err);
    });
  }
  return db;
}

/**
 * Await the boot-time demo seed before querying. API routes and server
 * components MUST use this so a cold serverless instance never returns an
 * empty dashboard while the seed is still writing.
 */
export async function readyDb(): Promise<KeyLensDb> {
  const target = getAppDb();
  if (seedPromise) await seedPromise;
  return target;
}

export type { KeyLensDb };
