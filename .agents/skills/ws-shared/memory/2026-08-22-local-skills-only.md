### [2026-08-22] Local skills only — no global install
- **Layer**: `Harness`
- **Module**: `AGENTS.md` Global vs local `ws-*` / skill invoke path
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-*/**, AGENTS.md`
- **Scenario / Context**: Operator uninstalled the machine-wide `{globalSkillsRoot}` (`$HOME/.agents/skills`) copy. Sessions that still prefer global `Read`/`dispatch` paths fail with missing skill trees (e.g. `ws-spec-to-pr`, `ws-verify-plan`).
- **DO NOT**: Prefer `{globalSkillsRoot}/ws-*` or assume a global install exists for invoke in this upstream package dogfood.
- **INSTEAD DO**: Load and run all `ws-*` skills and scripts from `$PWD/.agents/skills/ws-*` (expand `{skillsRoot}` → `.agents/skills`). Author / invoke / hash / test from that tree only until a global install is restored intentionally.
