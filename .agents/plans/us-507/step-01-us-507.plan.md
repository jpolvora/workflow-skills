---
step: 1
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-12T23:51:08Z"
endedAt: "2026-10-12T23:51:08Z"
acRefs: []
---
# Implementation Plan — us-507

## State-less run discovery in `ws-monitor` (a plan directory with step artifacts and no state file is invisible)

Slug: `us-507` · Pipeline: standard · Complexity: standard · Workflow: `uswf-us-507-20261012T235108Z`

## 1. Problem

`ws-monitor` enumerates runs exclusively from `*.state.json` / `*.state.md`
files: `listStateFiles()` (monitor_snapshot.cjs:438-474) collects state-file
paths per plan directory and silently skips a directory with zero matches, so
`snapshot()` builds no workflow record for it (`:1764`, `:1774-1885`), both
`workflowCount` and `activeCount` are 0, the Markdown report prints
`Workflows: 0 (0 active)` plus the empty-discovery line, and
`--watch --until-terminal` exits on the first tick (`terminalReached =
report.activeCount === 0`).

The blind spot is specific to on-disk discovery: an in-flight run that lost (or
never wrote) machine state keeps advancing on disk while the designated live
observer reports that nothing is running. The defect is the silence.

## 2. Approach

Derive state-less activity from the existing step-artifact model instead of
adding a parallel detector (mirrors the us-388 precedent that derived
`missing-child-state` from the multi-spec queue rows rather than an empty list).

1. Add `isStepArtifactName(name)` — matches the canonical canonical top-level
   `step-NN-{slug}.*` prefix used by `expectedArtifacts()`
   (`/^step-\d{2}[a-z]?-/`) (AC13).
2. Add `listStatelessRuns(plansDir, repoRoot)` — for each **top-level** directory
   entry of `{plansDir}` (AC14): skip entries that are not readable directories
   (AC15); skip any directory that holds a `*.state.json` or `*.state.md`
   top-level entry, regardless of parse success (AC10); when no state file exists
   and at least one top-level file matches `isStepArtifactName`, record the run by
   directory name with the newest artifact (by mtime) as repo-relative evidence
   (AC1, AC3, AC12, AC13).
3. Build a state-less workflow record: `statePath: null`, `currentStep: null`,
   `verificationScore: null`, `completedSteps: []`, `stepStatus: {}`,
   `pipeline: 'stateless'`, `stateless: true`, `slug`/`workflowId` = directory
   name, `expectedArtifacts` = the discovered artifacts (present), and a
   `run-without-state` finding whose severity follows the effective stall window
   (`warning` when newest-artifact age ≤ window, else `info`) (AC3, AC4, AC5,
   AC12).
4. Resolve freshness from the same `stallWindowMs` that drives the liveness
   stopwatch (`--stall-window <seconds>`, default 600s) (AC6); age equal to the
   window counts as fresh (Assumptions).
5. Select state-less runs by plan directory name only when `--slug` scopes the
   snapshot; never select a state-less directory for `--workflow-id` (AC11,
   Assumptions).
6. Append the records to `workflows` before counts + Markdown: they join
   `workflowCount` (AC7) and, when fresh, `activeCount` (AC8); a stale run stays
   visible as `info` and is not counted, so `--until-terminal` still terminates
   (AC9). The empty-discovery line is suppressed while any state-less run is
   reported (AC7). Guard the liveness/transcript loop with the `stateless` flag so
   no session/stopwatch work runs for a run that has no state.
7. Add `run-without-state` to `DEFECT_CONTRACTS` (AC17). Keep the multi-spec
   `missing-child-state` signal untouched (AC16). Detection is strictly read-only
   (AC18).
8. Document the signal in `ws-monitor/SKILL.md` § Signal map and § Detecting
   workflow defects (AC19). Add one new suite registered in
   `test/test-suites.json` (AC1-AC19).

## 3. Files touched

| Path | Change |
|------|--------|
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | `isStepArtifactName`, `listStatelessRuns`, state-less record build + selection in `snapshot()`, stateless guard in the liveness loop, stateless branch in `markdownReport`, `DEFECT_CONTRACTS['run-without-state']`, exports |
| `.agents/skills/ws-monitor/SKILL.md` | Signal map row + actionable-signals entry for `run-without-state` (AC19) |
| `test/test-ws-monitor-us507.js` | New suite: AC1-AC19 (detection, freshness, counts, scoping, read-only, docs, regression anchors) |
| `test/test-suites.json` | Register the new monitor suite |
| `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `docs/index.html` (site footer) | Patch version bump (once) |
| `README.md`, `FEATURES.md`, `docs/index.html`, root `AGENTS.md`, `.ws/AGENTS.md` | Doc/site sync for the new observable signal (only where the change is visible) |
| `.ws/CHANGELOG.md` | Append-only changelog entry (Step 8) |

## 4. AC coverage

- AC1/AC2: detection requires ≥1 step artifact and no state file.
- AC3/AC4/AC5/AC6: newest artifact evidence + window-derived severity.
- AC7/AC8/AC9: `workflowCount` / `activeCount` inclusion and empty-line
  suppression; stale runs stay visible without holding a watch open.
- AC10: a state file (even malformed) routes the directory through the existing
  state path.
- AC11: `--slug` resolves the state-less run by directory name.
- AC12: record shape (`statePath` null, unknown step/verification fields).
- AC13: evidence derives from the canonical `step-NN-{slug}.` naming.
- AC14/AC15: bounded top-level scan; unreadable/non-directory entries skipped.
- AC16: `missing-child-state` unchanged.
- AC17: `DEFECT_CONTRACTS` gains `run-without-state`.
- AC18: read-only (byte-identical fixture before/after).
- AC19: `ws-monitor/SKILL.md` documents the signal.

## 5. Verification plan

- `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- `node test/test-ws-monitor-us507.js`
- Regression anchors: `node test/test-ws-monitor-us464.js`,
  `test-ws-monitor-us395.js`, `test-ws-monitor-us388.js`,
  `test-ws-monitor-liveness.js`, `test-ws-monitor-watch-profile.js`,
  `test-ws-monitor.js`, `test-observer-us365.js`
- `npm run generate-integrity` + `npm run verify-integrity`
- `node test/test-harness-clean.js` (0 findings)
- `npm run test`

## 6. Stack & Security Invariants Verification Plan

| Boundary | Invariant | Check |
|----------|-----------|-------|
| Runtime | Node 22 CommonJS only; no Python | `node --check` on the changed script; no `.py` under `.agents/skills/**`/`bin/` |
| Dependencies | No new third-party dependency | `git diff package.json` shows the version only |
| Portability | No host-product coupling | changed files free of host product ids |
| Config | No new `config.json` key or CLI flag | `config.schema.json` / `config.json.example` unchanged |
| Observer safety | Read-only; no state, telemetry, or `{plansDir}` mutation | fixture tree (path/size/mtime) byte-identical before and after a snapshot |
| Discovery | Bounded to top-level plan entries; no nested descent | AC14 test with a nested `worktrees/` artifact |
| Single detector | Reuses the step-artifact model; `missing-child-state` untouched | AC16 regression anchors stay green |

## 7. Out of scope

Per spec: writing/back-filling state for a state-less run, reconstructing step or
score data from artifacts, changing `missing-child-state`, a new config key /
telemetry event / CLI flag, recursive scanning of nested plan subdirectories,
back-filling `{plansDir}/index.json`, auto-remediation/alerting, and other
observers (harness checks, offline audits, resume).
