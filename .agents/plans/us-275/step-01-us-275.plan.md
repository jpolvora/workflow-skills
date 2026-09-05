---
superseded: true
supersededBy: step-02-us-275.plan.refined.md
slug: us-275
title: "ws-spec-to-pr: autoMode must not skip Steps 1–3"
status: active
step: 1
workflowId: us-275-20260904T020000Z
startedAt: "2026-09-04T02:00:00Z"
endedAt: "2026-09-04T02:06:44.721Z"
acRefs: []
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

### Resolved assumptions (from spec; no blockers)

| Assumption | Chosen default | Confirmed |
|------------|----------------|-----------|
| Guard location | Extend existing `validate_state.cjs --pre-advance 4` (implementation in shared `workflow_state.cjs` `validateSnapshot`; CLI wrapper stays thin). No new `pre-implement-guard` script. | y |
| Interview skip | When Step 2 is skipped with `interview-not-required`, refined plan is not required (existing advance-to-3 table). Plan of record remains `step-01-*.plan.md`. | y |
| Doc language | en-us in shipped skill bodies | y |
| Test surface | Fixture + doc assertions; full host e2e simulation out of scope | y |
| Lite orch | Unchanged unless a proven parity gap appears (reported on standard only) | y |
| enableDag | Sequential stub required before Step 4 even when DAG is disabled | y |

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

- `defaults.minVerifyScore` / verify-score gates
- Lite orch behavior (unless a proven parity gap)
- Consumer product code
- New host adapters
- Relaxing `autoMode` to skip planning without explicit user override
- New CLI wrapper beside `--pre-advance 4`

## 2. Technical Design & Architecture

**Layers** (`config.json` `node-skills-package`): `skills-sot` (`.agents/skills`), `tests` (`test/`). No installer-cli, DB, frontend, or i18n.

**Current behavior (gap):**

- `autoMode` is documented as auto-gate index 0 + continuous cadence (`SKILL.md` Native Tool Contract, `STEP-DISPATCH.md` host execution, `gates.md` user-gate item 6). There is **no** dedicated **autoMode ≠ skip planning** table.
- Advance-to-4 already exists: `validate_state.cjs` → `workflow_state.cjs` `validateSnapshot`. For standard `next === 4` it requires `step-03-{slug}.plan.exec.md` (metadata step 3) plus `plan.index.json`. It does **not** require `step-01-*.plan.md` by name, does **not** require `completedSteps` to include 1 and 3 (or skip reasons), and stderr is `ERROR: {joined errors}` with **no** `HS-5` token.
- Post-step hygiene in `STEP-DISPATCH.md` / `state-hygiene.md` already says run `--pre-advance {N+1}` after finish; a jump from `currentStep: 0` to Step 4 `dispatch-agent` never hits that path. Need an **explicit Step 4 pre-dispatch** obligation.
- `setup.md` init table lists `autoMode` true/false but has no one-line planning reminder.
- Feature-branch gate documents stay-on-current / `feat/{slug}` checkout; it does **not** say a child slug on `feat/{parent}` still needs full planning.

**Design (minimal):**

1. **Docs (AC1–AC3, AC5 call-site, AC6 narrative):** Add identical-meaning **autoMode ≠ skip planning** tables to `SKILL.md` and `STEP-DISPATCH.md`. Add child-slug / existing-parent-branch rule to `gates.md` and `setup.md` (feature-branch / resume area). Add one init-banner line when `autoMode` is true. On Step 4 Action row, require `node {skillsRoot}/ws-spec-to-pr/scripts/validate_state.cjs {state} --pre-advance 4` **before** first `dispatch-agent`; on exit ≠ 0 → HS-5 STOP (no product edits). Mirror one sentence in `state-hygiene.md` (and `PROTOCOLS.md` only if the Step 4 call site is not already covered by STEP-DISPATCH).
2. **Guard (AC4–AC5):** In `validateSnapshot` when `preAdvance === 4` and pipeline is standard:
   - Keep existing exec + `plan.index.json` checks.
   - Require plan of record on disk: `step-02-{slug}.plan.refined.md` if Step 2 completed and was not skipped `interview-not-required`; else `step-01-{slug}.plan.md`.
   - Require Steps 1 and 3 present in `completedSteps` **or** matching `skippedSteps` with a valid reason (`dag-disabled` for 3; Step 1 skip still requires the plan file on disk).
   - Require Step 2 in `completedSteps` **or** `skippedSteps` reason `interview-not-required`.
   - On any of these failures, stderr must list each missing path/reason and include the token `HS-5`.
3. **Tests (AC4–AC8, NS1–NS3):** Extend existing Node tests (prefer `test/test-workflow-state-contract.js` for the guard; `test/test-quality-gates.js` and/or a small assertion in `test/test-runtime-portability.js` for doc strings). Fixture: `autoMode: true`, `workflowType: standard`, Step 0 artifacts only → `--pre-advance 4` non-zero, stderr names `step-01-*.plan.md`, `plan.index.json`, and `HS-5`.
4. **Harness (AC7):** After edits, run `ws-check-harness` Phases 0–5c plus the four Phase 5a scripts. Hashed skill bodies changed → `npm run generate-integrity` + `verify-integrity` in the implementation commit (not this planning step).

