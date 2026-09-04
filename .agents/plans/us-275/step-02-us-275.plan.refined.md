---
slug: us-275
title: "ws-spec-to-pr: autoMode must not skip Steps 1–3"
status: active
step: 2
workflowId: us-275-20260904T020000Z
startedAt: "2026-09-04T02:00:00Z"
endedAt: "2026-09-04T02:07:30.000Z"
acRefs: []
shared_understanding: confirmed
---
## 0. Summary & Business Rules

**Objective:** Harden the standard `ws-spec-to-pr` contract so `autoMode` never authorizes skipping planning Steps 1–3, editing product files before required plan artifacts exist, or inferring a "small child bug on an existing feature branch" shortcut.

**Defect class (design intent):** The FSM and `gates.md` already say `autoMode` only auto-selects gate index 0. The regression is orchestrator inference: skipping Step 0 `finish`, bypassing `validate_state.cjs --pre-advance`, ignoring classifier `runInterview` / `execMode`, and editing product paths while `currentStep` remains 0. Git history on `SKILL.md` / `STEP-DISPATCH.md` / `gates.md` / `setup.md` / `workflow_state.cjs` shows autoMode as gate-and-cadence behavior (continuous boundaries, auto index 0), not a planning skip. Fix = unambiguous shipped tables plus a fail-closed advance-to-4 check, not a new FSM.

**Business rules:**

| Rule | Detail |
|------|--------|
| autoMode does | Auto-select recommended gate option (index 0); proceed continuously across step boundaries (no One Step Per Turn halt). |
| autoMode never does | Skip Steps 1–3; edit product code before `step-01-*.plan.md` (and other advance-to-4 artifacts) exist; ignore classifier `runInterview` / `execMode`; treat existing `feat/{parent}` plus a child slug as a planning waiver. |
| No plan → no code | First Step 4 `dispatch-agent` (`ws-implement-tasks`) only after fail-closed `--pre-advance 4` exits 0. |
| No inference | Child bug/task slug on an existing parent branch still runs the full planning chain unless the user explicitly overrides. |
| Orchestrator | No product edits except Tier 3 inline-isolated; use `dispatch-agent` per step. Guard failure → HS-5 STOP, no product-file edits, no Step 4 dispatch. |
| Sequential exec | This package `defaults.enableDag` is false; Step 3 still writes sequential `step-03-*.plan.exec.md` (skip reason `dag-disabled`). |

**Security / portability:** en-us in shipped skill bodies, gates, banners, templates. Portable tokens (`{plansDir}`, `{skillsRoot}`, `{sharedDir}`, `dispatch-agent`, `user-gate`). No host product names, consumer repo names, or private paths in added prose (`test-runtime-portability.js` host-neutrality remains the check).

## 1. Definition of Ready & Scope

### Resolved assumptions (from spec + interview; no blockers)

| Assumption | Chosen default | Confirmed |
|------------|----------------|-----------|
| Guard location | Extend existing `validate_state.cjs --pre-advance 4` (implementation in shared `workflow_state.cjs` `validateSnapshot`; CLI wrapper stays thin). No new `pre-implement-guard` script. | y |
| Interview skip | When Step 2 is skipped with `interview-not-required`, refined plan is not required (existing advance-to-3 table). Plan of record remains `step-01-*.plan.md`. | y |
| Doc language | en-us in shipped skill bodies | y |
| Test surface | Fixture + doc assertions; full host e2e simulation out of scope | y |
| Lite orch | Unchanged unless a proven parity gap appears (reported on standard only) | y |
| enableDag | Sequential stub required before Step 4 even when DAG is disabled | y |
| stderr | Fail-closed `--pre-advance 4` stderr lists missing artifact names and includes token `HS-5` (today: `ERROR: {joined errors}` with no `HS-5`) | y |
| Doc call sites | Tables in `SKILL.md` + `STEP-DISPATCH.md`; child-slug rule in `gates.md` + `setup.md`; init banner line in `setup.md` | y |
| Tests | Guard fixtures in `test/test-workflow-state-contract.js`; doc-string asserts in `test/test-quality-gates.js` and/or `test/test-runtime-portability.js` | y |

