import type { AIKey, KeySourceType } from "@keylens/core";
import { PROVIDERS } from "@keylens/core";
import { discoverFromText } from "./discover";
import { registerConnector, type Connector } from "./registry";
import { scanVercelEnv } from "./vercel-env";

/**
 * Real GitHub connector: scans a GitHub org/user's repositories (default
 * branch tree) for provider key patterns using the GitHub REST API. It is
 * wired when MOCK_MODE=false and GITHUB_TOKEN is set.
 *
 * Deliberately conservative: skips forks/archived/private repos, only scans
 * text-like files, caps repos/files per run, and sleeps between calls to stay
 * well within rate limits.
 */

const API = "https://api.github.com";
const DEFAULT_PER_CALL_DELAY_MS = 80;
const DEFAULT_REPO_LIMIT = 25;
const DEFAULT_FILE_LIMIT = 400;

const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "py", "go", "rs", "rb", "java",
  "cs", "kt", "php", "sql", "tf", "sh", "ps1", "bash", "zsh", "vue",
  "svelte", "md", "txt", "yml", "yaml", "json", "json5", "toml", "ini",
  "cfg", "properties", "env", "example", "sample", "lock", "gradle",
  "xml", "html", "css", "scss", "tsconfig", "schema", "conf",
]);

function isInterestingFile(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  if (name.startsWith(".") && name.includes("env")) return true;
  const lower = name.toLowerCase();
  if (lower.includes("license") || lower.includes("credits")) return false;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  return TEXT_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface GitHubScanOptions {
  token: string;
  org: string;
  limitRepos?: number;
  limitFiles?: number;
  perCallDelayMs?: number;
}

export interface GitHubScanResult {
  scannedRepos: number;
  filesScanned: number;
  newKeys: AIKey[];
  providersFound: AIKey["provider"][];
}

interface GhRepo {
  name: string;
  default_branch?: string | null;
  fork: boolean;
  archived: boolean;
  private: boolean;
}

interface GhTreeEntry {
  path?: string;
  type?: string;
  size?: number | null;
}

/**
 * Scan a GitHub org/user for provider keys. Returns deduped findings (no raw
 * secrets, just fingerprint + masked + source ref). Does not touch the DB.
 */
export async function scanGitHubOrg(opts: GitHubScanOptions): Promise<GitHubScanResult> {
  const { token, org } = opts;
  const limitRepos = opts.limitRepos ?? DEFAULT_REPO_LIMIT;
  const limitFiles = opts.limitFiles ?? DEFAULT_FILE_LIMIT;
  const delay = opts.perCallDelayMs ?? DEFAULT_PER_CALL_DELAY_MS;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "keylens",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const reposRes = await fetch(`${API}/users/${org}/repos?per_page=100&type=all`, { headers });
  if (!reposRes.ok) {
    throw new Error(`GitHub: list repos failed (${reposRes.status})`);
  }
  const repos = ((await reposRes.json()) as GhRepo[])
    .filter((r) => !r.fork && !r.archived && !r.private)
    .slice(0, limitRepos);

  const findings: AIKey[] = [];
  const seenFingerprints = new Set<string>();
  let filesScanned = 0;

  for (const repo of repos) {
    const branch = repo.default_branch ?? "main";
    const treeRes = await fetch(
      `${API}/repos/${org}/${repo.name}/git/trees/${branch}?recursive=1`,
      { headers },
    );
    if (!treeRes.ok) continue;

    const tree = ((await treeRes.json()) as { tree?: GhTreeEntry[] }).tree ?? [];
    const perRepoCap = Math.max(10, Math.floor(limitFiles / Math.max(1, repos.length)));
    const candidates = tree
      .filter(
        (t) =>
          t.type === "blob" &&
          !!t.path &&
          t.size != null &&
          t.size > 0 &&
          t.size < 262_144 &&
          isInterestingFile(t.path),
      )
      .slice(0, perRepoCap);

    for (const candidate of candidates) {
      await sleep(delay);
      const path = candidate.path!;
      const rawRes = await fetch(
        `${API}/repos/${org}/${repo.name}/contents/${encodeURIComponent(path)}`,
        { headers: { ...headers, Accept: "application/vnd.github.raw" }, redirect: "follow" },
      );
      if (!rawRes.ok) continue;
      const text = await rawRes.text();
      filesScanned += 1;

      for (const found of discoverFromText(text)) {
        if (seenFingerprints.has(found.fingerprint)) continue;
        seenFingerprints.add(found.fingerprint);
        findings.push({
          ...found,
          sourceType: "github-repo",
          sourceRef: `${org}/${repo.name}:${path}`,
          meta: { ...found.meta, _scan: true, providerLabel: PROVIDERS[found.provider]?.name },
        });
      }
    }
  }

  const providersFound = [...new Set(findings.map((k) => k.provider))];
  return {
    scannedRepos: repos.length,
    filesScanned,
    newKeys: findings,
    providersFound,
  };
}

/**
 * GitHub repo connector for the registry. Uses GITHUB_TOKEN from the
 * environment; treats ctx.orgId as the GitHub owner (user or org). Only
 * returns findings; scanOrg persists them.
 */
const githubRepoConnector: Connector = {
  sourceType: "github-repo",
  async scan(ctx) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is not set (required for real github-repo connector)");
    }
    const result = await scanGitHubOrg({ token, org: ctx.orgId });
    return result.newKeys;
  },
};

registerConnector(githubRepoConnector);

/** Keep the old stub registration for sources we have not wired yet. */
function notWired(sourceType: KeySourceType): Connector {
  return {
    sourceType,
    async scan() {
      throw new Error(`real connector not yet wired: ${sourceType}`);
    },
  };
}

const UNWIRED_SOURCES: KeySourceType[] = [
  "github-actions",
  "netlify",
  "aws-secrets",
  "gcp-secrets",
  "gateway",
  "manual",
];

for (const sourceType of UNWIRED_SOURCES) {
  registerConnector(notWired(sourceType));
}

/**
 * Vercel env connector: env-guarded (requires VERCEL_TOKEN and
 * VERCEL_TEAM_ID). The connector is always registered; scanning without the
 * env variables throws a clear configuration error.
 */
registerConnector({
  sourceType: "vercel",
  async scan() {
    const token = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    if (!token || !teamId) {
      throw new Error("vercel connector requires VERCEL_TOKEN and VERCEL_TEAM_ID");
    }
    return scanVercelEnv({ token, teamId });
  },
});
