---
step: 7
slug: us-508
workflowId: us-508-20261013T005850Z
status: completed
startedAt: "2026-10-13T01:33:32.520Z"
endedAt: "2026-10-13T01:33:32.520Z"
acRefs: []
---
# Testing report — us-508

## Results (observed)

| Command | Result |
|---------|--------|
| `node test/test-check-workflows-global-root.js` | exit 0 — `PASS: ... us-504 AC1-AC5, NS1-NS3; us-508 AC1-AC13, NS1-NS10` |
| `npm run test` | exit 0 — `run-tests: all 164 entries passed (mode=local)`; hub config byte-identity verified |
| `node test/test-harness-clean.js` | exit 0 — `Harness OK (upstream clean) — 0 findings` |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | exit 0 — `Found 0 issue(s)` |

## Coverage of the change

- Root resolution precedence (explicit / consumer-checkout / install-root /
  cwd-fallback) and install-parent exclusion — covered by the extended suite.
- Dependency-parity reporting (`checked` / `skipped` + missing path / CRITICAL on
  a package root) — covered.
- `--json` diagnostics and markdown "Resolved Root & Repo-level Checks" — covered.
- Regression-locked us-504 anchors (both `--repo-root` forms, loud exit 2,
  copied global tree PASS) — covered.

## Mutation status

Skipped by configuration (`skipMutationTesting: true`; no `mutationTest` command).

## Verdict

Testing PASS. No failing test, no uncovered AC.