### Acceptance Criteria (measurable)

- **AC1:** `ws-spec-to-pr/SKILL.md` and `STEP-DISPATCH.md` each contain a dedicated **autoMode ≠ skip planning** subsection with a two-column table: what `autoMode` does vs what it never does (skip 1–3, product edits before `step-01-*.plan.md`, ignore classifier `runInterview` / `execMode`).
- **AC2:** `ws-shared/gates.md` and `ws-shared/setup.md` state that an existing parent feature branch plus a child bug/task id does **not** waive Steps 1–3 for the child slug; only an explicit user override may shorten planning.
- **AC3:** `setup.md` init banner (or equivalent bootstrap output) prints, when `autoMode: true`, a one-line reminder: gates are automatic, FSM 0→9 stays intact, no product code until Step 4 after plan artifacts exist on disk.
- **AC4:** Before the first Step 4 `dispatch-agent`, orch runs fail-closed `validate_state.cjs --pre-advance 4`; non-zero when ARTIFACTS.md advance-to-4 prerequisites are missing; stderr lists missing artifacts and mentions HS-5.
- **AC5:** Guard failure → no product-file edits, no Step 4 dispatch; STOP with HS-5 naming missing files (`step-01-*.plan.md`, `plan.index.json`, `step-03-*.plan.exec.md`, refined plan when interview was required).
- **AC6:** Documented dogfood conformance case (test fixture and/or orch docs) asserts that under `autoMode` + `workflowType: standard`, `step-01-{slug}.plan.md` exists before any product-path edit outside `{plansDir}` / workflow state for that slug.
- **AC7:** `ws-check-harness` and mechanical gates (`check_duplicates`, `measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`) still exit 0 after the changes.
- **AC8:** No host product names, consumer repo names, or private paths in shipped skill bodies, gates, or templates added by this work.

### Out of scope

- `defaults.minVerifyScore` / verify-score gates (do not change scoring; still link NS1–NS3 so uncovered negatives cannot cap this US at 8)
- Lite orch behavior (unless a proven parity gap)
- Consumer product code
- New host adapters
- Relaxing `autoMode` to skip planning without explicit user override
- New CLI wrapper beside `--pre-advance 4`
- Complexity-gate **simple** stub-plan jump (documented, writes `step-01`; not an autoMode inference waiver)
- FEATURES / site / version bump (later ship step unless required)
- Harness benchmarks / `ws-run-benchmark`

## 2. Technical Design & Architecture

**Layers** (`config.json` `node-skills-package`): `skills-sot` (`.agents/skills`), `tests` (`test/`). No installer-cli, DB, frontend, or i18n.

**Current behavior (gap):**

- `autoMode` is documented as auto-gate index 0 + continuous cadence (`SKILL.md` Native Tool Contract, `STEP-DISPATCH.md` host execution, `gates.md` user-gate item 6). There is **no** dedicated **autoMode ≠ skip planning** table.
- Advance-to-4 already exists: thin CLI `.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs` → `workflow_state.cjs` `validateSnapshot`. For standard `next === 4` it requires `step-03-{slug}.plan.exec.md` (metadata step 3) plus `plan.index.json`. It does **not** require `step-01-*.plan.md` by name, does **not** require `completedSteps` to include 1 and 3 (or skip reasons), and stderr is `ERROR: {joined errors}` with **no** `HS-5` token (`runValidateCli` L1412).
- Post-step hygiene in `STEP-DISPATCH.md` / `state-hygiene.md` already says run `--pre-advance {N+1}` after finish; a jump from `currentStep: 0` to Step 4 `dispatch-agent` never hits that path. Need an **explicit Step 4 pre-dispatch** obligation on the Step 4 Action row (today: `check_memory_conflict` then `dispatch-agent` only).
- `setup.md` init table lists `autoMode` true/false but has no one-line planning reminder.
- Feature-branch gate documents stay-on-current / `feat/{slug}` checkout; it does **not** say a child slug on `feat/{parent}` still needs full planning.
- `ARTIFACTS.md` advance-to-4 already names plan of record + `plan.index.json` + exec plan. Do **not** expand this US to rewrite that table unless a one-line “plan of record = step-01 or refined” clarification is required for the new stderr names.

