"use client";

import { useState } from "react";
import type { AnomalyView } from "@/api-types";
import { apiFetch } from "@/lib/fetch";
import { timeAgo } from "@/lib/format";
import { KindLabel, SeverityBadge } from "@/components/ui/Presentational";

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-sky-500",
  info: "bg-slate-500",
};

export function AnomalyFeed({
  initialAnomalies,
}: {
  initialAnomalies: AnomalyView[];
}) {
  const [items, setItems] = useState<AnomalyView[]>(initialAnomalies);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(id: string) {
    setResolving(id);
    setError(null);
    try {
      await apiFetch(`/api/anomalies/${id}/resolve`, { method: "POST" });
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setResolving(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Anomalies
        </h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {items.length} open
        </span>
      </div>

      {error && (
        <p className="border-b border-slate-200 bg-red-500/10 px-4 py-2 text-xs text-red-700 dark:border-slate-800 dark:text-red-300">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-2xl">✓</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All clear</p>
          <p className="mt-0.5 text-xs text-slate-500">
            No open anomalies right now
          </p>
        </div>
      ) : (
        <ul>
          {items.map((a) => (
            <li
              key={a.id}
              className="group flex gap-3 border-b border-slate-100 px-4 py-3.5 transition-colors duration-150 last:border-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/30"
            >
              <span
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[a.severity] ?? SEVERITY_DOT.info!}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {a.title}
                  </p>
                  <SeverityBadge severity={a.severity} />
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <KindLabel kind={a.kind} />
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{a.detail}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    {timeAgo(a.detectedAt)}
                    {a.keyLabel ? ` · ${a.keyLabel}` : ""}
                  </p>
                  <button
                    onClick={() => resolve(a.id)}
                    disabled={resolving === a.id}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    {resolving === a.id ? "Resolving..." : "Resolve"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
