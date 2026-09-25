---
step: 5
slug: us-414-run-state-integrity
workflowId: us-414-run-state-integrity-20260924T170500Z
status: completed
verificationScore: 10
scoreBoundary: step5
startedAt: "2026-09-24T21:31:28.321Z"
endedAt: "2026-09-24T21:31:28.321Z"
acRefs: []
---
# Check-implementation report — us-414-run-state-integrity

Verifier: worker self-verify (Step 5, product-tree readonly for scoring;
`ac_ledger` link/verify/score are the sanctioned writers).

## Score

`ac_ledger verify --boundary step5`: score 10, earnedUnits 70/70,
`knownDefect: false`, `missingEvidence: false`, `deficiencies: []`, `errors: []`.
Gate: `defaults.minVerifyScore` = 9 → 10 >= 9, advance allowed (no scoreAndRefine;
`scoreAndRefine: false` in config).

Note: initial dry-run verify scored 9 with
`errors: ["configured verification alias lacks observed result: backendTest"]`
because the full `npm run test` had not yet been recorded. After the green full
suite (131/131 entries, `run-tests: all 131 entries passed (mode=local)`), the
alias result was linked (`ev-alias-backendtest`,
`alias=backendTest,command=npm run test,exitCode=0`) and `verify` exits 0.
`finish --step 5 --verification-score 10` persists the score.

## Red-before-green (DoR failure modes)

`test/test-run-state-integrity.js` run before the fix: 13 failures covering
NEG1 (silent unknown-preset dispatch), NEG2 (`prNumber`/`prUrl` swallowed),
NEG3 (`check_fixpr_rounds.cjs` absent), AC2 preset-name recording, and the AC5
dispatch `--reason dag` hole. After the fix: all green (exit 0).

## Per-AC verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 fail-closed preset | Implemented | `workflow_state.cjs:L1272-L1308,L1578-L1589,L1606-L1612`; `setup.md:L71`; tests: unknown dispatch/`--preset` fail naming preset + available; no cross-preset model |
| AC2 resolved model ids | Implemented | `workflow_state.cjs:L1310-L1317,L1474-L1478,L1805-L1806`; dispatch + finish record ids |
| AC3 ship writeback | Implemented | `workflow_state.cjs:L819-L830,L2317,L2323`; schema `L14-L27`; `STEP-DISPATCH.md:L159,L177`; `prNumber`/`prUrl` persist; bad status fails |
| AC4 round artifacts or reason | Implemented | `check_fixpr_rounds.cjs:L1-L70`; `ws-goal-fix-pr/SKILL.md:L89,L116`; empty dir fails, round file passes, reasoned marker passes, bare marker fails |
| AC5 truthful skip | Implemented | `workflow_state.cjs:L1586-L1588,L1784,L1926`; bare `dag` fails on finish/dispatch/bypass; `dag-disabled` accepted |
| AC6 provenance | Implemented (document) | `STEP-DISPATCH.md:L196` mapping note; host side cannot report subagents, so documentation is the landing zone per spec |
| AC7 green suites + pins | Implemented | `test-run-state-integrity.js` green; preset/provenance/state-contract/script-ux/terminal-close/update-yaml/coordinator/liveness/enable-dag suites green; `npm run test` exit TBD below |

## Full-suite evidence

`npm run test` exit 0 (131/131 local entries); `ws-check-harness` outcome
recorded at Step 7 testing (final numbers there).

## Advance recommendation

Advance to Step 6 when `npm run test` + harness are green and score persists at
the `pre-step6` boundary after the G2 product commit.
