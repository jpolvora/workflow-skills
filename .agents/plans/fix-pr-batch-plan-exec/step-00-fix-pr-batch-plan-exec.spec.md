---
id: null
slug: fix-pr-batch-plan-exec
title: "fix-pr: plan substep (reviewer model) then execute (fix model) per batch"
source: local
specDate: 2026-08-25
step: 0
workflowId: fix-pr-batch-plan-exec-20260825T163900Z
status: active
startedAt: "2026-08-25T15:54:01.633Z"
endedAt: "2026-08-25T15:54:01.633Z"
acRefs: []
---
# Specification — fix-pr: plan substep (reviewer model) then execute (fix model) per batch

## Description

Upgrade the PR thread fix path so **every issue batch** runs as two substeps: (1) a **plan** pass under a **reviewer-class model**, then (2) an **execute** pass under a **fix/execution-class model**. Today Step 9 / `ws-goal-fix-pr` / `ws-fix-pr` use a single dispatch (or one session) for score → plan-gate → surgical fix; `plan-gate.md` is only a confirmation checklist, not a dual-model plan→exec contract. Step 6 already separates review (`reviewerModel`) from review-fix (`reviewFix` → `executionModel`); fix-pr must get the same discipline for remote review/CI batches.

### Problem

1. Scoring, fix planning, and code edits often share one model turn, so planning quality and fix execution are not independently tunable.
2. `stepModels` documents roles `dag`, `scoreAndRefine`, `reviewFix` but **not** fix-pr plan/exec roles; Step 9 falls through to `stepModels["9"]` or session only.
3. Agents can jump to edits without a durable plan artifact that the exec pass must follow.

### Goal

For each **batch** (one `ws-goal-fix-pr` Act round, or one standalone `/fix-pr` invocation):

1. **Plan substep** (`fixPrPlan`): fetch/score/classify threads; write a durable fix plan (extend `plan-gate.md` or successor) under **reviewer-class** model resolution; no product code edits in this substep.
2. **Execute substep** (`fixPrExec`): apply surgical + proactive class fixes per that plan under **execution-class** model resolution; verify, resolve, learn, push.

### Scope (touch)

| Artifact | Change |
|----------|--------|
| `ws-fix-pr/SKILL.md` | Split Steps 3–5 into plan-then-exec; forbid product edits in plan; bind model roles |
| `ws-goal-fix-pr/SKILL.md` | Act round must dispatch plan then exec (or require both substeps inside `ws-fix-pr`) |
| `ws-spec-to-pr/STEP-DISPATCH.md` + `PROTOCOLS.md` / `tools.md` | Document `fixPrPlan` / `fixPrExec` resolve order; Step 9 still one outer skill |
| `ws-shared/config.schema.json` + `config.json.example` + presets | Allow `stepModels.fixPrPlan` / `fixPrExec`; seed comments |
| `ws-configure-project` model interview | Mention the two new roles |
| `ws-fix-pr` / `ws-goal-fix-pr` evals + focused tests | Assert plan-before-edit + role names / fallbacks |
| Lite orch docs | Same artifact order; models telemetry-only (no `dispatch-agent`) |

### Design Intent

Mirror Step 6's review → fix model split without adding a new FSM step. Outer orch Step 9 / lite Step 5 still dispatch `ws-goal-fix-pr` or `ws-fix-pr` once. Dual-model lives **inside** the fix-pr batch. Product decisions: [fix-pr-batch-plan-exec.context.md](fix-pr-batch-plan-exec.context.md).

## Acceptance Criteria