**Design (minimal):**

1. **Docs (AC1–AC3, AC5 call-site, AC6 narrative):** Add identical-meaning **autoMode ≠ skip planning** tables to `SKILL.md` and `STEP-DISPATCH.md`. Add child-slug / existing-parent-branch rule to `gates.md` and `setup.md` (feature-branch / resume area). Add one init-banner line when `autoMode` is true. On Step 4 Action row, require `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs {state} --pre-advance 4` **before** first `dispatch-agent`; on exit ≠ 0 → HS-5 STOP (no product edits). Mirror one sentence in `state-hygiene.md` (and `PROTOCOLS.md` only if the Step 4 call site is not already covered by STEP-DISPATCH).
2. **Guard (AC4–AC5):** In `validateSnapshot` when `preAdvance === 4` and pipeline is standard:
   - Keep existing exec + `plan.index.json` checks.
   - Require plan of record on disk: `step-02-{slug}.plan.refined.md` if Step 2 completed and was not skipped `interview-not-required`; else `step-01-{slug}.plan.md`.
   - Require Steps 1 and 3 present in `completedSteps` **or** matching `skippedSteps` with a valid reason (`dag-disabled` for 3; Step 1 skip still requires the plan file on disk).
   - Require Step 2 in `completedSteps` **or** `skippedSteps` reason `interview-not-required`.
   - On any of these failures, stderr must list each missing path/reason and include the token `HS-5`. Keep the existing `ERROR:` prefix; do not add a second validator script.
3. **Tests (AC4–AC8, NS1–NS3):** Extend existing Node tests (prefer `test/test-workflow-state-contract.js` for the guard; `test/test-quality-gates.js` and/or a small assertion in `test/test-runtime-portability.js` for doc strings). Fixture: `autoMode: true`, `workflowType: standard`, Step 0 artifacts only → `--pre-advance 4` non-zero, stderr names `step-01-*.plan.md`, `plan.index.json`, and `HS-5`. Red baseline: those asserts fail on current tree (no `HS-5` token; step-01 not required by name).
4. **Harness (AC7):** After edits, run `ws-check-harness` Phases 0–5c plus the four Phase 5a scripts. Hashed skill bodies changed → `npm run generate-integrity` + `verify-integrity` in the implementation commit (not this planning step).

**Do not** add a second validator, change lite `--pre-advance 4` (lite 4 is review, not implement), or relax `--skip-gates` / `skipQualityGates` (existing bypass stays; this bug is autoMode, not skip-gates).

**Defect-class sibling sweep:** Search orch docs/scripts for phrases that could be read as "autoMode skips planning" or "small change → implement now". `docs/faq.md` HS-5 blurb **already** says pre-advance can fail for a missing required artifact (not YAML-only). Add an autoMode-does-not-skip-planning / missing-plan-artifact sentence if that wording is absent; do not rewrite the existing YAML + pre-advance paragraph. Do not rewrite unrelated autoMode rows (Reach-10, review autofix, branch-gate stay).

**Sabotage:** `verification.mutationTest` unset; after implement, run `run_sabotage.py` on the new pre-advance-4 assertions (flip the HS-5 / missing-plan check) per bugfix protocol. Do **not** load `ws-run-benchmark`.

## 3. Step-by-Step Plan

1. **Docs — autoMode ≠ skip planning (AC1, NS3)** — Add a dedicated subsection with a two-column table to `.agents/skills/ws-spec-to-pr/SKILL.md` (Goals & Invariants / Mode Flags) and `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` (after host-execution / before or beside the step table). Columns: **Does** (auto gate index 0; continuous step boundaries) vs **Never** (skip Steps 1–3; product edits before `step-01-*.plan.md`; ignore classifier `runInterview` / `execMode`). Check: `rg "autoMode ≠ skip planning"` hits both files.

