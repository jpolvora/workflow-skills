# Execution Plan — DAG Tasks

**Slug:** `workflow-bootstrap-feature-branch`  
**Source plan:** `.agents/plans/workflow-bootstrap-feature-branch/step-01-workflow-bootstrap-feature-branch.plan.md`  
**execMode:** `parallel`  
**targetModel:** `coder`

## Size detection

| Metric | Count | Threshold (`dagThresholds`) | Within? |
|--------|-------|-----------------------------|---------|
| Implementation steps (plan §3 Steps A–H) | 8 | `maxImplementationSteps` ≤ 3 | ❌ |
| Expected files | ≥8 (`setup.md`, `gates.md`, `PROTOCOLS.md`, `ws-ship-pr/SKILL.md`, lite `SKILL.md`, test module, `package.json`, `bin/skill-integrity.json`; optional `check_workflows.py`) | `maxExpectedFiles` ≤ 6 | ❌ |
| Layers | 3 (`skills-sot`, `installer-cli`, `tests`) | `maxLayers` ≤ 2 | ❌ |

**Decision:** `execMode: parallel` (steps, files, and layers all exceed thresholds).  
**Waves:** 4 levels, max 3 concurrent tasks per level (file-isolated). Steps A+B combined (both edit `setup.md`). Step F is lite-only (standard already on-demand-loads `setup.md`). Integrity is last. No package version bump.

## Levels

| Level | Tasks | Notes |
|-------|-------|-------|
| 0 | T1, T2, T3 | Parallel skill prose: `setup.md` (A+B), `gates.md`, `PROTOCOLS.md` |
| 1 | T4, T5 | Parallel: ship-pr head vs lite `setup.md` pointer |
| 2 | T6 | Tests after the skill-prose files they grep |
| 3 | T7 | Integrity regenerate last (hashed skill content + optional `check_workflows.py`) |

## Tasks

### T1 — Shared Feature branch gate + resume mismatch in `setup.md` (AC1–AC8, AC10, AC11)

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.agents/skills/ws-shared/setup.md`
- **Plan steps:** A (5b gate); B (resume HEAD mismatch)
- **ACs:** AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC10, AC11
- **Acceptance:**
  - New **5b. Feature branch gate (new workflow only)** sits after Bootstrap step 5 Identity and before step 6 Baseline; steps 6–10 keep their numbers.
  - `user-gate` copy has exactly three choices (create from HEAD, create from `{baseBranch}`, stay); exactly one Recommended (option 2 when HEAD is protected, else option 1); HS-1 on cancel; portable `user-gate` alias; en-us; no new host product names.
  - `{baseBranch}` from `config.project.baseBranch` if set, else `bash {skillsRoot}/ws-ship-pr/scripts/detect-base-branch.sh`; gate copy never treats `master` as the only hardcoded base.
  - Git recipes: create-from-current `git checkout -b {name}` from HEAD; create-from-base fetch-or-local; stay = no create/switch; existing `feat/{slug}` → checkout-existing / different name / stay / cancel (never reset / `-D`); dirty create-from-base STOP with stash / create-from-current / cancel; never `git reset --hard`; never `git add -A`; no auto-push; no worktree add.
  - Detached HEAD: stay invalid. Protected stay (AC11) includes ship-will-use-this-branch-as-PR-head warning.
  - Write `state.branch`, `branchStrategy` (`from-current` / `from-base` / `stay` / `checkout-existing`), `baseBranch` before baseline/checkpoint. Re-print banner `branch` / `baseBranch` rows (or a Feature branch gate result table).
  - `autoMode`: no prompt; stay; log `branch-gate | auto | stay | {branch} | ISO`. `dryRun`: show choices + commands; no ref mutation (skip fetch too).
  - Resume: do not re-run 5b. If `git rev-parse --abbrev-ref HEAD` ≠ `state.branch`, STOP with checkout-recorded (Recommended) / cancel. `autoMode` index 0 = checkout-recorded; log `branch-resume | auto | checkout | {branch} | ISO`.
- **coderPrompt:** Edit only `.agents/skills/ws-shared/setup.md` per plan §3 Steps A and B (combined because both files collide). Insert 5b after Identity and before Baseline with the plan §2 gate copy, recommended-option rule, protected set (`main`, `master`, `develop`, configured `baseBranch` / `workingBranch`), AC11 warning, detached-HEAD rule, existence gate, dirty-tree stash/from-current/cancel, git command table, `autoMode`/`dryRun`, state keys, and banner sync. In Resume / Reset, after skip-bootstrap, add HEAD≠`state.branch` STOP (no silent checkout). Reuse `detect-base-branch.sh`; do not add a helper script; do not refactor `cleanup_workflow_git.py`; do not copy the gate into orch SKILL bodies. Surgical edit only.

### T2 — `gates.md` auto-gate rows (AC1, AC7, AC8)

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.agents/skills/ws-shared/gates.md`
- **Plan steps:** C
- **ACs:** AC1, AC7, AC8
- **Acceptance:**
  - Auto-gate defaults table gains **Feature branch (new start)** → Stay on current (index 0).
  - Auto-gate defaults table gains **Feature branch resume mismatch** → Check out `state.branch`.
  - HS-1 wording unchanged. `skipQualityGates` still does not skip this SCM/safety gate.
