---
step: 5
slug: us-415-416-script-ux-golden-path
workflowId: us-415-416-script-ux-golden-path-20260924T190500Z
status: completed
startedAt: "2026-09-24T19:05:00.000Z"
endedAt: "2026-09-24T19:55:00.000Z"
acRefs: []
---
# Check-implementation report — us-415-416-script-ux-golden-path

Evaluated implementation vs `step-00` spec (10 ACs) and the Step 1 plan (T1-T8).
Overall score: **10/10**. No scoreAndRefine round needed (score >= minVerifyScore 9).

## Per-AC verdict

| AC | Verdict | Evidence |
|----|---------|----------|
| AC1 | Implemented | `ledgerHelpText()` in `ac_ledger.cjs` covers all six subcommands with flags + example; `score --help` / `link --help` smoke-tested exit 0 |
| AC2 | Implemented | `updateHelpText()` in `workflow_state.cjs` covers dispatch/finish/finish-batch/bypass (+ checkpoint/pause-turn); `finish --help` smoke-tested |
| AC3 | Implemented | Help states `--ledger` requirement, boundary labels, score-persists vs verify-dry-run, and full `link` flag set; dry-run property proven by byte-identical snapshot test |
| AC4 | Implemented | `deficiencies[]` in `scoreLedger` result covers files/tests/tasks/NS rows plus cap summaries; carried in `verify`/`score` stdout, `report`, and `scoreState` |
| AC5 | Implemented | Boundary error names expected label, persisted-vs-derived values, differing fields, and the exact repair invocation |
| AC6 | Implemented | Phantom `finish` throws before any write (exit 1, no `ok: true`, revision unchanged); reproduced pre-fix (`ok: true` + revision +1 + exit 0) and post-fix live |
| AC7 | Implemented | `gates.md` golden-path table for all standard + lite boundaries; pointers in standard `STEP-DISPATCH.md` and lite `SKILL.md`; portable prose (no tracker numbers) |
| AC8 | Implemented | Scratch-repo walkthrough 12/12 checks on documented commands only, zero hand-edits (driver `ws-walkthrough.cjs`, output in step-08 result) |
| AC9 | Implemented | `scoreState.writer` + `ledgerHash` tamper check in pre-advance gates (grandfathered when absent); boundary error names `ac_ledger.cjs score <boundary>`; hand-edit-unsupported prose in `gates.md` + `finish --help` |
| AC10 | Implemented | New suite `test/test-script-ux-golden-path.js` pins help content, deficiencies, boundary error, phantom contract, tamper evidence; registered in `test-suites.json` and green |

## Negative scenarios

- NEG1: covered by suite phantom case (exit != 0, no `ok: true`, revision unchanged).
- NEG2: covered by suite boundary case (names `pre-step6` + repair command).
- NEG3: covered by suite hand-flip case (fails closed naming `ac_ledger.cjs score`).

## Advance recommendation

Advance at 10. G2-code after this step, link the commit SHA, persist `pre-step6`, pre-advance 6.
