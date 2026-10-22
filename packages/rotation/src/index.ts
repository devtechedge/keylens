import { createHash } from "node:crypto";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { getDb, keys, orgs, rotationJobs } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import type { RotationJob, RotationStatus, RotationSummary } from "@keylens/core";
import { isMockMode } from "./mock";
import { realRotateKey } from "./real";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Deterministic job id per (org, key), stable across re-runs. */
function jobId(prefix: string, orgId: string, keyId: string): string {
  const h = createHash("md5").update(`${orgId}:${keyId}`).digest("hex").slice(0, 12);
  return `${prefix}_${h}`;
}

async function upsertJob(db: KeyLensDb, job: RotationJob): Promise<void> {
  const values = {
    orgId: job.orgId,
    keyId: job.keyId,
    provider: job.provider,
    status: job.status,
    scheduledFor: job.scheduledFor,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
  const existing = await db.select().from(rotationJobs).where(eq(rotationJobs.id, job.id)).get();
  if (existing) {
    await db.update(rotationJobs).set(values).where(eq(rotationJobs.id, job.id)).run();
  } else {
    await db.insert(rotationJobs).values({ id: job.id, ...values }).run();
  }
}

export interface RunRotationArgs {
  db: KeyLensDb;
  orgId: string;
  keyIds?: string[];
  dryRun?: boolean;
}

/**
 * Create rotation jobs for keys of an org. Defaults to dry-run: keys are
 * left untouched and jobs get status "dry-run". In mock mode a non-dry-run
 * run transitions the key rotating -> active and records success.
 */
export async function runRotation({
  db,
  orgId,
  keyIds,
  dryRun = true,
}: RunRotationArgs): Promise<RotationSummary> {
  const conditions = [eq(keys.orgId, orgId)];
  if (keyIds && keyIds.length > 0) {
    conditions.push(inArray(keys.id, keyIds));
  } else {
    conditions.push(eq(keys.status, "active"));
  }
  const keyRows = await db.select().from(keys).where(and(...conditions)).all();

  const now = Date.now();
  const jobs: RotationJob[] = [];
  for (const key of keyRows) {
    const id = jobId("rot", orgId, key.id);
    let status: RotationStatus;
    let result: string;
    let finishedAt: number | undefined;

    if (dryRun) {
      status = "dry-run";
      result = "dry run ok";
      finishedAt = now;
    } else if (isMockMode()) {
      // Mock rotation: flip status in DB, no network.
      await db.update(keys).set({ status: "rotating" }).where(eq(keys.id, key.id)).run();
      await db.update(keys).set({ status: "active", lastRotatedAt: now }).where(eq(keys.id, key.id)).run();
      status = "success";
      result = `mock rotate: ${key.provider} key swapped`;
      finishedAt = now;
    } else {
      // Real rotation (openai via admin API; guided placeholder for others).
      const outcome = await realRotateKey(db, key);
      status = outcome.ok ? "success" : "failed";
      result = outcome.result ?? "";
      finishedAt = now;
      if (!outcome.ok) {
        const jobError = outcome.error ?? "rotation failed";
        const job: RotationJob = {
          id: jobId("rot", orgId, key.id),
          orgId,
          keyId: key.id,
          provider: key.provider,
          status,
          scheduledFor: now,
          startedAt: now,
          finishedAt,
          error: jobError,
        };
        await upsertJob(db, job);
        jobs.push(job);
        continue;
      }
    }

    const job: RotationJob = {
      id,
      orgId,
      keyId: key.id,
      provider: key.provider,
      status,
      scheduledFor: now,
      startedAt: now,
      finishedAt,
      result,
    };
    await upsertJob(db, job);
    jobs.push(job);
  }

  return { orgId, ranAt: now, dryRun, jobs };
}

/**
 * Next Monday 09:00 in local time, strictly after `fromMs`.
 */
export function nextMonday0900Local(fromMs = Date.now()): number {
  const d = new Date(fromMs);
  d.setHours(9, 0, 0, 0);
  while (d.getDay() !== 1 || d.getTime() <= fromMs) {
    d.setDate(d.getDate() + 1);
  }
  return d.getTime();
}

/**
 * Queue weekly rotation jobs for active keys of the org (when its schedule
 * is weekly) whose last rotation is > 7 days ago or never happened.
 * scheduledFor = next Monday 09:00 local.
 */
export async function scheduleWeekly(orgId: string): Promise<void> {
  const db = getDb();
  const org = await db.select().from(orgs).where(eq(orgs.id, orgId)).get();
  if (!org || org.rotationSchedule !== "weekly") return;

  const cutoff = Date.now() - WEEK_MS;
  const keyRows = await db
    .select()
    .from(keys)
    .where(
      and(
        eq(keys.orgId, orgId),
        eq(keys.status, "active"),
        or(isNull(keys.lastRotatedAt), lt(keys.lastRotatedAt, cutoff)),
      ),
    )
    .all();

  const scheduledFor = nextMonday0900Local();
  const openStatuses: RotationStatus[] = ["queued", "running", "dry-run"];
  for (const key of keyRows) {
    const id = jobId("rotw", orgId, key.id);
    const existing = await db
      .select()
      .from(rotationJobs)
      .where(and(eq(rotationJobs.keyId, key.id), inArray(rotationJobs.status, openStatuses)))
      .get();
    if (existing) continue;
    await db
      .insert(rotationJobs)
      .values({
        id,
        orgId,
        keyId: key.id,
        provider: key.provider,
        status: "queued",
        scheduledFor,
      })
      .run();
  }
}

export { isMockMode } from "./mock";