- **coderPrompt:** Edit only `.agents/skills/ws-shared/gates.md` § Auto-gate defaults. Add two rows: Feature branch (new start) index 0 = Stay on current; Feature branch resume mismatch index 0 = Check out `state.branch`. Do not change HS-1. Do not edit `setup.md` (T1). Keep en-us; no new host product names.

### T3 — State YAML in `PROTOCOLS.md` (AC3, AC4, AC5, AC7, AC9)

- **parallelGroup:** L0
- **dependsOn:** []
- **Files:** `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`
- **Plan steps:** D
- **ACs:** AC3, AC4, AC5, AC7, AC9
- **Acceptance:**
  - `state.md` YAML list documents `branchStrategy` and `baseBranch` beside existing `branch`.
  - One sentence: written at bootstrap 5b; resume trusts them; ship reads `branch`.
  - `validate_state.py` `REQUIRED_KEYS` is **not** edited (old in-flight states must still validate).
- **coderPrompt:** Edit only `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` `state.md` YAML block. Add `branchStrategy: from-current | from-base | stay | checkout-existing` and `baseBranch` next to existing `branch`. Note they are written at setup.md 5b, trusted on resume, and `ws-ship-pr` workflow-mode reads `branch`. Do not modify `validate_state.py` or `REQUIRED_KEYS`. Do not duplicate the git recipe (that lives in `setup.md`).

### T4 — Workflow-mode `ws-ship-pr` head (AC9)

- **parallelGroup:** L1
- **dependsOn:** []
- **Files:** `.agents/skills/ws-ship-pr/SKILL.md`
- **Plan steps:** E
- **ACs:** AC9
- **Acceptance:**
  - When `workflowMode: true` with readable `{us-dir}` state: PR head, preflight current-branch check, `git pull` / `git push -u` / `create-pr --head` use `state.branch` (not `config.project.workingBranch`).
  - Standalone `/ship-pr` (no workflow state) still defaults head to `config.project.workingBranch`.
  - Explicit: do not rewrite `config.project.workingBranch`.
  - Merge: never delete the resolved head (workflow: `state.branch`; standalone: `workingBranch`).
  - `PREPARE-CHECKLIST.md` skipped (no required row that says confirm `workingBranch`).
- **coderPrompt:** Edit only `.agents/skills/ws-ship-pr/SKILL.md` Steps 1, 4, 5, 7 (and any head/preflight/`--head` wording). When `workflowMode: true`, resolve head from `state.branch` (orch-passed or read `{us-dir}/{workflow-id}.state.md`); confirm active branch is that name; push/create-pr/pull use it. Standalone remains `config.project.workingBranch`. Do not write `workingBranch`. Merge never-delete applies to the resolved head. Do not edit `PREPARE-CHECKLIST.md` (no workingBranch required row today). Do not bump package version.

### T5 — Lite orch `setup.md` pointer (AC10)

- **parallelGroup:** L1
- **dependsOn:** []
- **Files:** `.agents/skills/ws-spec-to-pr-lite/SKILL.md`
- **Plan steps:** F (lite only; standard already loads `setup.md`)
- **ACs:** AC10
- **Acceptance:**
  - `ws-spec-to-pr-lite/SKILL.md` on-demand-loads `{sharedDir}/setup.md` (at most one sentence; may mention Feature branch gate 5b).
  - Gate protocol is **not** copied into the lite (or standard) SKILL body.
  - `ws-spec-to-pr/SKILL.md` left unchanged (already lists `setup.md` on-demand).
  - No `ws-multi-spec` v1 override; no README / root AGENTS / catalog edits.
- **coderPrompt:** Edit only `.agents/skills/ws-spec-to-pr-lite/SKILL.md`. Add at most one on-demand sentence to load `{sharedDir}/setup.md` before Step 0 (Feature branch gate lives there at 5b). Do not paste the three-choice gate. Do not edit `ws-spec-to-pr/SKILL.md` (already loads setup.md). Do not edit `ws-multi-spec`, README, AGENTS hubs, or catalog.

