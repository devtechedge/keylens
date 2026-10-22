# Journey

Project-adapted copy. Canonical source: `~/.agents/skills/journey/SKILL.md`.

Audit view only. Do not merge this into dev-memory or the OpenCode fast
snapshot.

## Show

Paths use the Windows layout; on Linux or macOS the same files live under `~`.
Use whichever path exists on the current machine.

A missing OpenCode store is reported as zero bullets, not an error.

1. Run:

```powershell
python "~/.agents/skills/journey/scripts/journey_report.py"
```

2. Paste that report. It lists each tracked skill (name, state, uses, patches,
   last used), archived dirs, a short count of the OpenCode fast snapshot, the
   dev-memory standing-file size against its character caps, and the last 30
   ledger events, oldest first within that window. An over-cap file is only
   flagged here; compact it per dev-memory step 3 after the user agrees.
3. If the user asks to prune or correct, stop and ask before any delete or
   archive. Archiving a learn-created skill is curator restore-able. Dropping
   a dev-memory fact is an in-place edit of `~/.agents/memory`, only after they
   name the fact.
4. Removing a `domains/<name>` folder is not a journey action. It follows the
   dev-memory delete rule: append the substance verbatim to a dated log, verify
   it landed, then delete. Journey reports; it never removes.
5. Do not rewrite memory files during a plain `/journey`.
