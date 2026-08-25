---
step: 7
slug: fix-pr-batch-plan-exec
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
status: active
startedAt: "2026-08-25T17:37:42Z"
acRefs:
  - AC1
  - AC2
  - AC3
  - AC4
  - AC5
  - AC6
  - AC7
  - AC8
  - AC9
  - AC10
  - AC11
  - AC12
  - AC13
---
# Testing Plan — fix-pr-batch-plan-exec

## Scope and pass threshold

- Confirm the reviewFix commit on `develop` with the four requested focused checks.
- Re-run configured `verification.backendTest` (`npm run test`) after focused checks if the focused battery is green.
- Pass when every executed test/integrity command exits 0, mutation and non-applicable surfaces are skipped by policy, and regression sabotage does not fail.
- No coverage command is configured. The focused contract tests are the coverage signal for changed model resolution, Fix-PR gate ordering, state/YAML telemetry, and package integrity.

## Commands

1. `node test/test-models-preset-and-per-step.js`
2. `node test/test-fix-pr-proactive-class-sweep.js`
3. `node test/test-update-state-yaml.js`
4. `npm run verify-integrity`
5. `npm run test` when the focused battery is green and time remains.

## Acceptance-criteria quality probes

- AC1–AC4, AC8–AC10: the Fix-PR contract test must prove one batch pair, complete gate before edits, gate-only planning, amendment-before-deviation, lite ordering, goal evidence, and retained proactive execution checks.
- AC5–AC7, AC11: model/state tests must prove both internal roles, exact reviewer/execution fallbacks, numeric Step 9 exclusion, ordered dispatch telemetry, and the documented/configured role surfaces.
- AC12: focused Fix-PR coverage must retain the unchanged Auto-Fix contract.
- AC13: the configured full package suite remains the portability, language, token, docs, and harness regression gate.
- Observable failure threshold: any non-zero requested command is a Step 7 failure requiring handoff; no test defect is waived on judgment.

## Non-applicable surfaces

- Database seeds and rollback: not applicable (`stack.database.type: none`).
- API contracts, authentication, RBAC, and tenancy isolation: not applicable (no API host/port or tenancy field configured).
- UI/E2E, translations, accessibility, validation-error contrast, and alert indicators: not applicable (`stack.frontend.framework: none`, no dev host/locales).
- External credentials, services, hosts, and ports: none required; tests use repository-local fixtures.

## Mutation

- Status planned: skipped.
- Reason: `defaults.skipMutationTesting: true` and `verification.mutationTest` is empty.

## Regression Sabotage

- The AC ledger marks sabotage `not-required`. If no authorized caller-authored invert patch is supplied for this dispatch, record sabotage as skipped rather than mutating product files.
- The refined plan's recommended target is `.agents/skills/ws-fix-pr/SKILL.md`, with `node test/test-fix-pr-proactive-class-sweep.js` as the expected-red command and byte-identical restoration required.

## Working-tree constraints

- Preserve all pre-existing workflow artifacts and consumer-owned hub data.
- Write only this plan and the matching Step 7 report. Do not edit product or test code.
