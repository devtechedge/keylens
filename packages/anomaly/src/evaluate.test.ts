import { describe, expect, it } from "vitest";
import { getDb, keys, orgs, resetDbCache, usagePoints } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import { evaluateUsage } from "./evaluate";

const DAY_MS = 24 * 60 * 60 * 1000;

async function freshDb(): Promise<{ db: KeyLensDb; orgId: string; keyId: string }> {
  resetDbCache();
  const db = getDb(":memory:");
  const orgId = "org-anomaly";
  const keyId = "key-anomaly";
  const now = Date.now();
  await db
    .insert(orgs)
    .values({
      id: orgId,
      name: "Anomaly Test",
      rotationSchedule: "manual",
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
      fingerprint: "fp-anomaly",
      masked: "sk-...abcd",
      status: "active",
      sourceType: "manual",
      createdAt: now,
      meta: {},
    })
    .run();
  return { db, orgId, keyId };
}

function insertDayUsage(
  db: KeyLensDb,
  keyId: string,
  dayOffsetDays: number,
  spendUsd: number,
  calls = 10,
  errors = 0,
): Promise<unknown> {
  const dayStart = Math.floor(Date.now() / DAY_MS) * DAY_MS - dayOffsetDays * DAY_MS;
  return db
    .insert(usagePoints)
    .values({
      id: `u-${keyId}-${dayOffsetDays}-${Math.random()}`,
      keyId,
      periodStart: dayStart,
      spendUsd: Math.round(spendUsd * 1_000_000),
      tokens: spendUsd * 1000,
      calls,
      errors,
    })
    .run();
}

describe("evaluateUsage", () => {
  it("flags a 6x spend spike but not normal variation", async () => {
    const { db, orgId, keyId } = await freshDb();
    // 10 days: 9 normal $5 days and one $30 (6x) spike 3 days ago.
    for (let offset = 0; offset < 10; offset++) {
      const spike = offset === 3;
      await insertDayUsage(db, keyId, offset, spike ? 30 : 5);
    }

    const events = await evaluateUsage({ db, orgId });
    const spendSpikes = events.filter((e) => e.kind === "spend-spike");

    expect(spendSpikes).toHaveLength(1);
    expect(spendSpikes[0]?.severity).toBe("high");
    expect(spendSpikes[0]?.keyId).toBe(keyId);
    expect(spendSpikes[0]?.meta.day).toBeTypeOf("string");
  });

  it("does not flag normal variation", async () => {
    const { db, orgId, keyId } = await freshDb();
    for (let offset = 0; offset < 10; offset++) {
      // Small normal jitter around $5.
      const jitter = 0.4 * Math.sin(offset * 17) + 0.2;
      await insertDayUsage(db, keyId, offset, 5 + jitter);
    }
    const events = await evaluateUsage({ db, orgId });
    expect(events.filter((e) => e.kind === "spend-spike")).toHaveLength(0);
  });

  it("dedupes by kind+keyId+day (no duplicate open events)", async () => {
    const { db, orgId, keyId } = await freshDb();
    for (let offset = 0; offset < 10; offset++) {
      await insertDayUsage(db, keyId, offset, offset === 3 ? 30 : 5);
    }

    const first = await evaluateUsage({ db, orgId });
    expect(first.filter((e) => e.kind === "spend-spike")).toHaveLength(1);

    const second = await evaluateUsage({ db, orgId });
    const spendSpikes = second.filter((e) => e.kind === "spend-spike");
    expect(spendSpikes).toHaveLength(1);
    expect(second.filter((e) => e.kind === "spend-spike" && !e.resolvedAt)).toHaveLength(1);
  });

  it("flags an error-rate spike as medium", async () => {
    const { db, orgId, keyId } = await freshDb();
    for (let offset = 0; offset < 5; offset++) {
      // One day with 100 calls, 30% errors.
      const isErrorDay = offset === 2;
      await insertDayUsage(db, keyId, offset, 5, isErrorDay ? 100 : 10, isErrorDay ? 30 : 0);
    }
    const events = await evaluateUsage({ db, orgId });
    const errorSpikes = events.filter((e) => e.kind === "error-spike");
    expect(errorSpikes).toHaveLength(1);
    expect(errorSpikes[0]?.severity).toBe("medium");
  });
});
