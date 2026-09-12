# Spec-to-PR Delivery Pipeline (`delivery`)

## Feature Overview

The delivery pipeline turns an approved `*.spec.md` contract into a merged pull request through two orchestrators: `ws-spec-to-pr` (standard, steps 0–9) and `ws-spec-to-pr-lite` (fast, steps 0–5). `ws-spec-multi` classifies each spec and runs one pipeline at a time; `ws-classify-complexity` routes below-threshold work to lite. A run starts at bootstrap with an explicit feature-branch strategy (`feat/{slug}` from HEAD or base, or stay on current), proceeds through spec, plan, interview, DAG task breakdown, sequential-or-parallel implementation, verify scoring, adversarial code review, testing, close, ship, and fix-PR convergence. `ws-task-lifecycle` covers prompt-driven work outside Spec-to-PR via Intake → Implementation → Completion tracking without a plan tree.

## Business Rules & Logic

- **Planning is never skipped**: `autoMode` automates only gate index 0; standard Steps 1–3 (plan, interview, tasks) always run and Step 4 dispatch fails closed when plan artifacts are missing.
- **Verify bar is configurable**: Step 5 advances only at `defaults.minVerifyScore` (default 9); uncovered negative scenarios cap 8, critical stack-invariant violations cap below the bar and force `scoreAndRefine`.
- **Commit before review**: product files (`files_touched` only, never plan dirs or secrets) are committed after verify and again after review fixes; review inspects the committed `base...HEAD` diff and STOPs on uncommitted workflow files.
- **Close before ship**: implementation closes with `status: completed` and `shipStatus: pending` (MEMORY, changelog, delivery artifacts persisted) before any push/PR; `ws-ship-pr` in `workflowMode` only pushes and opens the PR.
- **Fix-PR discipline**: every batch plans on the reviewer model then executes on the fix model; `resolveReviewThread` mutation runs after reply verification; Hermes rules require prior-work sweep, whole-class fixes or recorded exemptions, and sabotage/CI-triage hygiene.
- **Execution control**: `enableDag: false` forces sequential dispatch; `testingModel` selects the Step 7 executor (lite ignores it); step artifacts are stamped with the per-step result, and repeated file-list flags accumulate rather than last-win.
- **Retired**: cooperative session leases are retired — parallel work uses git worktrees, not lease files.

## Technical Architecture

- **State**: single `{workflow-id}.state.json` SoT (`handoffs`, `acLedger`, `shipStatus`) with rendered `.state.md` and `telemetry.jsonl`; shared `workflow_state.cjs` / `validate_state.cjs --pre-advance N` across standard and lite.
- **Configuration**: `defaults.minVerifyScore`, `defaults.enableDag`, `defaults.testingModel`, `defaults.deliveryCommitArtifacts` (refined plan on by default, everything else opt-in), `defaults.modelsPreset` / `modelPresets` / `stepModels` (substep role > numeric step > preset > phase key > `current`), `fixPrPlan` / `fixPrExec` roles.
- **Branch & PR**: `state.branch` is the PR head; `workingBranch` and base branch are never rewritten; protected branches (`main`/`master`/`develop`) are deny-listed from cleanup; Phase A git cleanup runs only at terminal `shipStatus`.
- **Timesheet proof**: `ws-activity-report` bills Human Total inclusive of agent supervision (Human ≥ Agent Running; idle/AFK > 30 min non-billable).
- **Provenance**: living synthesis of specs 0006, 0016, 0021–0024, 0029, 0035, 0043, 0047, 0054, 0062, 0068, 0073–0074.
