import { createHash } from "node:crypto";

/** sha256 hex fingerprint of a raw key. Never store the raw key itself. */
export function fingerprint(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Redact a raw key for display: keep a recognizable prefix and the last 4 chars.
 * e.g. "sk-proj-abc...Ab12"
 */
export function mask(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}...`;
  const head = trimmed.slice(0, Math.min(10, trimmed.length - 4));
  return `${head}...${trimmed.slice(-4)}`;
}