- AC1: A batch is defined as one `ws-goal-fix-pr` Act round or one standalone `/fix-pr` run (all threads scored for that pass), not per-thread dual dispatch.
- AC2: Every batch completes a plan substep before any product-file edit by writing the fix plan artifact (`plan-gate.md` or documented successor) with scores, proposed actions, and proactive field placeholders.
- AC3: Plan substep forbids product code edits, commits, pushes, and remote `resolve-thread` mutations (gate file writes only).
- AC4: Execute substep follows the batch plan artifact and records any plan amendment on the gate before further edits.
- AC5: When the host supports `dispatch-agent`, plan runs under model role `fixPrPlan` and execute under `fixPrExec`, with `--model` / `--substep` recorded when orch-owned.
- AC6: Model resolve order is `stepModels[fixPrPlan|fixPrExec]` → preset steps → phase fallback (`fixPrPlan` → `reviewerModel`; `fixPrExec` → `executionModel`) → session, with empty/unsupported falling through to session without aborting.
- AC7: `config.schema.json`, `config.json.example` presets, `tools.md`, and `STEP-DISPATCH.md` list roles `fixPrPlan` and `fixPrExec` beside `dag` / `scoreAndRefine` / `reviewFix`.
- AC8: Lite orch ignores dual-model switches (session `currentModel`) but still enforces plan-before-edit artifact order for each batch.
- AC9: `ws-goal-fix-pr` Act round Done-when requires plan evidence on the gate plus execute with proactive sweep before push/resolve of score 6–10 threads.
- AC10: Cooperative proactive class sweep, CI baseline triage, and post-round `ws-self-learning` remain required on the execute substep.
- AC11: `ws-fix-pr` / `ws-goal-fix-pr` evals or focused `test/*.js` assert plan-before-edit language and the two role names / fallbacks with no dual folders or shims.
- AC12: Auto-Fix CI path (`AUTO_FIX.md`) is unchanged by this spec.
- AC13: Language remains en-us; skill bodies stay host-neutral; path tokens use `{skillsRoot}` / `{sharedDir}` / `{plansDir}` / `{reviewsDir}` only.

## Out of Scope

| Item | Reason |
|------|--------|
| New FSM step number beyond 0–9 | Dual-model is a fix-pr internal substep, like Step 6 review-fix |
| Per-thread plan→exec model switches | Cost; batch = Act round (context Q1-A) |
| Changing SCM provider APIs / `list-threads` / `resolve-thread` contracts | Unrelated |
| Rewriting `AUTO_FIX.md` dual-model | Constrained JSON runner (context Q4-A) |
| Merging `ws-fix-pr` into another skill | Keep skill boundaries |
| Rewriting archived round reports under `{reviewsDir}` | Historical |

## Assumptions & Open Questions

| # | Assumption / Question | Default if unresolved |
|---|----------------------|------------------------|
| A1 | Plan artifact stays under `{skillsRoot}/ws-fix-pr/runs/…` (uncommitted) unless a follow-up moves it to `{us-dir}` | Keep current `plan-gate.md` path; extend fields |
| A2 | Confirmation gate under goal-fix remains auto-yes after plan file is written | Unchanged |
| A3 | Numeric `stepModels["9"]` is outer Step 9 skill model when roles unset | Roles override for plan/exec subagents |
| Q1 | Exact `--substep` token spelling in `update_state.cjs` | Use `fixPrPlan` / `fixPrExec` identically to `reviewFix` |
| Q2 | Whether standalone `/fix-pr` without `dispatch-agent` must print model hints only | Same-session sequential plan then exec with Model: header when host allows |

## Original Issue Context

```text
improve the fix-pr process, every batch of issue fix should have a plan substep,
with a reviewer model, then an execution with a fix model. check if this is
already implemented, case yes, end, else, create a spec/plan register
```

- Keywords: fix-pr, goal-fix-pr, plan substep, reviewerModel, executionModel, batch, dual-model
- Baseline check (2026-08-25): **not implemented** — Step 9 single dispatch; `plan-gate` confirmation only; `stepModels` roles stop at `reviewFix`; Steps 8–9 → session unless `stepModels["8"|"9"]`
- Related: Step 6 review → `reviewFix`; `models-preset-and-per-step`; `fix-pr-proactive-class-sweep`

## Notes

- Implementation plan should update resolve helpers / docs in the same PR as skill body changes.
- Prefer linking Step 6 review-fix wording over inventing a third fix vocabulary.
