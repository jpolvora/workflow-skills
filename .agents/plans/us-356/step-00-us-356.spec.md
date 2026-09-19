---
id: 356
slug: us-356
title: "[ws-monitor] Discover and check transcripts/sessions for known agent hosts (Cursor, OpenCode, Antigravity, Muse)"
source: github
specDate: 2026-09-19
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/356"
step: 0
workflowId: us-356
status: completed
startedAt: "2026-09-19T08:49:46.237Z"
endedAt: "2026-09-19T08:49:46.237Z"
acRefs: []
---
# Specification — [ws-monitor] Discover and check transcripts/sessions for known agent hosts (Cursor, OpenCode, Antigravity, Muse)

## Description

Transcript evidence in `ws-monitor` is currently opt-in and manual (`--transcript-root`, `--discover-host-transcripts`). Each host stores sessions differently (workspace transcript dirs vs user data dirs, flat files vs app databases), so correlating a running subagent/worker to its transcript today requires hand-supplied session IDs and host-specific knowledge.

Add built-in host adapters in the monitor snapshot path:

1. **Per-OS default session locations** for Cursor, OpenCode, Antigravity, and Muse, behind the existing opt-in discovery flag. Never enabled by default; the operator opts in per run.
2. **Session-to-workflow correlation** (workspace directory, branch, run window) so the active worker session is found without manual IDs.
3. **Bounded, sanitized reads**: recent activity window only, plus an error-pattern scan (unhandled errors, rejected/unavailable models, turn ended before handoff).

New first-class signals: worker-session liveness (worker idle while the queue shows `in_progress` = stall evidence) and transcript error parts feeding the existing `subagent-error` / stall classifications.

Constraints: strictly read-only against live host stores (WAL-safe/immutable opens, never lock or modify); sanitize tokens and prompt content before reporting; never emit host-private paths or credentials in reports or upstream issues; keep host specifics as adapter data behind flags, not as required portable contract.

System boundaries: `ws-monitor` snapshot scripts and docs only. Architecture touchpoints: monitor snapshot builder, transcript discovery helpers, per-host adapter table (locations per OS), sanitizer, and classification rules. No changes to dispatch, providers, or workflow state schema unless the plan shows a signal field is needed.

## Acceptance Criteria

- AC1: Snapshot reports the transcript source per workflow (adapter name + location class) or `transcript-unavailable` with a reason — verified by running the monitor against a fixture with and without discoverable sessions.
- AC2: Per-host default session locations are documented for Cursor, OpenCode, Antigravity, and Muse, per OS where locations differ — verified by reading the monitor docs/reference table.
- AC3: Discovery stays opt-in behind the existing flag; default runs perform no host-store reads — verified by a test asserting zero host-store access without the flag.
- AC4: Reads are strictly read-only (immutable/WAL-safe opens, no locks or writes) and bounded (recent window + error-pattern scan only) — verified by code review of open modes plus a test on a locked/WAL fixture.
- AC5: Tokens, prompt content, host-private paths, and credentials are sanitized before reporting — verified by a redaction test with planted secrets.
- AC6: Per-tick cost stays bounded (documented time/read cap; no full-history scans) — verified by a timing/size assertion on a large fixture.

## Original Issue Context

Transcript evidence in ws-monitor is currently opt-in and manual (`--transcript-root`, `--discover-host-transcripts`). Each host stores sessions differently (workspace transcript dirs vs user data dirs, flat files vs app databases), so correlating a running subagent/worker to its transcript today requires hand-supplied session IDs and host-specific knowledge.

Proposal: built-in host adapters in the monitor snapshot path:
- Per-OS default session locations for Cursor, OpenCode, Antigravity, and Muse, behind the existing opt-in discovery flag.
- Session-to-workflow correlation (workspace directory, branch, run window) so the active worker session is found without manual IDs.
- Bounded, sanitized reads: recent activity window only, error-pattern scan (unhandled errors, rejected/unavailable models, turn ended before handoff).

New first-class signals: worker-session liveness (worker idle while queue shows in_progress = stall evidence) and transcript error parts feeding the existing `subagent-error` / stall classifications.

