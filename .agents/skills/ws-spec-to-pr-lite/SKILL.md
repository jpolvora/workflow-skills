---










name: ws-spec-to-pr-lite
version: 0.0.103
description: Fast sequential Spec-to-PR lite delivery orchestrator FSM (Steps 0–5). Streamlined spec → plan → implement → review → ship → fix-pr pipeline for fast feature delivery.

invocation_names:
  - spec-to-pr-lite
  - ws-spec-to-pr-lite
---

# Spec-to-PR Lite — Orchestrator

Sequential spec→ship using the **same** pipeline skills as [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md). Dual-mode: [`gates.md`](../ws-shared/gates.md) · [`config-resolution.md`](../ws-shared/config-resolution.md) · [`setup.md`](../ws-shared/setup.md). Do **not** use [`STEP-DISPATCH.md`](../ws-spec-to-pr/STEP-DISPATCH.md) for lite step numbers (standard 0–9 only).

## Native tool contract

Canonical aliases: [`tools.md`](../ws-shared/tools.md). At **every step boundary** in normal mode: prefer `AskQuestion` (host structured choice) with ≥2 options per [`gates.md`](../ws-shared/gates.md); markdown fallback when unavailable; `autoMode` → auto-gate index 0; cancelled → HS-1.

## Invariants

| Topic | Rule |
|-------|------|
| Entry | Same matrix as standard (`setup.md`) — GitHub, ADO, local-spec, free-text |

# Spec-to-PR Lite — Orchestrator

Sequential spec→ship using the **same** pipeline skills as [`ws-spec-to-pr`](../ws-spec-to-pr/SKILL.md). Dual-mode: [`gates.md`](../ws-shared/gates.md) · [`config-resolution.md`](../ws-shared/config-resolution.md) · [`setup.md`](../ws-shared/setup.md). Do **not** use [`STEP-DISPATCH.md`](../ws-spec-to-pr/STEP-DISPATCH.md) for lite step numbers (standard 0–9 only).

## Native tool contract

Canonical aliases: [`tools.md`](../ws-shared/tools.md). At **every step boundary** in normal mode: prefer `AskQuestion` (host structured choice) with ≥2 options per [`gates.md`](../ws-shared/gates.md); markdown fallback when unavailable; `autoMode` → auto-gate index 0; cancelled → HS-1.

## Invariants

| Topic | Rule |
|-------|------|
| Entry | Same matrix as standard (`setup.md`) — GitHub, ADO, local-spec, free-text |
| Type | `workflowType: lite` — never cross-resume with `standard` |
| Exec | Inline in main session (no subagent dispatch) |
| State | `python .agents/skills/ws-spec-to-pr-lite/scripts/update_state.py` each step; measured `--elapsed` required; missing telemetry = hygiene fail |
| Artifacts | `step-00` spec · `step-01` plan · `step-08` result (shared names with standard) |
| Commits | Code in implement/review-fix; plan+result at Step 4 G2-delivery |
| Ship / Fix-PR | Step 4 combined gate + `ws-ship-pr` (`workflowMode`, `stopBeforeFixPr`); Step 5 `ws-goal-fix-pr` / `ws-fix-pr` |
| Worktree | Branch-direct default; worktree when `plans.useWorktrees=true` |
| Fable | When `config.json.fable.enabled`: domain@1, judge@3, verify before PR@4 |
| `scoreAndRefine` | Score plan tasks (0–10) in `step-05-{slug}.score-analysis.md`, run 2nd pass implementation, and write `step-08-{slug}.second-pass-report.md` |

Skips interview, DAG, check-implementation, Testing vs standard.

## Steps 0–5

| Step | Label | Skill | Notes |
|------|-------|-------|-------|
| 0 | Spec | providers / `ws-write-spec` | Soft clarify if AC empty |
| 1 | Planning | `ws-write-plan` | No interview/DAG |
| 2 | Implementation | `ws-implement-tasks` build | Build+tests unless `skipTests`; 2nd pass re-run when `scoreAndRefine` |
| 3 | Code Review | `ws-code-review` (+ fix → re-review, max 3) | Artifact `step-06-{slug}.review.md` |
| 4 | Ship | orch + `ws-ship-pr` | Combined delivery+ship gate; 2nd pass comparative report if `scoreAndRefine` |
| 5 | Fix-PR | `ws-goal-fix-pr` / `ws-fix-pr` | After PR; merge only when checks green |

**Transitions** ([`gates.md`](../ws-shared/gates.md)): Advance (Recommended) · More options… (Previous / Repeat / Refine→Replay / Commit / Undo / Pause / Cancel). Banner: model + Pause→host→Resume. No phase soft tips.

### Step details (done when)

- **0:** `step-00-{slug}.spec.md` via [`setup.md`](../ws-shared/setup.md) § Shared entry → gate Advance.
- **1:** `step-01-{slug}.plan.md` → Advance.
- **2:** build mode + verification → Advance. When `scoreAndRefine` is active, score plan tasks (0–10) into `step-05-{slug}.score-analysis.md` before/after implementation.
- **3:** review file; on Critical/Warning run fix → re-review (max 3; `autoMode` autofix); state/memory each round; Advance only when clean (Pause on residual).
- **4:** checklist `[x]`; write `step-08-{slug}.result.md` with Benchmark Total time (and `step-08-{slug}.second-pass-report.md` if `scoreAndRefine`); combined ship gate; `ws-ship-pr` inline (`workflowType: lite`); auto-run [`ws-spec-index`](../ws-spec-index/SKILL.md) `sync` → Advance when PR/skip done.
- **5:** ≥300s settle; loop until `activeThreads == 0`; `merge-pr` via scm; never delete `project.workingBranch`.

## Auto-gate defaults (`autoMode` → index 0)

| Context | Index 0 |
|---------|---------|
| Transitions | Advance |
| Step 3 fix | Autofix → re-review (max 3); Pause on residual Critical/Warning |
| Step 4 (`fullMode`) | Commit plan+result, create PR |
| Step 4 (not full) | Skip delivery + skip shipping |
| Step 5 | Run ws-goal-fix-pr loop |

## Inline prefix

```markdown
# Inline — Step {STEP} — {Label}
Read state: `{us-dir}/{workflow-id}.state.md`
Skill: {SKILL.md path} — read full.
Orch: ws-spec-to-pr-lite · model {currentModel} · {modeFlags} · workflowType: lite · workflowMode: true
Enhancing skills (mandatory): ws-karpathy-guidelines, ws-senior-developer, ws-tdah, ws-self-learning
Read: state workflow memory + decisions; MEMORY.md index; `config.json.rules.stackFile`.
Config/SCM: `.agents/skills/ws-shared/config-resolution.md`
Anchor: uswf/{workflow-id}/before-step-{STEP} @ {sha} · CWD: {repo-root}
Role: fresh; no resume. files_touched required. model: {currentModel}.
Rules: no `{plansDir}/` in git-add except Step 4 G2-delivery; needs_user: ≥2 choices, recommended first.
End with ```step-output(...)```
```

## Triggers

```
@[ws-spec-to-pr-lite] [auto|dry-run|skip-tests|full|score-and-refine] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md | "feature description"]
/ws-spec-to-pr-lite [flags] [US {issue_id} | {org}/{project}#{id} | {name}.spec.md | "feature description"]
```

For interview, DAG, check-implementation, or Testing: use `/ws-spec-to-pr`.
