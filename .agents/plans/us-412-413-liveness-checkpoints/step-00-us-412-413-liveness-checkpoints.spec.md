---
id: 413
slug: us-412-413-liveness-checkpoints
title: "Unattended autoMode runs: mid-step checkpoints, turn-boundary pause state, and monitor stall detection"
source: github
specDate: 2026-09-24
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/413"
step: 0
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
status: completed
startedAt: "2026-09-24T04:27:18.225Z"
endedAt: "2026-09-24T04:27:18.225Z"
acRefs: []
---
# Specification — Unattended autoMode runs: mid-step checkpoints, turn-boundary pause state, and monitor stall detection

## Description

This specification makes a standard `ws-spec-to-pr` run viable **unattended** with `defaults.autoMode` (and `fullMode`) enabled: a run must either progress continuously to a terminal state, or park with an explicit, resumable pause marker that observers can distinguish from a stall. It consolidates two complementary upstream defect reports and fixes the existing harness behaviors they expose.

- **Orchestration gap (#413):** autoMode removes gate halts but does not chain host turns. A large step (for example a DAG Step 4 with roughly nine nodes) can end the host turn mid-step with no mid-step checkpoint, leaving `state.status: active`, an unchanged `revision`, `stepStatus[4]: active`, and no finish telemetry. The run is indistinguishable from a stall until a human re-prompts. Contract: a step too large for one host turn checkpoints resumable sub-progress (unit marker plus in-progress sub-step) so a later turn resumes deterministically, and a turn that must end mid-step records an explicit "paused at turn boundary, awaiting continuation" state.
- **Monitor gap (#412):** `ws-monitor` transcript collection both starves discovery and mismatches correlation windows. The per-tick 200-file / 2000 ms budget is consumed by unrelated candidate roots before the correlated session is read (`filesScanned: 0`, `capped: true`), and the scan filters on the full 256 KB tail while `resolveTranscriptSource` re-correlates on the trailing 8 KB, so a scanned, workflow-correlated session resolves to `transcript-unavailable` and `worker-session-stall` cannot fire. Contract: a discovery scan always reads the correlated session's recent window, one shared correlation window is used by scan and resolve, and the stall signal fires for an active workflow whose correlated session is idle beyond the stall window.

System boundaries: changes are limited to the upstream harness skills (`ws-spec-to-pr`, `ws-monitor`, shared runtime schemas, and the observer contract) and their tests. The pause/checkpoint contract is agent-agnostic: it is expressed in portable state, telemetry, and skill prose only, with no host-specific product coupling. No consumer project data, provider APIs, or SCM behavior changes.

## Acceptance Criteria

- AC1: `update_state.cjs` exposes a `checkpoint` operation that accepts `--step` and `--progress` and persists the step's sub-progress (completed unit ids, remaining unit count) in `{workflow-id}.state.json`.
- AC2: Every `checkpoint` call appends a `checkpoint` telemetry event (step, substep, progress, timestamp) to `telemetry.jsonl` and increments `state.revision` by one.
- AC3: `update_state.cjs` exposes a `pause-turn` operation that accepts `--step` and `--reason` and persists a turn-boundary pause marker (step, reason, ISO timestamp) in `{workflow-id}.state.json`.
- AC4: Every `pause-turn` call appends a `turn_paused` telemetry event to `telemetry.jsonl` and increments `state.revision` by one.
- AC5: `update_state.cjs finish` clears the pause marker and the checkpoint record of the finished step before rendering the state.
- AC6: `telemetry.schema.json` accepts `checkpoint` and `turn_paused` event types and validates their required fields.
- AC7: `workflow-state.schema.json` accepts the checkpoint and pause fields, and `validate_state.cjs` exits 0 on a state that carries them.
- AC8: `ws-spec-to-pr/SKILL.md` and `PROTOCOLS.md` document the turn-boundary pause/resume contract, stating that autoMode removes gate halts but does not chain host turns.
- AC9: `pause-turn` records a `nextAction` naming the resumable unit so a later turn resumes deterministically.
- AC10: `scanTranscriptRoots` reads the correlated workflow session (filesScanned >= 1) even when at least 200 unrelated candidate files and 61 candidate roots precede it.
- AC11: Discovery applies a per-root budget (or prioritizes the correlated root) so unrelated roots cannot exhaust the per-tick file or time budget before the target session is read.
- AC12: Scan filtering and `resolveTranscriptSource` correlate on one shared window, so every file counted by the scan resolves to `available` when it matches.
- AC13: `resolveTranscriptSource` reports `scan-capped` only when the scan stopped before reading the matching file, keeping the documented reason vocabulary (`discovery-disabled`, `no-matching-session`, `scan-capped`).
- AC14: `worker-session-stall` fires when the correlated session is `available` and idle beyond `stallWindowMs` (600000 ms) while the workflow is active.
- AC15: `monitor_snapshot.cjs` suppresses `worker-session-stall` for a workflow whose state carries a turn-boundary pause marker and reports the pause instead.
- AC16: `monitor_snapshot.cjs --watch` accepts `--until-terminal` as an alternative to `--iterations` and exits when the selected workflow reaches a non-active status.
- AC17: `ws-monitor/SKILL.md` and `observer-instructions.md` document the pause-versus-stall distinction and the shared correlation window.
- AC18: Regression tests cover the discovery budget, shared-window correlation, pause suppression, and the checkpoint/pause operations; `test/test-suites.json` registers them and `npm run test` exits 0.
- AC19: `README.md` and `FEATURES.md` describe the new operations, pause semantics, and the `--until-terminal` flag.

## Original Issue Context

### Issue #413 — ws-spec-to-pr: full/auto mode parks large steps at host turn boundaries with no checkpoint (run left active, appears stalled)

```text
## Failure class

Orchestration contract. With `defaults.autoMode: true` + `defaults.fullMode: true`, a standard `ws-spec-to-pr` run executes Steps 0→4 with no gates, then the host turn ends **mid-Step-4** (a large DAG step). The workflow records no mid-step checkpoint and full/auto mode does not chain across host turn boundaries, so the run is left `status: active` at an unchanged `revision` with no step `finish`, no telemetry, and no live child process — indistinguishable from a stall until a human re-prompts.

## Expected contract

- A step too large for one host turn must checkpoint resumable sub-progress (wave/node marker + `in_progress` sub-step) so a later turn resumes deterministically and the run never sits frozen at an unchanged revision.
- Full/auto mode should either (a) chain across host turn boundaries through the host's continuation mechanism, or (b) explicitly record a "paused at turn boundary, awaiting continuation" state so observers/operators can distinguish a pause from a stall.

## Observed evidence (sanitized)

- Standard run: Steps 0–3 completed; Step 4 dispatched (`agentType: generic:Task`), then the orchestrator turn ended after "wave 1" (one DAG node of several).
- State then frozen ~1 h 43 m: same `revision`, `currentStep: 4`, `stepStatus: {4: active}`, no step-4 `finish` telemetry, `state.json`/`telemetry.jsonl` mtime unchanged; host process alive but CPU-idle.
- Orchestrator's own explanation (paraphrased): "Full auto only removes gate halts; it doesn't chain my turns by itself — each of my turns still ends"; it "stopped at an internal checkpoint to report" with five DAG nodes remaining.
- Resume required a human prompt ("continue"), after which it proceeded again.
- Pre-existing config defect in the same run: `presetWarning: unknown-models-preset` — a named models preset was not defined, so Step 4 fell back to a different preset's execution model.

## Reproduction shape

- Install scope: global skills hub. Standard pipeline. `autoMode` + `fullMode` true.
- A step whose DAG has more nodes than fit the host turn budget (observed ~9 nodes) on any host with a bounded turn.
- No private project identifiers required.

## Additional host-side observations (not workflow-skills)

- Host status reported `0 subagents` while telemetry recorded a `generic:Task` dispatch — a dispatch-provenance mismatch worth reconciling in the monitor.
- Host reminder subsystem logged self-rejections: `unexpected field 'additionalProperties'` → `reminder_reconciler_outcome reason=invalid_payload`.

## Related

- Complements #412 (monitor transcript correlation): #412 explains why the observer could not emit `worker-session-stall`; this issue is the underlying orchestration gap that left the run parked.
```

### Issue #412 — ws-monitor: transcript discovery/correlation defects mask worker-session-stall (false scan-capped, zero files scanned)

```text
## Failure class

`ws-monitor` transcript collection. Two compounding defects cause a scanned, workflow-correlated host session to be reported as unavailable, and cause a discovery-enabled scan to correlate zero files. Both mask the `worker-session-stall` signal the observer needs to detect an active-but-idle run.

## Expected contract

- With `--discover-host-transcripts`, the recent-window scan for the target workflow's session must complete before the per-tick budget is exhausted by unrelated roots (or be bounded per root), so `filesScanned >= 1` whenever the correlated session exists.
- A session counted by the scan filter (matched on the bounded tail) must resolve to `transcriptSource.status: available`, using the **same** correlation window. `worker-session-stall` must be able to fire for an active workflow whose correlated session is idle beyond the stall window.

## Observed evidence

All sanitized; no consumer names, paths, session ids, or transcript content.

1. **Discovery flood / zero files scanned.** With `--discover-host-transcripts` plus an explicit `--transcript-root <session-dir>`:
   - `transcript.filesScanned: 0`, `transcript.capped: true`, `elapsedMs` ≈ the per-tick time cap (~2000 ms), 61 candidate roots.
   - The same run with the explicit root only (discovery off): `filesScanned: 2`, `capped: false`, `elapsedMs: 9`.
   - The host's session store nests per-day session dirs, each with `subagent/` and `tool-outputs/` subtrees; the 200-file / 2000 ms budget is consumed collecting unrelated roots before the correlated session is read.

2. **Scan-vs-resolve correlation mismatch.** The correlated `session.jsonl` tail contains the workflow id/slug within the 256 KB scan window (12×/6×) but not within the trailing 8 KB:
   - `scanTranscriptRoots` filters on the full `maxBytesPerFile` tail and counts the file as scanned.
   - `resolveTranscriptSource` re-correlates on `item.tail = text.slice(-8000)` → `candidates.length === 0` → returns `transcript-unavailable` with reason `scan-capped` (when capped) or `no-matching-session`.

3. **Consequence.** For a standard-pipeline run whose orchestrator turn had already ended (state still `active`, worker process idle, correlated session idle ~60 min, no step finish telemetry), the tool could not emit `worker-session-stall`; the observer had to infer liveness from host process CPU delta and child-process activity instead.

## Reproduction shape

- Install scope: global skills hub. Host adapter: Muse (a supported adapter).
- Command class:
  - `node monitor_snapshot.cjs --slug <slug> --discover-host-transcripts --json`
  - `node monitor_snapshot.cjs --slug <slug> --transcript-root <session-dir> --json`
- A host with a large nested session history is sufficient to exhaust the per-tick file/time budget; a session whose workflow id appears only outside the last 8 KB tail is sufficient to trigger the false `scan-capped`.

## Suggested direction (observer did not patch anything)

- Correlate the workflow's session first (or reserve budget per root) so the target's recent window is always read.
- Use one shared correlation window for both the scan filter and `resolveTranscriptSource` (e.g., reuse the scanned tail length, or persist a bounded match flag on the scanned file record).
- Optional: add a bounded `--watch --until-terminal` mode so an observer can stop on workflow completion without an external poll loop.
```

### Prior Work Sweep

Sweep run on 2026-09-24 against `jpolvora/workflow-skills` (provider `sweep_prior_work.cjs`, issues #412 and #413; keywords: transcript, scan-capped, worker-session-stall, correlation, autoMode, checkpoint, turn boundary, resume).

- **#412 origin:** PR #364 (`us-356: host adapters for transcript discovery in ws-monitor`, merged) introduced `resolveCandidateTranscriptRoots`, `scanTranscriptRoots`, `resolveTranscriptSource`, `TRANSCRIPT_LIMITS` (200 files / 2000 ms / 256 KB tail), and the trailing 8 KB slice in one commit (`c0750bc0`). Later monitor fixes (#369, #385, #388, us-395) hardened terminal-shape, child-state, and artifact logic without touching the scan budget or the scan/resolve correlation window.
- **#413 origin:** the One Step Per Turn / native transition-gate contract lives in `gates.md`; the last stall-class fix is PR #281 (`release(0.3.62): fix native transition-gate stall`, merged). No mid-step checkpoint exists in `update_state.cjs` (`workflow_state.cjs`): `revision` bumps only on `dispatch`/`finish`/`bypass` and `stepStatus` only tracks whole steps. `step_coordinator.cjs` + `worker_turn_guard.cjs` cover worker CLI turns in multi-CLI baton runs, not interactive host turn boundaries.
- **Duplicate risk:** no open PR references #412 or #413; no other workflow is fixing these paths.

### Design Intent

- **Why the code is shaped this way:** the monitor's discovery feature (us-356) added host adapters and a bounded scan with a single global file/time budget and a deliberately short 8 KB correlation tail for resolve; it assumed small session stores and tails, so the two windows diverged. The orchestrator's state machine (us-395 and earlier) models whole steps only; resume logic in `setup.md` jumps to `currentStep` and assumes no intra-step state, because interactive runs historically ended at step boundaries (gates).
- **What changes:** extend the existing vocabulary rather than invent a subsystem: new `update_state` operations (`checkpoint`, `pause-turn`) writing existing state/telemetry structures with schema updates; monitor budget/correlation fixes inside the existing `TRANSCRIPT_LIMITS`/`scanTranscriptRoots`/`resolveTranscriptSource` contract; pause-aware stall classification in `snapshot`. No host-specific coupling.
- **Rejected alternative:** a second state file or side-channel heartbeat for checkpoints (new artifact to version and reconcile) and host-specific turn-chaining hooks (violates portability).

## Child Tasks

### Task #413 — Full/auto mode parks large steps at host turn boundaries

- **Status:** Open
- **Description:** Mid-step checkpoint (unit marker + in-progress sub-step) and an explicit turn-boundary pause marker so a parked run is resumable and distinguishable from a stall.

### Task #412 — ws-monitor transcript discovery/correlation defects

- **Status:** Open
- **Description:** Guarantee the correlated session is scanned within the per-tick budget, use one correlation window for scan and resolve, and let `worker-session-stall` fire (while honoring an explicit pause marker).

## Notes

- Spec of record: `.agents/specs/0125-us-412-413-liveness-checkpoints.spec.md`. Workflow copy: `.agents/plans/us-412-413-liveness-checkpoints/step-00-us-412-413-liveness-checkpoints.spec.md`.
- Expected touch set: `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs`, `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`, `.agents/skills/ws-shared/runtime/telemetry.schema.json`, `.agents/skills/ws-shared/runtime/workflow-state.schema.json`, `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`, `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-monitor/SKILL.md`, `.agents/skills/ws-shared/runtime/observer-instructions.md`, `.agents/skills/ws-shared/runtime/setup.md`, `test/` (+ `test/test-suites.json`), `README.md`, `FEATURES.md`.
- Harness change protocol (upstream): version bump once per release PR (`package.json` + `bin/skill-dependencies.json` `packageVersion` + site footer), `npm run generate-integrity` + `npm run verify-integrity`, site rebuild, hub/README/FEATURES sync before ship. No `config.json` key changes, so no GUI editor sync is required.
- Ship closers: the delivery PR must carry `Closes #413` and `Closes #412`.
- Agent-agnostic: no host product names or host-only paths in skill bodies, scripts, or tests; use path tokens and portable aliases.
- Do not modify consumer hub data (`.ws/config.json`, `STACK.md`, memory, changelog) as part of the product diff.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Preset-name validation hardening | `presetWarning: unknown-models-preset` already falls back gracefully and is a config defect, not part of the expected contract. |
| New transcript host adapters | The adapter set is unchanged; only scan budget and correlation windows change. |
| step_coordinator / baton checkpoint parity | Interactive host-turn contract only; coordinator parity is a follow-up if needed. |
| Config schema keys or GUI bindings | No config keys are added or changed. |
| Auto-merge policy changes | Ship and merge behavior are unchanged. |
| ws-spec-to-pr-lite orchestration changes | Shared `update_state` gains the operations; lite flow and docs stay as-is. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Checkpoint storage shape | `state.checkpoints` object keyed by step number | Mirrors existing `stepStatus` / `handoffs` maps; small schema addition | n |
| Pause marker shape | `state.turnPause = { step, reason, at, nextAction }` | One explicit object observers can read without parsing prose | n |
| Pause lifetime | Cleared by `finish` for that step; no TTL | Workflow status already gates stall logic; avoids stale-expiry complexity | n |
| Shared correlation window | Reuse the scan's bounded tail (`maxBytesPerFile`) for resolve | One window removes the 256 KB / 8 KB mismatch class | n |
| Budget strategy | Per-root reservation with the correlated root prioritized | Guarantees the target session is read within one tick | n |
| `--until-terminal` semantics | Exits when the selected workflow status is not `active`; requires `--watch`; mutually exclusive with `--iterations` | Bounded watch for unattended observation without an external poll loop | n |
| Input validation, auth, rate limits, data lifecycle, external dependencies | N/A because changes are local state/telemetry fields plus a read-only CLI flag; no network, auth, or persistence lifecycle changes | Keeps scope tight | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Touched files named in Notes; no consumer data changes | Plan maps each AC to a file |
| Atomic criteria | Every AC is a single pass/fail statement | `validate_spec.cjs --mode=authoring` exits 0 |
| Failure modes | Negative scenarios enumerate expected red tests | Test run before fix (expected red) |
| Observation telemetry | `checkpoint` / `turn_paused` events and monitor fields named | Telemetry schema test and monitor JSON assertions |
| No open blockers | Both issues reproduced with code citations; no open PR owns them | Prior Work Sweep and code citations above |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug us-412-413-liveness-checkpoints --discover-host-transcripts --json` reports `transcript.filesScanned >= 1` with an honest `capped` flag.
- `telemetry.jsonl` contains `type: checkpoint` and `type: turn_paused` lines with their documented fields.
- `node .agents/skills/ws-spec-to-pr/scripts/validate_state.cjs <state> --pre-advance 5` exits 0 with checkpoint fields present.
- `npm run test` exits 0 with the new suites registered.

### Negative & Failing Test Scenarios

- Unrelated-root flood fixture (more than 200 unrelated files, 61 roots): pre-fix scan reports `filesScanned: 0` with `capped: true`; post-fix reports `filesScanned >= 1`.
- Workflow id present only between the 8 KB and 256 KB tail: pre-fix `resolveTranscriptSource` returns `scan-capped` or `no-matching-session`; post-fix returns `available`.
- Paused workflow with an idle correlated session: pre-fix emits `worker-session-stall`; post-fix reports the pause and emits no stall warning.
- `--until-terminal` combined with `--iterations`: usage error with non-zero exit and no scan.
- `checkpoint` / `pause-turn` with an out-of-range `--step`: non-zero exit with state unchanged.
- `validate_state.cjs` on a malformed checkpoint record: non-zero exit.
