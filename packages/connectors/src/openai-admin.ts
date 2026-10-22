import { fingerprint, mask } from "@keylens/core";
import type { UsagePoint } from "@keylens/core";

const OPENAI_ORG_BASE = "https://api.openai.com/v1/organization";

/** Base error for OpenAI admin API problems. */
export class OpenAiAdminError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "OpenAiAdminError";
  }
}

/** Thrown when the API response shape drifts from the expected REST shape. */
export class OpenAiApiShapeError extends OpenAiAdminError {
  constructor(message: string) {
    super(message);
    this.name = "OpenAiApiShapeError";
  }
}

interface JsonObject {
  [key: string]: unknown;
}

async function openAiCall(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`${OPENAI_ORG_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined),
      },
    });
  } catch (err) {
    throw new OpenAiAdminError(`openai network error: ${(err as Error).message}`);
  }
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json
        ? String((json as { error: { message?: string } }).error?.message ?? "")
        : text;
    throw new OpenAiAdminError(`openai API error ${res.status}: ${msg}`, res.status);
  }
  return json;
}

function asArray(value: unknown, what: string): JsonObject[] {
  if (Array.isArray(value)) return value as JsonObject[];
  if (value && typeof value === "object" && Array.isArray((value as JsonObject).data)) {
    return (value as JsonObject).data as JsonObject[];
  }
  throw new OpenAiApiShapeError(`expected ${what} array, got ${typeof value}`);
}

function asString(value: unknown, what: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new OpenAiApiShapeError(`expected ${what} string`);
  }
  return value;
}

export interface OpenAiProject {
  id: string;
  name: string;
}

export interface OpenAiServiceAccount {
  id: string;
  name: string;
  status: string;
}

export interface CreatedKey {
  keyId: string;
  rawKey: string;
  masked: string;
}

/** GET /organization/projects */
export async function listOpenAiProjects({ token }: { token: string }): Promise<OpenAiProject[]> {
  const json = await openAiCall("/projects", token);
  return asArray(json, "projects").map((p) => ({
    id: asString(p.id, "project.id"),
    name: asString(p.name ?? p.title, "project.name"),
  }));
}

/** GET /organization/projects/{projectId}/service_accounts */
export async function listServiceAccounts({
  token,
  projectId,
}: {
  token: string;
  projectId: string;
}): Promise<OpenAiServiceAccount[]> {
  const json = await openAiCall(`/projects/${encodeURIComponent(projectId)}/service_accounts`, token);
  return asArray(json, "service_accounts").map((sa) => ({
    id: asString(sa.id, "service_account.id"),
    name: asString(sa.name ?? sa.title, "service_account.name"),
    status: typeof sa.status === "string" ? sa.status : "active",
  }));
}

/**
 * POST /organization/projects/{projectId}/service_accounts/{id}/keys
 * Returns the raw key exactly once (never persisted by caller).
 */
export async function createServiceAccountKey({
  token,
  projectId,
  serviceAccountId,
  name,
}: {
  token: string;
  projectId: string;
  serviceAccountId: string;
  name?: string;
}): Promise<CreatedKey> {
  const json = await openAiCall(
    `/projects/${encodeURIComponent(projectId)}/service_accounts/${encodeURIComponent(serviceAccountId)}/keys`,
    token,
    {
      method: "POST",
      body: name ? JSON.stringify({ name }) : undefined,
    },
  );
  const obj = json as JsonObject;
  const keyId = asString(obj.id ?? obj.key_id ?? obj.keyId, "key.id");
  const rawKey = asString(obj.value ?? obj.key ?? obj.raw_key, "key.value");
  return { keyId, rawKey, masked: mask(rawKey) };
}

/** POST /organization/projects/{projectId}/service_accounts then create a key. */
export async function createServiceAccountWithKey({
  token,
  projectId,
  name,
}: {
  token: string;
  projectId: string;
  name?: string;
}): Promise<OpenAiServiceAccount & CreatedKey> {
  const saJson = await openAiCall(
    `/projects/${encodeURIComponent(projectId)}/service_accounts`,
    token,
    { method: "POST", body: name ? JSON.stringify({ name }) : undefined },
  );
  const sa = saJson as JsonObject;
  const serviceAccountId = asString(sa.id, "service_account.id");
  const key = await createServiceAccountKey({ token, projectId, serviceAccountId, name });
  return {
    id: serviceAccountId,
    name: asString(sa.name ?? sa.title ?? name ?? "", "service_account.name"),
    status: typeof sa.status === "string" ? sa.status : "active",
    ...key,
  };
}

/** DELETE /organization/projects/{projectId}/service_accounts/{id} */
export async function deleteServiceAccount({
  token,
  projectId,
  serviceAccountId,
}: {
  token: string;
  projectId: string;
  serviceAccountId: string;
}): Promise<void> {
  await openAiCall(
    `/projects/${encodeURIComponent(projectId)}/service_accounts/${encodeURIComponent(serviceAccountId)}`,
    token,
    { method: "DELETE" },
  );
}

function toMs(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new OpenAiApiShapeError(`bad timestamp ${String(value)}`);
  // Accept seconds (10 digits) or ms (13 digits); anything else assumed ms.
  return Math.abs(n) < 1e12 ? n * 1000 : n;
}

function toUsd(value: unknown, fieldName: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new OpenAiApiShapeError(`bad amount in ${fieldName}`);
  // Fields named *_cents / *_c arrive in cents; fields named *_usd / *_dollars arrive in dollars.
  if (/cents$|_c$|\.c$/i.test(fieldName)) return n / 100;
  return n;
}

function toInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

/**
 * GET /organization/usage/keys?start_time=...&end_time=...
 * The endpoint returns per-key usage aggregations. Response shapes may drift;
 * we accept rows that carry an amount in cents (amount_cents/amount_c) or
 * dollars (amount_usd/amount), plus token/call/error totals. Amounts are
 * converted to dollar floats for UsagePoint.
 */
export async function fetchOpenAiUsageByKey({
  token,
  orgId: _orgId,
  startTime,
  endTime,
}: {
  token: string;
  orgId?: string;
  startTime: number;
  endTime: number;
}): Promise<UsagePoint[]> {
  const qs = new URLSearchParams({
    start_time: String(Math.round(startTime / 1000)),
    end_time: String(Math.round(endTime / 1000)),
  });
  const json = await openAiCall(`/usage/keys?${qs.toString()}`, token);
  const rows = asArray(json, "usage rows");
  const out: UsagePoint[] = [];
  for (const row of rows) {
    const keyId = row.key_id ?? row.keyId ?? row.api_key_id;
    if (typeof keyId !== "string" || keyId.length === 0) continue;
    const amountField = row.amount_cents !== undefined
      ? "amount_cents"
      : row.amount_c !== undefined
        ? "amount_c"
        : row.amount_usd !== undefined
          ? "amount_usd"
          : row.amount !== undefined
            ? "amount"
            : "amount";
    out.push({
      keyId,
      periodStart: toMs(row.start_time ?? row.period_start ?? row.snapshot_time),
      spendUsd: toUsd(row[amountField] ?? 0, amountField),
      tokens: toInt(row.tokens),
      calls: toInt(row.calls ?? row.requests),
      errors: toInt(row.errors ?? row.error_count),
    });
  }
  return out;
}

export function fingerprintKey(raw: string): string {
  return fingerprint(raw);
}
