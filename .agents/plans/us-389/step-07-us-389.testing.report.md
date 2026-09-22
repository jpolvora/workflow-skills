---
slug: us-389
step: 7
workflowId: us-389-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:50:00Z"
endedAt: "2026-09-22T08:55:00Z"
acRefs: []
---
# Testing Report — us-389

## Surface probe

`node .agents/skills/ws-testing/scripts/probe_test_surface.cjs --json` →
`hasTestSurface: true`, alias `backendTest` = `npm run test`. Testing runs.

## Battery

| Test | Command | Exit | Notes |
|------|---------|------|-------|
| Editor unit/regression | `node test/test-powershell-config-editor.js` | 0 | 12/12, incl. Test 12 hub byte-identity |
| Full suite | `npm run test` | 0 | 115/115 + `run-tests: hub config byte-identity verified` |
| Harness clean | `node test/test-harness-clean.js` | 0 | 0 findings |
| Integrity | `npm run generate-integrity` / `npm run verify-integrity` | 0 / 0 | manifest matches tree |

Full-suite evidence is the pinned Step 5 run on commit `3382da8a`; no product
file changed after it (verification manifest `filesHash` unchanged), so the alias
result is reused per the manifest contract. The editor regression test was
re-executed fresh for this step.

## Mutation / sabotage

`verification.mutationTest` is unset and `defaults.skipMutationTesting` is `true`,
so the mutation substep is skipped (logged). The ledger rows carry
`sabotage: not-required`; no sabotage gate blocks advance.

## Coverage of ACs

| AC | Test evidence |
|----|---------------|
| AC1 | Test 4/6/7 explicit `-ConfigPath`; hub hash asserted after bat invocation |
| AC2 | Test 4 no-`ConfigPath` probe (no mutation, no `.bak`) + editor guard |
| AC3 | `run-tests.cjs` pre/post hub snapshot |
| AC4 | `finally` backup cleanup in Test 5 and Test 10 |
| AC5 | interactive fallback exercised by the no-`ConfigPath` probe (resolves hub, no write) |
| AC6 | Test 12 + runner assertion |
| AC7 | full suite + harness clean |

## Verdict

Green. No defect; advance to Step 8.
