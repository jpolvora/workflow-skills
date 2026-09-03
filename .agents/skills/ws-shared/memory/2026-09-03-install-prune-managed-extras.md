### [2026-09-03] Install/update must prune retired managed skill files
- **Layer**: harness
- **Module**: bin/cli.js
- **Severity**: High
- **PathPattern**: `bin/cli.js`, `.agents/skills/ws-preview/**`
- **Scenario / Context**: After removing a packaged file from a skill (e.g. `ws-preview/scripts/run_dry_run.sh`), consumer/global installs still had the leftover; merge-only copy left it on disk and post-copy integrity reported `extra` / exit 1 with no automatic rollback
- **DO NOT**: Assume overwrite install/update replaces the whole skill tree, or leave dest-only managed files after overlay copy
- **INSTEAD DO**: After `copyDirSync` into an existing skill dir, run `pruneManagedSkillExtras` (skip consumer-owned `config.json` / `MEMORY.md` / `memory/`); verify with install Phase 11 prune tests
