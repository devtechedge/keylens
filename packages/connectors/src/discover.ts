import { PROVIDERS, fingerprint, mask } from "@keylens/core";
import type { AIKey, ProviderId } from "@keylens/core";

/**
 * Scan order matters: several patterns overlap (e.g. the generic `sk-...`
 * patterns would also match Anthropic `sk-ant-...` keys). Providers are
 * checked most-specific first and the first provider to claim a raw
 * substring wins.
 */
const SCAN_PRIORITY: ProviderId[] = [
  "anthropic",
  "openai",
  "azure-openai",
  "gemini",
  "aws-bedrock",
  "mistral",
  "other",
];

interface RawMatch {
  provider: ProviderId;
  raw: string;
  start: number;
  end: number;
}

/**
 * Run every provider key pattern over `text` and return masked,
 * fingerprinted AIKey entries. The raw secret is never stored.
 * Results are deduped by fingerprint; matches nested inside an already
 * accepted (higher-priority) match are discarded.
 */
export function discoverFromText(text: string): AIKey[] {
  const matches: RawMatch[] = [];
  for (const provider of SCAN_PRIORITY) {
    const pattern = PROVIDERS[provider].keyPattern;
    const re = new RegExp(pattern.source, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = (m[1] ?? m[0]).trim();
      if (raw.length > 0) {
        matches.push({ provider, raw, start: m.index, end: m.index + m[0].length });
      }
      if (m[0].length === 0) re.lastIndex += 1; // safety against zero-width patterns
    }
  }

  // Deterministic order: earliest occurrence first, tied positions keep
  // priority order (Array.prototype.sort is stable).
  matches.sort((a, b) => a.start - b.start);

  const accepted: RawMatch[] = [];
  for (const mt of matches) {
    const nested = accepted.some(
      (a) => mt.start >= a.start && mt.end <= a.end,
    );
    if (nested) continue; // substring of a higher-priority match (e.g. mistral fragment)
    accepted.push(mt);
  }

  const seen = new Map<string, RawMatch>();
  const out: AIKey[] = [];
  for (const mt of accepted) {
    const fp = fingerprint(mt.raw);
    if (seen.has(fp)) continue; // dedupe repeats by fingerprint
    seen.set(fp, mt);
    out.push({
      id: `disc-${fp.slice(0, 16)}`,
      orgId: "",
      provider: mt.provider,
      fingerprint: fp,
      masked: mask(mt.raw),
      status: "unknown",
      sourceType: "manual",
      createdAt: new Date().toISOString(),
      meta: { _scan: true },
    });
  }
  return out;
}
