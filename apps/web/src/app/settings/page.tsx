import Link from "next/link";
import { getAppDb } from "@/db";
import { getFirstOrg } from "@/data";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · KeyLens",
};

export default async function SettingsPage() {
  const db = getAppDb();
  const org = await getFirstOrg(db);
  const mockMode = process.env.MOCK_MODE === "true";

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800/80 bg-slate-950/80">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3 sm:px-6">
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
              KL
            </span>
            Settings
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
        <SettingsPanel
          initialOrg={
            org ?? {
              id: "org-acme",
              name: "Acme Labs",
              rotationSchedule: "weekly",
              autoRotateExposed: false,
            }
          }
          mockMode={mockMode}
        />
      </main>
    </div>
  );
}
