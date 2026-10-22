# GitHub Repo Presentation

Project-adapted sanitized copy. Canonical source: `~/.agents/skills/github-repo-presentation/SKILL.md` (Revision 12, 2026-09-18). Private account details are scrubbed to placeholders in this copy.

Portable lessons from the OSS playbook (see `05-oss-pr-playbook.md`) are merged in: About 340 hard cap, public-text rules, API hygiene, clone retirement, CI/bot standard. Upstream-only OSS rules (target GO gates, silence/dormancy, ledger merge cascade, LinkedIn windows) stay out.

This skill is the procedure for making a public GitHub repo look intentional in about fifteen seconds. It is presentation first. Engineering hardening is a separate, opt-in second pass.

Chat with the user is private. GitHub is not. Never write these words (or close paraphrases) in anything that ships or is public-visible: git commit messages, GitHub About / README / releases / topics / comments, UI copy, screenshot captions you add, or any file in the repo.

Forbidden on that surface: "hiring manager", "hiring-manager", "recruiter", "recruiters", "portfolio piece", "job-application project", "built for a job posting".

Use "visitor", "first visual", "GitHub first look", "clone and run" instead. If a commit already shipped with a forbidden word, amend or rewrite that commit (force-with-lease when the user asked to scrub history) rather than leaving it on `main`.

Portable public-text rules (from `/oss`):

- Never name internal files or paths in public fields. No tracker filenames, script names, or `docs/...` paths in About, README, or topics.
- No em dashes in public-facing text. Use a hyphen or split the sentence.
- AI disclosure is mandatory-only, never volunteered. Say nothing about AI assistance unless a repo policy explicitly requires it.

- Owner: `<oss-account>`
- Windows clone root: `~/Documents/GitHub/<repo>`
- Local working copies: `artifacts/<repo>/` (create `docs/screenshots/` in that folder at the start of every repo)

Do not brand a public repo as "built with z.ai / GLM / Grok". Delete AI handoff files (`HANDOFF_TO_GLM*.md`) and zip dumps from git.

Do not fire unthrottled `gh` / git / API loops. Sub-second bursts are what flagged the account (see section 8).

## 1. Pick the phase before touching files

| Phase | When to run it | Goal | Typical score |
|-------|----------------|------|----------------|
| A - Presentation | Every repo, first, unless the user says otherwise | First visual a visitor can trust, live Vercel alias READY | ~9 / 10 |
| B - Hardening | Only if the user asks for security, tests, unused deps, or CI | Engineering surface | ~9.3 / 10 |

Default for remaining repos: Phase A only. Do not start Playwright, Dependabot, unused-dep deletion, or `SECURITY.md` unless asked.

A true 10 / 10 also needs a real public backend or genuine stars. Zero stars is not a code failure and is not something to manufacture.

### Reference repos (public)

| Repo | What it proves | Live |
|------|----------------|------|
| `chaos-simulator` | Full A + B. Client-side sim. Unused Prisma / NextAuth removed. Release `v2.1.0`. | Vercel production alias in README |
| `astra-marketplace` | Full A + B. Prisma kept as the local production path. Demo-mode Vercel. CI green. | Vercel production alias in README |
| `aarop` | Light-touch Phase A. Already ~8+ on inspect: do not rewrite a strong README. | live demo in README |
| `regulatory_compliance` | Full A + B. FastAPI + Postgres local; Vercel demo-mode Next `/api`. CI green. | Vercel production alias in README |
| `job-board` | New product, not a polish dump. TanStack Start + Neon on Hobby. ATS JSON index. | Vercel production alias in README |

## 2. Score before you edit

Inspect the tree, README, About, live URL, commit count, LICENSE, favicon, topics, screenshots, and any `*-vercel` duplicate. Then write:

1. A score out of 10.
2. One sentence why.
3. A gap list against the Phase A checklist below.

Do not change files until that score and gap list are in the chat. About bands: see Step A4 (330-340 done, 340 cap).

| Score | First visual |
|-------|------------------------|
| <= 5 | Empty About, one commit, no README / demo, junk at root |
| 6-7 | A README, but no screenshots / demo / topics |
| 8 | Live Vercel production URL (READY alias) + README + About + LICENSE |
| 9 | Plus screenshots, social preview, multi-commit history, honest demo note, one repo |
| 9.3 | Plus green CI, tests, unused deps gone, root `SECURITY.md` |
| 10 | All of the above plus stars or a real public backend |

