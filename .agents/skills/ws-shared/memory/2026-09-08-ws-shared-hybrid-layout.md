### [2026-09-08] ws-shared runtime/templates migration path audit
- **Layer**: Tooling
- **Module**: ws-shared installer, configure-project, and harness checks
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-shared/{runtime,templates}/**; bin/**; test/**`
- **Scenario / Context**: Moving managed hub content below `runtime/` and `templates/` requires updating consumers, tests, documentation links, integrity enumeration, and generated root autoload copies together.
- **DO NOT**: Leave flat managed-path assumptions or treat the generated root `autoload.md` mirror as an independent runtime source.
- **INSTEAD DO**: Resolve managed paths from `hub-layout.json`; keep consumer configuration at `{sharedDir}`; use the selected local/global runtime and template source; exclude manifest-classified generated copies from duplicate-content audits.
