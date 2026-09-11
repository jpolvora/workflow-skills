---
superseded: true
supersededBy: step-02-us-311.plan.refined.md
slug: us-311
title: "Stamp finished step artifacts with the step result, not the overall workflow status"
status: active
step: 1
workflowId: us-311-20260911T034559Z
startedAt: "2026-09-11T03:45:59.000Z"
endedAt: "2026-09-11T03:48:10.990Z"
acRefs: []
---
## 0. Summary & Business Rules

Fix `artifactStampFields()` in `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` so finished step artifacts carry the **step finish result** (`completed` | `failed` | `skipped`) instead of mirroring the overall workflow `state.status` (`active` while intermediate steps complete).

- Target rule: artifact `status` === validated finish `status`; `state.status` lifecycle untouched (state file remains workflow-status source of record).
- Single derivation path (AC5): pass the already-validated finish `status` into the stamping call (hoisted to function scope), resolved through one new helper with closed-enum validation that throws a descriptive error on unknown/missing values (AC6 fail-closed).
- No state schema change, no telemetry schema change, no `applyCloseAndShipStatus` change, no historical re-stamping.
- Live bug evidence in this run: this workflow's own `step-00-us-311.spec.md` was stamped `status: active` by the pre-fix code at Step 0 finish (see `startedAt` preservation); steps finished after the Step 4 code change will stamp `completed`.

## 1. Definition of Ready & Scope

Resolved assumptions (from spec, all confirmed):
- Derivation path: implementer picks one; this plan picks **pass-through of validated finish `status`** (not post-update `state.stepStatus` read), because internal-substep finishes record `stepStatus[step]='active'` while carrying their own finish result — pass-through stays correct for substep stamps too.
- Missing/unknown step result at stamp time: **descriptive throw** (fail closed). The finish flow already validates `--status` at `workflow_state.cjs` finish branch (`finish status must be completed, failed, or skipped`), so the helper is defense-in-depth plus the register-path guard.
- Register path (`register_local_spec.cjs`, outside the finish flow): preserve the previously stamped closed-enum status on re-register; on first stamp use defined provisional default `'completed'` (old `|| 'completed'` fallback intent; always re-stamped by the Step 0 finish in-flow via `finishArtifactNames[0]`).

Measurable ACs: AC1–AC7 from `step-00-us-311.spec.md` (AC1 completed / AC2 failed / AC3 skipped under active workflow; AC4 close-step regression guard; AC5 single-path singularity; AC6 fail-closed; AC7 regression tests + `npm run test` exit 0).

Out of scope (per spec): `state.status` semantics, telemetry schema/events, historical artifact migration, new lifecycle states. Also out of scope: Python twins (`update_state.py`, `register_local_spec.py` are frozen exec-delegates to the Node SoT — no changes needed); docs site / README / FEATURES (runtime bugfix, no feature/capability/CLI change).

## 2. Technical Design & Architecture

Config layers (`.agents/skills/ws-shared/config.json` → stack `node-skills-package`): `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test/`). This change touches `skills-sot` (1 runtime script + 1 register caller) and `tests` (1 new test file), plus `installer-cli`-adjacent release files (`package.json` test list + version bump alignment).

Edits:
1. `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`
   - Add `STEP_FINISH_STATUSES = new Set(['completed', 'failed', 'skipped'])` (or reuse inline list) and `resolveStepStampStatus(stepFinishStatus)` helper: returns the value when in the closed enum, else throws `step finish status must be one of: completed, failed, skipped (received: …)`.
   - `artifactStampFields(state, step, now, stepFinishStatus)` — 4th param required; `status: resolveStepStampStatus(stepFinishStatus)`; remove `state.status || 'completed'`.
   - `stampStepArtifact(file, state, step, stepFinishStatus)` — pass-through param.
   - Finish flow: hoist validated `status` (currently block-scoped in the `operation === 'finish'` branch) so the stamp loop (`for … finishArtifactNames … stampStepArtifact`) passes it; that call site is the single derivation path. Keep `startedAt`/`endedAt` preservation, `atomicWrite`, idempotent-finish guards, `updatePlansIndex` `updatedAt` semantics, and handoff `artifactPaths` normalization untouched.
   - Export the new helper for unit testing (module already exports `artifactStampFields`, `upsertArtifactFrontmatter`, `parseFrontmatter`).