Do not score CI as green if GitHub returns `Actions has been disabled for this user`. See section 8; still check `gh run list` before calling a badge live.

### Intensity

- Inspect score below ~8: full Phase A (hygiene, About, README, screenshots, favicon, social, Vercel production deploy, release if none).
- Inspect score ~8 or higher: light-touch. Fill only the missing pieces (topics, root LICENSE, 3 screenshots, junk, social preview). Do not rewrite a strong README. Do not mint a second release if one already documents the product.

## 3. Working copies and binaries

At the start of every repo:

1. Create `artifacts/<repo-name>/docs/screenshots/`.
2. If the user attaches screenshots, kebab-rename them (`01-storefront.png`, `02-account.png`) and save them in that folder and tell the user to copy them into the Windows clone at `~/Documents/GitHub/<repo>/docs/screenshots/`.
3. Push images with GitHub Desktop. Do not use the github.com "pencil" file UI to create screenshot folders. Binary push via API is unreliable.

Three strong screenshots beat four placeholders. Never leave a broken image row in the README.

Clone retirement: a Windows clone exists to produce one presentation pass, not to archive one. Retire it when the pass is done, the Vercel alias is READY, and screenshots are pushed. Before deleting: clean `git status --porcelain` and zero unpushed commits (`rev-list @{u}..HEAD`). Confirm before deleting build dirs: `git check-ignore -v <path>`: name lists fail in both directions. An oversized `.git` is worth a shallow re-clone (`--depth 1 --branch <b>`).

## 4. Phase A - first visual (mandatory)

Execute in this order. Small, named commits. One concern per commit. Commit subjects describe the product change, never the audience. Phase A always includes a Vercel production deploy: homepage and Live Demo badge are that production alias, confirmed READY, before calling the pass done.

### Step A1 - Inspect

Record: default branch, commit count, LICENSE presence, About description / homepage / topics, README length, screenshot paths, favicon, live URL (including UI path such as `/ui`), Vercel project, and any `foo-vercel` twin.

Also record `.description | length` (bands: see Step A4). Record the Vercel production alias and whether it is READY. No public host is a Phase A gap, not an honest leftover.

### Step A2 - Score and gaps

Post the score, one sentence, and the gap list. Wait only if the user asked to approve the plan; otherwise proceed after posting it.

### Step A3 - Root hygiene

Delete: zip dumps, `HANDOFF_TO_GLM*.md`, `AI_Engineer_Project_Prompt.md`, Caddyfiles, hello-world APIs, `examples-websocket`, nested leftover `.github` that is not the source of truth.

Ship a full MIT `LICENSE` at the repo root (not `LICENSE.txt`, not only under `core/`). Rename a template `package.json` `name` to the real repo. Add a sensible `.gitignore` (`.env`, `.next`, `node_modules`, `playwright-report`, `*.tsbuildinfo`).

### Step A4 - About card

GitHub About -> Description has a hard max of 350 characters. The API 422s anything longer, and a live copy at exactly 350 renders cut off mid-word with no error.

Fill the allocated space but cap at 340. Target 330-340 characters, prefer >= 335. A 120-200 character one-liner is unfinished. Do not stop early. Do not pad with filler ("amazing", "cutting-edge", "seamless"). Add product facts until you are in band. 340 is the cap and 350 is never the target: 10 chars of breathing room for a longer repo name or recount.

| Band | Treat as |
|------|----------|
| 0-200 | Gap. Rewrite. |
| 201-329 | Too thin. Add features, stack, honest demo note, login. |
| 330-340 | Done. Prefer >= 335. |
| 341+ | Overflow. Rebuild via the shed order below, never `slice(0, 350)`. A cut that lands mid-word is a failed write. |

Write, in order, as many of these as fit:

1. What it is and who it is for.
2. 4-6 concrete features (not synonyms of the title).
3. Stack (Next.js 15, TypeScript, ...).
4. Honest demo caveat if needed (in-memory, demo data, resets on cold start).
5. Public demo login if one exists.

Count before `gh repo edit`:

```powershell
$desc = @"
PASTE DESCRIPTION HERE
"@
$desc.Length   # must be 330-340, refuse anything over 340
```

Re-derive whole on every edit, never substring-patch mid-word. When the result exceeds 340, shed in this fixed order: first drop the demo login, then the demo caveat, then stack detail, then features from the end. Never hard-cut the string to fit.

Apply from the Windows clone. `gh` must see a git worktree.

