### [2026-09-19] Project-config gates must require the concrete config file
- **Layer**: harness
- **Module**: ws-shared resolve_consumer_root gate
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.*
- **Scenario / Context**: Resolver candidate order can select `.ws/templates/config.json.example` when `.ws/config.json` is absent while `configSource` stays `'project'`. A fail-closed gate that validates the resolved `configPath` or `configSource === 'project'` passes in that state, and a config-dependent skill proceeds on seeded template defaults instead of pointing at `ws-configure-project` (found during PR #368 fix-pr round 2).
- **DO NOT**: Accept a resolved config path's existence or `configSource === 'project'` as proof of a project hub in fail-closed gates.
- **INSTEAD DO**: Require the concrete `<repo>/.ws/config.json` (`HUB_CONFIG`) on disk with no `configError`; cover with an example-only fixture case plus an end-to-end script-spawn case asserting fail-closed exit.
