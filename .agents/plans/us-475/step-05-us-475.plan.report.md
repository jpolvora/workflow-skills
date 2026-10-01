---
step: 5
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Check-implementation report — executable foreign-commit guard
startedAt: "2026-09-30T20:30:00Z"
endedAt: "2026-09-30T20:35:00Z"
---
# Check-implementation — us-475

Verification aliases: `backendTest` = `npm run test` → **exit 0** (155/155 entries passed,
including the new `test/test-foreign-commit-guard.js`). `node --check` on the new guard → exit 0.

## AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `foreign_commit_guard.cjs:141` `recordBaseline` captures local (`refs/heads/{branch}`) and `origin/{branch}` tips and upserts `{slug, localTip, remoteTip, recordedAt}` in `foreign-commits.json`. Test `testRecordsBaselineLocalAndRemoteTips`. |
| AC2 | Implemented | `foreign_commit_guard.cjs:177-216` `checkAdvance` compares the recorded pair to the live tips and exits 1 naming each new commit (`git log --reverse --format=%H%x09%h%x09%s`). Test `testAdvanceNamesNewCommits`. |
| AC3 | Implemented | `PROTOCOL.md` Phase 4 foreign-commit bullet offers **Resume (Recommended)** / **Skip** / **Abort run** on exit 1. Test `testDocOffersResumeSkipAbort`. |
| AC4 | Implemented | `foreign_commit_guard.cjs:237-267` `checkConvergence` normalizes both refs with `git rev-parse` and exits 0 when the PR head equals the local tip. Test `testConvergencePassesOnEqualHead`. |
| AC5 | Implemented | Same command exits 1 with both full heads when they differ. Test `testConvergenceRefusesOnMismatch`. |
| AC6 | Implemented | `foreign_commit_guard.cjs:271-317` `listForeign` lists `base..head` minus `--own` and emits a `### Foreign commits in range` markdown block; `PROTOCOL.md` Phase 4b injects it into the PR body and audit notes; `ws-ship-pr` § Shared-head includes a supplied block. Test `testListForeignExcludesOwnCommits`. |
| AC7 | Implemented | `checkAdvance` returns exit 0 `advanced:false` with no new commits and no state write on unchanged tips; the guard adds no gate to the quiet path. Test `testQuietAdvanceNoGate`. |

## Negative & failing test scenarios

| NS | Verdict | Evidence |
|----|---------|----------|
| NS1 | Implemented | A commit landing between dispatches makes `check-advance` exit non-zero and name it (`testAdvanceNamesNewCommits`). |
| NS2 | Implemented | A PR head differing from the local tip makes `check-convergence` exit non-zero and name both heads (`testConvergenceRefusesOnMismatch`). |
| NS3 | Implemented | A foreign-commit-free sequential run stays exit 0 with no pause/refusal/gate (`testQuietAdvanceNoGate`). |

## Stack & security invariants

- Node-only `.cjs`, `node --check` clean; no `.py` added.
- Git-read-only: only `rev-parse` / `log` argv verbs; asserted by the test scan.
- Only write is the run-dir baseline sidecar; no product-path mutation.
- Fail-closed exits for unexpected advance (1), mismatch (1), missing baseline (2).

## Residual risk

The guard's foreign set depends on the master supplying `--own` (aggregated child commit SHAs).
With an empty own set it over-reports rather than hides commits — the conservative direction.
