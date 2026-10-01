---
id: 464
slug: us-464
title: "ws-monitor: slug-scoped scan drops canonical runId-foldered ws-spec-multi batch state"
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/464"
labels:
  - bug
step: 0
workflowId: us-464-20260930T220628Z
status: completed
startedAt: "2026-09-30T18:49:04.663Z"
endedAt: "2026-09-30T18:49:04.663Z"
acRefs: []
---
# Specification — ws-monitor: slug-scoped scan drops canonical runId-foldered ws-spec-multi batch state

**State:** open
**Labels:** bug

## Description

Slug-scoped workflow discovery (`--slug`) in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` does not return every run whose reported `slug` equals the filter, while the unfiltered scan and `--workflow-id` do. A canonical batch state file can be invisible to slug-scoped monitoring, so a scoped `--watch --until-terminal` can exit "finished" while a batch run it should observe is never reported, and scoped reports silently omit a run.

Reproduction with three `ws-spec-multi` batch states all reporting `slug: ws-spec-multi`: the unfiltered scan lists all three; the slug-scoped scan returns only the two under the slug-named plan folder (`{plansDir}/ws-spec-multi/*.state.md`) and drops the canonical `{plansDir}/{runId}/{runId}.state.md` run; `--workflow-id` returns the dropped run. The filter appears to match the plan folder name instead of the state file's reported `slug`.

The fix is that `--slug <value>` selects every discovered run whose state-derived slug equals the value, independent of the plan folder name or state-file layout. The drop was observed on a snapshot where all runs were terminal, so it is independent of run liveness.

### Design Intent

Discovery was written when `ws-spec-multi` batch state lived only under a slug-named folder, so matching the folder name was equivalent to matching the state slug. The artifact contract later added the canonical `{plansDir}/{runId}/{runId}.state.md` layout, which broke that equivalence. The intended contract is filter-by-state-slug, not filter-by-folder.

## Acceptance Criteria

- AC1: When `--slug <value>` is supplied, the monitor shall select every discovered run whose state-derived slug equals the value.
- AC2: The monitor shall select slug-scoped runs independent of the plan folder name and the state-file layout.
- AC3: When a run is stored under the canonical runId-folder layout, the monitor shall include it in the slug-scoped scan.
- AC4: When a run is stored under a slug-named plan folder, the monitor shall include it in the slug-scoped scan.
- AC5: When a run is stored under the legacy flat state file, the monitor shall include it in the slug-scoped scan.
- AC6: When `--workflow-id` is supplied, the monitor shall return the matching run regardless of any slug filter.
- AC7: When no discovered run's state-derived slug matches the filter, the monitor shall return a zero workflow count.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the `ws-spec-multi` artifact layout contract | The canonical layout is correct; the filter is the gap |
| Changing other monitor filters or detectors | Only slug-scoped discovery is implicated |
| Migrating or rewriting existing batch state files | Observer is read-only |
| Changing `--watch` exit semantics beyond scope inclusion | Exit semantics follow from correct discovery |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Filter key | State-derived `slug` field | Matches the issue's stated contract | y |
| Layouts to cover | Slug-named folder, canonical runId folder, legacy flat file | All documented batch layouts | y |
| Liveness independence | Filter applies to terminal and active runs alike | Reproduction showed terminal-only drops | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because the observer is read-only with no network or stored state | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Slug-scoped discovery only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Unmatched filter returns zero, not the full set | AC7 |
| Stack invariant | Read-only Node helper, launched with `node`, no state writes | `ws-check-harness` + read-only contract |
| Observation telemetry | Named `workflowCount` per layout under a slug filter | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 464 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- With three `ws-spec-multi` states across the documented layouts, `--slug ws-spec-multi --json` returns all three.
- `--workflow-id <runId>` returns the canonical-layout run whether or not a slug filter is set.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- A canonical `{plansDir}/{runId}/{runId}.state.md` run with `slug: ws-spec-multi` must appear in `--slug ws-spec-multi` output; dropping it fails.
- A `--slug` value matching no state-derived slug must return a zero count, not the unfiltered set.
- A slug-named-folder run and a legacy flat-file run must both remain in scope after the change.

## Original Issue Context

# ws-monitor: slug-scoped scan drops canonical runId-foldered `ws-spec-multi` batch state

## Failure class

Slug-scoped workflow discovery (`--slug`) does not return every run whose reported `slug` equals the filter, while the unfiltered scan and `--workflow-id` do. A canonical batch state file can be invisible to slug-scoped monitoring, so a scoped `--watch --until-terminal` can exit "finished" while a batch run it should observe is never reported.

## Reproduction (portable)

Given three multi-spec batch states that all report `slug: ws-spec-multi`:

1. Unfiltered scan lists all three:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --json`
   → workflowCount includes `ms-20260927T130013Z`, `ms-20260928T010610Z`, `ms-20260929T185153Z` (all `slug: ws-spec-multi`).
2. Slug-scoped scan returns only two:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --slug ws-spec-multi --json`
   → `ms-20260927T130013Z`, `ms-20260928T010610Z` only; `workflowCount: 2`.
3. Workflow-id scan returns the missing run:
   `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --workflow-id ms-20260929T185153Z --json`
   → `workflowCount: 1`, run found.

## Observed correlation (hypothesis, not yet confirmed)

The two runs returned by the slug filter live under a slug-named plan folder (`{plansDir}/ws-spec-multi/*.state.md`). The dropped run uses the canonical batch layout `{plansDir}/{runId}/{runId}.state.md` (per the `ws-spec-multi` artifact contract). The slug filter appears to match the plan folder name (or a slug derived from it) instead of the state file's reported `slug`, so runId-foldered batches are excluded.

## Expected contract

`--slug <value>` selects every discovered run whose state-derived `slug` equals `<value>`, independent of the plan folder name or state-file layout (slug-named folder, canonical runId folder, or legacy flat file).

## Impact

- Scoped `--watch --until-terminal` terminates as "already terminal" while the canonical batch is never in scope.
- Scoped reports (`--report`) silently omit a run, understating queue progress and findings.
- Batch runs written to the canonical layout are effectively unmonitorable by slug.

## Environment notes

- Observed on a snapshot where all three runs were `status: completed` (no active runs), so the drop is independent of run liveness.
- Monitor package version at observation time: see `ws-version` output in the maintainers' environment; no state files were modified while reproducing.

## Anonymization

Body contains only repo-relative harness paths and generic failure-class wording; no consumer repository names, absolute local paths, hostnames, transcript contents, or credentials.

### Prior Work Sweep

No open pull request references issue 464. Keyword search (`slug-scoped`, `runId`, `batch`) returned no open PR. Design-intent note: slug discovery assumed the slug-named folder layout, which the canonical runId-folder contract invalidated.

## Notes

Lookup: slug-scoped workflow discovery is in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`; the batch artifact contract is documented by `ws-spec-multi`. Stack file is the Node 22 skill package. MEMORY had no trap that changes this fix.
