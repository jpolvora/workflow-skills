---
step: 1
slug: us-477
workflowId: us-477-20260930T235947Z
status: completed
acRefs: []
title: ws-monitor session-source stall defers to the state/telemetry clock
startedAt: "2026-09-30T23:59:47Z"
endedAt: "2026-10-01T00:05:00Z"
---
## 0. Summary & Business Rules

`ws-monitor` raises a false `worker-session-stall` (warning) from `stopwatch.source: session`
while the workflow's own state/telemetry clock is advancing. Two defects sit in the session
correlation/stopwatch block of `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`:

1. The session source is treated as authoritative rather than as a feeder to the
   state/telemetry clock. A correlated session file that is stale (wrong session, or a
   cached reference) keeps the run looking stalled even though `*.state.json` was rewritten
   seconds before the tick.
2. Session correlation binds to the supplied `--session-id` root even when the workflow's
   state records a different driver session, and the report never says which session/file the
   stopwatch used, so a weak correlation is indistinguishable from a real stall.

Deliverable = one read-only Node helper edit plus its fixture coverage:

1. `monitor_snapshot.cjs` — re-read the correlated session-file mtime every tick, prefer
   state-recorded driver session ids over an unrelated `--session-id` root, and downgrade the
   session-source signal to `info` when the state/telemetry clock advanced within the stall
   window, recording the session id/file used and whether the correlation is weak.
2. Existing liveness fixtures updated to age the state clock so a genuine (state-idle) stall
   still fires, plus new fixtures for advancing-clock suppression and weak correlation.
3. Doc notes in `ws-monitor/SKILL.md` and `observer-instructions.md` describing the
   state/telemetry deference and the weak-correlation report field.

Business rules:
- Observer stays strictly read-only: no writes to workflow state, no network, no git mutation.
- `state.turnPause` handling (`worker-session-paused`) and `stalled-workflow`
  (state/telemetry source) semantics are unchanged (AC6, AC7).
- Node-only `.cjs`; no `.py` (harness fails closed).
- New report fields are additive; existing `transcriptSource`/`stopwatch` keys keep their shape.

## 1. Definition of Ready & Scope

**Resolved assumptions (spec, Confirmed = y):** freshness source is the correlated
session-file mtime re-read each tick; suppression form is a downgrade to `info` with a
"correlation stale/not-driver" reason; driver preference comes from state-recorded
`agentTranscripts` paths; input validation/auth/concurrency/data lifecycle/idempotency are
N/A because the observer is read-only.

**Measurable ACs:** AC1–AC7 from `step-00-us-477.spec.md`.

**In scope:**
- `monitor_snapshot.cjs`: per-tick session mtime re-read; state/telemetry cross-source
  suppression; stale-reference detection across ticks; driver-session preference; additive
  `sessionRef` report (`id`, `file`, `weak`, `stale`).
- Fixture updates in `test/test-ws-monitor-liveness.js`, `test/test-ws-monitor-us356.js`,
  `test/test-ws-monitor-us412-418.js`, `test/test-ws-monitor-watch-profile.js` so the aged
  state clock keeps exercising a real stall, plus new us-477 assertions.
- Doc notes in `.agents/skills/ws-monitor/SKILL.md` and
  `.agents/skills/ws-shared/runtime/observer-instructions.md`.
- Integrity regenerate + one version bump at ship.

