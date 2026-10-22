import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { anomalies, keys, usagePoints } from "@keylens/db";
import type { KeyLensDb, AnomalyRow } from "@keylens/db";
import type { AnomalyEvent, AnomalyKind, Severity, UsagePoint } from "@keylens/core";
import { DAY_MS } from "./baseline";

export interface EvaluateUsageArgs {
  db: KeyLensDb;
  orgId: string;
  points?: UsagePoint[];
}

interface DayAgg {
  spendUsd: number;
  tokens: number;
  calls: number;
  errors: number;
  periodStart: number;
}

async function loadUsageForOrg(db: KeyLensDb, orgId: string): Promise<UsagePoint[]> {
  const rows = await db
    .select()
    .from(usagePoints)
    .innerJoin(keys, eq(usagePoints.keyId, keys.id))
    .where(eq(keys.orgId, orgId))
    .all();
  return rows.map(({ usage_points: u }) => ({
    keyId: u.keyId,
    periodStart: u.periodStart,
    spendUsd: u.spendUsd / 1_000_000,
    tokens: u.tokens,
    calls: u.calls,
    errors: u.errors,
    region: u.region ?? undefined,
  }));
}

function rowToEvent(row: AnomalyRow): AnomalyEvent {
  return {
    id: row.id,
    orgId: row.orgId,
    keyId: row.keyId ?? undefined,
    kind: row.kind,
    severity: row.severity,
    title: row.title,
    detail: row.detail,
    detectedAt: row.detectedAt,
    resolvedAt: row.resolvedAt ?? undefined,
    meta: row.meta,
  };
}

/**
 * Evaluate org usage for anomalies. Baseline is the rolling 7-day mean per
 * key (daily totals); a day is flagged when spend exceeds max(5x baseline,
 * $20) or when error rate is > 20% on > 50 calls. New events are persisted
 * and deduped by kind+keyId+day (skipped while an open anomaly for that
 * combination exists). Returns all open events for the org.
 */
export async function evaluateUsage({ db, orgId, points }: EvaluateUsageArgs): Promise<AnomalyEvent[]> {
  const keyRows = await db.select().from(keys).where(eq(keys.orgId, orgId)).all();
  const keyById = new Map(keyRows.map((k) => [k.id, k]));

  const pts = points ?? (await loadUsageForOrg(db, orgId));

  // Aggregate points per key per UTC day.
  const byKey = new Map<string, Map<number, DayAgg>>();
  for (const p of pts) {
    if (!keyById.has(p.keyId)) continue;
    const day = Math.floor(p.periodStart / DAY_MS);
    let days = byKey.get(p.keyId);
    if (!days) {
      days = new Map();
      byKey.set(p.keyId, days);
    }
    const agg = days.get(day) ?? { spendUsd: 0, tokens: 0, calls: 0, errors: 0, periodStart: p.periodStart };
    agg.spendUsd += p.spendUsd;
    agg.tokens += p.tokens;
    agg.calls += p.calls;
    agg.errors += p.errors;
    if (p.periodStart < agg.periodStart) agg.periodStart = p.periodStart;
    days.set(day, agg);
  }

  // Existing open anomalies, used for dedupe.
  const openRows = await db
    .select()
    .from(anomalies)
    .where(and(eq(anomalies.orgId, orgId), isNull(anomalies.resolvedAt)))
    .all();
  const openKey = new Set(
    openRows
      .filter((r) => typeof r.meta?.day === "string")
      .map((r) => `${r.kind}|${r.keyId ?? ""}|${r.meta?.day}`),
  );

  const now = Date.now();
  for (const [keyId, days] of byKey) {
    const key = keyById.get(keyId);
    if (!key) continue;
    const sortedDays = [...days.keys()].sort((a, b) => a - b);
    for (const day of sortedDays) {
      const agg = days.get(day)!;
      const dayStr = new Date(agg.periodStart).toISOString().slice(0, 10);

      const previous = sortedDays.filter((d) => d < day).slice(-7);
      const baseline =
        previous.length > 0
          ? previous.reduce((acc, d) => acc + days.get(d)!.spendUsd, 0) / previous.length
          : 0;

      // Spend spike: > max(5x baseline, $20).
      if (agg.spendUsd > Math.max(5 * baseline, 20)) {
        const kind: AnomalyKind = "spend-spike";
        if (!openKey.has(`${kind}|${keyId}|${dayStr}`)) {
          const event = makeEvent({
            orgId,
            keyId,
            kind,
            severity: "high",
            title: "Spend spike",
            detail: `Daily spend $${agg.spendUsd.toFixed(2)} exceeded 5x baseline $${baseline.toFixed(2)}`,
            detectedAt: now,
            meta: {
              day: dayStr,
              baselineUsd: baseline,
              spendUsd: agg.spendUsd,
              calls: agg.calls,
              errors: agg.errors,
            },
          });
          await insertEvent(db, event);
        }
      }

      // Error spike: > 20% error rate on > 50 calls.
      if (agg.calls > 50 && agg.errors / agg.calls > 0.2) {
        const kind: AnomalyKind = "error-spike";
        if (!openKey.has(`${kind}|${keyId}|${dayStr}`)) {
          const ratePct = Math.round((1000 * agg.errors) / agg.calls) / 10;
          const event = makeEvent({
            orgId,
            keyId,
            kind,
            severity: "medium",
            title: "Error rate spike",
            detail: `Error rate ${ratePct}% on ${agg.calls} calls`,
            detectedAt: now,
            meta: {
              day: dayStr,
              calls: agg.calls,
              errors: agg.errors,
              errorRate: agg.errors / agg.calls,
            },
          });
          await insertEvent(db, event);
        }
      }
    }
  }

  const open = await db
    .select()
    .from(anomalies)
    .where(and(eq(anomalies.orgId, orgId), isNull(anomalies.resolvedAt)))
    .all();
  return open.map(rowToEvent);
}

interface MakeEventArgs {
  orgId: string;
  keyId: string;
  kind: AnomalyKind;
  severity: Severity;
  title: string;
  detail: string;
  detectedAt: number;
  meta: Record<string, unknown>;
}

function makeEvent(args: MakeEventArgs): AnomalyEvent {
  return { id: `anom_${randomUUID()}`, ...args };
}

async function insertEvent(db: KeyLensDb, event: AnomalyEvent): Promise<void> {
  await db
    .insert(anomalies)
    .values({
      id: event.id,
      orgId: event.orgId,
      keyId: event.keyId,
      kind: event.kind,
      severity: event.severity,
      title: event.title,
      detail: event.detail,
      detectedAt: event.detectedAt,
      meta: event.meta,
    })
    .run();
}
