# Workflows

Agent operating procedures for this project. These are working copies of the
six workflow skills used across the developer's agent setup. Private
operational details (names of private repos, career/PII paths, account
handles) are scrubbed to placeholders here so this folder is safe for a
public repository.

| File | Workflow | When to use |
| --- | --- | --- |
| `01-dev-memory.md` | Persistent memory across sessions | Every session start (boot) and end (save) |
| `02-curator.md` | Deterministic skill maintenance | Prune stale learn-created skills |
| `03-journey.md` | Learning timeline audit | Review what was learned |
| `04-learn.md` | Turn a procedure into a skill | Capture a reusable procedure |
| `05-oss-pr-playbook.md` | Upstream open-source PR contributions | Any upstream OSS PR work |
| `06-refine.md` | Post-turn review | Save durable corrections after a session |
| `07-github-repo-presentation.md` | Public GitHub repo first visual | Polish a repo's presentation (About, README, screenshots, social, deploy) |

## Canonical sources

- `dev-memory`, `curator`, `journey`, `learn`, `refine`,
  `github-repo-presentation` canonical copies live in
  `~/.agents/skills/<name>/SKILL.md` on the developer's machines. This repo
  mirrors them for project context only.
- The OSS PR playbook canonical copy lives in the private operational repo
  (`<private-operational-repo>`). Never publish that repo's name on a public
  surface; always refetch the canonical copy before PR work (see
  `05-oss-pr-playbook.md` section 0).

## Placeholder legend

| Placeholder | Meaning |
| --- | --- |
| `<private-operational-repo>` | The private repo that holds the canonical OSS playbook + triage state |
| `<private-career-repo>` | The private repo with career/PII files (resume, LinkedIn sources) |
| `<oss-account>` | The public OSS account handle used for contributions |
| `<oss-email>` | The email inbox for the OSS account (support/ticket threads) |
| `<vercel-team>` / `<vercel-team-slug>` | The Vercel team owning project deploys |
| `~` | The user home directory on any OS (`C:\Users\<user>` on Windows) |