**Do not** add a second validator, change lite `--pre-advance 4` (lite 4 is review, not implement), or relax `--skip-gates` / `skipQualityGates` (existing bypass stays; this bug is autoMode, not skip-gates).

**Defect-class sibling sweep:** Search orch docs/scripts for phrases that could be read as "autoMode skips planning" or "small change → implement now". Align `faq.md` HS-5 blurb if it still says HS-5 is only YAML parse failure (it currently understates pre-advance). Do not rewrite unrelated autoMode rows (Reach-10, review autofix, branch-gate stay).

**Sabotage:** `verification.mutationTest` unset; after implement, run `run_sabotage.py` on the new pre-advance-4 assertions (flip the HS-5 / missing-plan check) per bugfix protocol.

## 3. Step-by-Step Plan

1. **Docs — autoMode ≠ skip planning (AC1, NS3)** — Add a dedicated subsection with a two-column table to `.agents/skills/ws-spec-to-pr/SKILL.md` (Goals & Invariants / Mode Flags) and `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` (after host-execution / before or beside the step table). Columns: **Does** (auto gate index 0; continuous step boundaries) vs **Never** (skip Steps 1–3; product edits before `step-01-*.plan.md`; ignore classifier `runInterview` / `execMode`). Check: `rg "autoMode ≠ skip planning"` hits both files.

2. **Docs — child slug on existing parent branch (AC2, NS2)** — Add the no-waiver rule to `.agents/skills/ws-shared/gates.md` (autoMode / cadence or dual-mode rules) and `.agents/skills/ws-shared/setup.md` (feature-branch gate / identity). Wording: existing parent feature branch + child bug/task id does not waive Steps 1–3 for the **child slug**; only an explicit user override shortens planning. Generic `feat/{parent}` only. Check: both files state the child-slug rule.

3. **Docs — init banner (AC3)** — In `setup.md` step 3 init banner block, when `autoMode` is true, print one additional line: gates automatic, FSM 0→9 intact, no product code until Step 4 after plan artifacts exist on disk. Check: banner instruction is conditional on `autoMode: true`.

4. **Docs — Step 4 call site (AC4, AC5)** — In `STEP-DISPATCH.md` Step 4 Action: **before** `check_memory_conflict` / `dispatch-agent`, run `validate_state.cjs --pre-advance 4`; exit ≠ 0 → HS-5 STOP, name missing files, do not edit product paths, do not dispatch. One matching sentence in `protocols/state-hygiene.md` (pre-advance cheat sheet / exit ≠ 0 row). Optional one-liner in `PROTOCOLS.md` only if needed for orch load order. Check: Step 4 row contains `--pre-advance 4` and HS-5 STOP.

5. **Guard implementation (AC4, AC5, NS1)** — Extend `.agents/skills/ws-shared/scripts/workflow_state.cjs` `validateSnapshot` for standard `--pre-advance 4` as in §2 (plan of record, `plan.index.json`, exec plan, completedSteps 1 and 3 or skip reasons, Step 2 completed or `interview-not-required`). Format stderr so missing artifacts are listed and `HS-5` appears (`validate_state.cjs` remains the CLI). Do not change lite mapping. Check: fixture with only Step 0 artifacts fails; complete planning set with `dag-disabled` skip still passes (existing skip fixture).

6. **Conformance test + sibling FAQ (AC6, NS1, NS3)** — Add/extend Node tests (see §5) asserting autoMode + standard + missing `step-01` → `--pre-advance 4` fail + HS-5 + named files. Assert SKILL.md / STEP-DISPATCH.md tables and setup banner / child-slug sentences. If `docs/faq.md` still describes HS-5 as YAML-only, add pre-advance missing-artifact / autoMode-does-not-skip-planning. Check: new assertions fail on current tree, pass after steps 1–5.

7. **Portability + harness (AC7, AC8)** — Confirm new prose matches `test-runtime-portability.js` host-neutrality (`Cursor` / `OpenCode` / `Antigravity` forbidden in shipped skills). Run `node .agents/skills/ws-check-harness/scripts/check_duplicates.cjs`, `measure_harness.cjs`, `check_shell_quoting.cjs`, `check_pipeline_handoff.cjs` (exit 0) and `ws-check-harness` Phases 0–5c. Implementation later: `npm run generate-integrity` if hashed files changed. Check: AC7 commands exit 0; AC8 rg/test green.

## 4. Permissions, Tenancy & i18n

N/A (harness docs + Node validator). Constraints instead: portable en-us; no host product names; no consumer repo names; no private paths; never `git add -A`; do not commit `{plansDir}` in Steps 0–7 of this workflow.

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

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot + tests; shared `workflow_state.cjs` is the validator SoT).
- [ ] No schema/migrations/i18n/RBAC (N/A).
- [ ] Authorization: N/A; HS-5 fail-closed documented and implemented.
- [ ] Portable en-us; host-neutrality test green.
- [ ] Test cases cover AC1–AC8 and NS1–NS3.
- [ ] `ws-check-harness` + four mechanical gates exit 0.
- [ ] Integrity regenerated if hashed skill files changed (implementation commit).

## 8. Open Questions

None. All spec assumptions confirmed; interview skip is allowed if the interview skill finds no remaining design forks.
