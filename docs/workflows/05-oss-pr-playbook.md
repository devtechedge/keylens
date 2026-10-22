# OSS PR Playbook

Project-adapted sanitized copy. Canonical source lives in the private
operational repo (`<private-operational-repo>`) and MUST be refetched before
PR work (section 0). Private repo names, career paths, and account handles are
scrubbed to placeholders in this copy.

One playbook for contributing pull requests to upstream open-source
repositories. Work is handled through one unified OSS ledger and one
operational queue covering all upstream projects. Never split a PR or
scoreboard row by domain. Apply on every new PR unless the user overrides that
turn.

Core goals, in priority order:

1. Quality over quantity: small, uncontested, mergeable fixes
2. A credible human voice with maintainers
3. One well-run PR at a time beats a spray of contested ones

Learned patterns live in `PATTERNS.md` (canonical, in the private repo). Read
the matching section on demand, not the whole file. Every pattern is a
hypothesis: re-verify it, never assume it still holds.

How to read this playbook: rules are stated here, once. Case evidence and
machine traps are in `PATTERNS.md`. Queue state is in
`docs/triage/triage.json` (private repo). If a rule appears twice, this file
wins and the longer copy is stale. Dated counts rot. Re-check GitHub before
quoting one.

## 0. Canonical location and cross-platform sync

This playbook is used from several agent platforms. Only one copy counts, and
it lives in the private operational repo:

- `<private-operational-repo>` -> `docs/SKILL.md`
- `<private-operational-repo>` -> `docs/PATTERNS.md`

Authenticated fetches (private repo, no public raw URLs):

```
gh api repos/<private-operational-repo>/contents/docs/SKILL.md -H "Accept: application/vnd.github.raw"
gh api repos/<private-operational-repo>/contents/docs/PATTERNS.md -H "Accept: application/vnd.github.raw"
```

1. Edit only the canonical copies. Local mirrors are derivatives. A change
   made to a derivative is lost on the next sync.
2. Refetch at the start of every PR session. If the copy you are reading did
   not come from those URLs during this session, fetch them and follow what
   comes back. Working from a stale mirror is a real failure mode.
3. Raw is a CDN cache. It can serve a stale or truncated body with a 200 and
   no error. Compare the fetched byte count against `gh api
   repos/<private-operational-repo>/contents/<path> --jq .size` and refetch
   through the contents API when they differ. Never proceed on an empty or
   truncated file.
4. After editing either file, push to `docs/` in the same turn, then run the
   local sync script with no flags in the same turn so the local mirror matches
   canonical. A plain run rewrites canonical plus the Codex and OpenCode
   mirrors and also the `oss/` copy in the local skills-hub checkout; it
   prints uncommitted hub work and a behind second clone, but never commits or
   pushes for you. `--no-hub` skips the hub. After an intentional distillation
   push that shrinks a file by more than 25%, add `--force` (refused unless
   the fetched size equals the contents API size).

Bootstrap snippet for any platform:

```
Before any upstream OSS PR work, fetch and follow these files from the private repo <private-operational-repo> using authenticated gh api calls:
docs/SKILL.md
docs/PATTERNS.md
docs/triage/triage.json
These are the single source of truth and override any local copy.
```

SKILL.md and PATTERNS.md carry the rules. `triage.json` carries the state:
every open, merged, closed and no-go attempt, competing PRs, and the ping
dates the close rules measure from. Read it with `gh api
repos/<private-operational-repo>/contents/docs/triage/triage.json` and write
it back with a contents PUT in the same turn. A platform that fetches only the
two docs knows the rules but not the queue.

Portability: the rules travel in the skill, the state travels on GitHub.
Moving to another platform costs one fetch and nothing else.

## 1. Unified OSS workflow

| | Unified OSS ledger |
| --- | --- |
| Scope | All upstream OSS work across languages and domains |
| Ledger | Public ledger repo (`oss-contributions`) |
| Ledger writes | Update after every open, merge, no-go, closure, or other meaningful attempt outcome, same turn |
| Targeting | Rank all candidates together using the same eligibility criteria |
| Account | The user's OSS account, typically `@<oss-account>` |

