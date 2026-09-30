---
step: 7
slug: us-461
workflowId: wf-us-461
status: completed
startedAt: "2026-09-29T19:45:02Z"
endedAt: "2026-09-29T20:25:00Z"
acRefs: []
---
# Testing plan — us-461

Probe: `hasTestSurface: true` (`backendTest` = `npm run test`). Step 7 runs; not skipped.

## Battery

1. Full suite (`npm run test`) — non-regression gate, must be 145/145.
2. `node test/test-kanvas-spec-viewer.js` — V1–V7 direct.
3. `node test/test-kanvas-board.js` + `node test/test-kanvas-drag-drop.js` — AC6/NS6.
4. `scan_stack_invariants.cjs --stack node-skills-package` — 0 findings.
5. `npm run verify-integrity` — matches tree.
6. AC6 allowlist: `git diff 6b5cf76f...HEAD --name-only` ⊆ {board.html, server.cjs, collect.cjs,
   test-kanvas-spec-viewer.js, test-suites.json, skill-integrity.json}.
7. AC7 guard: `git diff 6b5cf76f...HEAD -- package.json` empty of dependency changes.

Mutation: skipped (`defaults.skipMutationTesting: true`, `verification.mutationTest` unset).
Regression sabotage: skipped — new assertions are covered by direct negative batteries (V3/V5)
rather than caller-authored invert patches.
