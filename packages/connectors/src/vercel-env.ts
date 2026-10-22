import type { AIKey } from "@keylens/core";
import { discoverFromText } from "./discover";

const VERCEL_API_BASE = "https://api.vercel.com";

export class VercelApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "VercelApiError";
  }
}

interface JsonObject {
  [key: string]: unknown;
}

async function vercelCall(path: string, token: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${VERCEL_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new VercelApiError(`vercel network error: ${(err as Error).message}`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    throw new VercelApiError(`vercel API error ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return json;
}

function asArray(value: unknown, what: string): JsonObject[] {
  if (Array.isArray(value)) return value as JsonObject[];
  if (value && typeof value === "object") {
    const obj = value as JsonObject;
    if (Array.isArray(obj.projects)) return obj.projects as JsonObject[];
    if (Array.isArray(obj.envs)) return obj.envs as JsonObject[];
    if (Array.isArray(obj.env)) return obj.env as JsonObject[];
    if (Array.isArray(obj.data)) return obj.data as JsonObject[];
  }
  throw new VercelApiError(`vercel response missing ${what} array`);
}

export interface ScanVercelEnvArgs {
  token: string;
  teamId: string;
  limitProjects?: number;
}

/**
 * Scan Vercel project env vars for AI keys. Returns AIKey entries with
 * sourceType "vercel" and sourceRef `vercel-project/<project>:env/<KEY>`.
 * Raw secrets are never included (only masked + fingerprinted).
 */
export async function scanVercelEnv({
  token,
  teamId,
  limitProjects,
}: ScanVercelEnvArgs): Promise<AIKey[]> {
  const projects = asArray(
    await vercelCall(`/v9/projects?teamId=${encodeURIComponent(teamId)}`, token),
    "projects",
  );
  const limited = limitProjects && limitProjects > 0 ? projects.slice(0, limitProjects) : projects;

  const out: AIKey[] = [];
  const seen = new Set<string>();
  for (const project of limited) {
    const projectName = typeof project.name === "string" ? project.name : String(project.id ?? "");
    if (!projectName) continue;
    const envJson = await vercelCall(
      `/v9/projects/${encodeURIComponent(projectName)}/env?teamId=${encodeURIComponent(teamId)}`,
      token,
    );
    const envs = asArray(envJson, "env");
    for (const env of envs) {
      const envKey = typeof env.key === "string" ? env.key : "";
      let value: unknown = env.value;
      if (value && typeof value === "object" && "value" in (value as JsonObject)) {
        value = (value as JsonObject).value;
      }
      if (typeof value !== "string" || !envKey) continue;
      const discovered = discoverFromText(value);
      for (const k of discovered) {
        if (seen.has(k.fingerprint)) continue;
        seen.add(k.fingerprint);
        out.push({
          ...k,
          id: `vercel-${k.fingerprint.slice(0, 16)}`,
          label: `${projectName}/${envKey}`,
          sourceType: "vercel",
          sourceRef: `vercel-project/${projectName}:env/${envKey}`,
        });
      }
    }
  }
  return out;
}
