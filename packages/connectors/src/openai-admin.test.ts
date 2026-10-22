import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  createServiceAccountKey,
  createServiceAccountWithKey,
  deleteServiceAccount,
  fetchOpenAiUsageByKey,
  listOpenAiProjects,
  listServiceAccounts,
  OpenAiApiShapeError,
  OpenAiAdminError,
} from "./openai-admin";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let realFetch: typeof fetch;
let calls: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  realFetch = globalThis.fetch;
  calls = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    const u = String(url);
    if (u.includes("/service_accounts") && u.includes("/keys")) {
      return jsonResponse(200, { id: "key_new_1", value: "sk-proj-BRANDNEWKEY0123456789abcdef" });
    }
    if (u.includes("/service_accounts") && (init?.method === "POST" || init?.method === undefined)) {
      return jsonResponse(200, { id: "sa_new_1", name: "rotated", status: "active" });
    }
    if (u.includes("/service_accounts")) {
      return jsonResponse(200, { deleted: true });
    }
    if (u.includes("/projects")) {
      return jsonResponse(200, { data: [{ id: "proj_1", name: "prod" }] });
    }
    if (u.includes("/usage")) {
      return jsonResponse(200, {
        data: [
          {
            key_id: "key_usage_1",
            start_time: 1700000000,
            amount_cents: 500,
            tokens: 1000,
            calls: 20,
            errors: 1,
          },
        ],
      });
    }
    return jsonResponse(404, { error: { message: "not found" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("listOpenAiProjects", () => {
  it("lists projects", async () => {
    const projects = await listOpenAiProjects({ token: "tok" });
    expect(projects).toEqual([{ id: "proj_1", name: "prod" }]);
    expect(calls[0]?.url).toContain("/v1/organization/projects");
    expect(calls[0]?.init?.headers).toMatchObject({ Authorization: "Bearer tok" });
  });

  it("throws a typed shape error on shape drift", async () => {
    globalThis.fetch = (async () => jsonResponse(200, { weird: true })) as typeof fetch;
    await expect(listOpenAiProjects({ token: "tok" })).rejects.toBeInstanceOf(OpenAiApiShapeError);
  });
});

describe("service accounts", () => {
  it("lists service accounts", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push({ url: String(url) });
      return jsonResponse(200, { data: [{ id: "sa_1", name: "ci", status: "active" }] });
    }) as typeof fetch;
    const accounts = await listServiceAccounts({ token: "tok", projectId: "proj_1" });
    expect(accounts[0]?.id).toBe("sa_1");
    expect(String(calls[0]?.url)).toContain("/service_accounts");
  });

  it("creates a key for an existing service account", async () => {
    const key = await createServiceAccountKey({
      token: "tok",
      projectId: "proj_1",
      serviceAccountId: "sa_1",
      name: "rotated",
    });
    expect(key.keyId).toBe("key_new_1");
    expect(key.rawKey).toBe("sk-proj-BRANDNEWKEY0123456789abcdef");
    expect(key.masked).toContain("sk-proj");
    expect(calls[0]?.init?.method).toBe("POST");
  });

  it("creates a service account with a key", async () => {
    const result = await createServiceAccountWithKey({
      token: "tok",
      projectId: "proj_1",
      name: "ci",
    });
    expect(result.id).toBe("sa_new_1");
    expect(result.keyId).toBe("key_new_1");
    expect(result.rawKey).toContain("sk-proj");
  });

  it("deletes a service account", async () => {
    await deleteServiceAccount({ token: "tok", projectId: "proj_1", serviceAccountId: "sa_1" });
    expect(calls[0]?.init?.method).toBe("DELETE");
  });
});

describe("fetchOpenAiUsageByKey", () => {
  it("converts cents to dollar spendUsd", async () => {
    const points = await fetchOpenAiUsageByKey({
      token: "tok",
      orgId: "org-1",
      startTime: 1700000000000,
      endTime: 1700086400000,
    });
    expect(points).toHaveLength(1);
    expect(points[0]?.keyId).toBe("key_usage_1");
    expect(points[0]?.spendUsd).toBe(5);
    expect(points[0]?.periodStart).toBe(1700000000 * 1000);
    expect(points[0]?.tokens).toBe(1000);
    expect(points[0]?.calls).toBe(20);
    expect(points[0]?.errors).toBe(1);
  });

  it("normalizes dollars-style amount fields without dividing", async () => {
    globalThis.fetch = (async () =>
      jsonResponse(200, {
        data: [{ key_id: "k", start_time: 1700000000, amount_usd: 12.5 }],
      })) as typeof fetch;
    const points = await fetchOpenAiUsageByKey({
      token: "tok",
      startTime: 1700000000000,
      endTime: 1700086400000,
    });
    expect(points[0]?.spendUsd).toBe(12.5);
  });

  it("throws typed errors on non-2xx responses", async () => {
    globalThis.fetch = (async () => jsonResponse(401, { error: { message: "bad key" } })) as typeof fetch;
    await expect(
      fetchOpenAiUsageByKey({ token: "bad", startTime: 1, endTime: 2 }),
    ).rejects.toBeInstanceOf(OpenAiAdminError);
  });
});
