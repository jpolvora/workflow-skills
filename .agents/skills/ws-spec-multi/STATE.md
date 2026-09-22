# `ws-spec-multi` — State Schema & Already-Implemented Probe

Canonical run state lives under `{plansDir}/ws-spec-multi/` (expand `{plansDir}` from `config.plans.dir`, default `.agents/plans`).

## Run ID

`{runId}` = `ms-{YYYYMMDDTHHMMSSZ}` (e.g. `ms-20260725T220000Z`).
State file: `{plansDir}/ws-spec-multi/{runId}.state.md`.

## State File Format

```markdown
---
workflowType: ws-spec-multi
runId: ms-20260725T220000Z
status: active
baseBranch: develop
dryRun: false
createdAt: "2026-07-25T22:00:00Z"
updatedAt: "2026-07-25T22:00:00Z"
specsDir: .agents/specs
totalItems: 2
---

# Multi-spec Runner — ms-20260725T220000Z

| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |
|---|------|----------|----------|--------|----------|-------|--------|-----------|
| 1 | 01-docker-compose | .agents/specs/01-docker-compose.spec.md | lite | pending | | | | 2026-07-25T22:00:00Z |
| 2 | 02-user-auth | .agents/specs/02-user-auth.spec.md | standard | pending | | | | 2026-07-25T22:00:00Z |
```

### Field Definitions

| Field | Values / Notes |
|-------|----------------|
| Run `status` | `active` · `paused` · `completed` |
| `baseBranch` | Base branch recorded at run start (e.g. `develop` or `main`), used for worker sync and PR targets |
| `totalItems` | **Frozen** queue length written once at Phase 2 from the selection; the only source of the reported `shipped/total` denominator. Never recomputed from the mutable table |
| Item `status` | `pending` · `in_progress` · `shipped` · `skipped` · `failed` |
| `flowMode` | `lite` (dispatches `ws-spec-to-pr-lite`) · `standard` (dispatches full `ws-spec-to-pr`) |
| `slug` | Basename of spec without `.spec.md` (stable id) |
| `specPath` | Repo-relative path to source `*.spec.md` (primary row identity) |
| `reason` | Required when `skipped` or `failed` (e.g. `already-implemented`, error summary) |
| `prNumber` / `prUrl` | Set on PR creation and retained on `shipped` |

### Queue invariants (mandatory)

- **One row per spec.** The table holds exactly one row for every spec selected in Phase 2. Row identity is `specPath` (fallback `slug`) — never the `#` column. The `#` column is a display index assigned once at queue init and never re-allocated.
- **Mutate in place.** Every transition (`pending` → `in_progress` → `shipped` / `skipped` / `failed`) updates the existing row for that `specPath` / `slug`. Appending a second row for the same spec is a defect, not a transition.
- **Frozen item count.** `totalItems` is written once at queue init and never recomputed from the table; the reported `shipped/total` uses `totalItems`.
- **Fail-closed duplicate guard.** Before writing the state file, verify the table has no duplicate `#` and no duplicate `slug` / `specPath`. If either is found, do **not** write the file; surface the conflict (HS-5 style stop) naming the duplicated key. Silent dedupe is forbidden.
- **`updatedAt` advances.** Every write sets the transitioned row's `updatedAt` and the run frontmatter `updatedAt` to the current UTC timestamp. A row whose `updatedAt` still equals `createdAt` after a transition is a defect.
- **Supersede retirement.** When a new run supersedes a prior run it names, the superseding run writes the retired run's terminal `status` (`cancelled` or `superseded`) with an advancing `updatedAt`, so at most one `active` runner exists per lineage and at most one item is `in_progress` per slug. Leaving the retired run `active` is a defect.
- **Parent-child handoff.** When a dispatched child worker reaches a terminal state, the parent run transitions that item's row (`in_progress` → `shipped` / `failed` / `skipped`) and advances the run frontmatter `updatedAt`. A frozen parent `updatedAt` beside a terminal child, or a child closed while its parent row stays `in_progress`, is a defect.
- **Idempotent transitions.** Re-applying a close or ship transition never adds rows and never regresses a terminal item status.

