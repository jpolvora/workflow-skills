---
step: 7
slug: step-baton-multi-agent-runs
workflowId: step-baton-multi-agent-runs-20260918T232508Z
status: completed
verdict: pass
startedAt: "2026-09-18T23:25:08Z"
endedAt: "2026-09-19T00:29:00Z"
acRefs: []
---
# Testing Report — step-baton-multi-agent-runs (Step 7)

Verdict: **PASS** — 6/6 focused suites green, full `backendTest` green
(exit 0), regression sabotage `passed` with byte-identical restore, mutation
`skipped` per policy. No code fixes made (none needed); no product or test
files modified by this step.

Memory consult: vault search 0 hits; local MEMORY 1 relevant trap folded
(sabotage artifacts out of `{us-dir}/.runtime/` — invert patch kept at
`/tmp/step7-invert.patch`). No new trap (standard run, <2 failures).
Learning: N/A (standard implementation).

## Base build (Step 2)

- `backendBuild`: empty — no build gate. `frontendBuild`/`frontendTest`: empty.
- `backendTest` (`npm run test`): exit 0, 2026-09-19T00:25:23Z–00:27:21Z,
  122 `PASS` lines, no failures (all `fail*` log lines are passing
  negative-assertion names, e.g. fail-fast / failure-telemetry cases).
- Env: bare env lacks `python` (only `python3`); ran with existing
  `/tmp/py-shim/python -> python3` on PATH. No product edits. `npm pack`
  tarball residue from the run removed afterward.

## Unit tests (Step 3)

| Suite | ACs / NS | Timestamp (UTC) | Exit |
|-------|----------|-----------------|------|
| `test/test-step-baton-config.js` | AC1–AC4, NS4 | 00:25:04 | 0 |
| `test/test-step-baton-claim.js` | AC5, AC6, AC8; NS1, NS7 | 00:25:04 | 0 |
| `test/test-step-coordinator.js` | AC7, AC9–AC14; NS2, NS3, NS5, NS6 | 00:25:05 | 0 |
| `test/test-step-baton-telemetry.js` | AC15 | 00:25:15 | 0 |
| `test/test-step-baton-monitor.js` | AC16 | 00:25:15 | 0 |
| `test/test-step-baton-specmemo.js` | AC17 | 00:25:16 | 0 |

All six also PASS inside the full `npm run test` chain. No coverage gaps vs
changed files: every new/edited product file has a targeting suite. No
standalone coverage tool is configured (no c8/nyc); signal is suite pass +
AC/NS mapping.

## DB seeds (Step 4)

N/A — `database.type: none`, no migrations, no seeds, no rollback surface.
State isolation (`workflowId` + branch) exercised by temp-fixture tests.

## API / integration checks (Step 5)

No HTTP surface (no `apiHost`/`devHost`; plan §6.1 grep-verified), so no
curl probes. Contract surface is CLI/file and is asserted green by suite:

- Dual-write claim/release in `.state.json` + `.state.md` (claim suite).
- Coordinator subprocess loop: stub workers, timeout kill + reaping,
  external advancement, exit-code contract (coordinator suite).
- `telemetry.jsonl` full-envelope lines validate against extended schema
  (telemetry suite); monitor snapshot read-only with zero writes (monitor
  suite); vault-call counting on/off (specmemo suite).

## UI / E2E validation (Step 6)

Skipped — `frontend.framework: none`, no routes, no translations.
Accessibility/contrast check on form validation errors and alert indicators:
N/A (no form UI; en-us CLI logs only).

## Mutation (Step 7)

| Status | skipped |
| Reason | `defaults.skipMutationTesting: true` and `verification.mutationTest` empty (both skip rules apply) |
| Evidence | `config.json` verification/defaults; no threshold evaluation |

## Regression Sabotage (Step 8)

| Status | passed |
| Helper | `python3 .agents/skills/ws-testing/scripts/run_sabotage.py --test "npm run test" --paths .agents/skills/ws-shared/runtime/scripts/step_baton.cjs --invert-patch /tmp/step7-invert.patch` |
| Helper exit | 0 at 2026-09-19T00:27:43Z–00:27:46Z |
| Helper payload | `status: passed, reason: test-failed-as-expected, testAlias: backendTest, testExitCode: 1, restored: true` |
| Invert | Caller-authored patch flipping the AC5 revision check (`!==` → `===` at `step_baton.cjs:172`); every declared path changed bytes |
| Restore | Byte-identical: post-run sha256 `29037278…fca0` matches pre-invert ledger hash; `git status` clean of product changes; patch never entered `{us-dir}/.runtime/` |

Bite attribution (verified, honest): in the full chain the first-biting
suite is the `test-install.js` integrity gate
(`bin/skill-integrity.json is stale`, <1s), which trips on any product-file
mutation. The targeted AC5 regression bite was verified independently with
the patch applied: `node test/test-step-baton-claim.js` exits 1 with
`baton revision conflict: presented 0, stored 0` at the equal-revision claim
assertion (`test/test-step-baton-claim.js:48`). File restored via
`git checkout` afterward; claim suite green again.

## Gaps and handoff

None. All 17 ACs + 7 NS have observed green tests; sabotage proves the AC5
assertions bite. No findings for `ws-implement-tasks` fix mode.
Orchestrator owns `update_state finish --step 7`.
