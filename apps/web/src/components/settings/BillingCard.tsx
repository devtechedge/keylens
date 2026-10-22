import Link from "next/link";
import { dateShort } from "@/lib/format";

function statusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trialing";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
    case "unpaid":
      return "Unpaid";
    default:
      return "No active plan";
  }
}

export function BillingCard({
  plan,
  status,
  currentPeriodEnd,
}: {
  plan: string | null;
  status: string;
  currentPeriodEnd: number | null;
}) {
  const hasPlan = status === "active" || status === "trialing";
  return (
    <section className="kl-enter-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Billing
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {hasPlan
              ? `${plan === "annual" ? "Annual" : "Monthly"} plan`
              : "No subscription yet"}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${
            hasPlan
              ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300 dark:ring-emerald-400/30"
              : "bg-slate-500/10 text-slate-600 ring-slate-500/30 dark:text-slate-300 dark:ring-slate-500/30"
          }`}
        >
          {hasPlan ? statusLabel(status) : "Free"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {hasPlan ? `Renews ${dateShort(currentPeriodEnd)}` : "Choose a plan to start rotating on autopilot."}
          </p>
        </div>
        <Link
          href="/pricing"
          className="shrink-0 rounded-lg bg-indigo-500 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-400"
        >
          View pricing
        </Link>
      </div>
    </section>
  );
}
