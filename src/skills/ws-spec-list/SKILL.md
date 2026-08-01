---
name: ws-spec-list
version: 0.0.114
description: Spec workflow board and management menu — list project specs with state, completion, and delivery; select continue/start/finish/cancel/archive/remove/open-pr.
disable-model-invocation: true
invocation_names:
  - spec-list
  - ws-spec-list
---

# ws-spec-list

> When this skill is loaded, output "ws-spec-list loaded."

Interactive **board + menu** for specs/workflows in the current project. Not `ws-spec-index` (that owns `index.PRD`). Action details: [`ACTIONS.md`](ACTIONS.md).

## Invocation

```text
/ws-spec-list
/ws-spec-list --active
/ws-spec-list --status active|completed|cancelled|failed|orphan
```

## Steps

1. **Resolve** — Read `{sharedDir}/config.json`. Expand `{plansDir}` ← `plans.dir` (default `.agents/plans`), `{specsDir}` ← `plans.specsDir` (default `.agents/specs`). Load [`../ws-shared/tools.md`](../ws-shared/tools.md) Path tokens + [`../ws-shared/gates.md`](../ws-shared/gates.md) for `user-gate`.
   - Done when: both roots resolved (missing config → stop and point to `ws-configure-project`).

2. **Discover** — Agent scan (no helper script):
   - Glob `{plansDir}/**/*.state.md` (include `*.archive/` paths; mark `archived: true`).
   - Glob `{specsDir}/**/*.spec.md` and `{plansDir}/**/step-00-*.spec.md`.
   - Orphan = spec with no matching slug/`us` state row.
   - Parse frontmatter keys: `workflowId`, `us`/`slug`, `status`, `workflowType`, `currentStep`, `completedSteps`, `prUrl`/`prNumber` (see ACTIONS § Fields).
   - Done when: row set built; empty project → board says none + offer **Start** / **Exit**.

3. **Board** — Print markdown table (ACTIONS § Board). Sort: `active` → `failed` → `orphan` → `cancelled` → `completed`; archived last within status. Cap display at 25 rows; note “N more — filter with `--status`”.
   - Done when: board shown with `#` index per row.

4. **Select** — `user-gate`: pick a row by `#` / slug, or **Exit**, or **Refresh**. Prefer host structured choice; markdown fallback when unavailable.
   - Done when: one row chosen or session ended.

5. **Act** — Second `user-gate` with actions valid for that row (ACTIONS § Matrix). Execute exactly one action; confirm before Finish / Cancel / Archive / Remove.
   - Done when: action applied (or cancelled at confirm → re-present Act menu).

6. **Loop** — Unless Exit: Refresh board (step 3) → Select. After Continue / Start: hand off to orch and **stop** this skill (orch owns the session).
   - Done when: user Exit, or orch handoff complete.

## Rules

- en-us; harness-neutral; path tokens only — never hardcode plans roots.
- Do not invent rows or PR URLs; missing field → `—`.
- Destructive actions require explicit confirm (HS-1 on dismiss).
- Continue / Start load orch — do not re-implement pipeline steps here.
