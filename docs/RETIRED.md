# keylens, and why it was retired

This repository was a second, parallel build of the same product brief. It is retired. The
canonical repository is **[devtechedge/keyward](https://github.com/devtechedge/keyward)**, and the
hosted control plane is **https://keyward-seven.vercel.app**.

Two public repositories for one product is a problem, not a feature. A visitor who finds both
cannot tell which is the real one, and the work splits in two.

## What was kept, and where it went

| From keylens | Now in keyward |
| --- | --- |
| Vercel environment connector | `packages/core/src/vercel.ts` |
| GitHub organisation connector | `packages/core/src/github.ts` |
| Slack and webhook alerting | `packages/core/src/alert.ts` |
| Stripe billing client and webhook signature verification | `packages/core/src/billing.ts` |
| Hourly anomaly cycle and scheduled rotation job | `packages/core/src/cycle.ts` and `keyward due` |
| Browser onboarding flow | `apps/web/src/app/settings` and the connect and scan API routes |
| API contract notes | `docs/BUILD.md` |

## What was deliberately dropped

- **The mock database.** keyward uses Neon Postgres, and the hosted app serves a demo dataset when
  no account is connected. The demo story is a dataset, not a second database engine.
- **The Drizzle and libsql stack.** keyward uses plain SQL over the Neon serverless client, which
  keeps the dependency count at one for the web app.
- **The billing and rotation tables in the app database.** Rotation runs are written by the CLI, and
  the hosted app reads them. The app does not rotate keys itself, because a browser session should
  not hold the authority to revoke a production credential.

## The one product decision worth keeping from both builds

The brief asked for a tool that finds every AI key, rotates it, and pings on odd spend, at $99 a
month. The market research turned up the reason that is hard: discovery is free and spend
dashboards are cheap, so the defensible part is **fan-out rotation with read-back verification and
rollback**. One logical secret lives in Vercel, GitHub Actions, Supabase, a local `.env` and CI.
Rotating it means creating the replacement, writing it to every consumer in the right order,
proving each one now holds the new value, and only then revoking. Every tool in that space ships
"no rollback" or "manual-assist".
