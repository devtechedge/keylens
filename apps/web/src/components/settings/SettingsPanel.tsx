"use client";

import { useState } from "react";
import type { AlertTestPayload, OrgView } from "@/api-types";
import { apiFetch } from "@/lib/fetch";

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
        checked ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-700"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}

const ENDPOINTS = [
  ["GET", "/api/summary"],
  ["GET", "/api/keys"],
  ["GET", "/api/anomalies"],
  ["GET", "/api/usage-series?keyId=..."],
  ["POST", "/api/scan"],
  ["POST", "/api/rotate"],
  ["POST", "/api/alerts/test"],
  ["POST", "/api/onboarding/mock-connect"],
];

export function SettingsPanel({
  initialOrg,
  mockMode,
}: {
  initialOrg: OrgView;
  mockMode: boolean;
}) {
  const [org, setOrg] = useState<OrgView>(initialOrg);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [alertBusy, setAlertBusy] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [base] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin,
  );

  async function save(patch: { rotationSchedule?: string; autoRotateExposed?: boolean }) {
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      const res = await apiFetch<{ org: OrgView }>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setOrg(res.org);
      setSavedMsg("Settings saved");
      setTimeout(() => setSavedMsg(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setAlertBusy(true);
    setAlertMsg(null);
    setError(null);
    try {
      const res = await apiFetch<AlertTestPayload>("/api/alerts/test", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setAlertMsg(
        res.delivered.length > 0
          ? `Delivered via ${res.delivered.join(", ")}`
          : "Alert queued (no channels configured)",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAlertBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="kl-enter rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Rotation</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            How often KeyLens rotates keys for this org.
          </p>
        </div>
        <div className="space-y-5 px-5 py-5">
          <label className="block">
            <span className="text-sm text-slate-700 dark:text-slate-300">Schedule</span>
            <select
              value={org.rotationSchedule}
              disabled={saving}
              onChange={(e) => save({ rotationSchedule: e.target.value })}
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual</option>
            </select>
          </label>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Auto-rotate exposed keys</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Immediately rotate keys flagged as leaked.
              </p>
            </div>
            <Toggle
              checked={org.autoRotateExposed}
              disabled={saving}
              onChange={(v) => save({ autoRotateExposed: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-700 dark:text-slate-300">Send test alert</p>
              <p className="mt-0.5 text-xs text-slate-500">
                Deliver a canned event through the alert pipeline.
              </p>
            </div>
            <button
              onClick={sendTest}
              disabled={alertBusy}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              {alertBusy ? "Sending..." : "Send test alert"}
            </button>
          </div>

          {(savedMsg || alertMsg) && (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
              {savedMsg ?? alertMsg}
            </p>
          )}
        </div>
      </section>

      <section className="kl-enter-1 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">API</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Route handlers exposed by this app.
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
              mockMode
                ? "bg-amber-500/10 text-amber-700 ring-amber-500/30 dark:text-amber-300 dark:ring-amber-400/30"
                : "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300 dark:ring-emerald-400/30"
            }`}
          >
            {mockMode ? "Mock mode" : "Live mode"}
          </span>
        </div>
        <div className="px-5 py-4">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-slate-950/70 dark:text-slate-400">
            {mockMode
              ? "Mock mode banner: all connectors, usage, rotation, and alerts run on synthetic demo data. Zero external credentials required."
              : "Live mode: connectors talk to real providers when credentials are configured."}
          </p>
          <ul className="mt-4 space-y-1.5">
            {ENDPOINTS.map(([method, path]) => (
              <li
                key={path}
                className="flex items-center gap-3 font-mono text-xs"
              >
                <span
                  className={`w-10 rounded px-1.5 py-0.5 text-center text-[10px] font-semibold ${
                    method === "GET"
                      ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                      : "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                  }`}
                >
                  {method}
                </span>
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {base}
                  {path}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
