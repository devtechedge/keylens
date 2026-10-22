import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_API = "https://api.github.com";

function normalizeOrg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  value = value.replace(/\/+$/, "").split("/")[0] ?? "";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(value)) return null;
  return value;
}

/**
 * Real GitHub connect: validates a token (provided by the user or the server
 * GITHUB_TOKEN) and confirms the org/user handle exists. No secrets are
 * persisted or logged; the token is used only in-memory for this request.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const org = normalizeOrg(body.org);
  const providedToken = typeof body.token === "string" ? body.token.trim() : "";

  if (!org) {
    return NextResponse.json(
      { error: "Enter a GitHub org or username to connect." },
      { status: 400 },
    );
  }

  const token = providedToken || process.env.GITHUB_TOKEN || "";
  if (!token) {
    return NextResponse.json(
      {
        error:
          "No GitHub token available. Add a fine-grained PAT below or set GITHUB_TOKEN on the server.",
      },
      { status: 401 },
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "keylens",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const userRes = await fetch(`${GITHUB_API}/user`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (userRes.status === 401 || userRes.status === 403) {
      return NextResponse.json(
        { error: "GitHub token is invalid or expired." },
        { status: 401 },
      );
    }
    if (!userRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error (${userRes.status}).` },
        { status: 502 },
      );
    }

    const orgRes = await fetch(`${GITHUB_API}/users/${org}`, {
      headers,
      signal: AbortSignal.timeout(15_000),
    });
    if (orgRes.status === 404) {
      return NextResponse.json(
        { error: `GitHub org or user "${org}" was not found.` },
        { status: 404 },
      );
    }
    if (!orgRes.ok) {
      return NextResponse.json(
        { error: `GitHub API error (${orgRes.status}).` },
        { status: 502 },
      );
    }
    const orgData = (await orgRes.json()) as { login?: string; type?: string; public_repos?: number };

    return NextResponse.json({
      ok: true,
      org: orgData.login ?? org,
      type: orgData.type ?? "User",
      publicRepos: orgData.public_repos ?? 0,
      tokenSource: providedToken ? "provided" : "server",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not reach GitHub. Try again." },
      { status: 502 },
    );
  }
}
