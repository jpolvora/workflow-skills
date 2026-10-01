---
step: 6
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: []
base: e5e1c357
head: e39f76b5
round: 1
startedAt: "2026-10-01T01:26:00Z"
endedAt: "2026-10-01T01:17:11.419Z"
---
# Code review — us-476

Diff under review: `git diff e5e1c357...HEAD` scoped to the workflow `files_touched`
(`.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`, `.agents/skills/ws-monitor/SKILL.md`,
`test/test-ws-monitor-us476.js`, `test/test-suites.json`, `FEATURES.md`, version/integrity/site).

## Findings

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| R1 | Minor | `const stateMtimeMs = Number(workflow.multiSpec?.stateMtimeMs)` coerces a missing stat (`null`) to `0` (finite), so an absent mtime is treated as an epoch timestamp rather than "unknown". Harmless today (epoch is ancient, so it can never make `runAdvanced` true when other evidence is absent), but it is a latent trap for future edits. | **Fixed** — guard to a positive finite number (`Number.isFinite(raw) && raw > 0 ? raw : NaN`). Fix commit appended after this review; unit + us-395 regression tests re-run green. |
| R2 | Suggestion | `formatAgeMs` rounds sub-minute ages to seconds; consistent with the human-readable intent of the message. No change. | Accepted as-is |
| R3 | Suggestion | The default 600s grace still warns for the observed ~19-minute propagation latency; the spec explicitly accepts this and the message carries the ages to tune `--stall-window`. | Accepted by spec design |

No critical or blocker findings.

## Scope / hygiene

- Changed lines trace to AC1–AC7 only; no unrelated refactor.
- `snapshot()` duplicate `stallWindowMs` declaration removed (single source); reused by the liveness stopwatch — behavior unchanged (same expression).
- Read-only invariant preserved: the only new syscall is `fs.statSync` on the batch state file.
- Two-argument `detectStaleParentRows` callers keep the default grace; existing us-395 fixtures (child closed days earlier) still warn.

## Evidence

- `node test/test-ws-monitor-us476.js` → ok (exit 0)
- `node test/test-ws-monitor-us395.js` → ok (exit 0)
- `node test/test-ws-monitor-us388.js`, `test/test-ws-monitor.js` → ok (exit 0)
- Integrity `--check` → OK (v0.5.30)

## Verdict

**Pass after R1 fix.** No re-review required: R1 is a one-line guard with unit coverage and no behavior change for valid inputs.
