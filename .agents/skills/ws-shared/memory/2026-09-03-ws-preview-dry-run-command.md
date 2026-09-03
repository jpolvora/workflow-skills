### [2026-09-03] ws-preview uses preview.dryRunCommand only
- **Layer**: harness
- **Module**: ws-preview
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-preview/**`, `.agents/skills/ws-shared/config*.json*`
- **Scenario / Context**: Invoking or authoring `/ws-preview` after the tool-agnostic rewrite
- **DO NOT**: Vendor or download a named reviewer backend (e.g. cursor-reviewer `run.sh`), invent `CURSOR_API_KEY` / stack / backend flags, or ship a packaged `run_dry_run.sh` wrapper
- **INSTEAD DO**: Read project `{sharedDir}/config.json` → `preview.dryRunCommand`; if empty STOP and ask the consumer to configure; run that command from the consumer repo root with a long Shell timeout
