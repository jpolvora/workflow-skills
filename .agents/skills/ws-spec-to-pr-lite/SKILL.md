---
name: ws-spec-to-pr-lite
version: 0.3.40
description: Fast Spec-to-PR (steps 0–5). Plan, implement, commit, review, ship. Trigger for lite/fast delivery.
disable-model-invocation: true
invocation_names:
  - spec-to-pr-lite
  - ws-spec-to-pr-lite
---

# Spec-to-PR Lite — Orchestrator

> When this skill is loaded, output "ws-spec-to-pr-lite loaded."

Sequential spec→ship orchestrator executing inline steps (0–5) using the same pipeline skills as [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md). Do **not** use `STEP-DISPATCH.md` for lite step numbers.

**Specs family:** Role = single-feature **lite** Spec→PR. Same entry rules as standard for specs (`{specsDir}` draft → authoring validate → register; tracker fetch → `ws-write-spec` agentic reformulation → authoring validate → register). Newly written spec with authoring validation non-zero: **skip** `ws-local-spec-provider` register. Pre-closure existing spec: register allowed under `validate_spec.cjs` `--mode=compat`. Downstream steps always read the enhanced local spec copy. Prefer when `ws-classify-complexity` recommends lite. Batch → [`ws-multi-spec`](../ws-multi-spec/SKILL.md). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

Before Step 0, on-demand load [`setup.md`](../ws-shared/setup.md) for bootstrap (Feature branch gate: §5b; Resume pre-check vs `{integrationBranch}`: §4c).

## Native Tool Contract

Aliases: [`tools.md`](../ws-shared/tools.md). At **every step boundary** in normal mode: use `user-gate` with ≥2 options per [`gates.md`](../ws-shared/gates.md) (host structured-choice when available; markdown fallback); `autoMode` → auto-gate index 0; cancel → HS-1.

## Invariants & Mode Rules

1. **Isolation:** `workflowType: lite` — never cross-resume with `standard`.
2. **Execution:** Inline in main session (no subagent dispatch).
3. **State & Telemetry:** Run `node {skillsRoot}/ws-spec-to-pr-lite/scripts/update_state.cjs dispatch` before each inline step and `finish` afterward with `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl`; elapsed time is derived from those timestamps and authored `--elapsed` is rejected. Missing telemetry → **HS-5**.
4. **Artifacts:** `step-00` spec · `step-01` plan · `step-08` result (shared names with standard).
5. **Commits & Cleanup:** Required **G2-code after Step 2 before Step 3**; second G2-code after Step 3 review-fix if product files remain (`commit-code`, path-scoped `files_touched` — [`gates.md`](../ws-shared/gates.md) § Required G2-code save points). Configured delivery artifacts at Step 4 G2-delivery (`defaults.deliveryCommitArtifacts` / [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md) § Step 8). On `status → completed`, follow [`artifact-cleanup.md`](../ws-spec-to-pr/protocols/artifact-cleanup.md) Phase A: `python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}`.
6. **Auto Mode Models:** `ws-spec-to-pr-lite` dispatches no `dispatch-agent` subagents (Invariant 2); the session executes inline under `{currentModel}` without session model switching. Resolve models from `defaults.modelsPreset` / `modelPresets`, optional `stepModels` `"0"`–`"5"`, and phase buckets 0–1 / `plannerModel`, 2 / `executionModel`, 3 / `reviewerModel` (Step 3), 4–5 session unless step override — **telemetry / banner only**. Do **not** read or apply `defaults.testingModel` or role keys `dag`, `scoreAndRefine`, `reviewFix`, `fixPrPlan`, or `fixPrExec`, even if set. Lite Step 3 review-fix stays on numeric Step `3`; Fix-PR runs gate-only plan then execute inline on `currentModel`, while numeric Step `5` remains the only outer telemetry row.
7. **Fable & Score/Refine:** Optional `fable.enabled` (domain@1, judge@3, verify@4). Optional `scoreAndRefine` (task score 0–10 in `step-05`, 2nd pass report in `step-08`; wide-context simplify per [`gates.md`](../ws-shared/gates.md) § Score & Refine).
8. **Config Entry Check:** Verify local project `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, prompt `user-gate` to run [`ws-configure-project`](../ws-configure-project/SKILL.md).
9. **MEMORY Consult:** In Steps 1, 2, and 3: grep `{sharedDir}/MEMORY.md` for 3–8 plan/spec keywords before coding; record `memory_consult` in step outputs.
10. **Verbose preview:** When `defaults.verboseMode` is explicit `true`, the session model (lite is inline) must **analyze this run** and print `Starting step {N} ({Label}):` plus 4–8 `*` bullets before any tool call for that step (goal, lookups, actions, conditional writes, next-step readiness). Do **not** copy a canned list. Omitted/`false` → silent. Schema/`ws-configure-project` seed writes `true`.

## Steps 0–5 Index

| Step | Label | Skill / Action | Verifiable Exit Criteria (Done When) |
|------|-------|----------------|--------------------------------------|
| 0 | Spec | providers / `ws-write-spec` (+ authoring validate; skip register on fail); **prior-work sweep** before plan/code; after register `node {skillsRoot}/ws-spec-to-pr/scripts/ac_ledger.cjs init --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/ac-ledger.json" --slug {slug} --workflow-id {workflow-id}` | `{specsDir}/{slug}.spec.md` exists (enhanced via `ws-write-spec`) **and** authoring validation PASS **and** `step-00-{slug}.spec.md` registered + `ac-ledger.json` + classifier user-gate completed |
| 1 | Planning | `ws-write-plan` (design-intent git log for modifications); then `node {skillsRoot}/ws-spec-to-pr/scripts/plan_index.cjs build --plan "{us-dir}/step-01-{slug}.plan.md" --spec "{us-dir}/step-00-{slug}.spec.md" --output "{us-dir}/plan.index.json"` | `step-01-{slug}.plan.md` + `plan.index.json` created & validated |
| 2 | Implementation | `ws-implement-tasks` (**defect-class repo-wide sweep**) | Code modified + build/tests pass (`config.json.verification`); then required G2-code (skip if empty) |
| 3 | Review | `ws-code-review` (+ fix; sibling modules beyond diff) | Committed `{base}...HEAD`; `step-06-{slug}.review.md` clean (0 Critical/Warning remaining; max 3 loops); then G2-code of review fixes if any |
| 4 | Ship | orch + `ws-ship-pr` (`check-pr-status` CI triage + **`comment-issue`** on create) | `step-08-{slug}.result.md` created + PR created/skipped per menu |
| 5 | Fix-PR | `ws-goal-fix-pr` / `ws-fix-pr`: for each batch, write and validate the gate-only plan before any product edit, then execute inline (`check-pr-status` baseline vs diff); ignore role model switches | Complete plan + execute/proactive evidence; PR merged or zero active threads (`activeThreads == 0`) |

