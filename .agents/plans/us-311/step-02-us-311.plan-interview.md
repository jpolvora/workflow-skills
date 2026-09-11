---
slug: us-311
title: Plan interview — Stamp finished step artifacts with the step result
status: active
step: 2
workflowId: us-311-20260911T034559Z
startedAt: "2026-09-11T03:45:59.000Z"
endedAt: "2026-09-11T03:48:56.385Z"
acRefs: []
---
## Interview registry

autoMode: all gaps resolved via project-context sweep or defaults; zero user escalations. `shared_understanding: confirmed` (orch auto-confirm "End refinement and advance").

| id | class | section | gap | recommendation | status | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------------|----------|
| G1 | design | §2 | Pass-through vs post-update-read derivation: is pass-through correct for internal-substep finishes? | Keep pass-through; hoist validated finish `status` to function scope for the stamp loop | closed | project | `workflow_state.cjs`: substep finish sets `stepStatus[step]='active'` (L1272) while carrying its own finish `status`; stamp loop (L1416+) sits outside the finish branch so `status` must be hoisted |
| G2 | design | §2 | Helper shape: name/style precedent for the closed-enum resolver | Add `STEP_FINISH_STATUSES` Set + `resolveStepStampStatus()` throwing descriptive error; export for unit tests | closed | project | No `resolveStepStampStatus` collision (grep); style precedent `SKIP_REASONS`/`SHIP_STATUSES` Sets at L21–28; module already exports stamp helpers |
| G3 | test | §5/T6 | Is a source-scan singularity assertion acceptable precedent? | Keep T6 static scan (one stamp call site; no `state.status` in `artifactStampFields`) | closed | assumed-default | Harness tests routinely assert on shipped source (e.g. shell-quoting/portability scans); AC5 explicitly demands singularity evidence |
| G4 | test | §3.6 | Exact `run_sabotage.py` invocation for this fix | `--test "node test/test-artifact-stamp-status.js" --paths .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs --invert-patch <generated>`; clean non-allowlisted `.runtime` residue before `validate_state` | closed | project | `.agents/skills/ws-testing/scripts/run_sabotage.py` usage header; MEMORY `[2026-09-03] Sabotage leftover .runtime files fail validate_state` |
| G5 | release | §2.5 | Bump + integrity ordering for managed-runtime change | All edits → `npm run build-site:bump` (0.4.14→0.4.15) → `generate-integrity` → `verify-integrity` → full tests; commit `bin/skill-integrity.json` with content | closed | project | `CATALOG.md` Before-ship rows 2,3,7 (+row 7 detail: integrity hashes `ws-shared/runtime/`); MEMORY integrity-regen traps |
| G6 | test | §5/T4 | Can a temp fixture finish close-step 8 without steps 0–7? | Yes — write `step-08` artifact, dispatch+finish step 8, assert close transition | closed | project | `validateSnapshot` without `preAdvance` checks structure/keys/index only (L1523+); no prior-steps requirement on finish |
| G7 | design | §1/Q1 | Register first-stamp provisional value (`'completed'`) — any test pin the old value? | Keep provisional `'completed'` + preserve-prior-on-reregister; no test pins register status | closed | assumed-default | `test/test-node-helper-ports.js` asserts only `step: 0` on register output; Step 0 finish always re-stamps in-flow |
| G8 | invariants | §6 | Skill rule: blocking gap if touched boundaries lack invariant checks | Covered — §6 names closed-enum boundary validation, sync-only async safety, unchanged paths, `atomicWrite` fd cleanup + commands | closed | project | Plan §6 + `{sharedDir}/runtime/stacks/typescript-node.md` rules 2–5 |
| G9 | process | §7 | Concurrent-worker isolation (us-310 files, dirty CHANGELOG) | G2-code stages only this workflow `files_touched` minus `{plansDir}`/`preExistingDirty`; never stage/commit the foreign files | closed | project | MEMORY `[2026-09-02] G2-code must stage only this slug files_touched` + worker preExistingDirty list |
| G10 | process | §3 | Red-before/green-after should be explicit TDD order, not "if needed" | Reorder: write tests → run red (T1–T3 fail pre-fix) → implement → run green | closed | assumed-default | Spec NS1–NS3 define red-before expectations; TDD order makes the evidence mechanical |
| G11 | release | §7 | Harness audit row missing (runtime script = hub-adjacent change) | Add `ws-check-harness` Phases 0–5c (0 critical, or justified caveat) to pre-ship verification | closed | project | `CATALOG.md` Before-ship row 8; MEMORY mechanical-5a caveat trap |

`blocking_open: 0`. Failing-test baseline present (T1–T3 red-before). Section 6 verification plan mandated and present.

## step-output

```yaml
status: success
refine:
  round: 0
  blocking_open: 0
  shared_understanding: confirmed
```
