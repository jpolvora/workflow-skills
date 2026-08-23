---
slug: us-235
step: 7
workflowId: us-235-20260823T151631Z
status: active
startedAt: "2026-08-23T16:08:00Z"
planSource: .agents/plans/us-235/step-02-us-235.plan.refined.md
specSource: .agents/plans/us-235/step-00-us-235.spec.md
skipBrowser: true
---

# Step 7 Testing Plan — us-235

## Scope and pass criteria

US-235 unblocks `ws-spec-to-pr` scoreAndRefine pre-advance 5→6: underscore verification keys excluded from required aliases; `skipReason` observation without `knownDefect`/8-cap; `.runtime` allowlist for `*.cjs`/`*.patch`/`*.md`; frontmatter-only `stateSha256`; repeatable `finish --commit`. Pass requires:

1. `verification.backendTest` (`npm run test`) exits 0
2. Focused regression files for AC1–AC15 exit 0
3. Regression sabotage proven (Step 5 evidence or re-run)
4. Mutation skipped per config (log only)
5. No browser/API/DB/frontend surfaces (`skip-browser: true`)

## Test matrix

| Area | Command | Expected | AC / note |
|------|---------|----------|-----------|
| Full install suite | `npm run test` | Exit 0 | `verification.backendTest`; includes integrity Phase 0b |
| Integrity verify | `npm run verify-integrity` | Exit 0 | Prerequisite for install suite |
| Focused ledger + state | `node --test test/test-ac-ledger.js test/test-workflow-state-contract.js` | Exit 0 | AC1–AC15 feature assertions |
| Harness efficiency | `npm run tests:harness-efficiency` | Exit 0 | Chained harness tests after install prerequisites |
| Regression sabotage | Step 5 evidence or `python .agents/skills/ws-testing/scripts/run_sabotage.py` | Invert non-zero + restore | AC14/AC15 when mutation skipped |
| Mutation | `verification.mutationTest` | Skipped | `mutationTest` empty + `defaults.skipMutationTesting: true` |

## Feature-quality AC checklist (observable)

| AC | Observable check | Test file |
|----|------------------|-----------|
| AC1 | `_comment_*` keys never required; errors cite real aliases only | `test-ac-ledger.js` — `comment key is not a required alias` |
| AC2 | `config.json.example` has no `verification._comment_mutationTest` | `test-ac-ledger.js` — example config assertion |
| AC3 | `skipReason` enum validated at `link` | `test-ac-ledger.js` — invalid skip rejected |
| AC4 | Skipped alias counts as observed | `test-ac-ledger.js` — `skipped backendFormat is observed` |
| AC5 | Skip does not set `knownDefect` or cap at 8 | `test-ac-ledger.js` — `skip does not set knownDefect` |
| AC6 | `baseline-dirty` on `backendFormat` accepted | `test-ac-ledger.js` — non-zero exit skip path |
| AC7 | Missing required alias blocks pre-advance 6 | `test-workflow-state-contract.js` |
| AC8 | Score ≥9 + observed/skipped aliases pass pre-advance 6 | `test-workflow-state-contract.js` |
| AC9 | `.runtime` allows `cjs`/`patch`/`md`; unknown ext fails | `test-workflow-state-contract.js` |
| AC10 | `stateSha256` from frontmatter only | `test-workflow-state-contract.js` |
| AC11 | Gate history append does not break hash | `test-workflow-state-contract.js` |
| AC12 | `finish --commit` writes `state.commits` | `test-workflow-state-contract.js` |
| AC13 | Duplicate SHA not appended | `test-workflow-state-contract.js` |
| AC14 | Tests fail if comment key treated as alias | sabotage + ledger tests |
| AC15 | Pre-advance 6 with score 9 + `baseline-dirty` skip | `test-workflow-state-contract.js` |

## Mutation testing

**Skipped.** Reasons:

- `defaults.skipMutationTesting: true`
- `verification.mutationTest` empty/unset

## Regression sabotage (mutation skipped)

Re-use Step 5 evidence when available:

- Patch: `.agents/plans/us-235/.runtime/invert-underscore-filter.patch` (inverts `!/^_/.test(key)` → `/^_/.test(key)`)
- Report: `.agents/plans/us-235/step-05-us-235.plan.report.md` § Regression Sabotage Check

Optional re-run: `python .agents/skills/ws-testing/scripts/run_sabotage.py` with `--test "npm run test"` alias `backendTest`.

## Non-applicable surfaces

| Surface | Status | Reason |
|---------|--------|--------|
| Browser / UI / E2E | skipped | `skip-browser: true`; `stack.frontend.framework: none` |
| API / integration hosts | N/A | No `apiHost` / `devHost` |
| Database / seeds / migrations | N/A | `stack.database.type: none` |
| RBAC / tenancy / i18n | N/A | Local Node CLIs only |
| `verification.backendBuild` | N/A | Empty in config |
| Form-error accessibility | N/A | No interactive forms |

## Defect threshold

- `npm run test` non-zero → Step 7 **failed**; hand off to implement fix loop
- Stale `bin/skill-integrity.json` without regenerate → **failed** (plan Step I obligation)
- Focused AC tests non-zero → **failed**
- Sabotage restore failure → **failed**
- Do not edit product files in this step unless reporting failures for orch fix
