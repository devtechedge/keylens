"use client";

import { useState } from "react";
import type { CheckoutPayload } from "@/api-types";
import { apiFetch } from "@/lib/fetch";

export function PricingSubscribeButton({
  plan,
  label,
}: {
  plan: "monthly" | "annual";
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<CheckoutPayload>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (!res.ok || !res.url) {
        setError(res.error ?? "Could not start checkout");
        return;
      }
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          {error} · connect Stripe (STRIPE_SECRET_KEY) to enable live checkout.
        </p>
      )}
      <button
        onClick={subscribe}
        disabled={busy}
        className="w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400 disabled:opacity-50"
      >
        {busy ? "Redirecting..." : label}
      </button>
    </div>
  );
}
