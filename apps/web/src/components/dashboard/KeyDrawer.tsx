"use client";

import { useCallback, useEffect, useState } from "react";
import type { KeyView, RotationResultPayload, UsageSeriesPoint } from "@/api-types";
import { apiFetch } from "@/lib/fetch";
import { dateShort, formatUsdFull, timeAgo } from "@/lib/format";
import { ProviderIcon, SourceLabel, StatusPill } from "@/components/ui/Presentational";
import { Sparkline } from "./Sparkline";

type Busy = "dryrun" | "rotate" | "retire" | null;

export function KeyDrawer({
  initial,
  onClose,
  onKeysChanged,
}: {
  initial: KeyView;
  onClose: () => void;
  onKeysChanged: (keys: KeyView[]) => void;
}) {
  const [points, setPoints] = useState<UsageSeriesPoint[] | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirm, setConfirm] = useState<Busy>(null);
  const [jobMsg, setJobMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPoints(null);
    apiFetch<{ points: UsageSeriesPoint[] }>(
      `/api/usage-series?keyId=${encodeURIComponent(initial.id)}`,
    )
      .then((res) => {
        if (!cancelled) setPoints(res.points);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [initial.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = useCallback(
    async (kind: Exclude<Busy, null>) => {
      setBusy(kind);
      setError(null);
      setJobMsg(null);
      try {
        const res = await apiFetch<RotationResultPayload>("/api/rotate", {
          method: "POST",
          body: JSON.stringify({ keyId: initial.id, dryRun: kind === "dryrun" }),
        });
        const job = res.jobs?.[0];
        setJobMsg(
          job
            ? `${job.status}${job.result ? ` - ${job.result}` : ""}`
            : "Rotation requested",
        );
        if (kind !== "dryrun") {
          const { keys } = await apiFetch<{ keys: KeyView[] }>("/api/keys");
          onKeysChanged(keys);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(null);
        setConfirm(null);
      }
    },
    [initial.id, onKeysChanged],
  );

  const stats = points && points.length > 0
    ? {
        total: points.reduce((s, p) => s + p.spendUsd, 0),
        peak: Math.max(...points.map((p) => p.spendUsd)),
        days: points.length > 0 ? Math.max(1, Math.round(points.length / 24)) : 1,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        aria-label="Close drawer"
        onClick={onClose}
        className="kl-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <aside className="kl-drawer kl-scroll absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ProviderIcon provider={initial.provider} />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {initial.providerName}
              </p>
              <div className="mt-0.5">
                <StatusPill status={initial.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Esc
          </button>
        </div>

        <div className="flex-1 space-y-6 p-5">
          <div>
            <p className="font-mono text-lg text-indigo-600 dark:text-indigo-300">
              {initial.masked}
            </p>
            {initial.label && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {initial.label}
              </p>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Source</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                <SourceLabel source={initial.sourceType} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Location</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-slate-500 dark:text-slate-400" title={initial.sourceRef ?? undefined}>
                {initial.sourceRef ?? "unknown"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Owner</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                {initial.ownerEmail ?? "unassigned"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Created</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-300">{dateShort(initial.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Last seen</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                {initial.lastSeenAt ? timeAgo(initial.lastSeenAt) : "never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Last rotated</dt>
              <dd className="mt-0.5 text-slate-700 dark:text-slate-300">
                {dateShort(initial.lastRotatedAt)}
              </dd>
            </div>
          </dl>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Spend · last 14 days
              </h3>
              {stats && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {formatUsdFull(stats.total)} total · peak {formatUsdFull(stats.peak)}
                </span>
              )}
            </div>
            {points === null ? (
              <div className="kl-skeleton h-24 rounded-lg" />
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <Sparkline points={points} />
              </div>
            )}
          </section>

          <section className="space-y-3">
            {jobMsg && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Last action: {jobMsg}
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => run("dryrun")}
                disabled={busy !== null}
                className="rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2 text-sm font-medium text-indigo-600 transition hover:bg-indigo-500/20 disabled:opacity-50 dark:text-indigo-300"
              >
                {busy === "dryrun" ? "Running..." : "Preview rotation"}
              </button>
              <button
                onClick={() => (confirm === "rotate" ? run("rotate") : setConfirm("rotate"))}
                disabled={busy !== null || initial.status === "retired"}
                className="rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:opacity-50"
              >
                {confirm === "rotate" ? "Confirm rotate?" : "Rotate now"}
              </button>
              <button
                onClick={() => (confirm === "retire" ? run("retire") : setConfirm("retire"))}
                disabled={busy !== null || initial.status === "retired"}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {confirm === "retire" ? "Confirm retire?" : "Retire"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Real rotation flips the key&apos;s status and retires the old
              secret in mock mode. Preview never mutates.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
