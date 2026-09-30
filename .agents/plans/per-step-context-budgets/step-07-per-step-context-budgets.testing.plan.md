---
slug: per-step-context-budgets
step: 7
status: completed
workflowId: per-step-context-budgets-20260930T125526Z
startedAt: "2026-09-30T14:05:00Z"
endedAt: "2026-09-30T14:05:00Z"
acRefs: []
---
# Testing plan — per-step-context-budgets

Source plan: `step-02-per-step-context-budgets.plan.refined.md`.
Spec: `step-00-per-step-context-budgets.spec.md`.

## Unit & coverage

- `backendTest`: `npm run test` (152 local entries via `test/run-tests.cjs`).
  Must exit 0. Covers the new `test-step-context-budgets.js` (AC1–AC8 +
  negatives) plus the extended audit and GUI suites.
- No other `*Build`/`*Test`/`*Format` aliases configured (all other
  `verification.*` keys empty) — nothing else to run.
- Gaps vs changed files: every product file maps to a suite —
  builder/writer → new suite + audit suite; measure → new suite + context
  suite; schema/example/GUI → new suite + GUI suite; PROTOCOLS → context
  suite (byte caps).

## Hosts, credentials, DB

None. Local CLI scripts only; no servers, ports, credentials, migrations, or
seed datasets. API contracts, RBAC, tenancy: N/A (no endpoints, no tenant
data). UI/E2E: skipped — no UI surface (`skip-browser` equivalent by stack).

## Feature-quality AC checklist (observable outcomes)

| AC | Observable check |
|----|------------------|
| AC1 | Schema + example expose the map (suite asserts) |
| AC2 | Builder emits 20000 for step 4, 32000 for step 5 (fixture runs) |
| AC3 | Invalid maps fail naming `stepContextBudgets["k"]` (stderr asserts) |
| AC4 | Manifests carry `budgetSource` step/global (audit pass-through assert) |
| AC5 | Oversized mandatory input fails with no output file (fs assert) |
| AC6 | `measure_harness --json` carries per-step rows + rollup (report asserts) |
| AC7 | GUI row bound `-Type json` (script + Test 9 asserts) |
| AC8 | Empty-map vs absent-map prompt bytes identical (equality assert) |

## Defect threshold

Pass: full suite exit 0, sabotage `passed`, mutation `skipped` per policy, no
new failures. Any suite failure or sabotage `failed` → Step 7 failed, hand to
fix mode.

## Mutation

`status: skipped` expected — `defaults.skipMutationTesting: true` and
`verification.mutationTest` empty (both skip rules apply; no engine vendored).

## Regression sabotage

Invert patch flips the builder resolution ternary
(`stepOverride === null ? configured : stepOverride` →
`? stepOverride : configured`) so step overrides are ignored and global
resolves `null`. Expect `npm run test` non-zero under inversion (new suite
catches both halves); helper must restore byte-identical content.
