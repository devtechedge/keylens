import type { AnomalyView, KeyView, SummaryPayload } from "@/api-types";
import { Header } from "@/components/ui/Header";
import { SummaryCards } from "./SummaryCards";
import { KeyTable } from "./KeyTable";
import { AnomalyFeed } from "./AnomalyFeed";

export function Dashboard({
  orgName,
  summary,
  keys,
  anomalies,
}: {
  orgName: string;
  summary: SummaryPayload;
  keys: KeyView[];
  anomalies: AnomalyView[];
}) {
  return (
    <div className="min-h-screen">
      <Header
        orgName={orgName}
        demo={summary.demo}
        nav={[
          { href: "/onboarding", label: "Onboarding" },
          { href: "/settings", label: "Settings" },
        ]}
      />

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <div className="kl-enter">
          <SummaryCards summary={summary} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="kl-enter-1 lg:col-span-2">
            <KeyTable initialKeys={keys} />
          </div>
          <div className="kl-enter-2">
            <AnomalyFeed initialAnomalies={anomalies} />
          </div>
        </div>
      </main>
    </div>
  );
}
