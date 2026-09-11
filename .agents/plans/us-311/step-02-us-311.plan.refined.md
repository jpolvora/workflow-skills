---
slug: us-311
title: "Stamp finished step artifacts with the step result, not the overall workflow status"
status: active
step: 2
workflowId: us-311-20260911T034559Z
startedAt: "2026-09-11T03:45:59.000Z"
endedAt: "2026-09-11T03:48:56.387Z"
acRefs: []
---
Refined from `step-01-us-311.plan.md` via `step-02-us-311.plan-interview.md` (G1–G11 closed, `blocking_open: 0`). Unchanged sections are carried over verbatim; refinements marked **[R]**.

## 0. Summary & Business Rules

Fix `artifactStampFields()` in `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` so finished step artifacts carry the **step finish result** (`completed` | `failed` | `skipped`) instead of mirroring the overall workflow `state.status` (`active` while intermediate steps complete).

- Target rule: artifact `status` === validated finish `status`; `state.status` lifecycle untouched (state file remains workflow-status source of record).
- Single derivation path (AC5): pass the already-validated finish `status` into the stamping call (hoisted to function scope), resolved through one new helper with closed-enum validation that throws a descriptive error on unknown/missing values (AC6 fail-closed).
- No state schema change, no telemetry schema change, no `applyCloseAndShipStatus` change, no historical re-stamping.
- Live bug evidence in this run: this workflow's own `step-00-us-311.spec.md` was stamped `status: active` by the pre-fix code at Step 0 finish; steps finished after the Step 4 code change will stamp `completed`.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec, all confirmed):
- Derivation path: **pass-through of validated finish `status`** (not post-update `state.stepStatus` read), because internal-substep finishes record `stepStatus[step]='active'` while carrying their own finish result — pass-through stays correct for substep stamps too **[R-G1: evidence `workflow_state.cjs` L1272 vs L1416+]**.
- Missing/unknown step result at stamp time: **descriptive throw** (fail closed). The finish flow already validates `--status`, so the helper is defense-in-depth plus the register-path guard.
- Register path (`register_local_spec.cjs`, outside the finish flow): preserve the previously stamped closed-enum status on re-register; on first stamp use defined provisional default `'completed'` (old `|| 'completed'` fallback intent; always re-stamped by the Step 0 finish in-flow) **[R-G7: no test pins register status value]**.

Measurable ACs: AC1–AC7 from `step-00-us-311.spec.md`.

Out of scope (per spec): `state.status` semantics, telemetry schema/events, historical artifact migration, new lifecycle states, Python twins (frozen exec-delegates), docs site / README / FEATURES.

## 2. Technical Design & Architecture

Layers: `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test/`).

Edits:
1. `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
   - Add `STEP_FINISH_STATUSES` Set (`completed|failed|skipped`, style precedent `SKIP_REASONS`/`SHIP_STATUSES` L21–28) and `resolveStepStampStatus(stepFinishStatus)` helper: returns the value when in the closed enum, else throws `step finish status must be one of: completed, failed, skipped (received: …)` **[R-G2]**.
   - `artifactStampFields(state, step, now, stepFinishStatus)` — 4th param required; `status: resolveStepStampStatus(stepFinishStatus)`; remove `state.status || 'completed'`.
   - `stampStepArtifact(file, state, step, stepFinishStatus)` — pass-through param.
   - Finish flow: hoist validated `status` so the stamp loop passes it; that call site is the single derivation path. Keep `startedAt`/`endedAt` preservation, `atomicWrite`, idempotent-finish guards, `updatePlansIndex` `updatedAt` semantics, handoff `artifactPaths` normalization untouched.
   - Export the new helper for unit testing.
2. `.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs` — update the `artifactStampFields(state, 0, now)` call: preserve prior closed-enum status on re-register, else provisional `'completed'`; comment that Step 0 finish re-stamps.
3. `test/test-artifact-stamp-status.js` (new) — T1–T7 per §5; harness-test-utils temp-fixture pattern.
4. `package.json` `tests:harness-efficiency` — append `node test/test-artifact-stamp-status.js` (explicit file list; new files not auto-discovered).
5. Release alignment (same product commit): all edits → `npm run build-site:bump` (0.4.14 → 0.4.15) → `npm run generate-integrity && npm run verify-integrity` **[R-G5: CATALOG Before-ship rows 2,3,7]**. Regen only after all skill-tree edits final and no untracked files under `.agents/skills/`.

Invariants: `commitPlanFilesOnlyAtStep8: true`.

Design intent: `git log -S "stampStepArtifact"` → only `561f86e9` (docs path-move) — accidental gap, safe to change. Fable `autoDetectDomain`: no domain signals — skipped.

## 3. Step-by-Step Plan (TDD order [R-G10])

1. Sibling sweep (defect-class): grep all `artifactStampFields` / `stampStepArtifact` callers and `status: state.status` stamp sites repo-wide (expected: `workflow_state.cjs` + `register_local_spec.cjs` only). Record evidence.
2. Write `test/test-artifact-stamp-status.js` (T1–T7) + register in `package.json`; run pre-fix → expect T1–T3 RED (`status: active` stamped), T5–T6 red.
3. Implement the `workflow_state.cjs` change (§2 item 1) — surgical, no adjacent refactors.
4. Update the `register_local_spec.cjs` call site (§2 item 2).
5. Run targeted suite → expect GREEN; then stack scan `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
6. Sabotage verification: `python .agents/skills/ws-testing/scripts/run_sabotage.py --test "node test/test-artifact-stamp-status.js" --paths .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs --invert-patch <generated>` **[R-G4]**; delete non-allowlisted `.runtime` residue before `validate_state`.
7. Full `npm run test` (remove the `npm pack` tarball after).
8. Version bump + integrity regen (§2 item 5) after all edits final; re-verify.

