---
slug: per-task-test-adequacy-review
title: Testing report
status: completed
step: 7
workflowId: per-task-test-adequacy-review-20260930T081414Z
verdict: pass
startedAt: "2026-09-30T08:14:18.000Z"
endedAt: "2026-09-30T09:06:58.317Z"
acRefs: []
---
## Results

- **Base build / unit suite**: `npm run test` — all 149 entries passed (mode=local), exit 0. Hub config byte-identity verified (no mutation). Focused `node test/test-per-task-adequacy.js` — exit 0.
- **Coverage**: no coverage alias configured; touched-file coverage argued by named-block mapping — AC1-AC7, 4/4 negative scenarios, 3/3 fix regressions — all observed green.
- **DB seeds / API / RBAC / tenancy**: N/A (local CLI skill package; no servers, credentials, or datastore).
- **UI/E2E + accessibility/contrast**: skipped — no UI surface (no forms, validation errors, or alert indicators exist in this change).

## Mutation

Skipped: `defaults.skipMutationTesting: true` and `verification.mutationTest` empty (opt-in battery off). No mutants generated; no threshold applies.

## Regression Sabotage

Passed (real bite, not a gate trip):

- Helper: `run_sabotage.cjs --test "npm run test" --paths ac_ledger.cjs bin/skill-integrity.json --invert-patch invert-ac5.patch` → `status: passed`, `testExitCode: 1`, `restored: true`, exit 0.
- Invert patch (caller-authored, 2805 bytes): neutralizes the inadequate-adequacy score rule AND carries matching integrity digests, so the inverted tree stays self-consistent and the suite reaches the regression test (avoids the committed-tree vacuous-pass hazard).
- Bite location verified by a captured focused run on the inverted tree: both declared paths changed bytes; `test-per-task-adequacy.js` exit 1 naming `AC5: inadequate adequacy sets knownDefect`; restore verified byte-identical (sha match); post-restore full suite green.
- Ledger: `--sabotage-exit 0` linked to AC5 (event `testing-sabotage`).

## Verdict

Pass: unit suite green, sabotage bites with byte-identical restore, mutation skipped per policy, no failures to hand off. Advance to Step 8.