2. **Docs — child slug on existing parent branch (AC2, NS2)** — Add the no-waiver rule to `.agents/skills/ws-shared/gates.md` (autoMode / cadence or dual-mode rules) and `.agents/skills/ws-shared/setup.md` (feature-branch gate / identity). Wording: existing parent feature branch + child bug/task id does not waive Steps 1–3 for the **child slug**; only an explicit user override shortens planning. Generic `feat/{parent}` only. Check: both files state the child-slug rule.

3. **Docs — init banner (AC3)** — In `setup.md` step 3 init banner block, when `autoMode` is true, print one additional line: gates automatic, FSM 0→9 intact, no product code until Step 4 after plan artifacts exist on disk. Check: banner instruction is conditional on `autoMode: true`.

4. **Docs — Step 4 call site (AC4, AC5)** — In `STEP-DISPATCH.md` Step 4 Action: **before** `check_memory_conflict` / `dispatch-agent`, run `validate_state.cjs --pre-advance 4`; exit ≠ 0 → HS-5 STOP, name missing files, do not edit product paths, do not dispatch. One matching sentence in `protocols/state-hygiene.md` (pre-advance cheat sheet / exit ≠ 0 row). Optional one-liner in `PROTOCOLS.md` only if needed for orch load order. Check: Step 4 row contains `--pre-advance 4` and HS-5 STOP.

5. **Guard implementation (AC4, AC5, NS1)** — Extend `.agents/skills/ws-shared/scripts/workflow_state.cjs` `validateSnapshot` for standard `--pre-advance 4` as in §2 (plan of record, `plan.index.json`, exec plan, completedSteps 1 and 3 or skip reasons, Step 2 completed or `interview-not-required`). Format stderr so missing artifacts are listed and `HS-5` appears (`validate_state.cjs` remains the CLI). Do not change lite mapping. Check: fixture with only Step 0 artifacts fails; complete planning set with `dag-disabled` skip still passes (existing skip fixture).

6. **Conformance test + sibling FAQ (AC6, NS1, NS3)** — Add/extend Node tests (see §5) asserting autoMode + standard + missing `step-01` → `--pre-advance 4` fail + HS-5 + named files. Assert SKILL.md / STEP-DISPATCH.md tables and setup banner / child-slug sentences. FAQ: add autoMode ≠ skip planning / named missing plan files if absent; keep existing pre-advance wording. Check: new assertions fail on current tree, pass after steps 1–5.

7. **Portability + harness (AC7, AC8)** — Confirm new prose matches `test-runtime-portability.js` host-neutrality (`Cursor` / `OpenCode` / `Antigravity` forbidden in shipped skills). Run `node .agents/skills/ws-check-harness/scripts/check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs` (exit 0) and `ws-check-harness` Phases 0–5c. Implementation later: `npm run generate-integrity` if hashed files changed. Check: AC7 commands exit 0; AC8 rg/test green.

## 4. Permissions, Tenancy & i18n

N/A (harness docs + Node validator). Constraints instead: portable en-us; no host product names; no consumer repo names; no private paths; never `git add -A`; do not commit `{plansDir}` in Steps 0–7 of this workflow. G2-code (later) stages only this slug `files_touched`.

## 5. Test Coverage

