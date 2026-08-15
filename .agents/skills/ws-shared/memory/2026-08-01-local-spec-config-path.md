### [2026-08-01] Local-spec provider config path
- **Layer**: Infrastructure
- **Module**: ws-local-spec-provider
- **Severity**: High
- **Scenario / Context**: Scripts that resolve `plans.specsDir` / register local specs
- **DO NOT**: Point `CONFIG_PATH` at `.agents/skills/shared/config.json` (retired folder name) — scripts silently miss `plans.specsDir` and fall back to hardcodes
- **INSTEAD DO**: Always use `.agents/skills/ws-shared/config.json`; default `plans.specsDir` / `DEFAULT_SPECS_DIR` to `.agents/specs`; expand skill token `{specsDir}` ← `plans.specsDir`
