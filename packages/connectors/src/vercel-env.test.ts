import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { scanVercelEnv } from "./vercel-env";

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let realFetch: typeof fetch;
let calls: string[] = [];

beforeEach(() => {
  realFetch = globalThis.fetch;
  calls = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = String(url);
    calls.push(u);
    if (u.includes("/v9/projects?")) {
      return jsonResponse(200, { projects: [{ name: "acme-app" }, { name: "web" }] });
    }
    if (u.includes("/env?teamId=")) {
      if (u.includes("acme-app")) {
        return jsonResponse(200, {
          envs: [
            { key: "OPENAI_API_KEY", value: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
            { key: "NOT_A_SECRET", value: "hello-world" },
          ],
        });
      }
      return jsonResponse(200, { envs: [] });
    }
    return jsonResponse(404, { error: { code: "not_found" } });
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("scanVercelEnv", () => {
  it("discovers AI keys from project env vars", async () => {
    const keys = await scanVercelEnv({ token: "tok", teamId: "team_1" });

    expect(keys).toHaveLength(1);
    const key = keys[0]!;
    expect(key.sourceType).toBe("vercel");
    expect(key.status).toBe("unknown");
    expect(key.provider).toBe("openai");
    expect(key.sourceRef).toBe("vercel-project/acme-app:env/OPENAI_API_KEY");
    expect(key.meta._scan).toBe(true);
    expect(key.masked).toContain("sk-");
    // Never store the raw secret.
    expect(JSON.stringify(key)).not.toContain("sk-proj-abcdefghijklmnopqrstuvwxyz1234567890");
    expect(calls[0]).toContain("/v9/projects?teamId=team_1");
    expect(calls[1]).toContain("/v9/projects/acme-app/env?teamId=team_1");
  });

  it("respects limitProjects", async () => {
    await scanVercelEnv({ token: "tok", teamId: "team_1", limitProjects: 1 });
    expect(calls.filter((c) => c.includes("/env?teamId="))).toHaveLength(1);
  });
});
