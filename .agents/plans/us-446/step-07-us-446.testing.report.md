---
slug: us-446
step: 7
workflowId: us-446-20260928T021400Z
status: completed
startedAt: "2026-09-28T02:39:00Z"
endedAt: "2026-09-28T02:39:00Z"
acRefs: []
---
# Testing Report — us-446

## Results

| Check | Result | Evidence |
|---|---|---|
| Targeted empty-alias regression | Passed | `node test/test-ship-verify-empty-aliases.js`, exit 0 |
| Existing verify regression | Passed | `node test/test-ship-verify-line-endings.js`, exit 0 |
| Syntax checks | Passed | `node --check` on `verify.cjs` and the new test, exit 0 |
| Stack invariant scan | Passed | 0 issues, 0 Critical, 0 Warning |
| Integrity | Passed | `npm run verify-integrity`, exit 0 |
| Full suite | Passed | `npm run test`, 140/140 entries passed; hub config byte identity verified |
| Regression sabotage | Passed | Inverted normalization caused `npm run test` to fail with exit 1; original bytes restored |
| Browser / integration | Skipped | No browser, service, database, or frontend application surface |

## Acceptance coverage

All six acceptance criteria and all three negative scenarios have observed ledger evidence. No test or review fix was required after the product commit.

## Result

**PASS.**