**Out of scope (spec table):** masked-stall detection (#412); turn-boundary parking (#413);
host-adapter transcript discovery changes; historic state/artifact rewrites.

## 2. Technical Design & Architecture

Stack: `node-skills-package` (Node 22 / JavaScript). Layers touched:

| Layer | Path | Role |
|-------|------|------|
| skills-sot | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`, `.agents/skills/ws-monitor/SKILL.md`, `.agents/skills/ws-shared/runtime/observer-instructions.md` | fix + doc |
| tests | `test/test-ws-monitor-liveness.js`, `test/test-ws-monitor-us356.js`, `test/test-ws-monitor-us412-418.js`, `test/test-ws-monitor-watch-profile.js` | fixture coverage |
| installer-cli | `bin`, `docs`, package version | integrity + version bump (ship only) |

**`monitor_snapshot.cjs` changes (read-only observer):**

1. `resolveStateTranscriptSource` / `resolveTranscriptSource` return the matched session
   `file` and a `weak` flag (whether the match came only from the supplied `--session-id`
   key, not from the workflow id/slug or a state-recorded driver path) (AC4, AC5).
2. New `resolveDriverSessionKeys(state)` derives driver correlation keys from
   `state.agentTranscripts.paths` (and `stepDispatches[].subagentId` when present); these
   are tried before the supplied `--session-id` (AC4).
3. In the per-workflow loop: always compute `stateTelemetryMtimeMs` (max mtime of the state
   file and `telemetry.jsonl`); re-stat the correlated session file each tick (AC1);
   maintain a per-workflow `sessionReferenceTracker` (module-level `Map`) to detect a strictly
   increasing session idle whose file was written within the window and mark
   `sessionRef.stale = true` (AC3).
4. Finding decision (session source available, active workflow):
   - `turnPause` → `worker-session-paused` (`info`), unchanged (AC6).
   - session idle > window **and** (`stateIdle <= window` **or** `weak` **or** `stale`) →
     `worker-session-stall` at `info` with a "session correlation stale/not-driver;
     state/telemetry advancing" reason (AC2, AC3, AC5).
   - session idle > window and state clock also idle → `worker-session-stall` at `warning`
     (genuine stall preserved).
   - no session + state stopwatch stalled → `stalled-workflow`, unchanged (AC7).
5. `workflow.sessionRef = { id, file, weak, stale }` added to the report and surfaced in
   `markdownReport` so the id/file the stopwatch used is diagnosable (AC5).

**Not touched:** `detectContextMismatch` severity logic (us-473), discovery budgets,
provider intents, `.ws/config.json` schema.

## 3. Step-by-Step Plan

1. **Session source plumbing** — add `file`/`weak` to the resolved source; add
   `resolveDriverSessionKeys`; prefer driver keys over `--session-id`. → AC4, AC5
2. **Stopwatch + cross-source suppression** — always compute the state/telemetry mtime;
   per-tick session mtime re-read; stale-reference tracker; downgrade decision. → AC1, AC2, AC3
3. **Report surface** — `workflow.sessionRef` + markdown line. → AC5
4. **Fixture updates** — age the state clock in the existing stall fixtures; add us-477
   suppression + weak-correlation + stale assertions. → AC1–AC7, NS1–NS3
5. **Docs** — `ws-monitor/SKILL.md` + `observer-instructions.md` state-deference note. → AC2, AC5
6. **Harness / Node-only check** — no `.py`; `test-harness-clean.js` 0 findings. → invariant
7. **Integrity + version bump (ship hygiene)** — `npm run build-site:bump` once,
   `npm run generate-integrity` + `verify-integrity`. → ship hygiene

## 4. Permissions, Tenancy & i18n

N/A — read-only local observer; no RBAC, tenancy, authZ, or user-facing i18n. Output is
en-us factual JSON/text.

## 5. Test Coverage

| AC / NS | Named check / test | Expected files |
|---------|--------------------|----------------|
| AC1 | `testSessionMtimeRereadPerTick` — advancing session file mtime lowers reported session idle across ticks | `monitor_snapshot.cjs` |
| AC2 | `testAdvancingStateSuppressesSessionStall` — fresh state clock + idle session → no warning-severity stall | `monitor_snapshot.cjs` |
| AC3 | `testStaleSessionReferenceMarked` — file written within the window while cached idle grows → `sessionRef.stale` | `monitor_snapshot.cjs` |
| AC4 | `testDriverSessionPreferredOverSessionId` — state-recorded driver path beats an unrelated `--session-id` root | `monitor_snapshot.cjs` |
| AC5 | `testReportNamesSessionRefWeak` — report records the session id/file and marks a non-driver correlation weak | `monitor_snapshot.cjs` |
| AC6 | `M5 pause-vs-stall` (existing) — `turnPause` → `worker-session-paused`, no stall | `monitor_snapshot.cjs` |
| AC7 | `P4 stalled-workflow` (existing) — no session + idle state clock → `stalled-workflow` unchanged | `monitor_snapshot.cjs` |
| NS1 | Advancing state + idle correlated session → no warning stall | `monitor_snapshot.cjs` |
| NS2 | Supplied `--session-id` that is not the driver → weak correlation, not a stall | `monitor_snapshot.cjs` |
| NS3 | `state.turnPause` set → `worker-session-paused`, no `worker-session-stall` | `monitor_snapshot.cjs` |

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification check | Expected files |
|-----------|--------------------|----------------|
| Node-only runtime | `node --check` on the edited `.cjs`; no `.py` introduced | `monitor_snapshot.cjs` |
| Read-only observer | source scan: no `fs.writeFileSync` to state/plans, no `git`/`spawn` mutation in the new path | `monitor_snapshot.cjs` |
| Status-literal severity (MEMORY trap) | session-stall severity keys on idle vs window only; no shape-derived severity input | `monitor_snapshot.cjs` |
| Turn-pause contract | `worker-session-paused` still suppresses `worker-session-stall` | `monitor_snapshot.cjs` |
| State-telemetry contract | `stalled-workflow` branch unchanged | `monitor_snapshot.cjs` |
| Additive report shape | new `sessionRef` key added; existing `transcriptSource`/`stopwatch` keys unchanged | `monitor_snapshot.cjs` |
