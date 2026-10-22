import { afterEach, describe, expect, it, vi } from "vitest";
import { scanGitHubOrg } from "./real-connectors";

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch(routes: Array<{ url: string; status?: number; body?: unknown; text?: string }>) {
  const calls: string[] = [];
  globalThis.fetch = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    const route = routes.find((r) => url.startsWith(r.url));
    if (!route) {
      return new Response("not found", { status: 404 });
    }
    if (route.text != null) {
      return new Response(route.text, { status: route.status ?? 200 });
    }
    return new Response(JSON.stringify(route.body ?? {}), {
      status: route.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe("scanGitHubOrg", () => {
  it("finds keys in repo file contents and sets source refs", async () => {
    const calls = mockFetch([
      { url: "https://api.github.com/users/acme/repos", body: [
        { name: "web", default_branch: "main", fork: false, archived: false, private: false },
        { name: "internal", default_branch: "main", fork: false, archived: false, private: true },
        { name: "forks", default_branch: "main", fork: true, archived: false, private: false },
      ]},
      { url: "https://api.github.com/repos/acme/web/git/trees/main", body: { tree: [
        { path: "src/lib/ai.ts", type: "blob", size: 100 },
        { path: "logo.png", type: "blob", size: 5000 },
      ]}},
      { url: "https://api.github.com/repos/acme/web/contents/src%2Flib%2Fai.ts", text: "const key = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ab';" },
    ]);

    const result = await scanGitHubOrg({
      token: "ghp_test",
      org: "acme",
      perCallDelayMs: 0,
    });

    console.log("DEBUG calls", JSON.stringify(calls), "repos", result.scannedRepos, "files", result.filesScanned, "keys", result.newKeys.length);
    expect(result.scannedRepos).toBe(1); // private + fork excluded
    expect(result.filesScanned).toBe(1);
    expect(result.newKeys).toHaveLength(1);
    expect(result.newKeys[0]!.provider).toBe("openai");
    expect(result.newKeys[0]!.sourceRef).toBe("acme/web:src/lib/ai.ts");
    expect(result.newKeys[0]!.masked).not.toContain("ABCDEFGHIJKLMNO"); // no raw secret
    expect(calls.some((u) => u.includes("users/acme/repos"))).toBe(true);
  });

  it("dedupes identical keys across files", async () => {
    mockFetch([
      { url: "https://api.github.com/users/acme/repos", body: [
        { name: "a", default_branch: "main", fork: false, archived: false, private: false },
      ]},
      { url: "https://api.github.com/repos/acme/a/git/trees/main", body: { tree: [
        { path: "x.ts", type: "blob", size: 100 },
        { path: "y.ts", type: "blob", size: 100 },
      ]}},
      { url: "https://api.github.com/repos/acme/a/contents/x.ts", text: "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop" },
      { url: "https://api.github.com/repos/acme/a/contents/y.ts", text: "sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop" },
    ]);

    const result = await scanGitHubOrg({ token: "ghp_test", org: "acme", perCallDelayMs: 0 });
    expect(result.filesScanned).toBe(2);
    expect(result.newKeys).toHaveLength(1);
    expect(result.newKeys[0]!.provider).toBe("anthropic");
  });

  it("throws when repo listing fails", async () => {
    mockFetch([{ url: "https://api.github.com/users/acme/repos", status: 403 }]);
    await expect(
      scanGitHubOrg({ token: "ghp_test", org: "acme", perCallDelayMs: 0 }),
    ).rejects.toThrow(/list repos failed \(403\)/);
  });
});
