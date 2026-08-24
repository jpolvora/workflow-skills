### [2026-08-24] verboseMode omitted is off even when schema default is true
- **Layer**: Harness
- **Module**: ws-shared / config-resolution / ws-configure-project
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/config.schema.json, .agents/skills/ws-shared/config-resolution.md, .agents/skills/ws-configure-project/INTERVIEW.md, test/test-verbose-mode.js
- **Scenario / Context**: Adding `defaults.verboseMode` so orch prints a reasoned start-of-step list
- **DO NOT**: Treat JSON Schema `default: true` or a seeded `config.json.example` value as the runtime value when the key is omitted from a live `config.json`
- **INSTEAD DO**: Runtime enable only on explicit `true`. Omitted/`false` stay silent. Write `true` only from schema seed, `config.json.example`, and `ws-configure-project` `--section defaults` (Recommended)
