import Link from "next/link";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata = {
  title: "Onboarding · KeyLens",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              KL
            </span>
            KeyLens onboarding
          </span>
          <Link
            href="/"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200"
          >
            Back to dashboard
          </Link>
        </div>
      </header>
      <main className="py-10">
        <OnboardingFlow />
      </main>
    </div>
  );
}
