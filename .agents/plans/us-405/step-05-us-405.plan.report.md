---
us: us-405
reportDate: "2026-09-22T20:53:59Z"
score: 9
sourcePlans:
  - .agents/plans/us-405/step-01-us-405.plan.md
evalSource: step-00-us-405.spec.md + step-01-us-405.plan.md
workflowId: us-405-20260922T203800Z
boundary: step5
minVerifyScore: 9
step: 5
slug: us-405
status: completed
mode: quick
startedAt: "2026-09-22T20:38:00.000Z"
endedAt: "2026-09-22T20:55:06.931Z"
acRefs: []
---
# Plan Implementation Audit Report — us-405

Score: 9/10 (derived by `ac_ledger.cjs score --boundary step5`; earned 54/60, knownDefect=false, missingEvidence=false, errors=[])

- **Target Plan**: `.agents/plans/us-405/step-01-us-405.plan.md`
- **Spec**: `.agents/plans/us-405/step-00-us-405.spec.md`
- **Date/Time**: 2026-09-22T20:53:59Z
- **Derived ledger score**: 9/10
- **Mode**: quick-score (gate 9 met; no full-matrix escalation)

## Executive Summary

`close-issue` is a required SCM intent on both providers, wired into `ws-ship-pr` Step 7 Merge and STEP-DISPATCH Step 9 after merge. Skip/`--dry-run` and comment-only separation are covered by focused + parity tests. Live `gh issue view 405 --json state` CLOSED check is deferred to ship (AC1 scored as implemented-by-contract).

## Result by Feature

| AC | Status | File evidence | Test evidence (observed, exit 0) |
|----|--------|---------------|----------------------------------|
| AC1 | Implemented (by contract; live close deferred to ship) | `ws-ship-pr/SKILL.md:L102-L103`; `STEP-DISPATCH.md:L56`, `L170` | `close-issue` in `test/test-provider-parity.js` |
| AC2 | Implemented | `scm-provider-contract.md:L36`; GH/ADO `SKILL.md` + `INTENTS.md` close-issue rows/headings | `close-issue` in `test/test-provider-parity.js` |
| AC3 | Implemented | `ws-ship-pr/SKILL.md:L102-L120`; `ensure_pr_closer.cjs:L111-L112` (`Closes #` retained) | `Merge path dispatches close-issue` in `test/test-close-issue.js` |
| AC4 | Implemented | GH/ADO INTENTS comment-only; `tools.md:L79`; `comment_issue.cjs` → `gh issue comment` only | `comment_issue.cjs is comment-only (no issue close)` in `test/test-provider-parity.js` |
| AC5 | Implemented | GH `close_issue.cjs:L108-L122`; ADO `close_issue.cjs:L237-L256` | `GitHub null id skipped` / `GitHub dry-run status` in `test/test-close-issue.js` |
| AC6 | Implemented | Contract + both `close_issue.cjs` | `All provider-parity checks passed` in `test/test-provider-parity.js` |

### AC notes

- **AC1**: Ship/merge prose requires `close-issue` after successful merge when tracker id present. No live `gh issue view 405` CLOSED observation in this Step 5 run; that check is ship-time.
- **AC4**: `rg` on both `comment_issue.cjs` found no `issue close` / `System.State` PATCH; GitHub uses `gh issue comment` only; ADO uses WIT Comments POST only.

## Negative scenarios

| NS | Coverage | Observed test (exit 0) |
|----|----------|------------------------|
| NS1 | Fix present via required `close-issue` intent | `close-issue` / `test-provider-parity.js` |
| NS2 | `--id null` → skipped | `GitHub null id skipped` / `test-close-issue.js` |
| NS3 | `--dry-run` print-only | `GitHub dry-run status` / `test-close-issue.js` |
| NS4 | Mutating ADO close without PAT → non-zero + `validate-auth` | `ADO close without PAT names validate-auth` / `test-close-issue.js` |
| NS5 | Create PR path does not dispatch `close-issue`; Merge does | `Create PR path does not dispatch close-issue` / `test-close-issue.js` |

## Additional Features

None beyond the plan. Focused `test/test-close-issue.js` gained NS4/NS5 assertions during verify so uncovered negatives would not cap the ledger at 8.

## Evaluation Criteria

| Criterion | Evaluation / Status | Notes |
| :--- | :--- | :--- |
| **Completeness** | Pass | AC1–AC6 Implemented with file + observed test evidence |
| **Correctness & Style** | Pass | Node-only `.cjs`; skip/dry-run before mutate; no silent SCM fallback |
| **Testing** | Pass | Focused + parity + full `npm run test` exit 0 |

## Stack Invariant Compliance

- Command: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs`
- Result: exit 0 — `Scanned 83 file(s). Found 0 issue(s) (0 Critical, 0 Warning).`
- Ledger `invariantViolations`: []
- Fable audit: skipped (not requested; `fable.autoAudit` not applied this turn)

## Verification Aliases

| Alias | Command | Exit |
|-------|---------|------|
| backendTest | `npm run test` | 0 (`run-tests: all 125 entries passed`) |
| (requested) | `node test/test-close-issue.js` | 0 |
| (requested) | `node test/test-provider-parity.js` | 0 |

## Contract / path checklist (observed)

| Check | Result |
|-------|--------|
| `scm-provider-contract.md` defines `close-issue` | Yes (L36) |
| GH + ADO `SKILL.md` + `INTENTS.md` | Yes |
| Both `scripts/close_issue.cjs` | Yes |
| `ws-ship-pr` merge path invokes `close-issue` | Yes (Step 7 L102–L103, Dependencies L120) |
| STEP-DISPATCH Step 9 invokes `close-issue` after merge | Yes (L56, L170) |
| `comment_issue.cjs` no issue close / state PATCH | Yes (both providers) |
| `--id null` skip + `--dry-run` | Yes (scripts + tests) |

## Regression Sabotage Check

| Status | skipped |
| Reason | `verification.mutationTest` unset; verification-manifest `sabotage: not-required`; no invert patch required for this Step 5 |
| Evidence | N/A |

## Gaps and Next Steps

- **Ship-time only**: run `gh issue view 405 --json state` after a merged delivery on non-default `baseBranch` to observe CLOSED (AC1 live telemetry). Not a Step 5 blocker.
- No score gaps below `minVerifyScore: 9`.
- Proceed to Step 6 review; orchestrator owns `update_state finish --step 5 --verification-score 9`.

## Recommendation

- [ ] **SCORE AND REFINE**: Score < defaults.minVerifyScore (default 9). Re-implement flagged tasks and re-verify until >= defaults.minVerifyScore (default 9).
- [x] **APPROVE & COMMIT**: Score >= defaults.minVerifyScore (default 9). Proceed to code review and commit.

### Details / Feedback

No product fixes required for Step 5. Report-only except a small NS4/NS5 assertion addition in `test/test-close-issue.js` so negative coverage would not fail-close the ledger.

The orchestrator owns any later path-scoped commit. This verifier never stages or commits files.
