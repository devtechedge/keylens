# dev-memory - persistent memory across chats

Project-adapted copy. Canonical source: `~/.agents/skills/dev-memory/SKILL.md`.

This skill is the developer's long-term memory. Short-term chat context dies
with the session; these files are what lets the next session pick up where
this one left off.

## 0. File layout (single source of truth)

`~` is the user home on every OS (Windows `C:\Users\<user>`, Linux
`/home/<user>`).

```
~/.agents/memory/
  MEMORY.md                  # global standing facts (prefs, identity, hard rules, env). Keep <= 6,000 chars.
  USER.md                    # who the user is. Keep <= 2,500 chars.
  domains/<name>/MEMORY.md   # per-domain standing facts. Keep <= 8,000 chars.
  domains/<name>/YYYY-MM-DD.md  # per-domain daily work logs. Most detailed layer.
```

- Standing files hold distilled, still-true facts: preferences, decisions,
  hard rules, environment gotchas, current counts with their dates.
- Daily logs hold what happened that day: outcomes, numbers, blockers,
  lessons. Write once, never rewrite history: correct with a new dated entry.
- New domains: when a session does substantive work that fits no existing
  domain, create `domains/<name>/MEMORY.md` on the spot and register it in
  global `MEMORY.md` under `## Domains`.

## 1. Session start (BOOT - do this first, every session)

1. Read `~/.agents/memory/MEMORY.md` and `~/.agents/memory/USER.md`.
2. Read `domains/<name>/MEMORY.md` for every domain relevant to this session's
   task.
3. If today's daily log exists for a relevant domain, read it. Do NOT pre-read
   old daily logs unless the task needs history.
4. Treat seeded facts as leads, not gospel: handoffs have been stale before.
   Re-verify before acting.
5. Slash commands in apps without slash support map to skill names: read that
   skill and run it.

## 2. During the session

- When the user says "remember this" (or "note this", "save this"), write it to
  the right file immediately, in that same turn, and confirm in one line what
  was saved where.
- Prefer updating the daily log for ephemeral progress and the standing file
  only for durable facts (a decision, preference, rule, count, or gotcha that
  future sessions must know).
- When the user says they already did a manual edit, stop immediately and only
  record the rule. Do not redo the edit.
- Prefer acknowledge, save, and propagate in one turn for authorized
  housekeeping; do not bounce a checklist back.
- OSS hunt sessions: save chosen picks and the screening log of excluded
  candidates with reasons to today's `domains/oss-prs/` daily log, so later
  scans skip them.
- Safety net: on long sessions (>~10 substantive turns) without a save, append
  a brief checkpoint to today's daily log unprompted.

## 3. Session end (SAVE)

Session end is detected three ways, in priority order:

1. Explicit cue: `save memory`, `checkpoint`, `wrap up`, `session ended`,
   `end of session`, `update memory`, goodbyes, or a topic-close like `moving
   on` / `let's switch topics`.
2. Heuristic close: task clearly finished AND conversation goes idle or pivots
   to a new unrelated task.
3. Pre-emptive save: if in doubt, save anyway.

Save procedure (same turn as the cue, before the final reply):

1. Append to today's `domains/<name>/YYYY-MM-DD.md` (create if missing): what
   was done, decided, and left open. Concrete numbers over vibes.
2. Promote durable items to `domains/<name>/MEMORY.md` or global `MEMORY.md`.
   Edit in place, keep bullets short.
3. Keep standing files compact. Past a cap, compact: merge duplicates, push
   detail down into the daily log it came from, link instead of quoting. Never
   delete substance: distill it. Compaction safety: back up to
   `~/.agents/memory-backups/` first, append moved text word for word to the
   dated logs, then confirm every PR number, SHA, date and backtick path still
   appears somewhere in the folder. Finish by making box and laptop stores
   byte-identical; if the laptop is offline, log "laptop sync pending" in
   today's daily log and run the sync when it is online. Never claim the stores
   match unchecked.
4. End with one line confirming what was saved and where.
5. Reusable procedure -> learn skill. Small corrections not yet saved -> refine
   skill. Do not run curator unless asked.

## 4. Rules that always apply

- PII: the `jobs` domain holds PII (resume, compensation, applications). Never
  push `~/.agents/memory/` to a public repo. No exceptions.
- Public-text rules carry over everywhere: no em dashes in anything that leaves
  the machine, never cite open-PR counts (merged only), AI disclosure
  mandatory-only.
- Counts move: any merged-PR count, board state, or sweep number gets its date.
  Never restate a dated count as current: re-check it.
- Deleting a domain folder is not deleting memory: append its substance verbatim
  to a dated log first, verify line by line that it landed, then remove the
  folder.
- Exact-line matching against a distilled store reports false "lost content":
  compaction rewrites wording. When a line looks unrepresented, grep a
  distinctive keyword and read the hit before calling it unique.
- Check redundancy against the store that actually holds the thing.
- Corrections beat appends: if the user corrects a standing fact, fix the
  standing file in place (and note the correction in the daily log).
- This skill defines the protocol. The memory files carry the state. Keep them
  separate.