### T6 — Markdown-contract tests (AC1–AC11)

- **parallelGroup:** L2
- **dependsOn:** ["T1", "T2", "T4", "T5"]
- **Files:** `test/test-feature-branch-gate.js`, `package.json`, `.agents/skills/ws-check-workflows/scripts/check_workflows.py`
- **Plan steps:** G; §5 test map
- **ACs:** AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11
- **Acceptance:**
  - New `test/test-feature-branch-gate.js` follows existing grep-contract pattern (`test/test-quality-gates.js` / `test/test-delivery-commit-artifacts.js`).
  - Functions from plan §5 exist and pass: `testGateThreeChoicesAndHs1`, `testBaseBranchResolution`, `testCreateFromCurrentRecipe`, `testCreateFromBaseAndDirtyStop`, `testStayAndDetached`, `testExistingFeatSlug`, `testResumeSkipAndMismatch`, `testAutoModeStayAndDryRun`, `testShipPrWorkflowHead`, `testSharedSetupNoOrchFork`, `testProtectedStayWarning`.
  - Wired into `package.json` `tests` and `tests:remote` (after existing chained `node test/…` entries; do not bump `version`).
  - Reads use `encoding: 'utf8'`; table/prose regexes are `\r?\n`-aware.
  - Optional: small `check_workflows.py` assertion that `setup.md` has Feature branch gate after Identity and before Baseline, and both orch SKILL.md still reference `setup.md`.
  - No live orch E2E; no `git add -A`; no helper-script fixture suite unless a helper was added (T1 must not add one).
- **coderPrompt:** After T1/T2/T4/T5 prose exists, add `test/test-feature-branch-gate.js` implementing plan §5 AC1–AC11 grep contracts. Wire it into `package.json` `scripts.tests` and `scripts.tests:remote` only (do not bump package version). Match quality-gates style; UTF-8 reads; `\r?\n`-aware. Optionally add a small bootstrap-order assertion in `.agents/skills/ws-check-workflows/scripts/check_workflows.py`. Do not edit skill bodies except that optional check_workflows assertion. Do not invent a live git mutation E2E.

### T7 — Integrity and harness (pre-ship, not version bump)

- **parallelGroup:** L3
- **dependsOn:** ["T1", "T2", "T3", "T4", "T5", "T6"]
- **Files:** `bin/skill-integrity.json`
- **Plan steps:** H
- **ACs:** (pre-ship proof; supports all ACs via `npm run test`)
- **Acceptance:**
  - `npm run generate-integrity && npm run verify-integrity` exit 0; `bin/skill-integrity.json` updated for hashed skill edits.
  - `ws-check-harness` Phases 0–5c → 0 critical.
  - `npm run test` includes the new contract tests and passes.
  - No `package.json` version bump; no `build-site:bump`.
  - No commit (`commitPlanFilesOnlyAtStep8`).
- **coderPrompt:** After T1–T6 content is landed, run `npm run generate-integrity && npm run verify-integrity` (must exit 0), `ws-check-harness` Phases 0–5c to 0 critical, and `npm run test`. Update only `bin/skill-integrity.json` for digest drift. Do not bump `package.json` version. Do not run `build-site:bump`. Do not commit. Fix only integrity drift from prior tasks.

## Out of DAG (optional / deferred)

| Item | Reason |
|------|--------|
| Package version bump / `npm run build-site:bump` | Ship Step 8 owns bump + catalog footer |
| `ws-spec-to-pr/SKILL.md` one-liner | Already on-demand-loads `setup.md` |
| `PREPARE-CHECKLIST.md` | No required row that says confirm `workingBranch` |
| Root `AGENTS.md` / `ws-shared/AGENTS.md` / `README.md` / catalog | Plan: no router or install-narrative change |
| `ws-multi-spec` batch override | Out of scope v1 |
| New helper script | Plan: recipes in `setup.md` unless proven insufficient |
| `cleanup_workflow_git.py` refactor | Out of scope; HEAD skip already protects checked-out branch |
| `validate_state.py` `REQUIRED_KEYS` | Must stay unchanged for old in-flight states |

## Handoff

Artifacts for `ws-implement-tasks`:

- `.agents/plans/workflow-bootstrap-feature-branch/step-03-workflow-bootstrap-feature-branch.plan.exec.md`
- `.agents/plans/workflow-bootstrap-feature-branch/step-03-workflow-bootstrap-feature-branch.exec.dag.json`
