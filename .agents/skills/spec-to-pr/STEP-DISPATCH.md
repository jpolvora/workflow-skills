# Step dispatch (canonical)

**Sole source of truth** for **`spec-to-pr` (standard)** step 0–9 dispatch actions, post-mutating merge notes, and Step 8/9 gate protocols. Load from `SKILL.md` only when advancing or dispatching a step. FSM, invariants, and gates overview stay in `SKILL.md`.

**Dual-mode (mandatory):** This file is **not** the lite step index. [`spec-to-pr-lite`](../spec-to-pr-lite/SKILL.md) keeps its own Steps 0–5 table. Shared gate/ship UX and artifact names stay in [`gates.md`](../shared/gates.md) / [`config-resolution.md`](../shared/config-resolution.md). Pipeline skills `00`–`11` stay orch-agnostic: never assume full vs lite step numbers; orch passes `workflowType`, paths, and flags.

## Step instructions

> **Consistency:** the Skill map in `SKILL.md` (`05-verify-plan` → Step 5, etc.) is authoritative. Keep this table aligned — never dispatch retired ids (`05-verify-sync-plan-us`, `implement-plan`, `plan-us`, …).

| Step | Action | Artifact |
|------|--------|----------|
| 0 | Entry gate (AskQuestion). US/spec provided → provider or skip to write. No args → free-text → `Task` `ws-write-spec`. Optional soft clarify if AC empty. | `step-00-{slug}.spec.md` |
| 1 | Complexity gate → if simple: stub plan + skip to 4. Else `Task` `ws-write-plan`. | `step-01-{slug}.plan.md` |
| 2 | Conditional: skip if eligible; else `Task` `ws-interview`; 2c End auto-confirms 2e | `step-02-{slug}.plan.refined.md` |
| 3 | `Task` `ws-plan-to-tasks`; sequential → skip empty DAG artifacts (log only). Parallel → DAG. | `step-03-*` when parallel |
| 4 | `Task` `ws-implement-tasks` mode build; branch-direct default | verification |
| 5 | `Task` `ws-verify-plan` **quick-score default** vs refined spec ‖ spec; full matrix if score < 7 or `--strict`; **&lt;7 gate** (refine/replan/respec/approve) | `step-05-{slug}.plan.report.md` |
| 6 | `Task` `ws-code-review`; findings → **fix substep** `ws-implement-tasks` fix (not a separate step); soft model tip for stronger review LLM | `step-06-{slug}.review.md` (+ optional `.fix.report.md`) |
| 7 | Auto-skip if `skipTesting` or (no test surface + unit tests green); else `Task` `ws-testing` (Testing) | `step-07-{slug}.testing.*` |
| 8 | Delivery result + **combined ship gate** ([`gates.md`](../shared/gates.md)) → `ws-ship-pr` (`workflowMode: true`, `stopBeforeFixPr: true`). MEMORY sweep after delivery commit. | `step-08-{slug}.result.md` |
| 9 | `Task` `ws-goal-fix-pr` (default) or `ws-fix-pr` (one-shot) after PR exists | PR threads / merge |

Post-mutating: merge files_touched → Step file log; backup preExistingDirty; checkpoint `before-step-{N+1}`.

### Step 5 — Check-implementation (score gate)

Eval implemented code vs **refined spec when present, else `step-00-{slug}.spec.md`**. Publish integer **score 0–10** in Progress Board + report.

| Score | Behavior |
|-------|----------|
| ≥ 7 | Complete step 5; Advance to 6 |
| &lt; 7 | AskQuestion: **Refine** (replay implement + re-check) / **Replan** (back to 1) / **Respec** (back to 0) / **Approve and continue** (log `check-approve-below-7`) |

`autoMode`: do **not** auto-approve below 7 — Pause with score (fail closed).

### Step 6 — Code-review + conditional fix (substep)

| Case | Behavior |
|------|----------|
| Clean (no Critical/Warning) | Complete step 6; Advance to 7 |
| Fixable findings | Substep: `ws-implement-tasks` mode fix → optional re-review slice → complete step 6 |
| User declines fix | Log skip; Advance with findings (or Pause) |

Fix is **not** its own `completedSteps` entry — log `review-fix` in gate history.

### Step 8 — Ship (delivery + push/PR)

**Order:** [`protocols/delivery-result.md`](protocols/delivery-result.md) (writes `step-08-{slug}.result.md` **with Benchmark Total wall-clock time**) → render Step 8 final board Telemetry ([`progress-board.md`](protocols/progress-board.md)) → **combined delivery + ship AskQuestion** → on delivery commit: MEMORY sweep → optional temp delete per [`protocols/artifact-cleanup.md`](protocols/artifact-cleanup.md).

Telemetry/`--elapsed` still required under `autoMode`/`fullMode` (State Hygiene → HS-5 if missing).

**Combined gate** ([`gates.md`](../shared/gates.md)):

1. **Commit plan + result, then create PR** (Recommended when `fullMode`)
2. **Commit plan + result, push only**
3. **Commit plan + result, skip PR**
4. **Skip delivery commit and skip shipping**
5. **Pause**

G2-delivery stages plan (refined if present) + `step-08-{slug}.result.md` only.

Dispatch `ws-ship-pr` with `workflowMode: true`, `shipAction`, `stopBeforeFixPr: true` — **no goal-fix loop inside ship**; orch Advance to 9 when PR created.

### Step 9 — Fix-PR

After Step 8 when `shipAction: create-pr` and PR exists:

1. **Wait for code-review / CI feedback** (same policy as `ws-ship-pr` Step 6 settle: ≥300s post-push, then poll checks + threads). Do not merge yet.
2. Dispatch `ws-goal-fix-pr` (default loop) or `ws-fix-pr` (one-shot) until **no open issues to fix** (`activeThreads == 0`).
3. **Merge** via SCM provider `merge-pr` only after step 2 converges and required checks are green. Never merge with open review threads or failing required checks.

Stop: max exhausted · escalate · merge blocked · cancelled · PR closed · checks red after convergence attempts.