```powershell
cd "~/Documents/GitHub/REPO_NAME"
gh repo edit OWNER/REPO `
  --description "..." `
  --homepage "https://..." `
  --add-topic tag1 --add-topic tag2 --add-topic tag3
```

Use one `--add-topic` per tag.

Verify after:

```bash
gh api repos/OWNER/REPO --jq '{n: (.description|length), description}'
```

If `n` < 330, rewrite with more product facts and set it again. If `n` > 340, rebuild via the shed order: do not submit over 340.

Homepage = the Vercel production alias a visitor should actually open (include `/ui` when that is the product). 8-12 topics, 10-12 preferred.

### Step A5 - Favicon

Branded SVG. Next.js: put it in `public/favicon.svg` and wire `metadata.icons` in `app/layout.tsx`. GitHub Pages: relative `favicon.svg`, never `/favicon.svg`.

### Step A6 - README

First-visual length, not a novel. Live Demo badge and URL are the Vercel production alias.

Required blocks, in order:

1. Title + one-sentence pitch.
2. Badges: Live Demo first, then CI (only if the workflow file exists), then stack, then License.
3. Live Demo heading with the real URL and an honest status blockquote.
4. Screenshots (3-5, kebab names, working paths).
5. Tight features.
6. Stack table.
7. Quick start that actually runs.
8. License.

Honesty rules:

- Live Demo badge and heading are the READY production alias. Never leave `#live-demo`, `PRODUCTION_URL`, or "set after first deploy".
- If Vercel is demo data, client-side only, or fixture-backed because the real backend will not run there, say so under Live Demo.
- If production later gains Neon (or any persistent DB), rewrite that blockquote. Recapture screenshots from the live alias. Do not leave "PGLite reseeds on cold start" on a Neon deploy.
- Do not mention Render, Railway, or VPS unless they are in use.
- Do not promise a video that does not exist.
- Do not claim NextAuth, JWT, or a production payment backend if those are demo-only.
- Ship the CI badge when `ci.yml` exists. Claim green only after `gh run list` shows a real success (see section 8).

### Step A6b - Frontend chrome (web UIs)

When the repo has a frontend, Phase A includes product chrome on every page: overlay hover-reveal scrollbars + a light/dark toggle top-right. Skip with a gap-list note when the repo has no web UI.

### Step A7 - Social preview

Dark product crop, 1280x640, under 1 MB, saved as `docs/screenshots/social-preview.png` and committed. GitHub rejects files over 1 MB.

There is no API for this upload. Settings -> General -> Social preview is a human leftover. Hand the user the PNG in chat. Confirm after they upload: `og:image` on the repo page is `repository-images.githubusercontent.com/...`. If it is still `opengraph.githubassets.com/...`, the custom card is not live.

### Step A8 - Commit hygiene

Never leave a one-commit dump. Logical commits, not noise. Do not squash the presentation series into a single "polish repo" commit.

Throttle pushes. Batch; one push per completed feature. No sub-second commit/status/API loops (section 8).

### Step A9 - Release

If none exists: `v0.1.0` / `v1.0.0` / `v2.x` with a detailed body (product + how to run, no audience framing) and the live URL.

```powershell
cd "~/Documents/GitHub/REPO_NAME"
gh release create v1.0.0 --title "v1.0.0" --notes "..."
```

`gh release create` must run inside the git worktree. Skip this step if a real release already exists.

### Step A10 - Production deploy and one source of truth

Phase A always includes a Vercel production deploy. The About homepage and the README Live Demo badge are that production alias. Confirm the alias is READY before calling Phase A done. No public host is a Phase A gap, not an honest leftover.

If the app has a Python/FastAPI (or other) backend that Vercel will not run, ship a Vercel demo-mode for the web app so the production URL is a working product, and say so in the Live Demo status blockquote. Pattern: Next App Router routes under `app/api/` matching the client surface, same-origin empty API base on Vercel, local Compose still points the web app at FastAPI, fixtures or an in-memory store, HITL/reviews reset on cold start.

Create or reuse the Vercel project with `create_git_project` (git-linked). Team: `<vercel-team>` (slug `<vercel-team-slug>`). Set `rootDirectory` for monorepos (`frontend` when the Next app lives there). Do not file-deploy with `deploy_to_vercel` when a GitHub remote exists. Confirm the production alias is READY and returns 200. New projects have Vercel Authentication off; if a visitor hits a login wall, turn SSO protection off. Point the project at this repo, not a `*-vercel` twin. Gate standalone output off Vercel via the VERCEL environment flag. Do not mention Render, Railway, or VPS unless they are actually used.

