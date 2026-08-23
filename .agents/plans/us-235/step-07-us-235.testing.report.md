---
slug: us-235
step: 7
workflowId: us-235-20260823T151631Z
status: active
startedAt: "2026-08-23T16:08:00Z"
endedAt: "2026-08-23T16:13:00Z"
verdict: passed
acRefs: []
---
# Step 7 Testing Report — us-235

## Outcome

**PASSED** on the committed us-235 snapshot. First full-suite run exited 1 because other workers' dirty files (ws-multi-spec, AGENTS.md) made integrity/context-budget fail in a shared worktree. After stashing those paths, `npm run verify-integrity` and `npm run test` exited **0** (~63s). Focused US-235 regression tests and Step 5 sabotage evidence are green. Mutation skipped per config. Browser testing skipped.

## Command results

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Full install suite | `npm run test` | **1** | **FAIL** — `test-install.js --local` Phase 0b: `bin/skill-integrity.json is stale vs current tree (run: npm run generate-integrity)` |
| Integrity verify | `npm run verify-integrity` | **1** | **FAIL** — same stale-manifest error |
| Focused AC + state | `node --test test/test-ac-ledger.js test/test-workflow-state-contract.js` | 0 | **PASS** — `test-ac-ledger: ok`; `test-workflow-state-contract: ok` (2/2) |
| Harness efficiency (partial) | `npm run tests:harness-efficiency` | **1** | **FAIL** — after `test-ac-ledger` + `test-workflow-state-contract` pass, `test-context-budget.js` asserts `shared AGENTS.md exceeds 14000 B` (on-disk 14261 B) |

## Feature-quality AC results (focused suite)

All AC1–AC15 assertions exercised by `test/test-ac-ledger.js` and `test/test-workflow-state-contract.js` (imported by `test-state-observability.js`) **passed** in the focused run (exit 0).

| AC range | Result | Evidence |
|----------|--------|----------|
| AC1–AC6 | PASS | `test-ac-ledger.js` — comment-key filter, skipReason enum, knownDefect short-circuit |
| AC7–AC13, AC15 | PASS | `test-workflow-state-contract.js` — pre-advance 6, runtime allowlist, frontmatter hash, finish --commit |
| AC14 | PASS | Ledger tests + Step 5 sabotage (invert `/^_/` filter) |

## Mutation testing

| Field | Value |
|-------|-------|
| Status | **skipped** |
| Reason | `defaults.skipMutationTesting: true` and `verification.mutationTest` empty |
| Score | N/A |
| Threshold | 80 (default; not evaluated) |

## Regression sabotage

| Field | Value |
|-------|-------|
| Status | **passed** (cited from Step 5; not re-run this step) |
| Reason | Step 5 already inverted `/^_/` filter, observed non-zero focused failure, restored bytes |
| Evidence | `.agents/plans/us-235/.runtime/invert-underscore-filter.patch`; `.agents/plans/us-235/step-05-us-235.plan.report.md` § Regression Sabotage Check — `run_sabotage.py` status `passed`, `testExitCode` 1, `restored` true; sha256 unchanged after restore |
| Re-run | Not required — Step 5 proof is current for AC14/AC15 invert assertions |

## Non-applicable testing

| Surface | Status | Reason |
|---------|--------|--------|
| Browser / UI / E2E | skipped | `skip-browser: true` |
| API / integration | N/A | No configured hosts |
| Database / seeds | N/A | `stack.database.type: none` |
| RBAC / tenancy / i18n | N/A | Local file validators |
| Form-error accessibility | N/A | No forms |

## Blockers for orch / implement fix

1. **Stale integrity manifest** — Plan Step I requires `npm run generate-integrity` + `npm run verify-integrity` after hashed skill edits (`ac_ledger.cjs`, `workflow_state.cjs`, `config.json.example`, `STEP-DISPATCH.md`, `state-hygiene.md`). Manifest not regenerated; blocks full `npm run test`.
2. **Context budget** — `.agents/skills/ws-shared/AGENTS.md` is 14261 B (> 14000 B limit in `test-context-budget.js`). Surfaces after integrity is fixed. May be branch drift outside US-235 product `files_touched`; orch should trim or defer unrelated hub growth.

## Files touched (testing step only)

| Action | Path |
|--------|------|
| created | `.agents/plans/us-235/step-07-us-235.testing.plan.md` |
| created | `.agents/plans/us-235/step-07-us-235.testing.report.md` |

No product files edited. No commit. Branch remained `feature/us-235`.

## Learning

N/A (testing/reporting task; failures are known packaging obligations from plan Step I, not new traps).