Upstream PR work is recorded on the unified ledger repo. The README lists
merged pull requests only; open, closed, no-go, and all other attempt state
lives in `docs/triage/triage.json` (private). Work in the user's own
repositories is never listed on the ledger.

Co-authored merges: a merged PR opened by someone else counts as co-authored
only when the user's `Co-authored-by` trailer survives in the merged commit on
the upstream default branch. Record it in `triage.json` `pull_requests` with
`role: "co-author"`, and put its curated publication record in
`publications.json` `co_authored`, never in `records`. It is never part of any
headline merged count. An absorbed change with no surviving trailer gets no
credit: note it in triage only.

Own / internal repos: for repositories the user owns or controls internally,
land changes as a direct commit on the default branch. Do not open a pull
request. Pull requests exist only for upstream / external repositories.

## 2. Permissions and approvals

- Act (comment, open PRs, request review) only as the authorized OSS account.
  Never post as any other account.
- Never comment, open a PR, or request review without permission in that turn,
  or a batch authorization covering those exact targets.
- Comment approval gate: always ask before posting any PR comment, issue
  reply, or review: show the full text as a draft and wait for explicit
  approval of that exact text, every time. A relayed "approved" that names the
  action but was given before the text was seen is not approval of the text.
  Post the approved text verbatim.
- The opening description is not a comment. Confirm with `issues/N/comments`
  and `pulls/N/comments` both empty. A follow-up rewrite of the description
  still needs the full draft approved before `gh pr edit`.
- Copy-pastable comment block: whenever you draft, post, or fail to post a PR
  comment, issue reply, or review, include a copy-pastable fenced code block
  of the exact GitHub markdown. Use a fence longer than any backtick run
  inside. Required even when the agent posts successfully.
- Verify after posting: fetch the posted comment (or PR body) back from the
  API in the same turn and diff it against the approved text. A 201 proves
  nothing about content. Treat a body that is a path, empty, truncated, or
  contains `\r` as a failed post. On Windows, write `--body-file` payloads
  with Python `newline='\n'`. Diff the fetched title. A later bot release-notes
  HTML comment appended to an otherwise matching body is not a failed post; do
  not strip it.
- Posting path: if an integration returns 403 `Resource not accessible by
  integration` on a comment or PR write, use the authenticated `gh` CLI as the
  OSS account with `--body-file`. Same approval gate; never retry the same
  write through other routes after a user decline.
- Commit signing: check the repository's contribution policy and sign commits
  accordingly before pushing.
- Playbook edits need no approval round. Decide wording and placement, then
  push after the usual read-back and sync. Ask first only before public
  upstream posts.

## 3. Voice (non-negotiable)

- Professional, respectful, and concise. Lead with what changed and why; no
  performative filler.
- Happy, inviting, collaborative. Open with genuine thanks tied to something
  specific, frame the approach as a suggestion, welcome the maintainer's
  preference, and close with an open offer. Warmth comes from specifics, not
  filler.
- Never use em dashes in maintainer-facing text. Use a normal hyphen `-` or
  split the sentence.
- Write as the user, a person, not as a model. If a draft could be swapped
  onto another PR by changing the names, rewrite it. Never put an experience
  in his mouth that he did not have.
- Emojis are allowed in moderation when replying to people: one or two per
  comment, varied and relevant. Never prayer hands. Do not stack emoji runs.
- Vary the opening across a batch. Comments to the same maintainer must not
  share an opening line or template.
- One sentence per line in all maintainer-facing text. Exactly one sentence or
  point per paragraph with a blank line between. No wall-of-text blocks.
- A bit detailed, not an essay. Name the function, what went wrong, what
  changed, and how you checked it.
- Prefer `Fixes #N` / `Closes #N` when the change fully resolves the issue.
- When the PR covers only part of the issue, write `Partially addresses #N` or
  `Part of #N`, never a closing keyword.