| AC / NS | Test | Method |
|---------|------|--------|
| AC1 | `test/test-quality-gates.js` (or sibling doc-assert in `test-runtime-portability.js`) | `rg`/read: both `SKILL.md` and `STEP-DISPATCH.md` contain heading **autoMode ≠ skip planning** and a table with skip-Steps-1–3 / no product edit before `step-01` / classifier `runInterview` / `execMode`. |
| AC2 | same doc-assert | `gates.md` and `setup.md` contain child-slug / existing parent branch does not waive Steps 1–3. |
| AC3 | same doc-assert | `setup.md` init banner: when `autoMode` true, one-line FSM 0→9 / no product code until Step 4. |
| AC4 | `test/test-workflow-state-contract.js` | Fixture missing advance-to-4 artifacts: `validate_state.cjs --pre-advance 4` status ≠ 0; stderr lists missing files and `/HS-5/`. Existing happy path (exec + `plan.index.json` + `dag-disabled`) still exit 0. |
| AC5 | `test/test-quality-gates.js` `testPreAdvanceHS5` extend + STEP-DISPATCH read | Step 4 Action documents: on guard fail, no `dispatch-agent`, no product edits, HS-5 names missing `step-01-*.plan.md`, `plan.index.json`, `step-03-*.plan.exec.md`. |
| AC6 | `test/test-workflow-state-contract.js` (dogfood fixture) | `autoMode: true`, `workflowType: standard`, only Step 0 files → pre-advance 4 fails because `step-01-{slug}.plan.md` missing; comment/doc string: plan must exist before product-path edits outside `{plansDir}`. Optional `faq.md` sentence. |
| AC7 | implementation verify (named commands) | `ws-check-harness` Phases 0–5c; `check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs` exit 0. |
| AC8 | `test/test-runtime-portability.js` existing host-neutrality loop | New shipped files remain in the scanned set; no `Cursor`/`OpenCode`/`Antigravity`; no consumer repo names in added skill/gate/template text. |
| NS1 | AC4 fixture | autoMode + Step 0 only → non-zero, lists `step-01` and `plan.index.json`, HS-5. |
| NS2 | AC2 doc-assert | child slug + `feat/{parent}` + `runInterview: true` → must not skip interview without `interview-not-required`. |
| NS3 | AC1 + AC4 | docs table + fail-closed validate_state, no orphan product commit path. |
| Sabotage | `run_sabotage.py` (mutation unset) | Invert the new pre-advance-4 missing-plan assertion during Step 7; not a committed test. |

## 6. Invariants (Do Not Violate)

- `commitPlanFilesOnlyAtStep8`: true — this plan artifact stays under `{plansDir}` until delivery.
- `skipQualityGates`: false in dogfood; do not use skip-gates to paper over the guard.
- SoT: edit `.agents/skills/` only for shipped bodies; CLI remains `validate_state.cjs`; logic in `workflow_state.cjs`.
- Portability: path tokens and aliases only; no host/IDE product coupling in shipped prose.
- Sequential: `enableDag` false still requires `step-03-*.plan.exec.md` before Step 4.
- Surgical: only files required by AC1–AC8 (listed in §3). No FEATURES/site/version bump in this change set unless a later ship step requires it.
- MEMORY: do not stamp every `plans/index.json` `updatedAt` on rebuild; this work should not call `rebuild-index` as a fix.
- MEMORY **G2-code files_touched only** (High, 2026-09-02): later product commit stages only this slug `files_touched`, not every dirty path under `.agents/skills`.
- MEMORY **no harness benchmarks** (High, 2026-08-31): do not load `ws-run-benchmark` or `npm run benchmark` from this pipeline; Timing stays telemetry sum.
- MEMORY **uncovered negatives cap verify at 8** (High, 2026-08-27): link NS1–NS3 with passing tests; do not treat happy-path ACs as sufficient for Advance.
- HS-5 fail-closed: guard miss STOP, no product edits, no Step 4 dispatch.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests; shared `workflow_state.cjs` is the validator SoT).
- [ ] No schema/migrations/i18n/RBAC (N/A).
- [ ] Authorization: N/A; HS-5 fail-closed documented and implemented.
- [ ] Portable en-us; host-neutrality test green.
- [ ] Test cases cover AC1–AC8 and NS1–NS3.
- [ ] `ws-check-harness` + four mechanical gates exit 0.
- [ ] Integrity regenerated if hashed skill files changed (implementation commit).
- [ ] G2-code stages this slug `files_touched` only.

## 8. Open Questions

None. All spec assumptions confirmed; interview closed in autoMode (End refinement). Scenario probes (soft-delete / concurrency / list sizing / rate limits): N/A for harness docs + Node validator.

Implementer notes (not user-gates):

- Guard CLI: `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs {state} --pre-advance 4` only.
- `testPreAdvanceHS5` today asserts non-zero for `--pre-advance 1` and skip-gates docs; extend it for Step 4 HS-5 naming without dropping the existing skip-gates assert.
- Existing skip fixture in `test-workflow-state-contract.js` already proves `--pre-advance 4` pass with exec + `plan.index.json` + `dag-disabled`; keep that green.

## Interview registry

