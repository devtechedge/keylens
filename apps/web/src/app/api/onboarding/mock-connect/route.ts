import { NextResponse } from "next/server";

/**
 * Scaffold onboarding path: intentionally NOT portal-gated.
 * Mock instant GitHub connect (no network).
 */
export async function POST(_req: Request) {
  return NextResponse.json({ ok: true, repos: 12 });
}
