### [2026-08-28] Documented defaults.hostAdapter must live in schema and example

- **Layer**: Harness
- **Module**: ws-shared / config
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-shared/config.schema.json;.agents/skills/ws-shared/config.json.example;.agents/skills/ws-shared/config-resolution.md
- **Scenario / Context**: Hub docs advertised defaults.hostAdapter without a schema or example object, so configure/validation could not check the advertised shape.
- **DO NOT**: Document a new config.json key in hub prose without adding it to config.schema.json and config.json.example.
- **INSTEAD DO**: Ship schema properties and an example object in the same change as the hub documentation.
