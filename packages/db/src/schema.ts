import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import type { KeyStatus, ProviderId, RotationStatus, RotationSchedule, Severity, AnomalyKind, KeySourceType } from "@keylens/core";

export const orgs = sqliteTable(
  "orgs",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    rotationSchedule: text("rotation_schedule").$type<RotationSchedule>().default("weekly").notNull(),
    autoRotateExposed: integer("auto_rotate_exposed", { mode: "boolean" }).default(false).notNull(),
    notifyChannels: text("notify_channels", { mode: "json" }).$type<string[]>().default([]).notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("orgs_created_at_idx").on(t.createdAt)],
);

export const keys = sqliteTable(
  "keys",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    provider: text("provider").$type<ProviderId>().notNull(),
    label: text("label"),
    fingerprint: text("fingerprint").notNull(),
    masked: text("masked").notNull(),
    status: text("status").$type<KeyStatus>().default("active").notNull(),
    sourceType: text("source_type").$type<KeySourceType>().default("manual").notNull(),
    sourceRef: text("source_ref"),
    ownerEmail: text("owner_email"),
    createdAt: integer("created_at").notNull(),
    lastSeenAt: integer("last_seen_at"),
    lastRotatedAt: integer("last_rotated_at"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>().default({}).notNull(),
  },
  (t) => [
    uniqueIndex("keys_fingerprint_idx").on(t.fingerprint),
    index("keys_org_idx").on(t.orgId),
    index("keys_status_idx").on(t.status),
  ],
);

export const usagePoints = sqliteTable(
  "usage_points",
  {
    id: text("id").primaryKey(),
    keyId: text("key_id").notNull().references(() => keys.id),
    periodStart: integer("period_start").notNull(),
    spendUsd: integer("spend_usd_micros").notNull(), // stored in micro-dollars to avoid float drift
    tokens: integer("tokens").default(0).notNull(),
    calls: integer("calls").default(0).notNull(),
    errors: integer("errors").default(0).notNull(),
    region: text("region"),
  },
  (t) => [
    index("usage_key_period_idx").on(t.keyId, t.periodStart),
    index("usage_org_period_idx").on(t.keyId, t.periodStart),
  ],
);

export const anomalies = sqliteTable(
  "anomalies",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    keyId: text("key_id").references(() => keys.id),
    kind: text("kind").$type<AnomalyKind>().notNull(),
    severity: text("severity").$type<Severity>().notNull(),
    title: text("title").notNull(),
    detail: text("detail").notNull(),
    detectedAt: integer("detected_at").notNull(),
    resolvedAt: integer("resolved_at"),
    meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>().default({}).notNull(),
  },
  (t) => [
    index("anomalies_org_detected_idx").on(t.orgId, t.detectedAt),
    index("anomalies_key_idx").on(t.keyId),
  ],
);

export const rotationJobs = sqliteTable(
  "rotation_jobs",
  {
    id: text("id").primaryKey(),
    orgId: text("org_id").notNull().references(() => orgs.id),
    keyId: text("key_id").notNull().references(() => keys.id),
    provider: text("provider").$type<ProviderId>().notNull(),
    status: text("status").$type<RotationStatus>().default("queued").notNull(),
    scheduledFor: integer("scheduled_for").notNull(),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
    result: text("result"),
    error: text("error"),
  },
  (t) => [
    index("rotation_org_sched_idx").on(t.orgId, t.scheduledFor),
    index("rotation_key_idx").on(t.keyId),
  ],
);

export type OrgRow = typeof orgs.$inferSelect;
export type KeyRow = typeof keys.$inferSelect;
export type UsagePointRow = typeof usagePoints.$inferSelect;
export type AnomalyRow = typeof anomalies.$inferSelect;
export type RotationJobRow = typeof rotationJobs.$inferSelect;