`force_interview` was true (High MEMORY PathPattern match on `.agents/skills`). Sweep closed all gaps; autoMode End refinement.

| ID | Class | Section | Gap | Recommendation | Status | resolutionSource | evidence | dependsOn |
|----|-------|---------|-----|----------------|--------|------------------|----------|-----------|
| I1 | blocking | 1–3,5 | Spec AC4 allows a `pre-implement-guard` wrapper. | Keep CLI `validate_state.cjs --pre-advance 4`; logic in `validateSnapshot`; no new script. | closed | project | `step-00-us-275.spec.md` Assumptions (Guard location y); `ws-spec-to-pr/scripts/validate_state.cjs` thin `runValidateCli`; `workflow_state.cjs` `validateSnapshot` | none |
| I2 | blocking | 2,5 | `--pre-advance 4` does not require `step-01` by name; stderr has no `HS-5`. | Extend `validateSnapshot` for standard next=4; list missing artifacts; include `HS-5` in stderr. | closed | project | `workflow_state.cjs` `requiredAdvanceArtifact` standard 4 = exec only; L1262 `plan.index.json`; L1412 `ERROR:` without HS-5; ARTIFACTS.md advance-to-4 row | none |
| I3 | blocking | 3,5 | Step 4 Action has no pre-dispatch `--pre-advance 4`. | Add fail-closed call before `dispatch-agent`; post-mutating `{N+1}` does not cover a jump from step 0. | closed | project | `STEP-DISPATCH.md` Step 4 row (`check_memory_conflict` then dispatch); post-mutating L48–56 | none |
| I4 | blocking | 5 | Tasks need a named red test before implement. | Guard fixture + doc-string tests fail on current tree (no HS-5 token; no skip-planning heading). | closed | project | `test/test-workflow-state-contract.js` skip fixture; `test/test-quality-gates.js` `testPreAdvanceHS5` (pre-advance 1 only); `rg "autoMode ≠ skip planning"` empty in SKILL/STEP-DISPATCH | none |
| I5 | non-blocking | 2,6 | FAQ sibling: plan said HS-5 is YAML-only. | FAQ already names pre-advance missing artifact. Add autoMode ≠ skip planning sentence if absent; do not rewrite YAML paragraph. | closed | project | `ws-spec-to-pr/docs/faq.md` L245–251 | none |
| I6 | non-blocking | 0,6 | High G2-code trap matched `.agents/skills`. | Later G2-code: this slug `files_touched` only; never `git add` whole skills tree. | closed | project | MEMORY 2026-09-02 G2-code must stage only this slug files_touched; `gates.md` G2-code | none |
| I7 | non-blocking | 5,6 | High no-benchmark trap matched orch paths. | Step 7 sabotage = `run_sabotage.py` only; do not load `ws-run-benchmark`. | closed | project | MEMORY 2026-08-31 Spec-to-PR must not start harness benchmarks | none |
| I8 | non-blocking | 5,6 | Uncovered NS cap verify score at 8. | Link NS1–NS3 to passing tests; do not change minVerifyScore. | closed | project | MEMORY 2026-08-27 Verify score must fail-close on uncovered negative scenarios; ledger NS1–NS3 | none |
| I9 | non-blocking | 1,6 | Complexity **simple** still skips 1–2–3 after a stub plan. | Out of scope. autoMode must not infer simple to waive planning; stub path stays documented. | closed | project | `gates.md` Complexity gate simple row; spec Out of Scope | none |
| I10 | non-blocking | 2 | ARTIFACTS.md already says plan of record for advance-to-4. | Do not expand to rewrite ARTIFACTS unless stderr names need a one-line alias. | closed | assumed-default | ARTIFACTS.md L58; surgical scope AC1–AC8 file list | none |
| I11 | non-blocking | 4,6 | Host/consumer names in new prose. | Portable tokens only; AC8 + `test-runtime-portability.js`. | closed | project | spec AC8; plan §0 security row | none |
| I12 | non-blocking | 6 | rebuild-index stamps idle `updatedAt`. | Do not call `rebuild-index` as a fix for this guard. | closed | project | MEMORY 2026-09-03 Plans index updatedAt is per-workflow | none |
