### [2026-09-12] Declare direct ws-* dependency edges for invoked skills
- **Layer**: harness
- **Module**: skill dependency graph
- **Severity**: Medium
- **PathPattern**: bin/skill-dependencies.json; .agents/skills/ws-shared/runtime/skill-dependencies.json; .agents/skills/ws-*/SKILL.md
- **Scenario / Context**: A skill invokes another `ws-*` skill at runtime (e.g. `ws-wiki` Phase 3 invokes standalone `ws-spec-write`) but its direct edge is missing. Orchestrator transitive closure masks the gap, yet selective installs and dependency auto-select leave the runtime invoke missing.
- **DO NOT**: Rely on transitive closure (e.g. via `ws-spec-to-pr`) when a skill directly invokes another `ws-*`; leave `ws-wiki: [ws-configure-project]` when `SKILL.md` invokes `ws-spec-write`.
- **INSTEAD DO**: Add the direct edge in both `bin/skill-dependencies.json` and `.agents/skills/ws-shared/runtime/skill-dependencies.json`, run `npm run generate-integrity && npm run verify-integrity`, rebuild site (`node bin/build-site.js`) for dep pills, and keep `test-doc-sync` green.
