# Spec-to-PR Delivery Pipeline (`delivery`)

> Provenance: `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr-lite/SKILL.md`, `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`, living synthesis of specs 0006, 0016, 0021–0024, 0029, 0035, 0043, 0047, 0054, 0062, 0068, 0073–0074.

## Feature

The Spec-to-PR delivery pipeline turns an approved `*.spec.md` contract into a merged pull request through two orchestrators that share one project hub and one state contract. The standard orchestrator (`ws-spec-to-pr`) runs steps 0 through 9: spec registration, plan authoring, plan interview, DAG task breakdown, implementation, verify scoring, adversarial code review, testing, close, ship, and fix-PR convergence. The lite orchestrator (`ws-spec-to-pr-lite`) compresses the same guarantees into steps 0 through 5 for work that passes `ws-classify-complexity` thresholds. `ws-spec-multi` classifies each queued spec and dispatches exactly one pipeline at a time with isolated `workflowType` and no cross-resume between standard and lite. Outside Spec-to-PR, `ws-task-lifecycle` covers prompt-driven work through Intake → Implementation → Completion without creating a plan tree.

## How it works

A run begins at bootstrap with an explicit feature-branch strategy: create `feat/{slug}` from HEAD or base, or stay on the current branch. Standard Steps 1 through 3 always execute even in `autoMode`; `autoMode` automates only gate index 0, and Step 4 dispatch fails closed when plan artifacts are missing. Step 5 (`ws-plan-verify`) advances only when the derived score from `ac-ledger.json` reaches `defaults.minVerifyScore` (default 9). Uncovered negative scenarios cap the score at 8, and critical stack-invariant violations cap below the bar and force `scoreAndRefine` back into implementation.

Product files commit before review, never plan directories or secrets. After Step 5 reaches the verify bar, only `files_touched` paths stage into a product commit. Step 6 (`ws-code-review`) inspects the committed `base...HEAD` diff and STOPs when workflow files remain uncommitted. Review fixes get a separate product commit before testing or close. Implementation closes at Step 8 with `status: completed` and `shipStatus: pending` while MEMORY, changelog, and optional delivery artifacts persist; `ws-ship-pr` in `workflowMode` only pushes and opens the PR after close.

Fix-PR batches always plan on the reviewer model (`fixPrPlan` → `reviewerModel`) and execute on the fix model (`fixPrExec` → `executionModel`). The `resolveReviewThread` mutation runs only after reply and commit verification. Hermes rules require a prior-work sweep, whole-class fixes or recorded exemptions, and sabotage or CI-triage hygiene before resolving threads. When `defaults.enableDag` is false (the default), Step 4 tasks dispatch sequentially; when true, at most three parallel subagents may run. Cooperative session leases are retired; parallel work uses git worktrees instead of lease files.

## Backend

State lives in a single `{workflow-id}.state.json` SoT with `handoffs`, `acLedger`, and `shipStatus`, plus a rendered `.state.md` companion and append-only `telemetry.jsonl`. Shared helpers `workflow_state.cjs` and `validate_state.cjs --pre-advance N` enforce the same contracts across standard and lite. Configuration keys that govern delivery include `defaults.minVerifyScore`, `defaults.enableDag`, `defaults.testingModel`, `defaults.deliveryCommitArtifacts` (refined plan on by default, everything else opt-in), `defaults.modelsPreset` with `modelPresets` and `stepModels` (substep role beats numeric step beats preset beats phase key beats `current`), and the fix-PR roles `fixPrPlan` / `fixPrExec`.

Branch discipline keeps `state.branch` as the PR head while `project.workingBranch` and the base branch never rewrite. Protected branches (`main`, `master`, `develop`) deny-list from cleanup, and Phase A git cleanup runs only at terminal `shipStatus`. Timesheet proof comes from `ws-activity-report`, which bills Human Total inclusive of agent supervision (Human ≥ Agent Running when agent time is positive) and treats idle or AFK gaps over 30 minutes as non-billable.
