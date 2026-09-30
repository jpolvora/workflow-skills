---
slug: per-task-test-adequacy-review
title: Testing plan
status: completed
step: 7
workflowId: per-task-test-adequacy-review-20260930T081414Z
---
## Scope

Unit + regression battery for the per-task Test Adequacy review (recipe + helper + ledger verb + verify note). Surface probe: `hasTestSurface: true` (`backendTest` = `npm run test`).

## Unit & Coverage

- `npm run test` (full local suite, 149 entries incl. `test/test-per-task-adequacy.js`) — must exit 0.
- Focused: `node test/test-per-task-adequacy.js` — must exit 0.
- Coverage tooling: none configured (no coverage alias); touched-file coverage argued by named-block mapping (AC1-AC7 + 4 NS + 3 fix regressions), not a percentage.

## Hosts / Credentials / DB Seeds

N/A — local CLI skill package; no servers, no credentials, no database.

## API Contracts / RBAC / Tenancy

N/A — no endpoints, no auth surface, no tenant data.

## Integration / E2E

- Cross-skill invocation chain: recipe → `check_test_adequacy.cjs` → `ac_ledger.cjs link --adequacy-file` → `score` (exercised end-to-end by this run's own adequacy records T1-T5 + FIX1).
- No UI routes, no translations. Browser: skipped (no UI surface; autoMode).

## Feature-Quality AC Checklist

AC1 binding map validated by helper + tests; AC2 both litmus kinds validated; AC3 orphan remove/remap validated; AC4 re-entry + bound in recipe prose; AC5 link verb + score cap + step-output block validated; AC6 false-positive rejection validated; AC7 fix-mode recipe + record validated. Each maps to observed test blocks, not happy-path-only.

## Defect Threshold

Pass: full suite green AND sabotage bites (red names the regression test) AND restore byte-identical. Any red → `status: failed`, hand to implement fix mode (no product edits in this step).

## Mutation

Skipped: `defaults.skipMutationTesting: true` and `verification.mutationTest` empty (opt-in battery off).

## Regression Sabotage

`run_sabotage.cjs` with caller-authored invert patch neutralizing the AC5 inadequate-adequacy score rule, `--test "npm run test"`, `--paths` = `ac_ledger.cjs` + `bin/skill-integrity.json` (both patched consistently so the inverted tree keeps integrity green and the suite reaches the regression test — avoids the committed-tree vacuous-pass hazard). Expect: non-zero exit, red names `test-per-task-adequacy.js` (`AC5: inadequate adequacy sets knownDefect`), every declared path changes bytes, restore byte-identical. Link helper exit to the ledger.
