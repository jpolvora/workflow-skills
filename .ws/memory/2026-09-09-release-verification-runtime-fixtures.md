### [2026-09-09] Release verification with hybrid runtime fixtures
- **Layer**: Tests
- **Module**: Workflow telemetry and release integrity
- **Severity**: Medium
- **PathPattern**: `**/workflow_state.cjs`; `test/**`; `bin/skill-integrity.json`
- **Scenario / Context**: A package release changes the upstream package version while isolated consumer fixtures resolve runtime metadata from a separately installed global skills root.
- **DO NOT**: Compare telemetry from an isolated consumer fixture with the upstream package manifest unless the fixture includes the intended runtime manifest. Do not treat an integrity check as final before all package-tree edits, generated projections, and intended new skills are present.
- **INSTEAD DO**: Seed the fixture's consumer-local runtime manifest when asserting the current release version, then regenerate and verify integrity only after the complete intended tree is stable.
