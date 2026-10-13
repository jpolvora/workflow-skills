---
step: 5
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-12T23:58:00Z"
endedAt: "2026-10-12T23:58:00Z"
acRefs: []
---
# Verification Report — us-507

Check-implementation for state-less run discovery in `ws-monitor`.

## Scope verified

Product diff (Step 4): `monitor_snapshot.cjs` (`isStepArtifactName`,
`statelessFreshness`, `listStatelessRuns`, state-less record build + selection in
`snapshot()`, liveness-loop guard, Markdown render branch,
`DEFECT_CONTRACTS['run-without-state']`, exports); `ws-monitor/SKILL.md` signal
map + actionable-signals entry; new `test/test-ws-monitor-us507.js` + its
`test/test-suites.json` registration.

## Commands and results

| Check | Command | Result |
|-------|---------|--------|
| Syntax | `node --check .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | exit 0 |
| New suite | `node test/test-ws-monitor-us507.js` | ok |
| Stack invariants | `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 issues |
| Monitor anchors | `test-ws-monitor.js`, `-us356`, `-us385`, `-us395`, `-us388`, `-liveness`, `-us412-418`, `-watch-profile`, `-us464`, `-us473`, `-us476`, `-us478`, `test-observer-us365.js`, `test-step-baton-monitor.js`, `test-terminal-close-us395.js`, `test-local-first-precedence.js` | all exit 0 |
| Repro (before) | spec baseline: `--slug demo` on a step-artifact-only fixture | `Workflows: 0` |
| Repro (after) | same fixture, post-change | `Workflows: 1 (1 active)` + `WARNING run-without-state` naming `step-01-demo.plan.md` |

## AC verdicts

| AC | Evidence | Verdict |
|----|----------|---------|
| AC1 | `fresh` block: step artifacts + no state → run reported (`stateless: true`) | Verified |
| AC2 | `none` block: neither state nor artifact → not a run | Verified |
| AC3 | `fresh` block: one finding, repo-relative newest artifact in evidence | Verified |
| AC4 | `fresh` block: newest inside window → `warning` | Verified |
| AC5 | `stale` block: older than window → `info` | Verified |
| AC6 | `window` block (`--stall-window 600` vs `1`) + `statelessFreshness(600000,600000)===true` boundary | Verified |
| AC7 | Markdown: `Workflows: 1`, empty-discovery line suppressed, finding rendered | Verified |
| AC8 | `fresh` activeCount 1 + `--until-terminal` does not exit on the first tick (timeout) | Verified |
| AC9 | `stale` `status: stale`, activeCount 0, `--until-terminal` exits 0 | Verified |
| AC10 | state-backed and malformed-state blocks: no `run-without-state` | Verified |
| AC11 | `--slug demo` matches by directory name; `--workflow-id` selects nothing | Verified |
| AC12 | `--json` record: `statePath` null, `currentStep`/`verificationScore` null, artifact evidence | Verified |
| AC13 | `isStepArtifactName` accepts canonical artifacts, rejects `notes.md` / `xstep-` / `step-0-` | Verified |
| AC14 | nested `worktrees/` artifact not counted; nested-only dir not a run | Verified |
| AC15 | `index.json` file entry skipped; sibling state-less run still reported | Verified |
| AC16 | `test-ws-monitor-us388.js` spawned exit 0; `missing-child-state` contract unchanged | Verified |
| AC17 | `DEFECT_CONTRACTS['run-without-state']` present; `--open-issue` proposal includes the code | Verified |
| AC18 | recursive fixture listing byte-identical across two snapshots | Verified |
| AC19 | SKILL.md actionable-signals line + signal-map row carry the signal and freshness rule | Verified |

## Negative scenarios

Covered: artifact-less directory (AC2), state-only/malformed state (AC10),
stale state-less run not counted (AC9), window boundary (AC6), alternate
`--workflow-id` selector (AC11), nested artifact (AC14), non-directory /
unreadable plans-root entry (AC15), read-only proof (AC18).

## Score

**10 / 10** — every AC has direct evidence, all negative paths asserted, no
critical stack invariant violation, existing monitor anchors preserved.
