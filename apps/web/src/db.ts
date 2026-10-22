import fs from "node:fs";
import path from "node:path";
import { getDb, type KeyLensDb } from "@keylens/db";

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

export function getAppDb(): KeyLensDb {
  if (!db) {
    db = process.env.DATABASE_URL ? getDb() : getDb(appDbPath());
  }
  return db;
}

export type { KeyLensDb };
