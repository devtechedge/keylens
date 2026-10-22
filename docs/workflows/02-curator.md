# Curator

Project-adapted copy. Canonical source: `~/.agents/skills/curator/SKILL.md`.

Deterministic maintenance for skills the loop created. No judgment pass.

## Stores

Paths use the Windows layout; on Linux or macOS the same files live under `~`.
Use whichever path exists on the current machine.

- DSH skill root: `~/.agents/skills`
- OpenCode mirror: `~/.config/opencode/skills`
- Usage: `~/.agents/skills/.usage.json`
- Ledger: `~/.agents/skills/.curator_ledger.jsonl`
- Archive: `~/.agents/skills/.archive`
- Backups: `~/.agents/skills/.curator_backups`

`dev-memory` under `~/.agents/memory` is a different store. Do not snapshot,
prune, or rewrite it here.

Skill backups live in `.curator_backups` under each skill root.
`~/.agents/memory-backups` belongs to dev-memory (its compaction safety zips);
curator never prunes, moves, or deletes it. When judging whether a backup is
still needed, compare it to the live skills store, not to the memory corpus.

## Run

1. Run the script. It snapshots learn-created skills first, keeps the newest 5
   backups, marks 14-day unused skills `stale`, and archives 30-day unused
   skills.

```powershell
python "~/.agents/skills/curator/scripts/curator_pass.py"
```

2. Read the script summary. Do not archive anything the script left alone.
3. Never touch pinned skills, `self-learn`, or any skill whose usage record is
   missing or whose `created_by` is not `learn` or `agent`. Hand-written skills
   stay even if unused.
4. Consolidation only when the user said "consolidate" in this turn. Merge
   overlapping learn-created skills into one umbrella, fix paths, then archive
   the absorbed dirs by moving them into `.archive\`. Print an old-name to
   new-name map. Do not consolidate hand-written skills.
5. End with the script summary plus that rename map, or "no consolidation".

## Restore

Move the archived directory back to `~/.agents/skills/<name>`, set `state` to
`active` in `.usage.json`, and append a ledger line `action: restore`. Archive
is the worst case. Never delete a skill directory.
