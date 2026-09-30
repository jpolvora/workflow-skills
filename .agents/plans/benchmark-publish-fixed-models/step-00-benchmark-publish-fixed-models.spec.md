---
id: null
slug: benchmark-publish-fixed-models
title: Publish fixed-model comparison benchmark
source: local
specDate: 2026-09-30
step: 0
workflowId: benchmark-publish-fixed-models-20260930T114235Z
status: completed
startedAt: "2026-09-30T11:43:01.840Z"
endedAt: "2026-09-30T11:43:01.840Z"
acRefs: []
---
# Specification — Publish fixed-model comparison benchmark

## Description

External comparator harnesses publish scored comparison numbers while this package answers comparison claims without a reproducible evidence column: `ws-benchmarks` tracks version-over-version evolution on internal fixtures, but no published run holds the PRD, models, sample count, and judge fixed across this harness and named external comparators. Claims about relative quality are therefore unverifiable.

This spec publishes one comparison benchmark run through `ws-benchmarks`: a single frozen PRD executed on this harness and on each included external comparator harness, with fixed model ids per role, at least 3 samples per harness, and a binary-check judge (each check passes or fails, no partial credit). The published report records PRD hash, harness versions, model ids, per-sample binary results, aggregate scores, and the judge definition so any party can rerun the comparison. The run answers external numbers with same-conditions evidence instead of conceding the evidence column.

## Acceptance Criteria

- AC1: The benchmark freezes one PRD revision (recorded by content hash) and executes it unchanged on this harness and on each included external comparator harness.
- AC2: Model ids are fixed per role for the whole run and recorded in the report; no run mixes model versions within a harness column.
- AC3: Each harness column carries at least 3 independent samples with per-sample results preserved alongside aggregates.
- AC4: Scoring uses a binary-check judge where every check passes or fails with no partial credit, and the judge definition ships with the report.
- AC5: The published report records PRD hash, harness versions, model ids, per-sample binary results, aggregate scores, judge definition, and run timestamps.
- AC6: The run executes through the existing `ws-benchmarks` run and report commands with no forked benchmark engine.
- AC7: External comparator harnesses run at their documented default settings pinned to recorded versions, with any deviation logged as a protocol exception.
- AC8: The report is committed under `benchmarks/results/` and the evolution index links the run.

## Original Issue Context

Free-text request: publish a benchmark using `ws-benchmarks` with the same PRD, fixed models, n greater or equal 3, a binary-check judge, and named external comparator harnesses included, answering their numbers instead of conceding the evidence column.

### Prior Work Sweep

- Keyword and git sweep on `benchmark`, `evolution`, `judge`, `comparator`: `ws-benchmarks` runs static and live modes via `scripts/harness-benchmark/cli.cjs`, tracks version-over-version evolution in `benchmarks/results/BENCHMARK_EVOLUTION.md`, and snapshots baselines under `benchmarks/baselines/`; no cross-harness comparison protocol exists.
- No binary-check judge definition is published; existing verdicts are engine-scored per fixture.
- No open PR covers a comparison benchmark; nearest closed work is the benchmark evolution and baseline deliveries.

### Design Intent

- Greenfield new run protocol: no existing file defines cross-harness comparison runs, so no `git log -S` behavior gap applies; the evolution tracker was designed for internal version-over-version use and this spec extends it to fixed-conditions comparison.

## Notes

- Dependencies: `ws-benchmarks/SKILL.md` (run menu, evolution, update-comparison), `scripts/harness-benchmark/cli.cjs` (static and live execution), `benchmarks/results/` (report target), `benchmarks/baselines/` (snapshot convention).
- The frozen PRD should be a small feature-sized spec already in corpus style so all harnesses start from identical requirements.
- Binary checks derive from the PRD acceptance criteria plus negative scenarios, one check per criterion, judged from observed run artifacts only.
- Stack rule packs under `{skillsRoot}/ws-shared/runtime/stacks/` do not apply to this Node 22 skill-package stack.

## Out of Scope

| Feature | Reason |
|---------|--------|
| A standing periodic comparison service | This spec ships one reproducible run, not a scheduled leaderboard |
| Tuning this harness to the frozen PRD | Run at default settings; PRD-specific tuning invalidates the comparison |
| New benchmark fixtures | The frozen PRD plus existing engine suffice for this run |
| Disputing external methodology | The report answers with same-conditions evidence, not with critique |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Sample count | Fixed at 3 per harness | Minimum for variance visibility at bounded cost | y |
| Judge form | Binary pass or fail per check, no partial credit | Removes scoring-subjectivity disputes between harnesses | y |
| Comparator settings | Documented defaults pinned to recorded versions | Same-conditions comparison without favoring any column | y |
| Engine | Existing `ws-benchmarks` run and report commands | No forked engine to maintain | y |
| Report location | Committed under `benchmarks/results/` with evolution link | Follows the existing report convention | y |
| Auth, rate limits, external dependencies | N/A because the run uses local commands plus already-credentialed model access | No new caller identity, throttle, or remote fallback applies | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | One frozen PRD, fixed models, 3 samples, binary judge, published report | AC1 through AC8 each map to one behavior |
| Atomic criteria | Each AC names a hash, count, judge rule, or committed path | Review AC list against the report template |
| Failure modes | PRD drift, model mix, sample shortfall, judge ambiguity named | Negative scenarios list each mode with expected signal |
| Observation telemetry | Report path, evolution link, and run commands named | Telemetry section lists exact paths and commands |
| Zero open blockers | Sample count, judge form, settings, and location decided | Assumptions table shows Confirmed y on decided rows |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `benchmarks/results/` holds the comparison report with PRD hash, harness versions, model ids, per-sample binary results, aggregates, judge definition, and timestamps.
- `benchmarks/results/BENCHMARK_EVOLUTION.md` links the comparison run.
- `node {skillsRoot}/ws-benchmarks/scripts/benchmarks_manager.cjs --evolution` renders the run in the evolution table.
- `npm run test` stays green; benchmark commands exit 0 for the published run.

### Negative & Failing Test Scenarios

- A run mixing model versions within one harness column is rejected as invalid instead of published.
- A harness column with fewer than 3 samples blocks publication until the shortfall is filled.
- A judge edit after samples are scored invalidates prior samples, which must be re-scored under the new definition.
- An unlogged deviation from a comparator default setting fails the protocol check for that column.
