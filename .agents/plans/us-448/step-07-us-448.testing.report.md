---
step: 7
slug: us-448
workflowId: us-448-20260928T011143Z
status: completed
startedAt: "2026-09-28T01:11:43Z"
endedAt: "2026-09-28T01:38:10.204Z"
acRefs: []
---
# us-448 — Testing Report

## Passed

- `npm run test`: all 139 entries passed.
- Targeted layout and compatibility tests: all passed.
- `node --check` on all modified CommonJS scripts: passed.
- Harness cleanliness and duplicate checks: 0 findings.
- `npm run verify-integrity`: passed for package version 0.5.9.
- TypeScript/Node stack invariant scan: 0 issues.
- Linter diagnostics: none.

## Coverage

The tests cover canonical per-run state directories, distinct run isolation,
legacy flat-state compatibility, custom plan roots, traversal rejection,
normal `ws-spec-multi` child slugs, monitor discovery, and
`missing-child-state`.
