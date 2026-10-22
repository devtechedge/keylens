import { readyDb } from "@/db";
import { getFirstOrg } from "@/data";
import { Header } from "@/components/ui/Header";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · KeyLens",
};

export default async function SettingsPage() {
  const db = await readyDb();
  const org = await getFirstOrg(db);
  const mockMode = process.env.MOCK_MODE === "true";

  return (
    <div className="min-h-screen">
      <Header brand="Settings" nav={[{ href: "/", label: "Dashboard" }]} />
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