- Informal tone is reserved for private chat with the user; all public text
  follows this section.

## 4. Cadence and API hygiene

1. Open one new PR at a time. A second may run only with explicit user
   permission. Complete the full cycle per PR before hunting the next. If
   CONTRIBUTING says one issue at a time and wait for a review before the next,
   a bot review does not clear that gate; a human OWNER, MEMBER, or
   COLLABORATOR review, or a merge, does.
2. Run one agent session per PR lifecycle and retire it once the PR is open,
   the ledger is updated, and the post-run retrospective (section 8) is done.
3. Keep GitHub API volume low. Prefer one consolidated call, reuse fetched
   data, no `--paginate` on large collections, no parallel API fan-out, poll
   CI at most every 60 seconds. Check `gh api rate_limit` before heavy scans.
4. On `resource_exhausted`: stop parallel work, wait, then resume serially.
5. Stuck handling: if a step stays blocked, stop hitting the wall. Report the
   blocker and either move on or ask the user.

## 5. Target selection and GO criteria

A target is GO only when every item below holds. Re-check the timeline with
`gh` immediately before claiming.

Check order matters: read `.github/workflows/` before you evaluate any issue. A
repo-level auto-close or account scanner nullifies an otherwise perfect target
and is invisible in the issue timeline.

Hard gates:

- Repo blocklist: skip a repo whose `repositories` entry in `docs/triage/
  triage.json` has `no_go: true` or `agent_scan_gate: true`. The stop is
  permanent until the user lifts that flag.
- Open issue, no owning assignee, no competing open fix PR. Check the issue
  timeline's `cross-referenced` events, not just body and comments. If the
  author of any open fix PR is our own account, stop, open nothing, and report
  the existing PR.
- Duplicate search before any claim or approach comment. Search the repo's
  issues, open and closed, for the symptom, not just the target's timeline.
  If one exists, engage on the older canonical issue instead.
- No prior closed-unmerged PR on the same issue, or a clear reason why the
  earlier approach failed and the new one differs.
- The fix is owned by the repo being targeted; confirm companion packages
  before claiming.
- Reproducible or source-verifiable on the current default branch, and not
  already fixed on main even if the issue is still open.
- Bounded patch: small file count, plus tests where the repo has them.
- Outside contributions allowed: if CONTRIBUTING or observed behavior reserves
  PRs for maintainer-invited contributors, the repo is off-limits until an
  invite exists on that issue.
- Submission path open before heavy work: account blocks and hard filters can
  404/FORBIDDEN PR creation while reads, forks, and fork pushes still work.
  Search for disabled-PR statements, confirm outside merges still happen, read
  `.github/workflows/` for assignment-gate auto-close bots, then probe with a
  bare branch PR create. On 404/FORBIDDEN: stop, record no-go in triage, keep
  the branch.
- No account-level scanner or auto-close workflow that fires at PR open and
  closes in seconds. Record as repo-level no-go; never refile; never reply to
  the bot.
- AgentScan adopters are no-go. Check the adopters page and `.github/workflows`
  for the AgentScan action. Do not open. Do not reply to the bot.
- Stellar org default no-go: `stellar/*` unless an explicit maintainer invite
  exists on that issue. Exception: `stellar/stellar-docs` for small docs fixes
  when CONTRIBUTING still allows them.
- Contribution policy satisfied: CLA, signed commits, required labels, repo
  accepting PRs. Read root `AI_POLICY.md`, `AGENTS.md`, `CLAUDE.md`, and org
  `community` / `.github` repos for GenAI rules. A ban on agent-created PRs is
  an account-integrity hard gate (record no-go; human opens with required
  disclosure).
- AI disclosure is mandatory-only, never volunteered. With no policy requiring
  it, say nothing about AI anywhere. Disclose only exactly what a required
  policy or PR-template disclosure section asks for.
