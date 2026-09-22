---
slug: us-405
step: 7
workflowId: us-405-20260922T203800Z
status: completed
startedAt: "2026-09-22T20:58:00Z"
endedAt: "2026-09-22T21:00:00Z"
acRefs: []
---
# Testing Report — us-405 (Step 7)

## Surface probe

`node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json` → exit **0**

- `hasTestSurface`: **true**
- `aliases[0]`: `backendTest` = `npm run test`
- `skipReason`: null

## Focused battery (orchestrator-directed)

| Test | Command | Exit | Result |
|------|---------|------|--------|
| Close-issue skip/dry-run | `node test/test-close-issue.js` | **0** | `All close-issue skip/dry-run checks passed.` |
| Provider parity | `node test/test-provider-parity.js` | **0** | `All provider-parity checks passed.` (incl. `close-issue` intent on GH + ADO, null-id skip, dry-run, comment-only separation) |
| Test surface probe | `node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json` | **0** | `hasTestSurface: true` |

Full `npm run test` was **not** re-run this step; Step 5 verify reported `npm run test` exit 0 on the same focused suites plus full battery.

## Mutation

**status: skipped**

- `defaults.skipMutationTesting`: **true**
- `verification.mutationTest`: unset (empty)

## Regression sabotage

**status: skipped**

- Reason: mutation substep skipped per config; focused Step 7 battery is contract/dry-run only (no new assertion invert gate requested).

## AC coverage (observed fixtures)

| AC | Test evidence |
|----|---------------|
| AC1 | Live `gh issue view 405` CLOSED deferred to ship; contract + merge-path dispatch covered in `test-close-issue.js` |
| AC2 | `close-issue` required intent on GH + ADO in `test-provider-parity.js` |
| AC3 | Merge path dispatches `close-issue`; Create PR path does not (`test-close-issue.js`) |
| AC4 | `comment_issue.cjs is comment-only (no issue close)` in `test-provider-parity.js` |
| AC5 | Null-id skip + dry-run in both focused suites |
| AC6 | `All provider-parity checks passed` |

## Accessibility / UI

N/A — harness/provider script change; no browser or form surface.

## Verdict

**PASS** — all focused commands exit 0. Advance to Step 8.
