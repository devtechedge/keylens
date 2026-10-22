import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, keys, orgs, resetDbCache, rotationJobs } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import { runRotation } from "./index";

async function freshDb(): Promise<{ db: KeyLensDb; orgId: string; keyId: string }> {
  resetDbCache();
  const db = getDb(":memory:");
  const orgId = "org-rotation";
  const keyId = "key-rotation";
  const now = Date.now();
  await db
    .insert(orgs)
    .values({
      id: orgId,
      name: "Rotation Test",
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: [],
      createdAt: now,
    })
    .run();
  await db
    .insert(keys)
    .values({
      id: keyId,
      orgId,
      provider: "openai",
      label: "Main",
      fingerprint: "fp-rotation",
      masked: "sk-...abcd",
      status: "active",
      sourceType: "manual",
      createdAt: now,
      meta: {},
    })
    .run();
  return { db, orgId, keyId };
}

describe("runRotation", () => {
  it("dry-run leaves keys unchanged and creates dry-run job rows", async () => {
    const { db, orgId, keyId } = await freshDb();

    const summary = await runRotation({ db, orgId });

    expect(summary.dryRun).toBe(true);
    expect(summary.jobs).toHaveLength(1);
    expect(summary.jobs[0]?.status).toBe("dry-run");
    expect(summary.jobs[0]?.result).toBe("dry run ok");

    const keyBack = await db.select().from(keys).where(eq(keys.id, keyId)).get();
    expect(keyBack?.status).toBe("active");
    expect(keyBack?.lastRotatedAt).toBeNull();

    const jobRow = await db.select().from(rotationJobs).where(eq(rotationJobs.keyId, keyId)).get();
    expect(jobRow?.status).toBe("dry-run");
  });

  it("non-dry-run mock rotation transitions the key and records success", async () => {
    const { db, orgId, keyId } = await freshDb();

    const summary = await runRotation({ db, orgId, dryRun: false });

    expect(summary.dryRun).toBe(false);
    expect(summary.jobs[0]?.status).toBe("success");
    expect(summary.jobs[0]?.result).toContain("mock rotate: openai key swapped");

    const keyBack = await db.select().from(keys).where(eq(keys.id, keyId)).get();
    expect(keyBack?.status).toBe("active");
    expect(keyBack?.lastRotatedAt).not.toBeNull();

    const jobRow = await db.select().from(rotationJobs).where(eq(rotationJobs.keyId, keyId)).get();
    expect(jobRow?.status).toBe("success");
  });

  it("generates deterministic job ids across runs", async () => {
    const { db, orgId } = await freshDb();
    const first = await runRotation({ db, orgId });
    const second = await runRotation({ db, orgId });
    expect(second.jobs[0]?.id).toBe(first.jobs[0]?.id);
  });
});
