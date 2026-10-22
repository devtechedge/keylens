import { NextResponse } from "next/server";
import { scanOrg, scanGitHubOrg, persistFindings } from "@keylens/connectors";
import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { withGate } from "@/gate";

export const dynamic = "force-dynamic";

function normalizeOrg(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let value = raw.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, "");
  value = value.replace(/\/+$/, "").split("/")[0] ?? "";
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(value)) return null;
  return value;
}

export async function POST(req: Request) {
  return withGate(req, async () => {
    const db = await readyDb();
    const org = await getFirstOrg(db);
    if (!org) {
      return NextResponse.json(
        { error: "No organization found. Run `pnpm seed` first." },
        { status: 404 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const sources = Array.isArray(body.sources) ? body.sources : undefined;

    // Real GitHub scan when the caller supplies an org (and a token from the
    // user or the server env). Falls back to the seeded demo scan otherwise.
    const githubOrg = normalizeOrg(body.org);
    const providedToken = typeof body.token === "string" ? body.token.trim() : "";
    const token = providedToken || process.env.GITHUB_TOKEN || "";

    if (githubOrg && token) {
      try {
        const result = await scanGitHubOrg({
          token,
          org: githubOrg,
          limitRepos: 25,
          limitFiles: 400,
        });
        const persisted = await persistFindings(db, org.id, result.newKeys);
        return NextResponse.json({
          orgId: org.id,
          scannedAt: Date.now(),
          scannedRepos: result.scannedRepos,
          candidateSecrets: result.newKeys.length,
          newKeys: persisted,
          providersFound: result.providersFound,
          real: true,
          sourceOrg: githubOrg,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "GitHub scan failed.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    if (githubOrg && !token) {
      return NextResponse.json(
        {
          error:
            "No GitHub token available for a real scan. Add a fine-grained PAT or set GITHUB_TOKEN on the server.",
        },
        { status: 401 },
      );
    }

    const summary = await scanOrg({ db, orgId: org.id, sources });
    return NextResponse.json(summary);
  });
}