TanStack Start / Vite on Hobby: WASM PGLite must be copied into the serverless output after `vite build` or production 500s. Neon production: env `DATABASE_URL` (not `STORAGE_URL`), Auth off, pooled URI, `sslmode=require`.

Keep the GitHub repo public. Private GitHub does not hide `*.vercel.app`, and this series is the public first visual. Do not private a repo "just in case" of crypto flags. For Web3-adjacent products: no seed phrases, `0x` addresses, airdrop/claim/connect-wallet, or donate patterns; a fictional licensing pack marked "not an offering" is fine.

If `foo` (code) and `foo-vercel` (deploy host) both exist:

1. Move the demo engine into `foo`.
2. Point the Vercel project at `foo`.
3. Rename the Vercel project if needed.
4. Archive or delete `foo-vercel`.
5. Update every README URL.

Never leave two public repos for one product.

Do not recreate a repo GitHub Support required deleted. Confirmed 404. Treat any such repo as permanently gone.

### Step A11 - Re-score and stop

Re-score the first visual. Confirm the Vercel production alias is READY. Stop. Do not start Phase B.

## 5. Phase B - hardening (opt-in)

Run this only when the user asks. Cost is much higher (tool loops). Not required for every remaining repo.

Inspect the existing engineering surface first. Many dumps already have a `ci.yml`, a Playwright file, or a `docs/SECURITY_REVIEW.md`. Score that surface before rewriting it.

### Step B0 - Inspect the engineering surface

| You find | Treat it as |
|----------|-------------|
| `ci.yml` that only runs `npm run build` | Not Phase B. Replace it. |
| No `package-lock.json` / `bun.lock` | Generate and commit one. `npm ci` will fail without it. |
| `docs/SECURITY_REVIEW.md` only | Production wishlist. Write root `SECURITY.md` and link the old file. |
| Prisma schema + seed + Docker Compose | Keep Prisma. This is a local production path, even if Vercel is in-memory. |
| Prisma / NextAuth never imported | Template leftover. Delete it. |
| Vitest / bun test / `node:test` already passing | Keep that runner. Do not swap. |
| Playwright `baseURL` = `http://127.0.0.1` | Will flake on Next origin checks. Use `http://localhost`. |
| e2e `goto('/admin')` with no role cookie | Wrong if middleware gates the route. Set the cookie. |
| `@testing-library/*` with no component tests | Unused. Remove it. |
| `env: CI: false` in the workflow | Smell. Remove it. |
| Node 24 in GHA | Use Node 22. |
| `HTTP 422: Actions has been disabled for this user` | Account hold, not a YAML bug. See section 8. Do not rewrite `ci.yml`. |

### Step B1 - Threat model (`SECURITY.md` at repo root)

Write an honest assessment: auth, XSS, injection, CORS, secrets, payments.

- Do not claim NextAuth if it is unused.
- Unsigned `Buffer.from(email:role).toString('base64')` cookies are not JWT. Say so.
- Public README demo passwords are fine for multi-role portals; they are also accepted residual risk and belong in `SECURITY.md`.
- Keep `docs/SECURITY_REVIEW.md` if it is a useful production backlog. Link it from the root file.

### Step B2 - Dependency audit

```bash
npm audit --omit=dev
```

Remove unused packages rather than pinning CVEs in dead code.

Typical unused template: NextAuth, z.ai SDK, unused shadcn / Radix, mdxeditor, dnd-kit, tanstack, `@testing-library/*` when tests are pure helpers.

Prisma rule: delete it only when it is unused template leftover. Keep it when `prisma/schema.prisma` + seed + Compose are the documented local path.

Do not run `npm audit fix --force` onto a newer major to clear older advisories.

### Step B3 - TypeScript

- `ignoreBuildErrors: false`
- `"typecheck": "tsc --noEmit"`
- Exclude from `tsconfig`: `**/*.test.ts`, `tests/`, `e2e/`, `playwright.config.ts`, `vitest.config.ts`

### Step B4 - Unit tests

Extract pure helpers (validation allow-lists, cart math, RBAC, sim presets). Cover those. Do not unit-test the whole React tree. Keep the existing runner.

### Step B5 - Playwright (optional, 3-5 smokes)