- No design or policy gate pending. If semantics need agreement, comment the
  approach and wait. Soft "consider discussing first" with no semantics
  dispute: implement to a pushed fork branch, post an approach comment, record
  `approach_proposed`, open only after maintainer reply or the user's call.
- Never previously attempted by us: check `triage.json`, the ledger, and
  `gh search prs --author <oss-account>` plus `gh search issues --author
  <oss-account>` for the repo and issue before scoring.
- Discuss-before-PR CONTRIBUTING is a hard gate. Draft the approach comment
  first (through the comment approval gate) and open nothing until a maintainer
  replies.
- Reproduce before picking. A pick is not GO until the bug reproduces on the
  default branch. Reproduce before implementing, not after. No repro: post the
  approach comment asking the reporter for a minimal reproduction, keep any
  local fix unpushed, and hold the PR until a red test exists.
- Rebase risk: list other open PRs touching the same files; heavy overlap
  lowers merge likelihood even without a competing fix.
- "Hidden as spam" is an account-level hazard. Check `isMinimized` /
  `minimizedReason` via GraphQL before reporting a comment as fine. On spam
  minimize: never repost, never edit to slip past, never appeal in-thread,
  never send more agent-shaped text in that repo.

Freshness and aliveness:

- Repo is alive: pushed within ~3 months (`pushed_at`). Uncontested issues in
  dormant repos are not targets.
- Repo merges outsiders, not just pushes. Require at least one non-bot outside
  merge in the last 30 days through a normal review, and median open-to-merge
  in days not months.
- Issue is recent: prefer days to a few weeks (roughly 6 weeks or less). Sort
  by newest at discovery.

Sizing and tilt:

- Default hunt filter (unless overridden that turn): tier 2/3 repos, non-web3,
  not huge competitive repos, maintainers American or Western European
  (verified via GitHub profile location and company, not guesswork), issue
  fresh (this week or month), no competing PRs, assignees, or claims, and high
  merge likelihood from recent outside-PR merge speed.
- Always skip: contested issues, archived repos, vague design features, and
  repeat AgentScan auto-close targets from the same account on the same issue.
- Prefer small and mid-size repos. Judge open-PR queue against outside-merge
  throughput. Skip event, hackathon, bounty, and never-merged-an-outsider
  repos.
- Unsolicited size and new API tilt against. Without a maintainer ask on the
  issue, keep the diff under about 150 lines and prefer bug fixes.
- Saturation cap: 1 open PR in a repo is fine; 2-3 only for an exceptional
  fix; 4+ skip for the cycle. Count per org too. Until an org has replied to
  one of ours, cap at one open PR.

Scan mechanics (when asked to scan for N targets):

- Run read-only scan agents in parallel over disjoint repo groups. Agents
  never post.
- Bulk issue discovery uses core `repos/{owner}/{repo}/issues?labels=bug`, not
  the search API (secondary rate limit). Follow up with one timeline call per
  shortlisted candidate.
- Raced-target rule (pre-claim only): competing open PR before we opened
  anything -> contested, stop, next candidate.
- Never yield a PR we opened first. A later competitor is not a reason to
  withdraw. Keep ours rebased and mergeable; one short note of fact is fine;
  closing for a competitor needs the user that turn.
- Persistent tracker for raced targets: record in `triage.json` with
  `do_not_duplicate: true` and update when the competitor closes/merges.
- Every scan re-verifies the existing candidate queue before adding names.
  Stamp verification dates.
- Keep a screening log: every excluded candidate with a one-clause reason.
  Record it in triage or the daily log so the next scan does not re-screen it.
- Pick deliverable: each pick is a standalone briefing of about 1000 words,
  pasteable into a fresh agent session: issue link and summary, repro steps
  and result, root-cause hypothesis and files, gates checked with evidence,
  CONTRIBUTING requirements, competing or overlapping PRs, and suggested next
  step. One pick per briefing.
- A `Potential AI issue` label on an issue we claimed means follow-ups must be
  extra precise and human.