2. `.agents/skills/ws-spec-provider-local/scripts/register_local_spec.cjs` — update the `artifactStampFields(state, 0, now)` call: preserve prior closed-enum status on re-register, else provisional `'completed'`; comment that Step 0 finish re-stamps.
3. `test/test-artifact-stamp-status.js` (new) — regression suite, harness-test-utils pattern (isolated temp repo-root fixtures, `update`/`validate` script runs, `ac_ledger` where needed):
   - T1/NS1 (AC1): intermediate finish `completed` under `status: active` → artifact `status: completed`, `state.status` stays `active`.
   - T2/NS2 (AC2): finish `failed` under `active` → artifact `status: failed`.
   - T3/NS3 (AC3): finish `skipped --reason <valid>` under `active` → artifact `status: skipped`.
   - T4/NS5 (AC4): standard close-step (step 8) finish → `state.status` `completed`, `shipStatus` `pending`, `endedAt` set (identical to pre-change), artifact carries `completed`.
   - T5/NS4 (AC6): `resolveStepStampStatus(unknown/missing)` throws descriptive error; CLI `--status bogus` still rejected; unknown value never appears verbatim in frontmatter.
   - T6 (AC5): static singularity assertion on `workflow_state.cjs` source — exactly one stamp call site passes the finish result; `artifactStampFields` contains no `state.status` reference.
   - T7: register first-stamp provisional + re-register preservation (documents §1 register decision).
4. `package.json` `tests:harness-efficiency` — append `node test/test-artifact-stamp-status.js` so AC7 runs in `npm run test` (explicit file list; new files are not auto-discovered).
5. Release alignment (same product commit): `npm run build-site:bump` (0.4.14 → 0.4.15; aligns `packageVersion` + site footer), then `npm run generate-integrity && npm run verify-integrity` (managed runtime bytes changed). Regen only after all skill-tree edits are final and tree has no untracked files under `.agents/skills/`.

Invariants (`config.json.invariants`): `commitPlanFilesOnlyAtStep8: true` — plan/result artifacts commit only at Step 8 delivery; product G2-code commits after Step 5 / Step 6-fix only.

Design intent (ws-plan-write §1): `git log --oneline -S "stampStepArtifact"` returns only `561f86e9` (docs path-move, no behavioral intent) — confirmed this run; the `state.status` mirroring is an accidental gap, safe to change. Fable `autoDetectDomain`: no IaC/K8s/Docker/DB-migration/Data-script signals in this repo change — domain adapters skipped, no STOP.

## 3. Step-by-Step Plan

