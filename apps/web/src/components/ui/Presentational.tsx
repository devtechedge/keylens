/**
 * Small presentational pieces shared by server and client trees.
 * Pure markup and fixed label maps, no logic.
 */

const PROVIDER_META: Record<string, { initials: string; bg: string }> = {
  openai: { initials: "OA", bg: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
  anthropic: { initials: "AN", bg: "bg-rose-500/15 text-rose-300 ring-rose-400/30" },
  "aws-bedrock": { initials: "AW", bg: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
  "azure-openai": { initials: "AZ", bg: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
  gemini: { initials: "GM", bg: "bg-violet-500/15 text-violet-300 ring-violet-400/30" },
  mistral: { initials: "MI", bg: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
  other: { initials: "?", bg: "bg-slate-500/15 text-slate-300 ring-slate-400/30" },
};

export function ProviderIcon({
  provider,
  size = "md",
}: {
  provider: string;
  size?: "sm" | "md";
}) {
  const meta = PROVIDER_META[provider] ?? PROVIDER_META.other!;
  const box =
    size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-semibold ring-1 ${box} ${meta.bg}`}
    >
      {meta.initials}
    </span>
  );
}

const STATUS_PILL: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/30",
  rotating: "bg-amber-500/10 text-amber-300 ring-amber-400/30",
  leaked: "bg-red-500/10 text-red-300 ring-red-400/30",
  retired: "bg-slate-500/10 text-slate-400 ring-slate-500/30",
  unknown: "bg-slate-500/10 text-slate-400 ring-slate-500/30",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${
        STATUS_PILL[status] ?? STATUS_PILL.unknown!
      }`}
    >
      {status}
    </span>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  "github-repo": "GitHub repo",
  "github-actions": "GitHub Actions",
  vercel: "Vercel",
  netlify: "Netlify",
  "aws-secrets": "AWS Secrets",
  "gcp-secrets": "GCP Secrets",
  gateway: "Gateway",
  manual: "Manual",
};

export function SourceLabel({ source }: { source: string }) {
  return <span>{SOURCE_LABELS[source] ?? source}</span>;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-300 ring-red-400/30",
  high: "bg-orange-500/15 text-orange-300 ring-orange-400/30",
  medium: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  low: "bg-sky-500/15 text-sky-300 ring-sky-400/30",
  info: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ${
        SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info!
      }`}
    >
      {severity}
    </span>
  );
}

const KIND_LABELS: Record<string, string> = {
  "spend-spike": "Spend spike",
  "new-region": "New region",
  "error-spike": "Error spike",
  "new-key-found": "New key found",
  "exposed-key": "Exposed key",
  "rotation-needed": "Rotation needed",
  other: "Other",
};

export function KindLabel({ kind }: { kind: string }) {
  return <span>{KIND_LABELS[kind] ?? kind}</span>;
}