## 6. Shipping steps

0. Internal vs upstream: own/internal repos skip this flow: commit to the
   default branch and stop.
1. Default to fork, branch, and PR via `gh` when Cloud Agents are unavailable.
2. Probe the submission path before heavy work. Skip the probe when approval to
   open has not been given yet; rely on account-level evidence and report probe
   skipped.
3. Treat briefs as leads, not specs: re-verify root cause, tests, and
   environment claims. Minimal root-cause fix matching repo style. No
   drive-bys. Prefer a just-merged same-shape PR as template. Treat
   CONTRIBUTING LOC/layout/docs/branch rules as review gates.
4. Add a focused regression that fails before and passes after when tests
   exist. Run it against the unfixed code first: if it passes without the fix,
   the bug is not reproduced, so stop and fall back to the no-repro hold,
   never open a PR whose test cannot fail. Run the full unit/lib suite, not
   only the new tests. Run fmt, lint, and UI/snapshot tests on the toolchain
   CI uses, and baseline any red against a clean `git worktree` of upstream
   main before attributing it to the diff. Commit series: every commit must
   pass fmt, CI's exact lint, and full tests alone.
5. Add a changeset when the repo uses them. Prefer entries that need no PR
   number, or add the link in a second commit; never amend/force-push only to
   add the PR's own link.
6. Use distinct branch names when multiple PRs target the same repo.
7. Sign commits per repo policy before pushing. Add `Signed-off-by` when recent
   history uses it, or when a DCO app reports the trailer missing. Confirm via
   `pulls/N/commits` -> `commit.verification.verified`.
8. Fix actionable bot review findings on your own code. A `CHANGES_REQUESTED`
   from a code-review bot is not that class: surface it, do not push. A bot
   finding about pre-existing behavior outside the issue is scope creep: leave
   it.
9. Leave non-actionable checks alone: platform authorize, team-only checks,
   first-contribution `action_required`, coverage bot comments when that check
   is SUCCESS.
10. CI must be green (or explicitly non-actionable) before reporting done.
    After each push, wait and confirm. Own red -> fix. Main red at base ->
    compare failing sets; report "no new red", not "green". Empty
    `check-runs` is not green: read workflow `on:`, sibling PR runs, commit
    statuses, `actions/runs`, and `check-suites` for `action_required`.
11. Report the PR URL, plus the scoreboard when batching.

## 7. Maintainer responses (user-driven; no babysitting)

No babysitting: never set up a watch, cron, listener, or poll loop on a PR.
GitHub email to the user is the trigger.

- When the user relays PR activity, read current state once. Treat bots as
  no-ops for action. Confirm `merged` before thank-you or ledger merge writes.
- `reviewDecision` is not a person. Require a human OWNER, MEMBER, or
  COLLABORATOR in `pulls/N/reviews` before saying only a merge is left or
  treating CHANGES_REQUESTED as work.
- Agreement from a non-maintainer is not sign-off. Check `author_association`
  for OWNER, MEMBER, or COLLABORATOR before treating it as sign-off.
- Marked duplicate or closed after we commented: move the proposal to the
  canonical issue and leave a one-line courtesy note on the original pointing
  there. Do not repost the full proposal on the original. Re-key the triage
  entry to the canonical issue.
- Act only on human maintainer or collaborator responses: safe in-scope fixes
  push to the same branch; replies go through the comment approval gate.
- "Please sign your commit": if API shows `verified: true`, the ask is
  satisfied; no reply. If not, only the user can re-sign.
- Closing our own open PR is a last resort, and never for an approved one.
  Re-read `reviewDecision`, last human comments/reviews, and recent merges
  from the API before any close. Prefer one polite nudge over closing a green
  mergeable PR with no contact after about a week; get per-PR approval before
  any close.
- Auto-close: mark Closed (not merged), never refile from the same account,
  never reply to the bot.
- Check who closed it. Read `issues/N/events` for the `closed` event actor
  before attributing any close to a maintainer.
