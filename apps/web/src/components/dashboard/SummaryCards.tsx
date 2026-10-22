import type { ReactNode } from "react";
import type { SummaryPayload } from "@/api-types";
import { formatUsd, relativeFuture } from "@/lib/format";

function ShieldAlertIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function SpendIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2a2.6 2.6 0 0 0-2.2-1.2c-1.5 0-2.6.9-2.6 2s1.1 2 2.6 2 2.6.9 2.6 2-1.1 2-2.6 2a2.6 2.6 0 0 1-2.2-1.2" />
      <path d="M12 6v12" />
    </svg>
  );
}

function PulseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l3-8 4 16 3-8h4" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function Card({
  icon,
  tone,
  accentBar,
  label,
  value,
  note,
  valueClass,
}: {
  icon: ReactNode;
  tone: string;
  accentBar?: string;
  label: string;
  value: string;
  note?: string;
  valueClass?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:shadow-black/30">
      {accentBar && (
        <span className={`absolute inset-x-0 top-0 h-0.5 ${accentBar}`} />
      )}
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${tone}`}>
          {icon}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
      </div>
      <p className={`mt-3 text-[26px] font-bold leading-none tracking-tight ${valueClass ?? "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </p>
      {note && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-500">{note}</p>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: SummaryPayload }) {
  const next = summary.nextRotation;
  const exposed = summary.leakedKeys > 0;
  const anomalies = summary.openAnomalies > 0;

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Card
        icon={<ShieldAlertIcon />}
        tone={exposed ? "bg-red-500/10 text-red-600 ring-red-500/25 dark:text-red-400" : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400"}
        accentBar={exposed ? "bg-gradient-to-r from-red-500 to-orange-400" : undefined}
        label="Exposed keys"
        value={String(summary.leakedKeys)}
        note={exposed ? "rotate or retire" : "all clear"}
        valueClass={exposed ? "text-red-600 dark:text-red-400" : undefined}
      />
      <Card
        icon={<KeyIcon />}
        tone="bg-indigo-500/10 text-indigo-600 ring-indigo-500/25 dark:text-indigo-300"
        label="Keys found"
        value={String(summary.keysFound)}
        note="tracked keys"
      />
      <Card
        icon={<SpendIcon />}
        tone="bg-violet-500/10 text-violet-600 ring-violet-500/25 dark:text-violet-300"
        label="Est. 7-day spend"
        value={formatUsd(summary.spend7dUsd)}
        note="last 7 days"
      />
      <Card
        icon={<PulseIcon />}
        tone={anomalies ? "bg-amber-500/10 text-amber-600 ring-amber-500/25 dark:text-amber-300" : "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400"}
        accentBar={anomalies ? "bg-gradient-to-r from-amber-500 to-orange-400" : undefined}
        label="Open anomalies"
        value={String(summary.openAnomalies)}
        note={anomalies ? "needs review" : "none"}
        valueClass={anomalies ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <Card
        icon={<RefreshIcon />}
        tone="bg-sky-500/10 text-sky-600 ring-sky-500/25 dark:text-sky-300"
        label="Next rotation"
        value={next ? relativeFuture(next.scheduledFor) : "None"}
        note={next ? `${next.provider} · ${next.status}` : "schedule in settings"}
      />
    </section>
  );
}