AC map: 1→AC5, 2→AC7-red, 3→AC1–AC6, 4→AC6-register, 5→AC7/§6, 6→NS1–NS5, 7→AC7, 8→release gate.

## 4. Permissions, Tenancy & i18n

N/A — synchronous in-process enum selection; no network, auth, tenants, or locale content.

## 5. Test Coverage

| AC | Test case(s) | Method / assertion |
|----|--------------|--------------------|
| AC1 | T1/NS1 intermediate `completed` under `active` | Temp fixture via `update_state.cjs`; assert artifact `^status: completed$`, `state.status === 'active'` |
| AC2 | T2/NS2 intermediate `failed` under `active` | Assert `^status: failed$` |
| AC3 | T3/NS3 intermediate `skipped` under `active` | Valid `--reason`; assert `^status: skipped$` |
| AC4 | T4/NS5 close-step regression | Finish step 8 standard in fixture **[R-G6: feasible — `validateSnapshot` has no prior-steps requirement]**; assert `state.status/completed`, `shipStatus/pending`, `endedAt` set, artifact `completed` |
| AC5 | T6 singularity static scan | One stamp call site passes finish result; no `state.status` in `artifactStampFields` source **[R-G3]** |
| AC6 | T5/NS4 fail-closed | `resolveStepStampStatus('bogus'|undefined)` throws `/step finish status must be one of/`; CLI rejects `--status bogus`; unknown value never in frontmatter |
| AC7 | T1–T7 in suite + full run | Wired into `tests:harness-efficiency`; targeted exit 0; `npm run test` exit 0 |

## 6. Stack & Security Invariants Verification Plan

Pack: `{sharedDir}/runtime/stacks/typescript-node.md`:
- Boundary input validation: `resolveStepStampStatus` closed-enum check at stamp boundary.
- Async safety: fully synchronous; `atomicWrite` fd cleanup preserved.
- Path traversal: no path logic touched; stamp targets from `finishArtifactNames` allowlist.

Commands:
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`
- `node test/test-artifact-stamp-status.js`
- `npm run test` (tarball removed after)
- `npm run verify-integrity` (after regen)

## 7. Pre-PR Checklist

- [x] Layer boundaries respected.
- [x] Sibling sweep done; no second stamp path left.
- [x] Stack & security invariants verified.
- [x] T1–T7 cover all ACs, wired into `npm run test`, red-before/green-after evidenced.
- [x] `npm run test` exit 0 on final tree; tarball removed.
- [x] Version bumped strictly above merge-base; integrity regenerated + verified.
- [x] `ws-check-harness` Phases 0–5c → 0 critical (or justified caveat) **[R-G11]**.
- [x] G2-code stages only this workflow `files_touched` (never `{plansDir}`, never `preExistingDirty`/us-310 files).

## 8. Open Questions

None blocking. Q1 (register provisional) resolved §1; alternatives documented in interview G7.
