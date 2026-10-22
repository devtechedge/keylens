import { NextResponse } from "next/server";

/**
 * Portal gate helper. Checks the x-portal-token header against PORTAL_TOKEN.
 * When the env var is unset the gate is open (mock dev convenience).
 */
export function checkPortalGate(headers: Headers): { ok: boolean; error?: string } {
  const expected = process.env.PORTAL_TOKEN;
  if (!expected) return { ok: true };
  const provided = headers.get("x-portal-token");
  if (provided === expected) return { ok: true };
  return { ok: false, error: "Unauthorized: missing or invalid x-portal-token" };
}

export async function withGate(
  req: Request,
  handler: () => Promise<Response> | Response,
): Promise<Response> {
  const gate = checkPortalGate(req.headers);
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: 401 });
  return handler();
}
