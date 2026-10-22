# KeyLens package contracts

These are the frozen interfaces the parallel build implements against.
Do NOT change signature names or shapes without updating this file first.

## @keylens/core (owned by lead, done)

Exports: all types from `src/types.ts`, `PROVIDERS`/`PROVIDER_IDS` from
`src/providers.ts`, `fingerprint()`/`mask()` from `src/mask.ts`.

## @keylens/db (owned by kl-db)

- `getDb(dbPath?) => KeyLensDb` shared Drizzle client (better-sqlite3),
  creates the data dir and WAL on first use. Reads `DATABASE_URL`.
- `getDbPath() => string`
- Schema tables: `orgs`, `keys`, `usagePoints`, `anomalies`, `rotationJobs`.
  usagePoints stores `spendUsd` as **micro-dollars** (`spend_usd_micros`
  integer) to avoid float drift.
- `src/seed.ts` (run via `pnpm seed`): creates the demo org "Acme Labs"
  + a rich synthetic story, idempotent (wipes + reseeds). Seeds:
  - 1 org, ~8 keys across providers with a status mix (1 leaked/high burn,
    1 normal, 1 unused, 1 recent, 1 retired)
  - 14 days of hourly usage points; a spend spike on the leaked key ~3 days
    ago reaching ~6x its baseline
  - 2 open anomaly events (spend-spike on the leaked key, new-key-found)
  - 1 rotation job queued for the leaked key
  - `_demo` markers in `meta` so the UI can label demo data

## @keylens/connectors (owned by kl-engine)

- `discoverFromText(text: string): AIKey[]` - regex pass using PROVIDERS keyPatterns,
  deduped by fingerprint.
- `scanOrg({ db, orgId, sources? }): Promise<ScanSummary>` - orchestrates
  connectors. In MOCK_MODE it returns seeded deterministic findings from
  `_demo` keys (no network).
- `fetchUsage({ db, orgId, providers? }): Promise<UsagePoint[]>` - pulls
  spend per key. In mock mode, generates/returns the seeded usage.

## @keylens/anomaly (owned by kl-engine)

- `evaluateUsage({ db, orgId, points? }): Promise<AnomalyEvent[]>` - baseline =
  rolling 7-day mean per key per day-of-week. Flags when a point exceeds
  max(5x baseline, $20) or error rate > 20% on >50 calls. Returns events
  (persists newly detected ones, dedupes by kind+keyId+day).
- `baselineFor(keyId: string): Promise<{ meanUsdPerDay, stdevUsdPerDay }>`

## @keylens/rotation (owned by kl-engine)

- `runRotation({ db, orgId, keyIds?, dryRun = true }): Promise<RotationSummary>` -
  creates a new provider key, flips active status, retires old. In mock mode
  it transitions statuses and records jobs without network. Always runs in
  dry-run by default. Auto-schedule weekly via `scheduleWeekly(orgId)`.

## @keylens/alerts (owned by kl-engine)

- `sendAlert({ db, orgId, event, channels? }): Promise<{ delivered: string[] }>`
  - Slack webhook if SLACK_WEBHOOK_URL set; otherwise mock delivery (logged).
- `emailDigest({ db, orgId }): Promise<void>` - weekly summary digest.

## apps/worker (owned by kl-engine)

Cron worker: every 60 min fetchUsage -> evaluateUsage -> sendAlert for new
high/critical events; daily at 09:00 runs scheduleWeekly for orgs with
rotationSchedule=weekly; endpoints for manual trigger.

## apps/web (owned by kl-web)

Next.js App Router app. Routes:
- `/` dashboard (summary cards, key table, anomaly feed, spend sparklines)
- `/onboarding` connect flow (mock GitHub connect + instant "scan")
- `/settings` org rotation config + alert test button
- Route handlers in `apps/web/app/api/**`: `/api/summary`, `/api/keys`,
  `/api/anomalies`, `/api/usage-series`, `/api/scan`, `/api/rotate`,
  `/api/alerts/test`, `/api/onboarding/mock-connect`
- All handlers call the packages above; no business logic in the web app.
- Portal gate: read `x-portal-token` header; allow if env PORTAL_TOKEN is
  unset or matches (MOCK_MODE dev convenience).
