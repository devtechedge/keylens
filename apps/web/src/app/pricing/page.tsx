import { Header } from "@/components/ui/Header";
import { PricingSubscribeButton } from "@/components/pricing/PricingSubscribeButton";

export const metadata = {
  title: "Pricing · KeyLens",
};

const FEATURES = [
  "Unlimited AI key discovery",
  "Weekly automated rotation",
  "Spend anomaly alerts",
  "Slack + email notifications",
  "Priority support",
];

function TierCard({
  name,
  price,
  period,
  badge,
  highlighted,
  plan,
  buttonLabel,
}: {
  name: string;
  price: string;
  period: string;
  badge?: string;
  highlighted?: boolean;
  plan: "monthly" | "annual";
  buttonLabel: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        highlighted
          ? "border-indigo-500/50 bg-indigo-500/5 dark:border-indigo-400/40 dark:bg-indigo-500/10 dark:hover:shadow-black/30"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:hover:shadow-black/30"
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-0.5 text-[11px] font-semibold text-white shadow-sm whitespace-nowrap">
          {badge}
        </span>
      )}
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {name}
      </h2>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {price}
        </span>
        <span className="text-sm text-slate-500">{period}</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2.5">
        {FEATURES.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              ✓
            </span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <PricingSubscribeButton plan={plan} label={buttonLabel} />
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header
        brand="Pricing"
        nav={[
          { href: "/", label: "Dashboard" },
          { href: "/settings", label: "Settings" },
        ]}
      />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="kl-enter text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Simple, flat pricing
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Everything you need to find keys, rotate them, and catch weird spend.
            No seat limits, no overage surprises.
          </p>
        </div>
        <div className="kl-enter-1 mt-10 grid gap-6 md:grid-cols-2">
          <TierCard
            name="Monthly"
            price="$99"
            period="/mo"
            plan="monthly"
            buttonLabel="Subscribe monthly"
          />
          <TierCard
            name="Annual"
            price="$990"
            period="/yr"
            badge="2 months free"
            highlighted
            plan="annual"
            buttonLabel="Subscribe yearly"
          />
        </div>
        <p className="kl-enter-2 mt-8 text-center text-xs text-slate-500">
          You can switch plans or cancel anytime. Billing handled by Stripe.
        </p>
      </main>
    </div>
  );
}
