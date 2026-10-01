---
step: 6
slug: us-474
workflowId: us-474-20260930T192724Z
status: completed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7]
---

# Fresh-worker verification — us-474 (Step 6b)

Fresh re-derivation of every AC verdict from `step-00-us-474.spec.md` (independent of the review report), plus one fault injection per AC on the committed tree. Method: apply a targeted mutation to the shipped helper, run `node test/test-spec-index-filing.js`, require a non-zero exit, then `git checkout --` restore (verified byte-identical).

## Fault injections

| AC | Injected fault | Test exit | Killed | Restored |
|----|----------------|-----------|--------|----------|
| AC1+AC2 | `fileViaOrganizer` returns `[]` (filing disabled) | 1 | yes | yes |
| AC3 | catch returns `synced` instead of `outstanding` | 1 | yes | yes |
| AC4+AC5 | close verify ignores the `pending/` location | 1 | yes | yes |
| AC6 | harness gate always returns `ok:true` | 1 | yes | yes |
| AC7 | Done-log idempotency guard removed (duplicate row) | 1 | yes | yes |

## Verdicts (evidence-or-zero)

| AC | Verdict | Independent evidence |
|----|---------|----------------------|
| AC1 | VERIFIED | `testSyncFilesSpecAndSidecarsToCompleted`: spec + `.context.md` + `.assets/` present under `completed/`, absent under `pending/` |
| AC2 | VERIFIED | same test asserts the `spec:` ref rewritten to `completed/0005-us-474.spec.md` |
| AC3 | VERIFIED | `testSyncReportsOutstandingWhenFilingFails`: exit 2, `filingOutstanding:true`, stale path; index byte-unchanged |
| AC4 | VERIFIED | `testCloseVerifyFailsClosedOnPendingSpec`: exit 2 with `ok:false` |
| AC5 | VERIFIED | same test: stderr names `pending/0005-us-474.spec.md` |
| AC6 | VERIFIED | `testHarnessFlagsDoneRowWithPendingRef`: exit 1 finding on pending ref, exit 0 on clean board; repo gate 0 findings |
| AC7 | VERIFIED | `testSyncQuietWhenAlreadyFiled`: index unchanged, no move, close verify exit 0 |

## Notes

- Scratch surface was the working tree (all mutations reverted; `git status` clean of product edits afterward).
- No residual defects; no fix loop needed. Advance to Step 7.
