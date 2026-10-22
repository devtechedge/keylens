import type { KeySourceType } from "@keylens/core";
import { registerConnector, type Connector } from "./registry";

/**
 * Placeholder real connectors. The scaffold only wires the mock path;
 * every real source throws a clear "not wired" error so callers never
 * accidentally hit the network with fake credentials.
 */
function notWired(sourceType: KeySourceType): Connector {
  return {
    sourceType,
    async scan() {
      throw new Error(`real connector not yet wired: ${sourceType}`);
    },
  };
}

const ALL_SOURCES: KeySourceType[] = [
  "github-repo",
  "github-actions",
  "vercel",
  "netlify",
  "aws-secrets",
  "gcp-secrets",
  "gateway",
  "manual",
];

for (const sourceType of ALL_SOURCES) {
  registerConnector(notWired(sourceType));
}
