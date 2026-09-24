# Execution observation semantics (shared)

Single instruction source for harness-execution observation, shared by the
`ws-spec-to-pr` opt-in execution observer (us-365) and `ws-monitor`.
Both sides reference this file instead of duplicating the contract, so
observation semantics cannot drift between them.

## Scope

Harness execution only: orchestrator dispatch flow, workflow state files,
telemetry, expected step artifacts, and agent transcript paths. Consumer
product implementation is never observed for content and never touched.

## Read-only posture

An observer (one-shot snapshot or parallel watcher) MUST NOT:

- edit product files, workflow state files, or consumer configuration;
- create commits, branches, or pull requests;
- file upstream issues automatically.

The only permitted write is the observer's own log/report artifact pair
under the workflow directory (`observer/observer.log`,
`observer/observer-report.md`).

## Transcript vocabulary

- `available`: transcript/session paths are recorded with adapter and
  location class.
- `transcript-unavailable` with one reason: `discovery-disabled`,
  `no-matching-session`, or `scan-capped`.

State files record available agent transcript paths when known and carry
the explicit absent marker otherwise; monitoring continues in both cases.

Discovery uses **one shared correlation window**: the bounded window is
sanitized once, matched by the scan filter, stored, and matched again by
source resolution, so a session the scan counted resolves `available` and
`scan-capped` is reported only when the scan stopped before reading the
matching file.

## Pause vs stall

A workflow whose state carries a turn-boundary pause marker
(`state.turnPause`, written by `update_state.cjs pause-turn` when a host
turn ends mid-step) is **paused**, not stalled: report
`worker-session-paused` (info) and suppress `worker-session-stall`. The
stall warning requires an active workflow, an available correlated
session, and **no** pause marker. The step's terminating `finish` clears
the marker, after which stall detection applies again.

## Finding classification

| Severity | Meaning |
|----------|---------|
| `critical` | Missing mandatory artifact, verify score below the gate with advancement, path-resolution failure |
| `warning` | Empty `filesTouched` on a completed mutating step, rejected model without fallback, turn ended before handoff, worker-session stall (no pause marker) |
| `info` | Idle queue, vault record missing on disk, workflow paused at a turn boundary, healthy run with no defects |

Every finding carries a stable code, a message, and the evidence path that
produced it. Evidence and inference are labeled separately.

## Fix proposals

Findings that indicate a bug in skill instructions or orchestrator flow
include a proposal scoped to the upstream package: the failing contract,
the file and contract that should change, and the smallest correction.
Proposals are reports; auto-committing, auto-filing, or auto-merging them
is out of scope.
