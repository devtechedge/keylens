import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, keys, orgs, resetDbCache, rotationJobs } from "@keylens/db";
import type { KeyLensDb } from "@keylens/db";
import { runRotation } from "./index";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let realFetch: typeof fetch;
let calls: { url: string; init?: RequestInit }[] = [];
const envBackup: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ["MOCK_MODE", "OPENAI_ADMIN_KEY", "OPENAI_PROJECT_ID"]) {
    envBackup[k] = process.env[k];
  }
  realFetch = globalThis.fetch;
  calls = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u.includes("/service_accounts") && u.includes("/keys")) {
      return jsonResponse(200, { id: "key_rot_1", value: "sk-proj-ROTATEDNEWKEYabcdefghijklmnopqrstuvwxyz0123456789" });
    }
    if (u.includes("/service_accounts")) {
      return jsonResponse(200, { id: "sa_rot_1", name: "rotated", status: "active" });
    }
    return jsonResponse(404, { error: { message: "unexpected" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  for (const [k, v] of Object.entries(envBackup)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  process.env.MOCK_MODE = "true";
});

async function freshDb(): Promise<{ db: KeyLensDb; orgId: string; keyId: string }> {
  resetDbCache();
  const db = getDb(":memory:");
  const orgId = "org-real-rot";
  const keyId = "key-real-rot";
  const now = Date.now();
  await db.insert(orgs).values({
    id: orgId,
    name: "Real Rot",
    rotationSchedule: "weekly",
    autoRotateExposed: false,
    notifyChannels: [],
    createdAt: now,
  }).run();
  await db.insert(keys).values({
    id: keyId,
    orgId,
    provider: "openai",
    label: "Main",
    fingerprint: "fp-old",
    masked: "sk-...old",
    status: "active",
    sourceType: "manual",
    createdAt: now,
    meta: { serviceAccountId: "sa_existing_1" },
  }).run();
  return { db, orgId, keyId };
}

describe("runRotation real path", () => {
  it("dry-run never touches the network and records dry-run jobs", async () => {
    process.env.MOCK_MODE = "false";
    process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
    process.env.OPENAI_PROJECT_ID = "proj_test";

    const { db, orgId, keyId } = await freshDb();
    const summary = await runRotation({ db, orgId });

    expect(summary.dryRun).toBe(true);
    expect(summary.jobs[0]?.status).toBe("dry-run");
    expect(calls).toHaveLength(0);

    const keyBack = await db.select().from(keys).where(eq(keys.id, keyId)).get();
    expect(keyBack?.status).toBe("active");
    expect(keyBack?.lastRotatedAt).toBeNull();
    const job = await db.select().from(rotationJobs).where(eq(rotationJobs.keyId, keyId)).get();
    expect(job?.status).toBe("dry-run");
  });

  it("performs a real openai swap when configured", async () => {
    process.env.MOCK_MODE = "false";
    process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
    process.env.OPENAI_PROJECT_ID = "proj_test";

    const { db, orgId, keyId } = await freshDb();
    const summary = await runRotation({ db, orgId, dryRun: false });

    expect(summary.jobs[0]?.status).toBe("success");
    expect(summary.jobs[0]?.result).toContain("real openai rotate");

    // The admin key was used on the API.
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.init?.headers).toMatchObject({ Authorization: "Bearer sk-admin-test" });

    const keyBack = await db.select().from(keys).where(eq(keys.id, keyId)).get();
    expect(keyBack?.status).toBe("active");
    expect(keyBack?.lastRotatedAt).not.toBeNull();
    expect(keyBack?.masked).toContain("sk-");
    expect(keyBack?.fingerprint).not.toBe("fp-old");
    expect(keyBack?.meta.rotatedKeyId).toBe("key_rot_1");
  });

  it("marks the job failed when real credentials are missing", async () => {
    process.env.MOCK_MODE = "false";
    delete process.env.OPENAI_ADMIN_KEY;
    process.env.OPENAI_PROJECT_ID = "proj_test";

    const { db, orgId } = await freshDb();
    const summary = await runRotation({ db, orgId, dryRun: false });

    expect(summary.jobs[0]?.status).toBe("failed");
    expect(summary.jobs[0]?.error).toContain("OPENAI_ADMIN_KEY");
    expect(calls).toHaveLength(0);

    // Key is not left stuck rotating.
    const keyBack = await db.select().from(keys).where(eq(keys.id, "key-real-rot")).get();
    expect(keyBack?.status).toBe("active");
  });

  it("keeps guided placeholder result for non-openai providers", async () => {
    process.env.MOCK_MODE = "false";
    process.env.OPENAI_ADMIN_KEY = "sk-admin-test";
    process.env.OPENAI_PROJECT_ID = "proj_test";

    resetDbCache();
    const db = getDb(":memory:");
    const orgId = "org-anthropic";
    const keyId = "key-anthropic";
    const now = Date.now();
    await db.insert(orgs).values({
      id: orgId,
      name: "Anthro",
      rotationSchedule: "weekly",
      autoRotateExposed: false,
      notifyChannels: [],
      createdAt: now,
    }).run();
    await db.insert(keys).values({
      id: keyId,
      orgId,
      provider: "anthropic",
      label: "Anthro key",
      fingerprint: "fp-anthro",
      masked: "sk-ant-...abcd",
      status: "active",
      sourceType: "manual",
      createdAt: now,
      meta: {},
    }).run();

    const summary = await runRotation({ db, orgId, dryRun: false });
    expect(summary.jobs[0]?.status).toBe("success");
    expect(summary.jobs[0]?.result).toContain("guided rotation");
    expect(calls).toHaveLength(0);
  });
});
