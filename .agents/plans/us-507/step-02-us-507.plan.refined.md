---
step: 2
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-12T23:51:08Z"
endedAt: "2026-10-12T23:51:08Z"
acRefs: []
---
# Refined Plan — us-507

Refinement of `step-01-us-507.plan.md` after the Step 2 interview. The approach
is unchanged; the refinements below are the folded gaps.

## Refined implementation

1. `isStepArtifactName(name)` in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`:
   `/^step-\d{2}[a-z]?-/` — the canonical `step-NN-{slug}.` prefix used by
   `expectedArtifacts()` (AC13).
2. `listStatelessRuns(plansDir, repoRoot)`:
   - iterate top-level directory entries only (AC14);
   - skip an entry whose `readdirSync` throws (AC15);
   - skip any directory holding a top-level `*.state.json` / `*.state.md`
     (presence only, AC10);
   - keep directories with ≥1 top-level step artifact and no state file (AC1,
     AC2); record `{ slug: dirName, artifact: repoRelative, artifactName,
     newestMtimeMs }` for the newest artifact (AC3, AC12).
3. In `snapshot()`, after `stallWindowMs` resolves:
   - select runs: `--slug` matches by directory name; `--workflow-id` selects
     none (AC11);
   - for each selected run, compute `ageMs = Date.now() - newestMtimeMs`,
     `fresh = ageMs <= stallWindowMs`;
   - build a state-less record appended to `workflows`: `stateless: true`,
     `statePath: null`, `pipeline: 'stateless'`, `currentStep: null`,
     `verificationScore: null`, `completedSteps: []`, `stepStatus: {}`,
     `status: fresh ? 'active' : 'stale'`, `expectedArtifacts` = discovered
     artifacts, a window-derived `run-without-state` finding (`warning` fresh,
     `info` stale) with the repo-relative newest artifact as evidence, plus a
     `stateless: { newestArtifact, ageMs, fresh, thresholdMs }` block (AC3-AC9,
     AC12).
4. Guard the transcript/liveness loop with `if (workflow.stateless) continue;`
   (no session/stopwatch work); the record is added before vault reconciliation so
   its slug joins `diskSlugs`.
5. Counts and Markdown come for free (`workflowCount`/`activeCount` over
   `workflows`); add a `stateless` render branch and rely on `workflows.length > 0`
   to suppress the empty-discovery line (AC7).
6. Add `DEFECT_CONTRACTS['run-without-state']` (AC17); leave `missing-child-state`
   untouched (AC16); no writes anywhere (AC18).
7. `ws-monitor/SKILL.md`: signal-map row + actionable-signals entry (AC19).
8. `test/test-ws-monitor-us507.js` covers AC1-AC19 + regression anchors;
   registered in `test/test-suites.json`.

## Refined AC map

AC1/AC2 → detection blocks; AC3 → evidence path; AC4/AC5/AC6 → freshness sweep
(`--stall-window`); AC7/AC8/AC9 → summary-count + watch blocks; AC10 → malformed
state block; AC11 → `--slug` / `--workflow-id` blocks; AC12 → record shape
(`--json`); AC13 → nested/artifact-class blocks; AC14/AC15 → nested + unreadable
blocks; AC16 → `missing-child-state` regression anchor; AC17 → `DEFECT_CONTRACTS`
assertion; AC18 → read-only byte-identical block; AC19 → SKILL.md text assertion.

## Risk

Low. Additive discovery + one new finding code; existing state-backed selection
(`stateDerivedSlug` / `stateFileMatchesSlug`) and `missing-child-state` are
unchanged. The only shared surface touched is `snapshot()`'s workflow list and the
Markdown renderer, both additive.
