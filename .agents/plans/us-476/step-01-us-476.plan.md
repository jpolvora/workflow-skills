---
step: 1
slug: us-476
workflowId: us-476-20261001T010948Z
status: completed
acRefs: []
title: "ws-monitor: time-bounded stale-parent-row propagation grace"
startedAt: "2026-10-01T01:09:48Z"
endedAt: "2026-10-01T01:13:01.727Z"
---
## 0. Summary & Business Rules

Make the `stale-parent-row` detector in `ws-monitor/scripts/monitor_snapshot.cjs` time-bounded so the normal child-close to parent-propagate window is not reported as a defect, while the persistent lineage defect (#395) keeps firing.

Deliverable = one detector change plus its evidence surface:

1. `detectStaleParentRows` gains a child-terminal-age grace (default: the configured `--stall-window`, 600s) and scores severity by measured age. A child terminal inside the grace window while the run is still advancing is `info` (propagation pending); beyond the grace window, or with lineage dead (terminal run / superseding run), stays `warning`.
2. The finding message carries the measured child-terminal age and last row-transition age so an operator can tune the grace from real runs.
3. `snapshot()` threads the resolved stall window into the detector (single knob, `--stall-window`) and exposes the batch state `updatedAt` / mtime as the "run advanced" signal.

Business rules:
- Severity must distinguish routine propagation latency from a permanent hang; an active healthy batch must not produce a warning-severity `stale-parent-row`.
- Persistent cases (#395) keep warning severity.
- Observer stays read-only; no state writes, no schema change.
- Node 22 `.cjs` only (launched with `node`).

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** grace window = `--stall-window` (default 600s); child terminal age = child `endedAt`, falling back to `updatedAt`; severity model = `info` inside grace, `warning` beyond; input-validation/auth/concurrency/data-lifecycle/idempotency N/A (read-only observer).

**Measurable ACs:** AC1–AC7 from `step-00-us-476.spec.md`.

**In scope:**
- `detectStaleParentRows` grace + age-carrying message + severity split (`monitor_snapshot.cjs`).
- `snapshot()` stall-window threading and `multiSpec.updatedAt` / `stateMtimeMs` exposure.
- `ws-monitor/SKILL.md` signal docs + `FEATURES.md` row.
- `test/test-ws-monitor-us476.js` fixture coverage + `test-suites.json` registration.
- Integrity regenerate + one version bump at Step 8.

**Out of scope (spec table):** persistent stale-row lineage repair (#395, state writer); duplicate queue rows (#393); changing the `ws-spec-multi` row schema; rewriting historic state.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`, `.agents/skills/ws-monitor/SKILL.md` | detector + docs |
| tests | `test/test-ws-monitor-us476.js`, `test/test-suites.json` | fixtures |
| installer-cli | `bin`, `docs`, `FEATURES.md`, version files | integrity + version bump (Step 8 only) |

**Runtime design:**

1. `detectStaleParentRows(workflow, allWorkflows, options)` — new optional `{ graceMs, nowMs }`. For an `in_progress` row whose same-slug child is terminal:
   - `childTerminalAgeMs = nowMs - childEndedAt` (child `endedAt` else `updatedAt`).
   - `lastAdvanceMs = max(runUpdatedAt, stateMtimeMs, rowUpdatedAt)`; `runAdvanced = nowMs - lastAdvanceMs <= graceMs`.
   - `childTerminalAgeMs <= graceMs && runAdvanced` → `info` "propagation pending"; else `warning`. Message always carries `child terminal for <age>; last row transition <age> ago` (AC1).
   - Superseded-run branch (AC5) and `classifyMultiSpecWorkflow` terminal-run branch (AC4) stay `warning`; non-terminal child adds no finding (AC7).
2. `snapshot()` computes `stallWindowMs` once (before cross-workflow detection, reused by the liveness stopwatch) and passes `{ graceMs: stallWindowMs }`. The multi-spec record gains `updatedAt: state.updatedAt` and `stateMtimeMs` (state file mtime).
3. Grace default = `TRANSCRIPT_LIMITS.stallWindowMs` (600000), overridable via `--stall-window` (already parsed) or per-call `graceMs` (AC6).

**Not touched:** multi-spec row schema, state writer, other detectors, host adapter code.

## 3. Step-by-Step Plan

1. **Detector grace** — add `formatAgeMs`, optional `options`, age-carrying message, info/warning split; keep superseded/terminal-run warnings. → AC1, AC2, AC3, AC5, AC7
2. **Snapshot threading** — hoist `stallWindowMs`, pass `graceMs`, add `updatedAt`/`stateMtimeMs` to the multi-spec record. → AC2, AC6
3. **Docs** — `ws-monitor/SKILL.md` queue-signal + severity-table rows; `FEATURES.md` summary. → AC1–AC3
4. **Tests** — `test/test-ws-monitor-us476.js` unit (AC1–AC7, NS1–NS3) + CLI end-to-end (info default, warning with narrowed window). → AC1–AC7, NS1–NS3
5. **Register + harness** — add the test to `test-suites.json`; `node test/test-harness-clean.js` 0 findings; no `.py`. → NS3
6. **Integrity + version bump (Step 8 ship hygiene)** — `npm run build-site:bump` once, `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — local read-only filesystem observation, no RBAC, tenancy, authZ, or user-facing i18n. Output is en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `us-476 AC1` — info message carries `child terminal for 5m` + `last row transition 10m ago` | `test/test-ws-monitor-us476.js` |
| AC2 | `us-476 AC2` — fresh child close + advancing run → `info`; e2e snapshot reports info propagation-pending | `test/test-ws-monitor-us476.js` |
| AC3 | `us-476 AC3` — child terminal beyond grace, no transition → `warning` | `test/test-ws-monitor-us476.js` |
| AC4 | `us-476 AC4` — terminal run with non-terminal row → `warning` | `test/test-ws-monitor-us476.js` |
| AC5 | `us-476 AC5` — newer active run claims slug → `warning` | `test/test-ws-monitor-us476.js` |
| AC6 | `us-476 AC6` — default grace = stall window; widened/narrowed override changes severity; e2e `--stall-window 1` warns | `test/test-ws-monitor-us476.js` |
| AC7 | `us-476 AC7` — non-terminal child adds no grace finding | `test/test-ws-monitor-us476.js` |
| NS1 | `us-476 AC2` fixture (fresh child, advancing run) must not warn | `test/test-ws-monitor-us476.js` |
| NS2 | `us-476 AC3` fixture (child closed long ago) still warns | `test/test-ws-monitor-us476.js` |
| NS3 | `us-476 AC4` fixture (terminal run) still warns; harness Node-only, no `.py` | `test/test-ws-monitor-us476.js` |

## 6. Stack & Security Invariants Verification Plan

Stack id `node-skills-package`; rule pack `{skillsRoot}/ws-shared/runtime/stacks/typescript-node.md`. Touched boundaries:

- **Authorization & endpoint protection:** N/A — no HTTP/routes.
- **Concurrency & async safety:** detector stays synchronous, pure function of its inputs; no timers, no floating promises.
- **Input validation & DTO boundary:** timestamps parsed with `Date.parse` and guarded by `Number.isFinite`; no `eval`; no shell construction. Grace/mtime are numbers; unknown values degrade to the warning path (never crash).
- **Subscription & lifecycle cleanup:** N/A — no listeners/streams beyond process lifetime.
- **Harness-specific:** Node-only `.cjs`; no IDE product names; read-only invariant preserved (only `fs.statSync` reads for the mtime signal); integrity regenerated after hashed edits.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (`skills-sot` + `test/`).
- [ ] Schema migrations — N/A.
- [ ] Authorization — N/A.
- [ ] Stack & security invariants verified (finite timestamp guards, read-only, Node-only).
- [ ] i18n — N/A.
- [ ] Test cases cover all ACs (§5 table).
- [ ] `test-harness-clean.js` 0 findings; new test registered in `test-suites.json`.
- [ ] Integrity regenerated; version bumped once at Step 8.

## 8. Open Questions

1. **Grace default:** one stall window (600s) as specified; the observed 19-minute case needs an operator-tuned `--stall-window`. The finding message exposes both ages so the threshold can be tuned from real runs.
2. **"Run advanced" signal:** batch state `updatedAt`, state-file mtime, and row `updatedAt` are all considered; any within the window counts as advancing. No new persisted field.
