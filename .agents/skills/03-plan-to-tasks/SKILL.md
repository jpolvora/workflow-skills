---
name: 03-plan-to-tasks
description: Breaks an implementation plan (step-02-{slug}.plan.refined.md or fallback step-01-{slug}.plan.md) into atomic tasks with files, acceptance criteria, and coderPrompt, organized in a DAG of topological levels for safe parallel execution. Auto-detects small plans and recommends sequential execution.
version: 2.0
disable-model-invocation: true
---

# plan-to-tasks

Transforms a refined plan `step-02-{slug}.plan.refined.md` (or falls back to `step-01-{slug}.plan.md` if Step 2 refinement was bypassed) into an operational execution plan: atomic tasks + dependency graph (DAG) ready for a coding agent (`implement-tasks`) to execute without ambiguity.

**Automatic size detection:** before generating the DAG, evaluates whether the plan is small enough for direct sequential execution — if so, returns `execMode: sequential` and skips DAG generation (see [Size Detection](#size-detection--sequential-mode)).

**Standalone** — useful even outside `us-workflow` for those who just want the execution checklist of a plan.

## Input

Path to `step-02-{slug}.plan.refined.md` or `step-01-{slug}.plan.md`. If not provided, search for `step-02-*.plan.refined.md` first; if it exists, read it; otherwise, fall back to `step-01-*.plan.md`. If neither exists, ask.

## Size Detection & Sequential Mode

Before breaking into atomic tasks, evaluate the plan size by reading the section "3. Step-by-Step Plan" and the file matrix. If the plan meets **all** criteria below, it is considered **small** — return `execMode: sequential` and skip DAG generation:

| Criterion | Limit | How to measure |
|----------|--------|------------|
| Implementation steps | ≤ 3 | Count numbered sub-steps in section 3 |
| Expected files | ≤ 6 | Sum all files listed under "Files" in the steps |
| Layers involved | ≤ 2 | Core / Infrastructure / API / web — count distinct |

**Customizable thresholds:** the [`config.json`](../us-workflow/config.json) file may override these values in the `dagThresholds` field. If the field exists, use those values. If absent, use the defaults above.

If **any** criterion exceeds the limit → generate the DAG normally (`execMode: parallel`).

If **all** criteria are within the limit → `execMode: sequential`.

**Fallback:** when the plan lacks a section 3 clear enough to count steps/files, assume `execMode: parallel` (do not risk skipping the DAG on ambiguous plans).

## Sequential Mode Output

When `execMode: sequential`, the output is minimal — no DAG, no `tasks[]`, no `levels[]`:

### `step-03-{slug}.plan.exec.md`
```markdown
# {slug} — Execution Plan (Sequential)
**Mode:** sequential — small plan, direct execution without DAG.
**Reason:** {n} steps, {m} files, {k} layers — below thresholds.

Run via `implement-tasks` `build` mode with the `step-01-{slug}.plan.md` directly.
```

### `step-03-{slug}.exec.dag.json`
```json
{
  "execMode": "sequential",
  "reason": "{n} steps, {m} files, {k} layers — sequential execution is more efficient.",
  "planPath": "step-01-{slug}.plan.md",
  "tasks": [],
  "levels": []
}
```

## Parallel Mode (DAG — large plan)

When `execMode: parallel`, follow the normal flow below.

### What to do

1. Read the entire plan, focusing on the section "3. Step-by-Step Plan" and the AC matrix.
2. Break each step into **atomic tasks** (`T1`, `T2`, ...), each with:
   - `id`: `T{n}`
   - `title`: short, imperative (e.g.: "Create DTO `WithdrawalDto` with validations")
   - `files`: exact list of paths to create/modify (no wildcards)
   - `dependsOn`: IDs of prerequisite tasks
   - `acceptance`: objective, testable criterion (references plan AC when applicable)
   - `coderPrompt`: literal, complete instruction for the implementer — namespaces, classes, DTOs, permissions; cite a real reference file from the repo (e.g.: service or controller in the project layers defined in `config.json.stack`)
   - `parallelGroup`: filled in at step 3 below
3. Assemble **topological levels** (`levels`): tasks with no pending dependencies go in the same level, **max. 3 concurrent tasks per level**, and **no file overlap** within the same level (two tasks at the same level must never touch the same file — if they do, force a dependency between them and move them to different levels).
4. Do **not** define worktree per task — execution isolation is the responsibility of whoever runs the DAG (`implement-tasks`/orchestrator), not of the DAG itself.

### Output

#### `step-03-{slug}.plan.exec.md` (human-readable)
Markdown with one section per task (`id`, `title`, `files`, `dependsOn`, `acceptance`, summary of the `coderPrompt`) and a final table with levels (`Level | Tasks`).

#### `step-03-{slug}.exec.dag.json` (machine-readable)
```json
{
  "execMode": "parallel",
  "targetModel": "coder",
  "tasks": [
    {
      "id": "T1",
      "parallelGroup": null,
      "dependsOn": [],
      "files": ["src/Core/Withdrawals/WithdrawalDto.cs"],
      "acceptance": "DTO exposes mapped properties with DataAnnotations validations",
      "coderPrompt": "Create WithdrawalDto in the Core layer following the existing DTOs pattern (record OK, persistence-agnostic).",
      "title": "Create WithdrawalDto"
    }
  ],
  "levels": [["T1"], ["T2", "T3"]]
}
```

**File naming convention:** same names used by `us-workflow` (`step-03-us-{id}.plan.exec.md`, `step-03-us-{id}.exec.dag.json`) when invoked by the workflow, inside `.cursor/plans/us-{id}/`. When standalone without a US, use the same basename as the input `step-01-*.plan.md` swapping the extension (`step-01-meu-plano.plan.md` → `step-03-meu-plano.plan.exec.md` / `step-03-meu-plano.exec.dag.json`), in the same folder as the plan.

## step-output (us-workflow)

```yaml
step-output:
  status: success
  step: 3
  execMode: sequential | parallel
  artifacts:
    planExecMd: "{path}"
    execDagJson: "{path}"
  files_touched:
    - "{path}/step-03-us-{id}.plan.exec.md"
    - "{path}/step-03-us-{id}.exec.dag.json"
  summary: "{execMode} — {n} steps, {m} files, {k} layers"
  decisions:
    - "Sequential: small plan — direct execution without DAG"   # when sequential
    - "Parallel: {n} tasks in {k} levels"                       # when parallel
  needs_user: null
```

## Conduct rules

- **Do not implement code** — only decompose the plan into tasks (or detect sequential mode).
- **Do not invent files/symbols** the plan does not support — if the plan is too vague to generate a precise `coderPrompt`, that is a sign `interview` was skipped; report the gap instead of guessing.
- Follow the guardrails in `config.json.invariants` + `config.json.rules` when deciding where each file should go. Layers and paths defined in `config.json.stack`.
- References: load docs pointed to by `config.json.domain.architectureSpec` and project pattern skills (e.g.: view-patterns when UI).

## Triggers

- `@[plan-to-tasks] path/to/plan.md`
- Dispatched by subagent of `us-workflow` (Step 3).