- Chromium only.
- `webServer.command`: `npx next dev -p 3000` - not `tee`, and not `npm run dev` if that script pipes logs.
- `baseURL`: `http://localhost`, never `127.0.0.1`.
- Next 16: `allowedDevOrigins: ["127.0.0.1", "localhost"]`.
- Add `data-testid`s. If one component renders twice, put the test id only on the default button.
- Role-gated `/admin` or `/seller`: set the role cookie in the test. `page.goto('/admin')` without it is a false green or a guaranteed fail.

### Step B6 - GitHub Actions

Replace build-only CI. Pipeline: install -> unit -> typecheck -> Playwright.

- Node 22
- `npm ci` (requires the lockfile) or `bun install --frozen-lockfile`
- CI badge at the top of the README when the workflow file exists
- Do not fail the job on `npm audit` when the only hits are framework majors
- Upload the Playwright report on failure
- Bots: fix actionable findings on your own code on the same branch, ignore noise (platform "authorize deploy", team-only checks, first-contribution `action_required` approvals).

Monorepo with a Python API: pytest the backend helpers too (validator, retrieval, status). CI must cover API + web, not only the app build command.

Pushing GitHub Actions workflow YAML requires the token workflow scope; refresh gh auth with that scope. An OAuth app with only repo/gist/read:org returns 403. Sleep at least two seconds between `gh` / git calls. Push with a token URL, then confirm `origin` does not store the token.

Shipping the workflow is the Phase B deliverable. Then check whether a run actually exists:

1. `gh api repos/OWNER/REPO/actions/permissions` - `enabled: true` means repo Settings are already on.
2. `gh workflow list --repo OWNER/REPO` - `active` means the YAML is registered.
3. `gh run list --repo OWNER/REPO` - a `success` on `main` is a live badge.
4. If `gh workflow run` 422s `Actions has been disabled for this user`, stop. That is account-wide again (section 8). Do not rewrite YAML. Do not loop dispatch.
5. Local proof still counts: `npm test`, `npm run typecheck`, Playwright. Record that in the chat. Do not claim GitHub is green.
6. When `main` itself is red at the base commit, compare the PR's failing set to the base commit's: equal sets with every main-passing check also passing means no new red: report that standard, not "green". A workflow with only a `pull_request` trigger has no base check-runs; an empty base set is not a green base, so compare against sibling PRs' runs of the same workflow instead.

Do not retry dispatch in a loop. Do not open a second Support ticket.

### Step B7 - Dependabot

Weekly npm + GitHub Actions, group patch/minor, ignore majors, no auto-merge.

### Step B8 - Vercel hygiene (Next.js)

- Do not use `output: "standalone"` on Vercel. Gate it: `...(process.env.VERCEL ? {} : { output: "standalone" })`.
- `"build": "next build"` - never `cp` into `.next/standalone` (`next-server.js.nft.json` ENOENT on Turbopack).
- Bun lockfile v2 needs `"bunVersion": "1.x"` in `vercel.json`.
- Confirm the production alias is READY before calling the deploy fixed.
- TanStack Start + PGLite: post-build copy WASM assets. Neon: `DATABASE_URL`, Auth off.

### Step B9 - Re-score

Engineering surface should land around 9.3. Do not claim 10. Score CI green only after `gh run list` shows success.

## 6. Out of scope unless asked

- Paid Render / Railway / Netlify backends
- Artificial stars or follow-for-follow
- Full Playwright suites beyond a smoke path
- Enabling every ESLint rule
- Merging Dependabot majors
- Deep product refactors
- Recreating a repo GitHub Support deleted
- Opening a new GitHub Support ticket about Actions after the closed hold

Use Fast mode for advice. Use Build mode for inspect / patch / push.

## 7. Known failures (lookup)

