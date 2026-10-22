import { getAppDb } from "@/db";
import { getFirstOrg, getSummary, listKeys, listOpenAnomalies } from "@/data";
import { Dashboard } from "@/components/dashboard/Dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getAppDb();
  const org = await getFirstOrg(db);
  const summary = await getSummary(db, org);
  const keys = await listKeys(db, org);
  const anomalies = await listOpenAnomalies(db, org);

  return (
    <Dashboard
      orgName={org?.name ?? "Acme Labs"}
      summary={summary}
      keys={keys}
      anomalies={anomalies}
    />
  );
}
