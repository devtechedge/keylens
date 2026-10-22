"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConnectGitHubPayload, ScanResultPayload } from "@/api-types";
import { apiFetch } from "@/lib/fetch";
import { ProviderIcon } from "@/components/ui/Presentational";

type Phase = "idle" | "connecting" | "connected" | "scanning" | "results";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  "aws-bedrock": "AWS Bedrock",
  "azure-openai": "Azure OpenAI",
  gemini: "Google Gemini",
  mistral: "Mistral",
  other: "Other",
};

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function OnboardingFlow() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [orgInput, setOrgInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [connectedOrg, setConnectedOrg] = useState<string | null>(null);
  const [repos, setRepos] = useState<number | null>(null);
  const [scan, setScan] = useState<ScanResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const realTarget = orgInput.trim().length > 0;

  async function connect() {
    setError(null);
    setPhase("connecting");
    try {
      if (realTarget) {
        const res = await apiFetch<ConnectGitHubPayload>("/api/onboarding/connect-github", {
          method: "POST",
          body: JSON.stringify({ org: orgInput.trim(), token: tokenInput.trim() || undefined }),
        });
        setConnectedOrg(res.org ?? orgInput.trim());
        setRepos(res.publicRepos ?? null);
      } else {
        const res = await apiFetch<{ ok: boolean; repos: number }>(
          "/api/onboarding/mock-connect",
          { method: "POST", body: JSON.stringify({}) },
        );
        setConnectedOrg(null);
        setRepos(res.repos);
      }
      setPhase("connected");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  async function scanOrg() {
    setError(null);
    setPhase("scanning");
    try {
      const [result] = await Promise.all([
        apiFetch<ScanResultPayload>("/api/scan", {
          method: "POST",
          body: JSON.stringify({
            org: realTarget ? orgInput.trim() : undefined,
            token: realTarget ? tokenInput.trim() || undefined : undefined,
          }),
        }),
        delay(1500),
      ]);
      setScan(result);
      setPhase("results");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("connected");
    }
  }

  useEffect(() => {
    if (phase === "scanning") {
      const el = progressRef.current;
      if (el) {
        el.classList.remove("kl-progress");
        // force reflow so the animation restarts
        void el.offsetWidth;
        el.classList.add("kl-progress");
      }
    }
  }, [phase]);

  const grouped =
    scan?.newKeys.reduce<Record<string, number>>((acc, k) => {
      acc[k.provider] = (acc[k.provider] ?? 0) + 1;
      return acc;
    }, {}) ?? {};

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4">
      <div className="kl-enter w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-md transition-transform duration-200 hover:scale-105">
            KL
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-900 dark:text-slate-100">
            {phase === "results" ? "You're covered" : "Connect your GitHub org"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            {phase === "results"
              ? "KeyLens found your AI keys and is watching them."
              : realTarget
                ? "We'll scan your repos for exposed AI keys with your GitHub token."
                : "Demo mode: connect a mock org or enter a real GitHub org below."}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-700 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {phase === "idle" && (
            <>
              <div className="space-y-2">
                <input
                  type="text"
                  value={orgInput}
                  onChange={(e) => setOrgInput(e.target.value)}
                  placeholder="GitHub org or username (e.g. acme)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
                />
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Fine-grained PAT (optional; used only for this scan)"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-100"
                />
              </div>
              <button
                onClick={connect}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {realTarget ? "Connect GitHub" : "Connect GitHub (demo)"}
              </button>
              <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                Leave fields empty to preview with the seeded demo organization.
              </p>
            </>
          )}

          {phase === "connecting" && (
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              Connecting to GitHub...
            </div>
          )}

          {phase === "connected" && (
            <>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                <span>✓</span>
                <span>
                  {connectedOrg ? (
                    <>
                      Connected · {connectedOrg} · {repos ?? 0} public repos
                    </>
                  ) : (
                    <>Connected · {repos ?? 0} repositories (demo)</>
                  )}
                </span>
              </div>
              <button
                onClick={scanOrg}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400"
              >
                Scan org for AI keys
              </button>
            </>
          )}

          {phase === "scanning" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">Scanning repositories...</span>
                <span className="text-slate-500">~1.5s</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div ref={progressRef} className="kl-progress h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Matching provider key patterns against config files, CI logs, and
                env stores.
              </p>
            </div>
          )}

          {phase === "results" && scan && (
            <>
              <div className="space-y-2">
                {Object.entries(grouped).map(([provider, count]) => (
                  <div
                    key={provider}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition-colors duration-150 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-indigo-500/50"
                  >
                    <ProviderIcon provider={provider} size="sm" />
                    <span className="flex-1 text-sm text-slate-800 dark:text-slate-200">
                      {PROVIDER_LABELS[provider] ?? provider}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {count} key{count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && (
                  <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                    No AI keys found in this scan.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-700 dark:text-emerald-300">
                ✓ {scan.newKeys.length} keys found · {scan.candidateSecrets} candidate
                secrets · {scan.scannedRepos} repos scanned
                {scan.real && ` · ${scan.sourceOrg ?? ""}`}
              </div>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400"
              >
                Go to dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
