import cron from "node-cron";
import { eq } from "drizzle-orm";
import { getDb, orgs, anomalies } from "@keylens/db";
import { fetchUsage } from "@keylens/connectors";
import { evaluateUsage } from "@keylens/anomaly";
import { scheduleWeekly } from "@keylens/rotation";
import { sendAlert } from "@keylens/alerts";
import { hasFlag } from "./args";

const HOURLY_CRON = "0 * * * *";
const DAILY_CRON = "0 9 * * *";

const db = getDb();

async function hourlyCycleOnce(): Promise<void> {
  const orgRows = await db.select().from(orgs).all();
  for (const org of orgRows) {
    const points = await fetchUsage({ db, orgId: org.id });
    const events = await evaluateUsage({ db, orgId: org.id, points });
    for (const event of events) {
      const isHigh = event.severity === "high" || event.severity === "critical";
      if (!isHigh || event.meta._alerted === true) continue;
      const { delivered } = await sendAlert({
        db,
        orgId: org.id,
        event,
        channels: org.notifyChannels,
      });
      if (delivered.length > 0) {
        const row = await db.select().from(anomalies).where(eq(anomalies.id, event.id)).get();
        if (row) {
          await db
            .update(anomalies)
            .set({ meta: { ...row.meta, _alerted: true } })
            .where(eq(anomalies.id, event.id))
            .run();
        }
      }
    }
  }
}

async function dailyWeeklySchedule(): Promise<void> {
  const weeklyOrgs = await db.select().from(orgs).where(eq(orgs.rotationSchedule, "weekly")).all();
  for (const org of weeklyOrgs) {
    await scheduleWeekly(org.id);
  }
}

if (hasFlag(process.argv, "once")) {
  await hourlyCycleOnce();
  console.log("[worker] --once cycle complete");
  process.exit(0);
}

cron.schedule(HOURLY_CRON, () => {
  hourlyCycleOnce().catch((err) => console.error("[worker] hourly cycle failed:", err));
});
cron.schedule(DAILY_CRON, () => {
  dailyWeeklySchedule().catch((err) => console.error("[worker] daily schedule failed:", err));
});

console.log("[worker] started: hourly anomaly cycle + daily 09:00 weekly rotation");
