---
slug: us-439
step: 7
workflowId: us-439-20260927T170000Z
status: completed
---
# Testing Plan — us-439

Change class: new packaged skill (markdown + Node helper) + doc/integrity projections.
Touchable layers: skills SoT (`.agents/skills/ws-spec-to-issue/`), tests (`test/`), docs/hub.

## Test surface probe

`node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --repo-root .` →
`hasTestSurface: true`, alias `backendTest` = `npm run test`.

## Batteries

| # | Battery | Command | Scope |
|---|---------|---------|-------|
| 1 | Unit / contract (new skill) | `node test/test-ws-spec-to-issue.js` | frontmatter, both manifests, `--help`, GH/ADO dry-run, `local` STOP, anonymization guard |
| 2 | Full suite | `npm run test` | all 139 entries (installer, integrity, tree checks) |
| 3 | Harness clean | `node test/test-harness-clean.js` | 0 findings |
| 4 | Skill-load gate | `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs` | 0 findings |
| 5 | Duplicates gate | `node .agents/skills/ws-check-harness/scripts/check_duplicates.cjs` | 0 findings |
| 6 | Ownership gate | `node test/test-git-ownership-contract.js` | matrix classifies the new skill |
| 7 | Context budget | `node test/test-context-budget.js` | hub byte budgets |
| 8 | Workflows FSM | `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` | 0 critical |
| 9 | Integrity | `npm run verify-integrity` | `bin/skill-integrity.json` matches tree |
| 10 | Config GUI | `node test/test-powershell-config-editor.js` | 12/12 (config untouched) |

Mutation testing: disabled (`defaults.skipMutationTesting: true`, `verification.mutationTest` empty).

## Integration / E2E

No network call is exercised in CI (no tracker credentials). The provider `create-issue`
delegation is covered by contract reuse: the helper resolves the provider script per tracker and
passes the body through `--body-file`; the provider `create-issue` intents are themselves covered
by `test-provider-listers.js` and provider suites. `--dry-run` proves payload shaping without a
mutation.

## Exit criteria

All batteries exit 0; the new skill's contract test is registered in `test/test-suites.json` (both
lists).
