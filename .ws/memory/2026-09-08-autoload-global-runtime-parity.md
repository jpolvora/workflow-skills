### [2026-09-08] Autoload writers must use the selected global runtime
- **Layer**: `Tooling`
- **Module**: `ws-configure-project` autoload and root-pointer generation
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-configure-project/scripts/configure_autoload.py;test/test-autoload-configure.js`
- **Scenario / Context**: Global-hybrid consumers can keep skill bodies and the dependency graph under the global hub while project-local `ws-shared/` contains only consumer data. Autoload writers and checks must use that selected global runtime.
- **DO NOT**: Read `externalSkills` only from the local graph or generate `AGENTS.md` that points to a local hub file which was never materialized.
- **INSTEAD DO**: Resolve the selected local/global runtime for every graph lookup and create a thin project-local hub pointer before emitting a root pointer; cover a minimal global-only fixture.