- Stale "No jobs were run" emails: before blaming maintainers or re-pushing,
  run `gh api repos/OWNER/REPO/actions/runs?head_sha=SHA` and check `actor`,
  `triggering_actor`, `created_at`, and `run_attempt`.
- Silence and dormancy (7 + 7 days): activity is a human other than us, or a
  code-review bot. CI/deploy/changeset/codecov/CLA/platform/Netlify do not
  count; our own comments do not reset the clock. After 7 days silence: one
  ping through the gate. After 7 more: close with one short sentence through
  the gate. Absolute exemptions: already approved by a human and only waiting
  on merge, or a human still actively reviewing. One follow-up per PR ceiling.
- Ping craft: at least five sentences, gentle, concrete about files, root
  cause, tests, and the linked issue. One sentence per paragraph, blank lines,
  hyphen never em dash. Post via `--body-file`, fetch back. Space a batch
  about one minute apart. Log `last_ping` in triage the same turn.

## 8. Post-run retrospective (mandatory before retiring a PR session)

Every PR run ends with a retrospective when active work is done. Do not skip
it on a bad outcome.

1. Revisit the full run end to end from actual commands and outputs.
2. Extract what generalized (would change behavior on a future PR in a
   different repo). Repo-specific point-in-time facts go to triage.
3. Write findings the same turn:
   - Generalizable lessons -> `PATTERNS.md` under the matching heading.
   - If a lesson tightens a hard gate or shipping step, edit this SKILL.md
     too.
   - Repo-specific facts -> `triage.json`, never PATTERNS.md.
4. Sync: push updated SKILL/PATTERNS to `docs/`, then run the section 0 sync.
5. Ask the user whether they picked up learnings; write what they offer per
   step 3.
6. Only then retire the session.

## 9. Email triage (OSS inbox)

- Confirm with the user whether flagged mail is actionable before acting.
- A GitHub email about an issue or PR we have no stake in is a scan lead, not
  a task. Check involvement, run section 5 gates, report skip-or-go, post
  nothing.
- CLA emails: the user signs in the browser. Confirm only after the
  `license/cla` check succeeds.
- Keep: human approvals, reviews, merges, security alerts, anything from real
  people.
- Discard or ignore: bot-only noise (Copilot, platform authorize, Changeset,
  CodeRabbit, Qodo paused notices, surveys, sales).
- Use the correct existing labels for the OSS accounts. Never invent vague
  labels.

## 10. Ledger and own-repo writes

The unified ledger repo is public (`oss-contributions`); its README is the
public product. Everything in this section lands on GitHub the same turn it is
decided.

Operational files are private by default. The public ledger shows merged
portfolio only. Triage, playbook, patterns, and scripts live in the private
operational repo, never in a public repo. Do not publish agent instructions,
scan gates, maintainer notes, or pacing rules.

Never write that private repo's name on a public surface. Workflow YAML,
README, commit messages, and Actions logs count. A later commit that deletes a
literal name reprints it in the public diff. To remove a literal, rewrite the
commit that introduced it. Deleting the repo and recreating it with the same
history does not kill those URLs, because the commits are ancestors and the
same SHAs are uploaded again. A deleted repo can be restored within 90 days.

How to write: prefer direct `gh api` contents PUT / edit endpoints for spot
edits. For whole-file transformations, scripted local rewrite is fine: `git
pull --ff-only` first, push the same turn.

Ledger commit messages must not contain `owner/repo#N`. That creates an
upstream cross-reference. Write `owner/repo <N>` or name the repo only. If one
leaks, do not comment on the upstream thread.

Temp payload hygiene: write `gh api --input` payloads under the OS temp
directory and delete them the same turn. Session end: zero ledger-related
files left in the workspace.

## 11. Single source of truth: GitHub, not local disk

The ledger exists in exactly one place: `oss-contributions` on GitHub. The
local machine is a workspace, not a mirror.

- Read state from GitHub via contents API. Do not assume a local copy is
  current.
