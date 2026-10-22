/**
 * Shared view types crossing the server/client boundary.
 * Pure types only: importing these never pulls server code into the client.
 */

export interface OrgView {
  id: string;
  name: string;
  rotationSchedule: string;
  autoRotateExposed: boolean;
}

export interface KeyView {
  id: string;
  provider: string;
  providerName: string;
  label: string | null;
  masked: string;
  status: string;
  sourceType: string;
  sourceRef: string | null;
  ownerEmail: string | null;
  createdAt: number;
  lastSeenAt: number | null;
  lastRotatedAt: number | null;
  demo: boolean;
}

export interface AnomalyView {
  id: string;
  keyId: string | null;
  keyLabel: string | null;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  detectedAt: number;
  resolvedAt: number | null;
}

export interface NextRotationView {
  jobId: string;
  keyId: string;
  provider: string;
  scheduledFor: number;
  status: string;
}

export interface SummaryPayload {
  org: OrgView | null;
  leakedKeys: number;
  keysFound: number;
  spend7dUsd: number;
  openAnomalies: number;
  nextRotation: NextRotationView | null;
  demo: boolean;
}

export interface UsageSeriesPoint {
  t: number;
  spendUsd: number;
}

export interface ScanResultPayload {
  orgId: string;
  scannedAt: number;
  scannedRepos: number;
  candidateSecrets: number;
  newKeys: {
    id: string;
    provider: string;
    label?: string;
    masked: string;
    status: string;
    sourceType: string;
    sourceRef?: string;
  }[];
  providersFound: string[];
}

export interface RotationResultPayload {
  orgId: string;
  ranAt: number;
  dryRun: boolean;
  jobs: {
    id: string;
    keyId: string;
    provider: string;
    status: string;
    scheduledFor: number;
    result?: string;
    error?: string;
  }[];
}

export interface AlertTestPayload {
  ok: boolean;
  delivered: string[];
}

export interface BillingStatusPayload {
  plan: string | null;
  status: string;
  currentPeriodEnd: number | null;
}

export interface CheckoutPayload {
  ok: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
}
