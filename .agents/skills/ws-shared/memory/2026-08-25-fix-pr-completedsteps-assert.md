### [2026-08-25] Fix-PR completedSteps assertions must be block-aware
- **Layer**: `Harness`
- **Module**: `ws-fix-pr / update_state tests`
- **Severity**: `High`
- **PathPattern**: `test/test-models-preset-and-per-step.js, test/test-update-state-yaml.js, .agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Scenario / Context**: Step 6 review found single-line `completedSteps:[^\n]*9` checks that miss YAML block lists (`- 9` on the next line), and index sort coercion that preserved schema-invalid rows without workflowId.
- **DO NOT**: Assert Step completion with a single-line regex against `completedSteps:`, or keep malformed plans-index rows alive via empty-string sort coercion.
- **INSTEAD DO**: Use the same inline/block-aware completedSteps pattern as outer-finish tests; drop index rows missing `workflowId` when rewriting `plans/index.json`.
