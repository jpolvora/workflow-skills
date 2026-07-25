# `ws-long-runner` — State Schema & Already-Implemented Probe

Canonical run state lives under `{plansDir}/ws-long-runner/` (expand `{plansDir}` from `config.plans.dir`, default `.agents/plans`).

## Run ID

`{runId}` = `lr-{YYYYMMDDTHHMMSSZ}` (e.g. `lr-20260725T220000Z`).
State file: `{plansDir}/ws-long-runner/{runId}.state.md`.

## State File Format

```markdown
---
workflowType: ws-long-runner
runId: lr-20260725T220000Z
status: active
dryRun: false
createdAt: "2026-07-25T22:00:00Z"
updatedAt: "2026-07-25T22:00:00Z"
specsDir: .agents/specs
---

# Long-runner — lr-20260725T220000Z

| # | slug | specPath | status | prNumber | prUrl | reason | updatedAt |
|---|------|----------|--------|----------|-------|--------|-----------|
| 1 | 01-docker-compose | .agents/specs/01-docker-compose.spec.md | pending | | | | 2026-07-25T22:00:00Z |
```

### Field Definitions

| Field | Values / Notes |
|-------|----------------|
| Run `status` | `active` · `paused` · `completed` |
| Item `status` | `pending` · `in_progress` · `shipped` · `skipped` · `failed` |
| `slug` | Basename of spec without `.spec.md` (stable id) |
| `specPath` | Repo-relative path to source `*.spec.md` |
| `reason` | Required when `skipped` or `failed` (e.g. `already-implemented`, error summary) |
| `prNumber` / `prUrl` | Set on `shipped` |

## Worker `step-output` Contract

Workers dispatched by `ws-long-runner` must return a parseable `step-output` block in their final output:

```text
step-output:
  status: shipped|failed
  slug: {slug}
  prNumber: {n|null}
  prUrl: {url|null}
  evidence: {one-line cite}
```

Missing or unparseable output is treated as `status: failed`.

## Already-Implemented Probe

Before dispatching a worker for a `pending` or `failed` item, run the probe check:

| # | Check | Evidence | Action |
|---|-------|----------|--------|
| 1 | Item already terminal in state | `shipped` or `skipped` in state table | Skip worker |
| 2 | Prior delivery result for slug | `Glob` `{plansDir}/{slug}/**/step-08-*.result.md` exists and cites merged PR / commit | Mark `skipped` + `reason: already-implemented` |
| 3 | SCM merged PR for slug | Provider `gh` / SCM list shows merged PR referencing slug / title | Mark `skipped` + `reason: already-implemented` |

If ambiguous (e.g., unmerged open PR or missing evidence), do **not** skip. Proceed to worker execution.

## Blank-List Scan

When invoked without args or state file:
1. Resolve `{specsDir}` from `config.plans.specsDir` (default `.agents/specs`).
2. `Glob` `{specsDir}/**/*.spec.md`.
3. Present `user-gate` multi-select list.
4. User selection establishes the run order.
5. If cancelled or empty, stop immediately (no state file created).

## Resume Policy

When loading an existing `{plansDir}/ws-long-runner/*.state.md`:
1. Retain original queue ordering.
2. Skip items marked `shipped` or `skipped`.
3. Resume execution at the first `pending`, `in_progress` (reset to `pending`), or `failed` item.
