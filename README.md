# KeyLens

AI key lifecycle + spend brain for startups running agents.

KeyLens finds every AI key a company has (OpenAI, Anthropic, AWS Bedrock,
Azure OpenAI, Gemini, Mistral, and more), rotates them on a schedule, and
pings you when spend looks weird. Built for teams that run agents and need a
single pane of glass over their $/token/API-key stack.

This repository is the **MVP scaffold**: a working end-to-end product in mock
mode. It runs with zero external credentials and demonstrates the full loop:
discovery -> inventory -> usage baselines -> anomaly alerts -> rotation jobs.

## Quickstart

```bash
git clone https://github.com/devtechedge/keylens.git
cd keylens
pnpm install
pnpm seed       # creates packages/db/data/keylens.db with a demo org + story
pnpm dev        # dashboard at http://localhost:3000
```

What you see after `pnpm seed` (demo org "Acme Labs"):

- 8 keys across 6 providers, one marked leaked with a recent ~$293 spend spike
- 14 days of hourly usage data (2,016 points) with a clean anomaly story
- 2 open anomalies: `spend-spike` (high) and `new-key-found` (medium)
- 1 queued weekly rotation job for the leaked key
- Full dashboard, onboarding flow (mock GitHub connect + scan), and settings

## What is inside

| Path | Purpose |
| --- | --- |
| `packages/core` | Domain types, provider registry with key regexes, masking/fingerprinting |
| `packages/db` | Drizzle schema, libsql client (node:sqlite bootstrap), deterministic seed |
| `packages/connectors` | `discoverFromText`, `scanOrg`, `fetchUsage` + connector registry |
| `packages/anomaly` | 7-day baseline + z-score style spend/error rules, dedupe, persistence |
| `packages/rotation` | Dry-run-first rotation orchestrator, weekly scheduling |
| `packages/alerts` | Slack webhook + console fallback, email digest stub |
| `apps/worker` | Cron worker: hourly usage -> evaluate -> alert; daily 09:00 weekly rotation |
| `apps/web` | Next.js 16 dashboard (server-rendered first paint, hand-rolled SVG sparklines) |

## Commands

| Command | What it does |
| --- | --- |
| `pnpm install` | Install all workspace packages (approves esbuild/libsql builds) |
| `pnpm seed` | Wipe + reseed the demo database (idempotent) |
| `pnpm dev` | Start the web app at :3000 |
| `pnpm dev:worker` | Start the cron worker (`--once` runs a single cycle) |
| `pnpm -r typecheck` | Typecheck every package |
| `pnpm -r test` | Run the vitest suites (connectors, anomaly, rotation, alerts, worker) |
| `pnpm --filter @keylens/web build` | Production build |

## Environment

Copy `.env.example` to `.env` to override defaults. Everything runs in mock
mode out of the box (`MOCK_MODE=true`). Real connectors activate only when you
provide credentials (OpenAI, GitHub, Vercel, Slack) and flip `MOCK_MODE=false`.

| Variable | Purpose |
| --- | --- |
| `MOCK_MODE` | Use seeded demo data (default `true`) |
| `DATABASE_URL` | SQLite file path (default `file:./data/keylens.db`) |
| `PORTAL_TOKEN` | Simple single-user gate for the dashboard (`x-portal-token`) |
| `OPENAI_API_KEY` | Real OpenAI usage + rotation |
| `GITHUB_TOKEN` | Real GitHub secret scanning |
| `VERCEL_TOKEN` | Real Vercel env-var scanning |
| `SLACK_WEBHOOK_URL` | Alert delivery |
| `STRIPE_SECRET_KEY` | Billing (roadmap) |

## API (web adapters)

`GET /api/summary`, `GET /api/keys`, `GET /api/anomalies`,
`GET /api/usage-series?keyId=`, `POST /api/scan`, `POST /api/rotate`,
`POST /api/alerts/test`, `POST /api/onboarding/mock-connect`,
`POST /api/anomalies/[id]/resolve`, `PATCH /api/settings`.

## Roadmap

The scaffold ships a working inventory + spend-alert loop. The genuinely
unsolved part of this problem is **fan-out + verification + rollback**: one
logical secret lives in N places (Vercel env vars, GitHub Actions secrets,
Supabase, local `.env`, CI), so a safe rotation means creating a replacement,
writing it to every consumer in the right order, proving the new key is live
and the old one is idle, and only then revoking. That engine is the core next
build.

1. Rotation engine: fan-out + verification + rollback against real consumers
   (Vercel, GitHub Actions, local `.env`). Cadence is configurable; weekly is
   only the demo default, production guidance is quarterly or on exposure.
2. Real connectors via provider admin APIs (OpenAI service-account keys with
   expiry, Anthropic admin key, AWS/GCP IAM). Auto-rotate where native APIs
   allow; guided rotation elsewhere.
3. Egress gateway (proxy) for ground-truth spend per key and zero-downtime
   credential swap.
4. Stripe billing: `$99/mo` tier + annual plan, trial funnel from free scans.
5. Multi-tenant auth (Supabase/Auth.js), SSO, audit logs, SOC 2 posture.

## Workflows

Agent operating procedures used for this project live in
[`docs/workflows/`](docs/workflows/README.md): dev-memory, curator, journey,
learn, OSS PR playbook, refine, and GitHub repo presentation. They are
sanitized working copies; private operational details are scrubbed to
placeholders.

## Status

MVP scaffold. Everything runs locally with seeded demo data. Contributions,
issues, and ideas welcome.

## License

MIT (c) 2026 Dev M
