---
name: 04-implement-tasks
description: Executes or fixes code following a plan/DAG or review findings. Detects stack via config.json; stack-agnostic. Modes: build and fix.
version: 2.0
disable-model-invocation: true
---

# implement-tasks

Implements or fixes code following an execution plan. Two modes — declare the mode explicitly.

## Mandatory pre-read

Before starting, read:
- `.agents/skills/us-workflow/config.json` — stack, commands, invariants
- `tools.md` — tool aliases (`.agents/skills/us-workflow/tools.md`)
- `stack.md` — code and paths (`.agents/skills/us-workflow/stack.md`)
- Hub: `AGENTS.md` (root)

## Modes

| Mode | When | Input |
|------|--------|---------|
| **build** | New implementation | `*.plan.exec.md` + `*.exec.dag.json` or `*.plan.md` directly |
| **fix** | Fix review/test findings | List of findings |

If the mode is not explicit, ask.

## Build mode

1. Read the DAG task (`files[]`, `acceptance`, `coderPrompt`, `dependsOn`) or the "3. Step-by-Step Plan" section of `*.plan.md`.
2. **Look for equivalent feature** in the repository (same structural pattern, layers from `config.json.stack`).
3. Implement **only** what is in `coderPrompt`/`files[]` — do not expand scope.
4. Rule priority:
   - `AGENTS.md` — routing; load skills on demand
   - `config.json.rules` — project guardrails
   - Architecture spec: `config.json.domain.architectureSpec`
   - Pattern skills (e.g. view-patterns if UI)
   - `karpathy-guidelines` — simplicity, surgical changes
5. Local validation before reporting success:
   - Backend touched: `build-backend` + `test-backend` (tools.md)
   - Frontend touched: `build-frontend` (+ `test-frontend` if i18n/UI logic)
6. Report `files_touched` (created/modified/deleted).

## Fix mode

1. Read `karpathy-guidelines` — surgical fixes, do not refactor beyond the finding.
2. Receive list of findings (format: File:Line, severity, analysis).
3. For each confirmed finding, sweep **sibling occurrences** of the same pattern — fix the **class**, not just the instance.
4. Cover each class with an **anti-regression test**.
5. Run same validation as build mode.
6. Document: problem, fix, sibling occurrences, anti-regression test.

## Output (both modes)

- Code + tests in working tree (do not commit).
- Summary: files touched, tests (pass/fail), findings fixed (fix) or steps implemented (build).

### `step-output` format (workflow dispatch)

```yaml
status: success | partial | failed | needs_user
files_touched:
  created: []
  modified: []
  deleted: []
verification:
  files_on_disk: pass | fail
  build: pass | fail | skipped
  tests: pass | fail | skipped
summary: |
  <text>
```

## Conduct rules

- **Never commit or push** — decision of the invoker.
- **Strict scope** — do not expand beyond `coderPrompt`/findings.
- **Minimal diff** — no unsolicited refactors.
- **Never write migrations by hand** — use `migrations-add` (tools.md).
- If ambiguous, **stop and ask** (or `needs_user` when subagent).

## Triggers

- `@[implement-tasks] us-{id}.plan.md` (standalone build)
- `@[implement-tasks] "fix findings: ..."` (standalone fix)
- Dispatch workflow — Step 5 (build), Step 10 (fix)
