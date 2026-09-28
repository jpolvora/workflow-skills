---
slug: us-440
step: 7
status: completed
workflowId: us-440-20260927T162130Z
acRefs: []
startedAt: "2026-09-27T16:21:30Z"
endedAt: "2026-09-27T16:43:09.004Z"
---
# Testing Report — us-440

**Result: PASS** — all batteries green; no regressions.

## Battery results

| # | Command | Exit | Evidence |
|---|---------|------|----------|
| 1 | `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs` | 0 | `check_skill_load: OK (157 skill docs)` |
| 2 | `node .agents/skills/ws-check-harness/scripts/check_duplicates.cjs` | 0 | `No duplicated normative blocks.` |
| 3 | `node test/test-harness-clean.js` | 0 | `Harness OK (upstream clean) — 0 findings.` |
| 4 | `npm run test` (`node test/run-tests.cjs`) | 0 | `run-tests: all 138 entries passed (mode=local)` |
| 5 | `npm run verify-integrity` | 0 | `OK: bin\skill-integrity.json matches tree (v0.5.5)` |
| 6 | `rg -c "\{skillLoader\}"` over the 6 converted files | 0 | 6/6 files carry the token |
| 7 | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 | 26 files scanned, 0 issues |

## `ws-check-harness` Phases 0–5c (individual gates)

| Gate | Exit |
|------|------|
| `detect_install_mode.cjs` | 0 (upstream) |
| `check_duplicates.cjs` | 0 |
| `measure_harness.cjs` | 0 (10 blocking gates) |
| `check_shell_quoting.cjs` | 0 (309 files) |
| `check_pipeline_handoff.cjs` | 0 (11 skills) |
| `check_unique_runtime.cjs` | 0 (no `.py`/`.pyc` under `.agents/skills` or `bin/`) |
| `check_harness_links.cjs` | 0 |
| `check_hub_separation.cjs` | 0 (hub separation clean) |
| `check_skill_load.cjs` | 0 (157 skill docs) |
| `check_git_ownership.cjs` | 0 (158 docs, 131 scripts) |

**0 findings** at the package root.

## Mutation testing

Not configured (`skipMutationTesting: true`, empty `verification.mutationTest`); regression sabotage not armed.

## Coverage / quality notes

- No runtime surface → no unit/integration/E2E delta.
- The functional change is prose-only; the meaningful regression guards are the Phase 5a gates (raw-load recipe detection, normative duplication) and the version/integrity/hub tests inside `npm run test`.
- Idempotency: re-running items 1–5 produces identical results (no state mutation, no byte-identity drift reported by `run-tests`).

## Learning

`Learning: N/A (no new project knowledge)` — no new trap; battery reused existing gates.