Constraints: strictly read-only against live host stores (WAL-safe/immutable opens, never lock or modify); sanitize tokens and prompt content before reporting; never emit host-private paths or credentials in reports or upstream issues; keep host specifics as adapter data behind flags, not as required portable contract.

Acceptance: snapshot reports the transcript source per workflow (or transcript-unavailable with reason), per-host locations are documented, and per-tick cost stays bounded.

### Prior Work Sweep

- Provider `sweep-prior-work` for issue 356 (keywords: ws-monitor, transcript, host): no open PR for the same tracker id; keyword hits are merged historical PRs (#277, #219, #191, #318, #317, #304, #300); no duplicate risk.
- Related merged work: #191 (ws-doctor diagnostic inspector) and monitor evolution PRs; this spec adds host-aware transcript discovery on top of the existing opt-in flags.
- No commits touching monitor transcript discovery found on the current branch — greenfield adapter work.

### Design Intent

- Manual `--transcript-root` / `--discover-host-transcripts` flags are the intentional current contract (opt-in, operator-supplied); the gap is that per-host locations and session correlation are not built in, forcing hand-supplied IDs. This spec extends that contract rather than replacing it — discovery stays opt-in.
- Greenfield adapter table plus read-only/sanitized access rules; no prior intentional constraint forbids host-specific location data as long as it stays behind flags and out of the portable contract.

## Notes

- Host product names appear here only as adapter data (location table), never as required portable contract — shipped skill bodies stay host-neutral per harness rules.
- SQLite/app-database session stores must be opened immutable/WAL-safe (e.g. read-only connection, copy-then-read) so monitoring a live session can never lock or corrupt it.
- Correlation keys (workspace dir, branch, run window) must be normalized before matching (case, separators, symlinks) to avoid false stall signals.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Write access to host session stores | Read-only is a hard constraint; monitoring must never mutate host state |
| Full-history transcript ingestion | Bounded recent-window reads only; cost and privacy require caps |
| New required portable contract for hosts | Adapters are opt-in data; hosts without adapters report `transcript-unavailable` |
| Changes to dispatch or workflow state schema | Monitor-side signals only, unless the plan proves a schema field is needed |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Discovery stays behind the existing opt-in flag | No host-store reads unless `--discover-host-transcripts` (or equivalent) is passed | Issue constraint says "behind the existing opt-in discovery flag" | y |
| Per-OS location differences are documented per host | Adapter table has OS rows where paths differ | Issue asks for "per-OS default session locations" | y |
| Error patterns are the three named classes | Unhandled errors, rejected/unavailable models, turn-ended-before-handoff | Named explicitly in the issue | y |
| Input validation and bounds | N/A because monitor reads local session stores, not user free input | No new external input surface | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Monitor snapshot + adapter table + sanitizer + docs only | Plan file list matches AC touchpoints |
| Atomic acceptance criteria | AC1–AC6 each independently testable with fixtures | `validate_spec.cjs --mode=authoring` passes |
| Failure modes covered | Unavailable transcript, unreadable store, secret leak, unbounded cost each have a negative scenario | Negative scenarios section lists all four |
| Observation telemetry | Transcript source per workflow and error-part signals are named snapshot fields | Telemetry section names the fields |
| Zero open blockers | No external dependency; host location data gathered from docs during planning | Assumptions table shows no open questions blocking start |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Monitor snapshot includes `transcriptSource` per workflow (adapter id or `transcript-unavailable` + reason).
- Transcript error parts feed `subagent-error` / stall classifications in the snapshot.
- Worker idle with queue `in_progress` surfaces as stall evidence when the session shows no recent activity.
- `ws-monitor` snapshot run against fixtures with/without sessions; per-tick timing logged.

### Negative & Failing Test Scenarios

- No discoverable session must report `transcript-unavailable` with reason, never an empty or misleading source — red before the fix.
- Locked live database fixture must still snapshot without locking or modifying the store — red if the monitor takes a write lock.
- Planted token/credential in a fixture transcript must be redacted in the snapshot output — red if any secret leaks.
- Oversized history fixture must complete within the documented per-tick cap (recent window only) — red on full-history scan.
