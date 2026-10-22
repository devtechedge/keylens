import type { ProviderId } from "./types";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  /** Regex that matches a plausible raw key for this provider. */
  keyPattern: RegExp;
  /** Can this provider's keys be rotated via an API? */
  rotationSupported: boolean;
  /** Does the provider expose a spend/usage API? */
  usageAvailable: boolean;
  /** Used as a fallback baseline until real spend data exists. */
  defaultSpendBaselineUsdPerDay: number;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    keyPattern: /\b(sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/,
    rotationSupported: true,
    usageAvailable: true,
    defaultSpendBaselineUsdPerDay: 5,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    keyPattern: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/,
    rotationSupported: false, // no public key-management API yet -> guided rotation
    usageAvailable: true,
    defaultSpendBaselineUsdPerDay: 5,
  },
  "aws-bedrock": {
    id: "aws-bedrock",
    name: "AWS Bedrock (IAM)",
    keyPattern: /\b(AKIA[0-9A-Z]{16})\b/,
    rotationSupported: true,
    usageAvailable: true,
    defaultSpendBaselineUsdPerDay: 10,
  },
  "azure-openai": {
    id: "azure-openai",
    name: "Azure OpenAI",
    keyPattern: /(?:api[_ -]?key|apikey)["'\s:=]+([0-9a-f]{32})/i,
    rotationSupported: true,
    usageAvailable: true,
    defaultSpendBaselineUsdPerDay: 5,
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini / Vertex",
    keyPattern: /\b(AIza[0-9A-Za-z_-]{35})\b/,
    rotationSupported: true,
    usageAvailable: true,
    defaultSpendBaselineUsdPerDay: 5,
  },
  mistral: {
    id: "mistral",
    name: "Mistral",
    keyPattern: /\b([A-Za-z0-9]{32,})/,
    rotationSupported: false,
    usageAvailable: false,
    defaultSpendBaselineUsdPerDay: 2,
  },
  other: {
    id: "other",
    name: "Other",
    keyPattern: /\b(sk-[A-Za-z0-9_-]{20,})\b/,
    rotationSupported: false,
    usageAvailable: false,
    defaultSpendBaselineUsdPerDay: 1,
  },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];