- Write state to GitHub the same turn as the outcome. One PUT per file with
  final content.
- Never create local ledger files. Temp under OS temp only, deleted same turn.
- Stale-copy rule: if a local `triage_*.json` is found, treat it as a fossil.
  Remote is truth; never push a local copy over remote.
- Skill mirrors: after PUT, run the section 0 sync.

### 11.1 Local clones are disposable

A clone exists to produce one PR, not to archive one.

- Retire the clone when the PR is open, checks are green, and triage is
  updated, unless it holds unpushed commits or active review iteration.
- Confirm before deleting: `git check-ignore -v <path>`.
- Check for unpushed work first. Export a patch before deleting if the fork is
  gone but the clone still holds unique commits.
- An oversized `.git` is worth a shallow re-clone (`--depth 1 --branch <b>`).
  Shallow clones push normally but need `git fetch --unshallow` before
  history-dependent work.

## 12. Unified ledger schema discipline

- Canonical triage memory is `docs/triage/triage.json` in the private
  operational repo, and only there.
- Keep all records in the same arrays and schema. Do not create separate
  domain-specific queue files.
- Preserve existing field names. Update only affected records.
- Historical portfolio documents must not override canonical triage state.
- Diff stats in ledger copy come from `gh api repos/OWNER/REPO/pulls/N
  --jq '[.additions,.deletions,.changed_files]'` after the last push, never
  hand-summed from local commits.

## 13. Merge cascade (do not hand-edit publication targets)

When an upstream PR merges, do not independently edit README, resume, LinkedIn
source, profile README, or repository About. Trigger the ledger workflow
instead. Resume, LinkedIn, and paste files live in `<private-career-repo>`
(PII, never in a public repo). Master resume DOCX lives there too.

One-click: Actions -> Sync merged OSS -> Run workflow. Optional `pr` =
`owner/repo#number`. Optional `summary` = curated impact copy for a new
publication record.

The workflow (do not hand-edit these targets instead):

1. Treats GitHub merge state as fact
2. Updates `docs/triage/triage.json`
3. Upserts `docs/triage/publications.json` without overwriting
   `curated: true` copy
4. Regenerates README here and professional docs in `<private-career-repo>`
5. Auto-patches master resume DOCX (top 20 by rank; give new repos a
   `REPO_TIER` at merge time)
6. Updates repository About when the sync token is present (admin PATCH).
   Public writes run only after `validate()` passes.
7. Validates merged counts across every publication target
8. Commits only when something changed

If About or profile README was skipped, repair both by hand the same turn (run
still reports success). Signal: About count lagging the README badge, or null
`about` in the log.

About hard rule: finished description MUST be <= 340 chars, re-derived whole
from the template on every merge, never a substring patch, never cut mid-word.
GitHub caps at 350 and truncates silently. Measure before PATCH. Never mention
internal triage paths in About.

Template (HARD CAP 340):

```
Public ledger of upstream open-source contributions: {count} merged pull requests across TypeScript, Rust and Python. Merged into {names}, covering SDKs, tooling, frameworks, databases, docs and concurrency fixes.
```

`{count}` is authored merged total (co-authored excluded). `{names}` is
distinct authored merged repos, alpha-sorted, joined with ", " and a final "
 and ". Shed to fit: drop the ", covering ..." clause first, then drop names
from the end and append " and more".

Profile README: restore the token and re-run the workflow (fragment renders
in-memory; no on-disk copy).

After every green merge run, paste live LinkedIn from the regenerated
`<private-career-repo>` files and confirm the live count matches the README
badge. Frozen sections stay untouched unless the user decides otherwise.

Canonical operational record: `docs/triage/triage.json`
Canonical publication copy: `docs/triage/publications.json`
Human-only: GitHub profile bio, PATTERNS.md (unless a new generalizable lesson
exists), social preview.

## 14. Publication copy quality (merged entries must explain the change)

Every merged PR gets real impact prose, never a one-line restatement of its
title.

