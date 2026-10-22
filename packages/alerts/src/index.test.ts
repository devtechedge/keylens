import { describe, expect, it } from "vitest";
import { getDb, orgs, resetDbCache } from "@keylens/db";
import type { AnomalyEvent } from "@keylens/core";
import { emailDigest, sendAlert } from "./index";

function makeEvent(): AnomalyEvent {
  return {
    id: "anom-test-1",
    orgId: "org-alerts",
    keyId: "key-1",
    kind: "spend-spike",
    severity: "high",
    title: "Spend spike",
    detail: "Daily spend $30.00 exceeded 5x baseline $5.00",
    detectedAt: Date.now(),
    meta: {},
  };
}

describe("sendAlert", () => {
  it("mock-delivers to console when slack webhook is unset", async () => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: unknown) => logs.push(String(msg));
    try {
      const event = makeEvent();
      const result = await sendAlert({ db: undefined as never, orgId: event.orgId!, event });
      expect(result.delivered).toEqual(["console"]);
      expect(logs.some((l) => l.includes("mock delivery"))).toBe(true);
    } finally {
      console.log = originalLog;
    }
  });

  it("never throws when slack delivery fails", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://invalid.example/webhook";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => Promise.reject(new Error("boom"))) as typeof fetch;
    try {
      const event = makeEvent();
      const result = await sendAlert({
        db: undefined as never,
        orgId: event.orgId!,
        event,
        channels: ["slack"],
      });
      // Delivery failure is logged and falls back to console.
      expect(result.delivered).toContain("console");
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.SLACK_WEBHOOK_URL;
    }
  });
});

describe("emailDigest", () => {
  it("logs a summary without throwing", async () => {
    resetDbCache();
    const db = getDb(":memory:");
    const orgId = "org-alerts";
    await db
      .insert(orgs)
      .values({
        id: orgId,
        name: "Alerts Test",
        rotationSchedule: "manual",
        autoRotateExposed: false,
        notifyChannels: [],
        createdAt: Date.now(),
      })
      .run();
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (msg: unknown) => logs.push(String(msg));
    try {
      await emailDigest({ db, orgId });
      expect(logs.some((l) => l.includes("[email-digest]"))).toBe(true);
    } finally {
      console.log = originalLog;
    }
  });
});