| Symptom | Fix |
|---------|-----|
| Social preview rejected | File is over 1 MB. Compress. |
| `og:image` is still `opengraph.githubassets.com` | Custom Social preview not uploaded. Hand the user the 1280x640 PNG. No API. |
| Repo Settings 404 in the box browser | Anonymous GitHub session. Do not log in for them. Hand the PNG. |
| Live Demo badge is `#live-demo` or `PRODUCTION_URL` | Phase A not done. Put the READY alias there. |
| 403 writing `.github/workflows` | Token missing `workflow` scope. |
| Privating the GitHub repo to dodge flags | Do not. Vercel stays public. Series first visual is the public repo. |
| Screenshot folder missing on GitHub | Use GitHub Desktop, not the web file UI. |
| README claims a production backend | Replace with an honest demo-mode note. |
| Two repos for one product | Collapse to one. |
| Vercel `next-server.js.nft.json` ENOENT | Standalone + post-build `cp` on Turbopack. Stop doing that. |
| Vercel rejects bun.lock | Set `"bunVersion": "1.x"`. |
| Playwright flakes on Next | Use `localhost`, not `127.0.0.1`. |
| Admin e2e fails or is a false green | Set the role cookie. |
| `npm ci` fails on GitHub Actions | Commit the lockfile. |
| CI is green but only built the app | Replace the workflow. |
| About description 422 / truncated / thin | See Step A4 bands (340 cap, 330 floor, shed order). |
| `HTTP 422: Actions has been disabled` / `User flagged as spammy` / empty CI badge with `ci.yml` present | Account hold - see section 8. Check `gh run list` before repeating hold language. |
| Supabase preview errors on trigger/policy create | `DROP ... IF EXISTS` first. |
| Support ticket is login-walled | Ask the user to paste the thread. API has no ticket endpoint. |
| Native `<select>` click does nothing | An ancestor still has `transform` / `translate` / `filter` (often `animation-fill-mode: both` on a page-enter wrapper). Use fill-mode `backwards`, then strip the enter class. Do not leave `will-change: transform` on a parent of form controls. |
| Vercel 500, PGLite WASM missing | Post-build copy of `@electric-sql/pglite` assets into the function bundle. |
| Neon store exists, app still ephemeral | Wrong env key (`STORAGE_URL`) or Neon Auth left on. Use `DATABASE_URL`. Redeploy. |
| README says PGLite, `/api/health` says neon | Rewrite the Live Demo blockquote. Recapture screenshots. |
| Cron 401 | `CRON_SECRET` + `APP_URL` must exist on Vercel and GitHub Actions. Bearer header, never `?secret=`. |
| Company logos blank | CSP `img-src` blocked the favicon host. Allow the favicon host or host files yourself. |
| Warm coffee light theme on a tool UI | Retint to cool silver. Update favicon + `theme-color`. |

## 8. GitHub account hold (Actions / search / "spammy")

This is account-level. It blocks every repo under the OSS account. It is not a missing `ci.yml`.

### What you will see

- `gh workflow run ...` -> `HTTP 422: Actions has been disabled for this user`
- Same 422 on a second repo
- `gh api search/repositories?q=user:<oss-account>` -> `User flagged as spammy`
- Repo Settings -> Actions can still read `{"enabled":true,"allowed_actions":"all"}`
- `gh workflow list` can still show `CI  active`
- `gh run list` stays empty - no run is created

Repo Actions permissions and an `active` workflow prove the YAML is registered. The 422 happens before a run exists.

### Why

The hold was caused by a local agent loop firing unthrottled, sub-second git status / commits / API syncs, tripping secondary rate limits. Abuse-detection sent the account to manual review. The reinstatement ticket closed; Actions runs succeed again. Do not open a second ticket.

### Agent rules after reinstatement

- The hold ticket is closed. Score a CI badge as green only after `gh run list` shows a real success.
- Do not open a second Support ticket about this hold.
- Do not rewrite YAML hoping a 422 will vanish; if a 422 returns, it is account-level again, not a per-repo bug.
- Do not retry `workflow_dispatch` in a loop.
- Do not fire unthrottled `gh` / git / API bursts (mandatory delays, batch commits, one push per feature). That burst is what caused the hold. Sleep at least two seconds between `gh` / git calls.
- API hygiene: one consolidated call over several narrow ones, reuse fetched data, no `--paginate` on large collections, no parallel API fan-out. Check `gh api rate_limit` before heavy scans and stop well before the limit. Poll at most every 60 seconds while waiting on CI.
- On `resource_exhausted`: stop parallel work, wait, then resume serially.
- Stuck handling: if a step stays blocked past any plausible runtime (hung command, repeated identical failures), stop hitting the wall, report the evidence, and move to other queued work.

Support portal is login-walled. The GitHub API has no ticket endpoint. Search the account inbox for the ticket number before repeating hold language.

## 9. New-chat starter

Paste this, and attach the series handoff plus this skill:

```
Use the github-repo-presentation skill (Revision 12 or later).

Handoff is attached.

Next repo: https://github.com/<oss-account>/<repo>
Live: <url if any>

Phase A only unless I ask for security / tests / CI.
Target first-visual 9-10/10.
Inspect, score, and list gaps BEFORE changing anything.
About description must land in 330-340 characters (hard cap 340; GitHub max 350 truncates silently).
Web UIs: overlay hover-reveal scrollbars on every pane, and a light/dark toggle at the top right of each page.
```
