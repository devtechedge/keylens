"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResultPayload } from "@/api-types";
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
  const [repos, setRepos] = useState<number | null>(null);
  const [scan, setScan] = useState<ScanResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  async function connect() {
    setError(null);
    setPhase("connecting");
    try {
      const res = await apiFetch<{ ok: boolean; repos: number }>(
        "/api/onboarding/mock-connect",
        { method: "POST", body: JSON.stringify({}) },
      );
      setRepos(res.repos);
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
          body: JSON.stringify({}),
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
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white">
            KL
          </span>
          <h1 className="mt-4 text-xl font-semibold text-slate-100">
            {phase === "results" ? "You're covered" : "Connect your GitHub org"}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            {phase === "results"
              ? "KeyLens found your AI keys and is watching them."
              : "We'll scan your repos for exposed AI keys. Fully mocked for this demo."}
          </p>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-4">
          {phase === "idle" && (
            <button
              onClick={connect}
              className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
            >
              Connect GitHub
            </button>
          )}

          {phase === "connecting" && (
            <div className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm text-slate-400">
              Connecting to GitHub...
            </div>
          )}

          {phase === "connected" && (
            <>
              <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                <span>✓</span>
                <span>
                  Connected · {repos ?? 0} repositories
                </span>
              </div>
              <button
                onClick={scanOrg}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400"
              >
                Scan org for AI keys
              </button>
            </>
          )}

          {phase === "scanning" && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">Scanning repositories...</span>
                <span className="text-slate-500">~1.5s</span>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
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
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <ProviderIcon provider={provider} size="sm" />
                    <span className="flex-1 text-sm text-slate-200">
                      {PROVIDER_LABELS[provider] ?? provider}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                      {count} key{count === 1 ? "" : "s"}
                    </span>
                  </div>
                ))}
                {Object.keys(grouped).length === 0 && (
                  <p className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-center text-sm text-slate-400">
                    No AI keys found in this scan.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-300">
                ✓ {scan.newKeys.length} keys found · {scan.candidateSecrets} candidate
                secrets · {scan.scannedRepos} repos scanned
              </div>
              <button
                onClick={() => router.push("/")}
                className="w-full rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-400"
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
