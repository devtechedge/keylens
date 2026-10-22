import { and, eq, gte } from "drizzle-orm";
import { getDb, usagePoints } from "@keylens/db";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Baseline for a key: last 7 days, summed per day (micro-dollars -> dollars).
 * Uses the shared default db client (matching the contract signature).
 */
export async function baselineFor(
  keyId: string,
): Promise<{ meanUsdPerDay: number; stdevUsdPerDay: number }> {
  const db = getDb();
  const cutoff = Date.now() - 7 * DAY_MS;
  const rows = await db
    .select({ spendUsd: usagePoints.spendUsd, periodStart: usagePoints.periodStart })
    .from(usagePoints)
    .where(and(eq(usagePoints.keyId, keyId), gte(usagePoints.periodStart, cutoff)))
    .all();

  const buckets = new Map<number, number>();
  for (const row of rows) {
    const day = Math.floor(row.periodStart / DAY_MS);
    buckets.set(day, (buckets.get(day) ?? 0) + row.spendUsd);
  }

  const dailyUsd = [...buckets.values()].map((micros) => micros / 1_000_000);
  if (dailyUsd.length === 0) {
    return { meanUsdPerDay: 0, stdevUsdPerDay: 0 };
  }
  const mean = dailyUsd.reduce((a, b) => a + b, 0) / dailyUsd.length;
  if (dailyUsd.length < 2) {
    return { meanUsdPerDay: mean, stdevUsdPerDay: 0 };
  }
  const variance =
    dailyUsd.reduce((acc, x) => acc + (x - mean) ** 2, 0) / (dailyUsd.length - 1);
  return { meanUsdPerDay: mean, stdevUsdPerDay: Math.sqrt(variance) };
}
