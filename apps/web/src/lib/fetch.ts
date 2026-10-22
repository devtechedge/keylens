/**
 * Client-side fetch helper. Attaches the portal gate token when one is
 * configured publicly (NEXT_PUBLIC_PORTAL_TOKEN), so the dashboard can talk
 * to gated API routes even when PORTAL_TOKEN is set server-side.
 */

const TOKEN = process.env.NEXT_PUBLIC_PORTAL_TOKEN;

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (TOKEN) headers.set("x-portal-token", TOKEN);
  const res = await fetch(path, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (body as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return body as T;
}