*Note on `shipped`:* An item is terminal `shipped` ONLY when the PR is fully merged (`merged: true`, `state: MERGED`) with 0 open review threads (`activeThreads: 0`). Open, unmerged PRs are non-terminal and must complete Phase 4b delivery convergence and PR merge before advancing to the next spec.

## Worker `step-output` Contract

Workers dispatched by `ws-spec-multi` must return a parseable `step-output` block in their final output:

```text
step-output:
  status: shipped|failed
  slug: {slug}
  flowMode: lite|standard
  prNumber: {n|null}
  prUrl: {url|null}
  merged: true|false
  activeThreads: {n}
  checksStatus: green|red|pending
  mergeCommit: {sha|null}
  evidence: {one-line cite}
```

Missing or unparseable output (or `merged: false` when PR exists) is treated as non-terminal, triggering Phase 4b convergence via `ws-goal-fix-pr` and `ws-ship-pr` merge.

## Already-Implemented Probe

Before evaluating flow mode or dispatching a worker, run the probe check:

| # | Check | Evidence | Action |
|---|-------|----------|--------|
| 1 | Item already terminal in state | `shipped` (with confirmed merge) or `skipped` in state table | Skip worker |
| 2 | Prior delivery result for slug | `Glob` `{plansDir}/{slug}/**/step-08-*.result.md` exists and cites `merged: true` / `state: MERGED` / `merged PR` (not `not merged PR`) | Mark `skipped` + `reason: already-implemented` |
| 3 | SCM merged PR for slug | Provider `gh` / SCM list shows merged PR referencing slug / title | Mark `skipped` + `reason: already-implemented` |

If ambiguous (e.g., unmerged open PR or missing evidence), do **not** skip. Proceed to Phase 4b convergence gate or worker execution.

## Blank-List Scan

When invoked without args or state file:
1. Resolve `{specsDir}` from `config.plans.specsDir` (default `.agents/specs`) and `{plansDir}` from `config.plans.dir`.
2. Run `node {skillsRoot}/ws-spec-multi/scripts/list_pending_specs.cjs --specs-dir {specsDir} --plans-dir {plansDir} --json`.
3. Present `user-gate` multi-select from `pending[]` only (omit index `[x]` / Done-log / merged `step-08` results / `step-00-*.spec.md`).
4. User selection establishes the run order.
5. If cancelled, empty selection, or `pending[]` is empty, stop immediately (no state file created).

## Resume Policy

When loading an existing `{plansDir}/ws-spec-multi/*.state.md`:
1. Retain original queue ordering and assigned `flowMode`.
2. Load recorded `baseBranch` from state frontmatter (or auto-detect active base branch if missing).
3. Skip items marked `shipped` (with `merged: true` confirmed) or `skipped`; identity is `specPath` (fallback `slug`), never the `#` index.
4. Run the fail-closed duplicate guard on load: any duplicate `#` or duplicate `slug` / `specPath` is a corrupt queue — stop and surface the conflict, do not dispatch.
5. A run marked `completed` whose table still holds any `pending` / `in_progress` row is invalid (phantom rows). Treat it as corrupt, surface the stale rows, and re-dispatch nothing.
6. Rows with open PRs (`merged: false` / unmerged) must re-enter Phase 4b convergence gate to run `ws-goal-fix-pr` and merge into `baseBranch`.
7. Resume execution at the first `pending`, `in_progress` (reset to `pending`), or `failed` item.
8. Before re-dispatching worker for a spec, sync feature branch with `baseBranch` (`git merge {baseBranch}` or `git rebase {baseBranch}`) to ensure all prior merged changes and base features are incorporated.
9. Immediately after any PR merge success (`state: MERGED`), pull the latest `baseBranch` before creating a new feature branch for the next spec.
10. **Supersede retirement on load:** when this run's notes name a prior run it supersedes and that prior run is still `active`, retire it (`cancelled` / `superseded`) with an advancing `updatedAt` before dispatching — never leave two `active` runners claiming the same item.
