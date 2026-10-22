import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, keys, orgs, resetDbCache, usagePoints } from "@keylens/db";

describe("schema roundtrip", () => {
  it("inserts org + key + usage via Drizzle and reads them back", async () => {
    resetDbCache();
    const db = getDb(":memory:");
    const orgId = "org-roundtrip";
    const keyId = "key-roundtrip";
    const now = Date.now();

    await db
      .insert(orgs)
      .values({
        id: orgId,
        name: "Roundtrip Inc",
        rotationSchedule: "weekly",
        autoRotateExposed: false,
        notifyChannels: ["slack"],
        createdAt: now,
      })
      .run();

    await db
      .insert(keys)
      .values({
        id: keyId,
        orgId,
        provider: "openai",
        label: "Main key",
        fingerprint: "fp-" + keyId,
        masked: "sk-...abcd",
        status: "active",
        sourceType: "manual",
        createdAt: now,
        meta: { _demo: true },
      })
      .run();

    await db
      .insert(usagePoints)
      .values({
        id: "usage-1",
        keyId,
        periodStart: now - 3600_000,
        spendUsd: 5_000_000, // micro-dollars
        tokens: 1000,
        calls: 10,
        errors: 0,
      })
      .run();

    const orgBack = await db.select().from(orgs).where(eq(orgs.id, orgId)).get();
    expect(orgBack?.name).toBe("Roundtrip Inc");
    expect(orgBack?.rotationSchedule).toBe("weekly");

    const keyBack = await db.select().from(keys).where(eq(keys.id, keyId)).get();
    expect(keyBack?.provider).toBe("openai");
    expect(keyBack?.meta._demo).toBe(true);

    const usageBack = await db.select().from(usagePoints).where(eq(usagePoints.id, "usage-1")).get();
    expect(usageBack?.spendUsd).toBe(5_000_000);
    expect(usageBack?.calls).toBe(10);
    expect(usageBack?.keyId).toBe(keyId);
  });
});
