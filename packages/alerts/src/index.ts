import { and, count, eq, gte, isNull, lt, or } from "drizzle-orm";
import { anomalies, keys, usagePoints } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import type { AnomalyEvent } from "@keylens/core";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface SendAlertArgs {
  db: KeyLensDb;
  orgId: string;
  event: AnomalyEvent;
  channels?: string[];
}

function formatSlack(event: AnomalyEvent): string {
  return `[KeyLens] ${event.severity.toUpperCase()} ${event.kind}: ${event.title} - ${event.detail}`;
}

/**
 * Deliver an alert. When SLACK_WEBHOOK_URL is set and "slack" is in
 * channels, POST a formatted message. Otherwise (or on any delivery
 * failure, which is logged, never thrown) fall back to mock console
 * delivery.
 */
export async function sendAlert({
  db: _db,
  orgId,
  event,
  channels = [],
}: SendAlertArgs): Promise<{ delivered: string[] }> {
  const delivered: string[] = [];
  const webhook = process.env.SLACK_WEBHOOK_URL;

  if (channels.includes("slack") && webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: formatSlack(event) }),
      });
      if (!res.ok) throw new Error(`slack webhook returned ${res.status}`);
      delivered.push("slack");
    } catch (err) {
      console.error("[alerts] slack delivery failed:", err);
    }
  }

  if (delivered.length === 0) {
    console.log(
      `[alerts] mock delivery org=${orgId} kind=${event.kind} severity=${event.severity} title="${event.title}"`,
    );
    delivered.push("console");
  }

  return { delivered };
}

/**
 * Mock weekly digest: log a concise summary (open anomalies, top key spend
 * over the last 7 days, keys needing rotation).
 */
export async function emailDigest({ db, orgId }: { db: KeyLensDb; orgId: string }): Promise<void> {
  const openCount =
    (await db
      .select({ n: count() })
      .from(anomalies)
      .where(and(eq(anomalies.orgId, orgId), isNull(anomalies.resolvedAt)))
      .get())?.n ?? 0;

  const cutoff = Date.now() - WEEK_MS;
  const usageRows = await db
    .select({ keyId: usagePoints.keyId, spendUsd: usagePoints.spendUsd })
    .from(usagePoints)
    .innerJoin(keys, eq(usagePoints.keyId, keys.id))
    .where(and(eq(keys.orgId, orgId), gte(usagePoints.periodStart, cutoff)))
    .all();

  const perKey = new Map<string, number>();
  for (const row of usageRows) {
    perKey.set(row.keyId, (perKey.get(row.keyId) ?? 0) + row.spendUsd);
  }
  let topKeyId = "";
  let topSpendMicros = 0;
  for (const [keyId, micros] of perKey) {
    if (micros > topSpendMicros) {
      topKeyId = keyId;
      topSpendMicros = micros;
    }
  }

  const needRotation =
    (await db
      .select({ n: count() })
      .from(keys)
      .where(
        and(
          eq(keys.orgId, orgId),
          eq(keys.status, "active"),
          or(isNull(keys.lastRotatedAt), lt(keys.lastRotatedAt, cutoff)),
        ),
      )
      .get())?.n ?? 0;

  console.log(
    `[email-digest] org=${orgId} open_anomalies=${openCount} ` +
      `top_key=${topKeyId || "(none)"} top_spend_usd=${(topSpendMicros / 1_000_000).toFixed(2)} ` +
      `keys_needing_rotation=${needRotation}`,
  );
}