1. Sibling sweep (defect-class): grep all `artifactStampFields` / `stampStepArtifact` callers and all `status: state.status` stamp sites repo-wide (expected: `workflow_state.cjs` + `register_local_spec.cjs` only; Python twins delegate). Record sweep evidence.
2. Implement the `workflow_state.cjs` change (§2 item 1) — surgical, no adjacent refactors.
3. Update the `register_local_spec.cjs` call site (§2 item 2).
4. Write `test/test-artifact-stamp-status.js` (T1–T7) and register it in `package.json` `tests:harness-efficiency`.
5. Run targeted suite: `node test/test-artifact-stamp-status.js`; then stack scan `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
6. Sabotage verification (mutation unset: `verification.mutationTest` empty + `skipMutationTesting: true`): run `python .agents/skills/ws-testing/scripts/run_sabotage.py` per ws-testing Step 7 policy, or document why the negative-case matrix (NS1–NS5 red-before/green-after) already covers it; delete any non-allowlisted `.runtime` leftovers before `validate_state`.
7. Full `npm run test` (includes `pretests: npm pack` — remove the generated tarball after the run so the tree stays clean).
8. Version bump + integrity regen (§2 item 5) after all edits final; re-verify.

Each step maps to ACs: 1→AC5 (singularity scope), 2→AC1–AC6, 3→AC6-register, 4→AC7, 5→AC7/§6, 6→NS1–NS5, 7→AC7, 8→release gate.

## 4. Permissions, Tenancy & i18n

N/A — synchronous in-process enum selection in a local CLI helper; no network, auth, tenants, user-facing strings, or locale content. No new inputs, retries, callers, TTL, or external deps (spec assumptions table).

## 5. Test Coverage

| AC | Test case(s) | Method / assertion |
|----|--------------|--------------------|
| AC1 | T1/NS1 intermediate `completed` under `active` | `test-artifact-stamp-status.js`: finish step 1 via `update_state.cjs` in temp fixture; assert artifact frontmatter `^status: completed$` and `state.status === 'active'` |
| AC2 | T2/NS2 intermediate `failed` under `active` | Same harness; assert `^status: failed$` |
| AC3 | T3/NS3 intermediate `skipped` under `active` | Same harness with valid `--reason`; assert `^status: skipped$` |
| AC4 | T4/NS5 close-step regression | Finish step 8 standard; assert `state.status/completed`, `shipStatus/pending`, `endedAt` set, artifact `completed` |
| AC5 | T6 singularity static scan | Assert one stamp call site + no `state.status` in `artifactStampFields` source |
| AC6 | T5/NS4 fail-closed | `resolveStepStampStatus('bogus'|undefined)` throws `/step finish status must be one of/`; CLI rejects `--status bogus`; frontmatter never contains the unknown value |
| AC7 | T1–T7 in suite + full run | New file listed in `tests:harness-efficiency`; `node test/test-artifact-stamp-status.js` exit 0; `npm run test` exit 0 |

Red-before/green-after: T1–T3 fail on pre-fix code (`status: active` stamped); verified by running the new suite against `git stash` of the fix if needed.

## 6. Stack & Security Invariants Verification Plan

Rule pack: `{sharedDir}/runtime/stacks/typescript-node.md`. Touched framework boundaries:
- Boundary input validation (Warning): stamped status is a closed enum — `resolveStepStampStatus` validates at the stamp boundary; CLI `--status` validation unchanged (defense in depth, not a second derivation path).
- Async safety (Critical): change is fully synchronous; no new promises, no `atomicWrite` fd-cleanup change (Warning rule 5 preserved).
- Path traversal (Critical): no path logic touched; stamp targets still come from `finishArtifactNames` allowlist + `usDir` join.
- Type safety: plain Node CJS, no TS annotations added.

Verification commands:
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` (exit 0)
- `node test/test-artifact-stamp-status.js` (exit 0)
- `npm run test` (exit 0; remove `npm pack` tarball after)
- `npm run verify-integrity` (exit 0 after regen)

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot runtime + tests only, plus release alignment files).
- [ ] Sibling sweep done; no second stamp path left behind.
- [ ] Stack & security invariants verified (closed enum, sync-only, paths unchanged, fd cleanup intact).
- [ ] Test cases cover all ACs (T1–T7) and are wired into `npm run test`.
- [ ] `npm run test` exit 0 on final tree; tarball removed.
- [ ] Version bumped strictly above merge-base; integrity regenerated + verified.
- [ ] G2-code stages only this workflow `files_touched` (never `{plansDir}`, never `preExistingDirty`, never the concurrent us-310/spec files).

## 8. Open Questions

- Q1 (resolved in §1): register first-stamp provisional value — chosen `'completed'` (old fallback intent; re-stamped by Step 0 finish in-flow). Reviewer may challenge; alternative is preserving prior-only with throw on first stamp, which would break fresh register — rejected.
- Q2: none blocking. No absent-dimension ACs (spec assumptions table confirms N/A for validation/idempotency/auth/concurrency/lifecycle/external-deps).