- Write the change in concrete technical terms: name the surface touched, then
  the observable consequence.
- One to three sentences, starting with what changed. No em dashes or emojis
  in this copy.
- Set `curated: true` when writing it. Check the flag on every newly merged
  record.
- Fill `ledger_what`, `profile_line`, `resume_bullet`, `linkedin_bullet`
  consistently.
- `profile_logo_alt` must not repeat the visible title; use the org or product
  name.
- Match the actual PR title. Never describe a docs-only or test-only PR as a
  fix, and never claim tests a PR does not add.
- No em dashes in generated copy. Separator is a plain hyphen.
- After any sync, check `languages` on the new record (empty falls back to a
  wrong language).
- After hand-fixing a record, re-run Sync merged OSS. Curated copy is left
  alone, so re-running is safe.

## 15. Gratitude to maintainers after a merge

When a human maintainer merges one of our PRs, send a short thank-you on the
PR thread.

- Goes through the comment approval gate.
- Personalize with real first names from `gh api users/<login> --jq .name`.
  Never guess; blank name -> handle. No @-mention.
- Name the review chain when visible.
- Warm and collaborative: enthusiasm in words, at most one `!` on the close,
  at most three content-tied emojis. Name the specific thing learned.
- Three or four sentences, one per paragraph. No em dashes, no ask, no
  follow-up question.
- If they scoped something out, thank them for that call; at most offer the
  left-out case as a separate issue they can ignore.
- One note per merged PR, once. Skip bot/auto/self merges. Spread multiple
  notes across turns.
- Never publish maintainer praise in README, resume, LinkedIn, or other public
  artifacts.

## 16. Fork hygiene (a fork lives only as long as its PR)

- A fork exists to serve one PR. Delete it when that PR merges or is finally
  closed.
- Never delete a fork that has an open PR upstream.
- Never edit upstream prose inside a fork; deletion is the right lever.
- Account-wide text sweeps cover owned repositories only; forks are out of
  scope.
- Before deleting: no open PR from that fork, no branch holding our work, no
  local clone that depends on it.
- `compare` `ahead_by > 0` does not prove a branch is ours (fork carries
  upstream branches). Prefer fork `created_at` vs `pushed_at` gap. For a real
  gap, confirm triage records a dead end before deleting.
- Upstream keeps commits of open/closed PRs after fork deletion. Only
  never-opened fork pushes are at risk: check for a local clone first.
- Deleting a fork makes its closed PRs permanently non-reopenable. Before
  deleting, read each closed-unmerged PR from it: keep the fork and ask the
  user if a human OWNER, MEMBER or COLLABORATOR engaged with it, or if we
  closed it on a non-maintainer's objection. If a maintainer asks after the
  fork is gone, recover with a new PR from `refs/pull/N/head`.
- Delete in batches of about ten; confirm open PR count unchanged after each
  batch.
- `gh repo delete` needs `delete_repo` scope (`gh auth refresh -s
  delete_repo`, interactive).
- Pruning also blunts bulk-fork account flags and keeps owned repos visible on
  the profile.

## 17. Hunt heuristics and per-PR handoff

- Classify each pick at hunt time: direct fix (bounded bug, clear expected
  behavior) vs design-gated (soundness/UB, semantics choice, API shape).
  Record the mode in triage and in the handoff.
- Design-gated: draft an approach comment first; implement on the fork branch
  in parallel; open the PR only after a maintainer reply or the user's
  explicit decision.
- AI-contribution policy (CONTRIBUTING, PR template): record it in the brief,
  the user owns the diff and every public sentence, and prefer the
  design-gated flow so it is never an unsolicited AI PR.
- Handoff to a per-PR session must be self-contained: playbook bootstrap URLs,
  issue URL, root cause with file/line refs at a pinned commit SHA, fix sketch,
  tests, contribution rules, gates, mode, and the first deliverable expected.
- The per-PR session re-checks the issue timeline as its very first action.
- Two per-PR sessions at once need the user's explicit go.
