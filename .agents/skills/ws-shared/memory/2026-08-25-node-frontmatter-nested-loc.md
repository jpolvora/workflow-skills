### [2026-08-25] Node frontmatter must keep nested telemetry.loc
- **Layer**: Infrastructure
- **Module**: ws-shared / workflow_state.cjs parseFrontmatter
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/scripts/workflow_state.cjs, test/test-update-state-yaml.js
- **Scenario / Context**: Frozen Python `update_state.py` now execs Node. A one-level YAML flatten turned `telemetry.loc.baseline` into `telemetry.baseline` and emptied `loc`, so the nested-map round-trip test failed.
- **DO NOT**: Parse indented mapping blocks by trimming every line into a single flat object. Do not stringify nested maps with `JSON.stringify` on `telemetry.steps`.
- **INSTEAD DO**: Parse nested keys with indent (`parseNestedMapping`). Serialize object arrays as YAML `- { … }` so `elapsedSec` dual-writes into state.md. Cover with `test-update-state-yaml.js` loc mapping and `test-quality-gates.js` dual-write.
