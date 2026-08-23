### [2026-08-23] Autoload opt-out must strip Always-applied row
- **Layer**: Config / autoload
- **Module**: `configure_autoload.py` / `ws-configure-project`
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/configure_autoload.py, .agents/skills/ws-shared/autoload.md`
- **Scenario / Context**: PR #238 review. `defaults.autoloadTaskLifecycle: false` plus `--write-autoload` only skipped *adding* `ws-task-lifecycle`. After a prior Yes, `membership_from_existing_rows` kept the row, so Always-applied stayed out of sync with `config.json`.
- **DO NOT**: Treat "does not add" as sticky membership that ignores a later false flag.
- **INSTEAD DO**: When the flag is not JSON `true`, drop `ws-task-lifecycle` from Always-applied membership (leave other preserved rows). Assert against the first Skill/Path/Trigger table only. Keep numbered wizard steps at column 0 in SKILL.md (sub-bullets may indent; `2.` / `3.` must not nest under `1.`).
