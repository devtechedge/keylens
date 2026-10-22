import { and, eq, inArray } from "drizzle-orm";
import { keys, usagePoints } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import type { ProviderId, UsagePoint } from "@keylens/core";
import { isMockMode } from "./mock";

export interface FetchUsageArgs {
  db: KeyLensDb;
  orgId: string;
  providers?: ProviderId[];
}

/**
 * Pull spend per key for an org. In mock mode reads the seeded usage_points
 * rows (micro-dollars converted to dollars).
 */
export async function fetchUsage({ db, orgId, providers }: FetchUsageArgs): Promise<UsagePoint[]> {
  if (!isMockMode()) {
    throw new Error("real connector not yet wired: fetchUsage only supports mock mode");
  }
  const conditions = [eq(keys.orgId, orgId)];
  if (providers && providers.length > 0) {
    conditions.push(inArray(keys.provider, providers));
  }
  const rows = await db
    .select()
    .from(usagePoints)
    .innerJoin(keys, eq(usagePoints.keyId, keys.id))
    .where(and(...conditions))
    .all();

  return rows
    .map(({ usage_points: u }) => ({
      keyId: u.keyId,
      periodStart: u.periodStart,
      spendUsd: u.spendUsd / 1_000_000,
      tokens: u.tokens,
      calls: u.calls,
      errors: u.errors,
      region: u.region ?? undefined,
    }))
    .sort((a, b) => a.periodStart - b.periodStart);
}
