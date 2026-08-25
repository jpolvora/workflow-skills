# Context — fix-pr batch plan → execute dual-model

Decisions for `fix-pr-batch-plan-exec.spec.md`. Recommended option first.

## Q1 — What is a "batch"?

| Option | Meaning |
|--------|---------|
| **A (Recommended)** | One Act round of `ws-goal-fix-pr` (or one standalone `/fix-pr` run): all active threads fetched and scored for that pass share one plan then one execute. |
| B | Per blocking thread (score 6–10): plan then execute for each thread. |
| C | Agent-chosen clusters of related threads within a round. |

**Why A:** Matches today's `plan-gate.md` + Act round; avoids N×2 model switches; still upgrades every issue batch the loop actually processes.

## Q2 — Where do the two dispatches live?

| Option | Meaning |
|--------|---------|
| **A (Recommended)** | Inside `ws-goal-fix-pr` Act round and standalone `ws-fix-pr` when the host can `dispatch-agent`: plan subagent then exec subagent. Orch Step 9 still dispatches the goal/one-shot skill once. |
| B | Orch Step 9 expands into two FSM-visible dispatches per round (new orch ceremony). |
| C | Docs-only: same session must "think plan then code" without model roles. |

**Why A:** Mirrors Step 6 review → `reviewFix` without growing the 0–9 FSM. Lite stays session-inline with the same plan-before-edit artifact order.

## Q3 — Model resolution keys

| Option | Meaning |
|--------|---------|
| **A (Recommended)** | New `stepModels` roles `fixPrPlan` and `fixPrExec`. Fallbacks: `fixPrPlan` → `reviewerModel`; `fixPrExec` → `executionModel` (same bucket as `reviewFix`). Numeric `stepModels["9"]` remains the Step 9 outer skill unless overridden per role. |
| B | Reuse `reviewerModel` / `reviewFix` strings only (no new keys). |
| C | Single `stepModels["9"]` for both (no dual-model). |

**Why A:** Configurable without overloading Step 6's `reviewFix`; presets can seed distinct plan vs fix models.

## Q4 — Auto-Fix CI runner path

| Option | Meaning |
|--------|---------|
| **A (Recommended)** | Out of scope for this spec: cooperative/human agent path only. `AUTO_FIX.md` keeps single-pass unless a follow-up. |
| B | Require the same dual-model split for Auto-Fix. |

**Why A:** Auto-Fix is a constrained JSON runner, not `dispatch-agent`.
