import Link from "next/link";
import type { AnomalyView, KeyView, SummaryPayload } from "@/api-types";
import { SummaryCards } from "./SummaryCards";
import { KeyTable } from "./KeyTable";
import { AnomalyFeed } from "./AnomalyFeed";

export function Dashboard({
  orgName,
  summary,
  keys,
  anomalies,
}: {
  orgName: string;
  summary: SummaryPayload;
  keys: KeyView[];
  anomalies: AnomalyView[];
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white">
              KL
            </span>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-100">{orgName}</h1>
              {summary.demo && (
                <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300 ring-1 ring-indigo-400/30">
                  Demo data
                </span>
              )}
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/onboarding"
              className="rounded-lg px-3 py-1.5 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200"
            >
              Onboarding
            </Link>
            <Link
              href="/settings"
              className="rounded-lg px-3 py-1.5 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200"
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <SummaryCards summary={summary} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <KeyTable initialKeys={keys} />
          </div>
          <div>
            <AnomalyFeed initialAnomalies={anomalies} />
          </div>
        </div>
      </main>
    </div>
  );
}