**No Step 5/7 verify or testing:** lite does not dispatch `ws-verify-plan` or `ws-testing`. **Regression sabotage** and **mutation testing** are **standard-orch Steps 5 and 7 only** — out of scope for lite.

## Post-Mutating Transition Sequence (Steps 0–4 → 1–5)

After completing step N (0..4), before step N+1:
1. **State Hygiene:** `update_state.cjs` dispatch/finish with file lists, structured `--gate-decision`, and `--jsonl-out`; use its `bypass` operation when `skipQualityGates`.
2. **G2-code after Step 2 before Step 3** (required; skip if empty stage). After Step 3 review-fix: G2-code if product files remain. Algorithm: [`gates.md`](../ws-shared/gates.md) § Required G2-code save points / [`tools.md`](../ws-shared/tools.md) `commit-code`. Fail-closed: uncommitted workflow product files → do not dispatch Step 3 `ws-code-review`. `dryRun` simulates only. Other steps: skip.
3. **Checkpoint:** `git tag uswf/{workflow-id}/before-step-{N+1}` @ HEAD **after** any G2-code.
4. **Pre-Advance CI:** Unless `skipQualityGates`, run `node {skillsRoot}/ws-spec-to-pr-lite/scripts/validate_state.cjs {plansDir}/{slug}/{workflow-id}.state.md --pre-advance {N+1}`. Exit code > 0 → **HS-5** (STOP). Does **not** skip G2-code.
5. **Progress Board:** Display board → transition gate → proceed to step N+1.

## Step 0 — Pipeline Classifier

After `step-00-{slug}.spec.md` exists and before Step 1:
1. Run [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) → writes `step-00-{slug}.classify.md`.
2. **User Gate** (unless `autoMode` or `skipQualityGates`): Accept recommendation (Recommended) · Override to standard · Override to lite.

## Lite safety valve

After `step-01-{slug}.plan.md` exists (opening implement step list in plan §3 / Step-by-Step), if that list has **> 5** atomic steps, present `user-gate` (recommended first): **Continue lite** / **Switch to `ws-spec-to-pr` standard**. `dagThresholds.maxImplementationSteps` stays **3** for classify; this valve is independent. `autoMode`: continue lite.

## Quality Gate Bypass (`skipQualityGates`)

See [`gates.md`](../ws-shared/gates.md) § Quality gate bypass. Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`.

## Triggers

```
/ws-spec-to-pr-lite [flags] [US {issue_id} | {name}.spec.md | "description"]
```
