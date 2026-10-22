import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { getSubscription } from "@keylens/billing";
import { Header } from "@/components/ui/Header";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { BillingCard } from "@/components/settings/BillingCard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · KeyLens",
};

export default async function SettingsPage() {
  const db = await readyDb();
  const org = await getFirstOrg(db);
  const mockMode = process.env.MOCK_MODE === "true";
  const sub = org ? await getSubscription({ db, orgId: org.id }) : null;

  return (
    <div className="min-h-screen">
      <Header brand="Settings" nav={[{ href: "/", label: "Dashboard" }]} />
      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10 sm:px-6">
        <BillingCard
          plan={sub?.plan ?? null}
          status={sub?.status ?? "none"}
          currentPeriodEnd={sub?.currentPeriodEnd ?? null}
        />
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
