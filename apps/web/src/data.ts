/**
 * Read-side access to the KeyLens DB for pages and route handlers.
 * Server-only. Thin selects + shape mapping; no business logic.
 * The shared DB driver is libsql (async): every query is awaited.
 */
import { and, asc, desc, eq, gte, gt, isNull } from "drizzle-orm";
import { anomalies, keys, orgs, rotationJobs, usagePoints } from "@keylens/db";
import type { KeyLensDb } from "./db";
import type {
  AnomalyView,
  KeyView,
  NextRotationView,
  OrgView,
  SummaryPayload,
  UsageSeriesPoint,
} from "./api-types";

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "aws-bedrock": "AWS Bedrock",
  "azure-openai": "Azure OpenAI",
  gemini: "Google Gemini",
  mistral: "Mistral",
  other: "Other",
};

export async function getFirstOrg(db: KeyLensDb): Promise<OrgView | null> {
  const row = await db.select().from(orgs).orderBy(asc(orgs.createdAt)).limit(1).get();
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    rotationSchedule: row.rotationSchedule,
    autoRotateExposed: row.autoRotateExposed,
  };
}

const DAY_MS = 86_400_000;

export async function listKeys(
  db: KeyLensDb,
  org: OrgView | null,
): Promise<KeyView[]> {
  if (!org) return [];
  const rows = await db
    .select()
    .from(keys)
    .where(eq(keys.orgId, org.id))
    .orderBy(desc(keys.createdAt))
    .all();
  return rows.map((k) => ({
    id: k.id,
    provider: k.provider,
    providerName: PROVIDER_LABELS[k.provider] ?? k.provider,
    label: k.label,
    masked: k.masked,
    status: k.status,
    sourceType: k.sourceType,
    sourceRef: k.sourceRef,
    ownerEmail: k.ownerEmail,
    createdAt: k.createdAt,
    lastSeenAt: k.lastSeenAt,
    lastRotatedAt: k.lastRotatedAt,
    demo: Boolean(k.meta && (k.meta as Record<string, unknown>)._demo === true),
  }));
}

export async function listOpenAnomalies(
  db: KeyLensDb,
  org: OrgView | null,
): Promise<AnomalyView[]> {
  if (!org) return [];
  const rows = await db
    .select()
    .from(anomalies)
    .where(and(eq(anomalies.orgId, org.id), isNull(anomalies.resolvedAt)))
    .orderBy(desc(anomalies.detectedAt))
    .all();

  const keyIds = [...new Set(rows.map((a) => a.keyId).filter(Boolean))] as string[];
  const labelById = new Map<string, string>();
  if (keyIds.length > 0) {
    const keyRows = await db
      .select({ id: keys.id, label: keys.label })
      .from(keys)
      .where(
        and(
          eq(keys.orgId, org.id),
          ...keyIds.map((id) => eq(keys.id, id)),
        ),
      )
      .all();
    for (const r of keyRows) labelById.set(r.id, r.label ?? r.id);
  }

  return rows.map((a) => ({
    id: a.id,
    keyId: a.keyId,
    keyLabel: a.keyId ? (labelById.get(a.keyId) ?? null) : null,
    kind: a.kind,
    severity: a.severity,
    title: a.title,
    detail: a.detail,
    detectedAt: a.detectedAt,
    resolvedAt: a.resolvedAt,
  }));
}

export async function getSummary(
  db: KeyLensDb,
  org: OrgView | null,
): Promise<SummaryPayload> {
  if (!org) {
    return {
      org: null,
      leakedKeys: 0,
      keysFound: 0,
      spend7dUsd: 0,
      openAnomalies: 0,
      nextRotation: null,
      demo: false,
    };
  }

  const allKeys = await db
    .select()
    .from(keys)
    .where(eq(keys.orgId, org.id))
    .all();
  const leakedKeys = allKeys.filter((k) => k.status === "leaked").length;
  const keysFound = allKeys.filter((k) => k.status !== "retired").length;
  const demo = allKeys.some(
    (k) => k.meta && (k.meta as Record<string, unknown>)._demo === true,
  );

  const cut = Date.now() - 7 * DAY_MS;
  const usage = await db
    .select()
    .from(usagePoints)
    .innerJoin(keys, eq(usagePoints.keyId, keys.id))
    .where(and(eq(keys.orgId, org.id), gte(usagePoints.periodStart, cut)))
    .all();
  const spend7dUsd =
    usage.reduce((sum, r) => sum + r.usage_points.spendUsd, 0) / 1_000_000;

  const openRows = await db
    .select()
    .from(anomalies)
    .where(and(eq(anomalies.orgId, org.id), isNull(anomalies.resolvedAt)))
    .all();
  const openAnomalies = openRows.length;

  const job = await db
    .select()
    .from(rotationJobs)
    .where(and(eq(rotationJobs.orgId, org.id), gt(rotationJobs.scheduledFor, Date.now())))
    .orderBy(asc(rotationJobs.scheduledFor))
    .limit(1)
    .get();
  let nextRotation: NextRotationView | null = null;
  if (job) {
    nextRotation = {
      jobId: job.id,
      keyId: job.keyId,
      provider: job.provider,
      scheduledFor: job.scheduledFor,
      status: job.status,
    };
  }

  return {
    org,
    leakedKeys,
    keysFound,
    spend7dUsd,
    openAnomalies,
    nextRotation,
    demo,
  };
}

export async function usageSeries(
  db: KeyLensDb,
  org: OrgView | null,
  keyId: string,
  hours = 14 * 24,
): Promise<UsageSeriesPoint[]> {
  if (!org) return [];
  const cut = Date.now() - hours * 3_600_000;
  const rows = await db
    .select()
    .from(usagePoints)
    .where(and(eq(usagePoints.keyId, keyId), gte(usagePoints.periodStart, cut)))
    .orderBy(asc(usagePoints.periodStart))
    .all();
  return rows.map((r) => ({ t: r.periodStart, spendUsd: r.spendUsd / 1_000_000 }));
}
