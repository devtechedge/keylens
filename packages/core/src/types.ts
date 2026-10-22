/**
 * KeyLens core domain types.
 * These are the single source of truth every package implements against.
 * Keep this file dependency-free (no imports outside this package).
 */

export type ProviderId =
  | "openai"
  | "anthropic"
  | "aws-bedrock"
  | "azure-openai"
  | "gemini"
  | "mistral"
  | "other";

export type KeyStatus =
  | "active"
  | "rotating"
  | "leaked"
  | "retired"
  | "unknown";

export type KeySourceType =
  | "github-repo"
  | "github-actions"
  | "vercel"
  | "netlify"
  | "aws-secrets"
  | "gcp-secrets"
  | "gateway"
  | "manual";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type AnomalyKind =
  | "spend-spike"
  | "new-region"
  | "error-spike"
  | "new-key-found"
  | "exposed-key"
  | "rotation-needed"
  | "other";

export type RotationStatus =
  | "queued"
  | "dry-run"
  | "running"
  | "success"
  | "failed"
  | "rolled-back";

export type RotationSchedule = "weekly" | "monthly" | "manual";

/** A discovered or imported AI key. Never store the raw secret. */
export interface AIKey {
  id: string;
  orgId: string;
  provider: ProviderId;
  label?: string;
  /** sha256 hex of the raw key, used as the dedupe identity. */
  fingerprint: string;
  /** Redacted form, e.g. "sk-...Ab12". Safe to display. */
  masked: string;
  status: KeyStatus;
  sourceType: KeySourceType;
  /** e.g. "acme/repo:src/lib/ai.ts#L42" */
  sourceRef?: string;
  ownerEmail?: string;
  createdAt: string;
  lastSeenAt?: string;
  lastRotatedAt?: string;
  meta: Record<string, unknown>;
}

/** One aggregated usage sample for a key over a period (1h by default). */
export interface UsagePoint {
  keyId: string;
  /** Unix ms at period start. */
  periodStart: number;
  spendUsd: number;
  tokens: number;
  calls: number;
  errors: number;
  region?: string;
}

export interface AnomalyEvent {
  id: string;
  orgId: string;
  keyId?: string;
  kind: AnomalyKind;
  severity: Severity;
  title: string;
  detail: string;
  /** Unix ms. */
  detectedAt: number;
  /** Unix ms or undefined while open. */
  resolvedAt?: number;
  meta: Record<string, unknown>;
}

export interface RotationJob {
  id: string;
  orgId: string;
  keyId: string;
  provider: ProviderId;
  status: RotationStatus;
  /** Unix ms. */
  scheduledFor: number;
  startedAt?: number;
  finishedAt?: number;
  result?: string;
  error?: string;
}

export interface OrgConfig {
  orgId: string;
  name: string;
  rotationSchedule: RotationSchedule;
  autoRotateExposed: boolean;
  notifyChannels: string[];
}

/** Result of a discovery/scan pass. */
export interface ScanSummary {
  orgId: string;
  scannedAt: number;
  scannedRepos: number;
  candidateSecrets: number;
  newKeys: AIKey[];
  providersFound: ProviderId[];
}

/** Result of a rotation pass. */
export interface RotationSummary {
  orgId: string;
  ranAt: number;
  dryRun: boolean;
  jobs: RotationJob[];
}
