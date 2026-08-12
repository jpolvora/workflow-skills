---








name: ws-spec-to-pr-lite
version: 0.3.10
description: Fast sequential Spec-to-PR lite orchestrator (Steps 0–5). Trigger when user requests lite/fast spec-to-PR delivery.
invocation_names:
  - spec-to-pr-lite
  - ws-spec-to-pr-lite
---

# Spec-to-PR Lite — Orchestrator

> When this skill is loaded, output "ws-spec-to-pr-lite loaded."

Sequential spec→ship orchestrator executing inline steps (0–5) using the same pipeline skills as [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md). Do **not** use `STEP-DISPATCH.md` for lite step numbers.

**Specs family:** Role = single-feature **lite** Spec→PR. Same entry rules as standard for specs (`{specsDir}` draft → register; or provider). Prefer when `ws-classify-complexity` recommends lite. Batch → [`ws-multi-spec`](../ws-multi-spec/SKILL.md). Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

Before Step 0, on-demand load [`setup.md`](../ws-shared/setup.md) for bootstrap (Feature branch gate: §5b).

## Native Tool Contract

Aliases: [`tools.md`](../ws-shared/tools.md). At **every step boundary** in normal mode: use `user-gate` with ≥2 options per [`gates.md`](../ws-shared/gates.md) (host structured-choice when available; markdown fallback); `autoMode` → auto-gate index 0; cancel → HS-1.

## Invariants & Mode Rules

1. **Isolation:** `workflowType: lite` — never cross-resume with `standard`.
2. **Execution:** Inline in main session (no subagent dispatch).
3. **State & Telemetry:** Run `python {skillsRoot}/ws-spec-to-pr-lite/scripts/update_state.py` each step with measured `--elapsed` and `--jsonl-out {plansDir}/{slug}/telemetry/step-{NN}.jsonl`. Missing telemetry → **HS-5**.
4. **Artifacts:** `step-00` spec · `step-01` plan · `step-08` result (shared names with standard).
5. **Commits & Cleanup:** Code in implement/review-fix; configured delivery artifacts at Step 4 G2-delivery (`defaults.deliveryCommitArtifacts` / [`ARTIFACTS.md`](../ws-spec-to-pr/ARTIFACTS.md) § Step 8). On `status → completed`, run Phase A git cleanup: `python {skillsRoot}/ws-spec-to-pr/scripts/cleanup_workflow_git.py --workflow-id {workflow-id}`.
6. **Auto Mode Models:** In `autoMode: true`, switch models per phase if `config.json` → `defaults` defines `plannerModel` (Steps 0–1), `executionModel` (Step 2), `reviewerModel` (Step 3). Fallback to active model if switch fails.
7. **Fable & Score/Refine:** Optional `fable.enabled` (domain@1, judge@3, verify@4). Optional `scoreAndRefine` (task score 0–10 in `step-05`, 2nd pass report in `step-08`).
8. **Config Entry Check:** Verify local project `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, prompt `user-gate` to run [`ws-configure-project`](../ws-configure-project/SKILL.md).
9. **Runtime audit:** When `defaults.enableAuditing` is `true`, follow [`ws-audit`](../ws-audit/SKILL.md) (init at bootstrap, append per step, finalize + upstream issue gate at end). When `false`, skip.

## Steps 0–5 Index

| Step | Label | Skill / Action | Verifiable Exit Criteria (Done When) |
|------|-------|----------------|--------------------------------------|
| 0 | Spec | providers / `ws-write-spec` (+ register) | `{specsDir}/{slug}.spec.md` exists **and** `step-00-{slug}.spec.md` registered (spec of record always first, any provider) + classifier user-gate completed |
| 1 | Planning | `ws-write-plan` | `step-01-{slug}.plan.md` created & validated |
| 2 | Implementation | `ws-implement-tasks` | Code modified + build/tests pass (`config.json.verification`) |
| 3 | Review | `ws-code-review` (+ fix) | `step-06-{slug}.review.md` clean (0 Critical/Warning remaining; max 3 loops) |
| 4 | Ship | orch + `ws-ship-pr` | `step-08-{slug}.result.md` created + PR created/skipped per menu |
| 5 | Fix-PR | `ws-goal-fix-pr` / `ws-fix-pr` | PR merged or zero active threads (`activeThreads == 0`) |

**No Step 7 Testing:** lite does not dispatch `ws-testing`. Optional **mutation testing** (kill/survive gate) is **standard-orch Step 7 only** — out of scope for lite.

## Post-Mutating Transition Sequence (Steps 0–4 → 1–5)

After completing step N (0..4), before step N+1:
1. **State Hygiene:** `update_state.py` with measured `--elapsed`, file lists, `--gate-choice`, `--jsonl-out`, and `--bypassed` (if `skipQualityGates`).
2. **Checkpoint:** `git tag uswf/{workflow-id}/before-step-{N+1}`.
3. **Pre-Advance CI:** Unless `skipQualityGates`, run `python {skillsRoot}/ws-spec-to-pr-lite/scripts/validate_state.py {plansDir}/{slug}/{workflow-id}.state.md --pre-advance {N+1}`. Exit code > 0 → **HS-5** (STOP).
4. **Progress Board:** Display board → transition gate → proceed to step N+1.

## Step 0 — Pipeline Classifier

After `step-00-{slug}.spec.md` exists and before Step 1:
1. Run [`ws-classify-complexity`](../ws-classify-complexity/SKILL.md) → writes `step-00-{slug}.classify.md`.
2. **User Gate** (unless `autoMode` or `skipQualityGates`): Accept recommendation (Recommended) · Override to standard · Override to lite.

## Quality Gate Bypass (`skipQualityGates`)

See [`gates.md`](../ws-shared/gates.md) § Quality gate bypass. Active via `--skip-gates` or `config.json` → `invariants.skipQualityGates`.

## Triggers

```
@[ws-spec-to-pr-lite] [auto|dry-run|skip-testing|skip-tests|skip-gates|full|strict] [US {issue_id} | {name}.spec.md | "description"]
/ws-spec-to-pr-lite [flags] [US {issue_id} | {name}.spec.md | "description"]
```
