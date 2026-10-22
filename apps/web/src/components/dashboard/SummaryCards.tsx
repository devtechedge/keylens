import type { SummaryPayload } from "@/api-types";
import { formatUsd, relativeFuture } from "@/lib/format";

function Card({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ?? "text-slate-100"}`}>
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
    </div>
  );
}

export function SummaryCards({ summary }: { summary: SummaryPayload }) {
  const next = summary.nextRotation;
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Card
        label="Exposed keys"
        value={String(summary.leakedKeys)}
        note={summary.leakedKeys > 0 ? "rotate or retire" : "all clear"}
        accent={summary.leakedKeys > 0 ? "text-red-400" : undefined}
      />
      <Card label="Keys found" value={String(summary.keysFound)} note="tracked keys" />
      <Card
        label="Est. 7-day spend"
        value={formatUsd(summary.spend7dUsd)}
        note="last 7 days"
      />
      <Card
        label="Open anomalies"
        value={String(summary.openAnomalies)}
        note={summary.openAnomalies > 0 ? "needs review" : "none"}
        accent={summary.openAnomalies > 0 ? "text-amber-400" : undefined}
      />
      <Card
        label="Next rotation"
        value={next ? relativeFuture(next.scheduledFor) : "None"}
        note={
          next
            ? `${next.provider} · ${next.status}`
            : "schedule in settings"
        }
      />
    </section>
  );
}
