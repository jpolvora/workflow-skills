---
id: 395
slug: us-395
title: "[ws-monitor] Terminal-state workflows stay active; batch queue keeps stale/superseded rows"
source: github
specDate: 2026-09-22
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/395"
status: completed
step: 0
workflowId: us-395-20260922T080709Z
startedAt: "2026-09-22T12:58:45.331Z"
endedAt: "2026-09-22T12:58:45.331Z"
acRefs: []
---
# Specification — [ws-monitor] Terminal-state workflows stay active; batch queue keeps stale/superseded rows

## Description

Workflow state files can reach a terminal shape — every step completed or skipped, verification passed, the run effectively finished — without ever writing a terminal `status` or an `endedAt`. The same failure class appears at the parent-child handoff: a batch child worker closes out correctly while its parent queue row stays `in_progress` and the parent `updatedAt` freezes. A third instance is queue hygiene: batch ship updates leave stale `pending` rows beside `shipped` rows, and a superseding batch run never retires the run it supersedes.

The consequence is an observer contract violation. `ws-monitor` reports these runs as live signals, so a consumer polling `status == active` waits forever on finished work, and the strictly-sequential single-`in_progress` batch contract is broken by two runs claiming the same item.

Four instances were confirmed from read-only sources in one snapshot, spanning three transitions:

1. **Single-run close never fires.** A `standard` run with `completedSteps: [0..9]`, every `stepStatus` terminal (Step 3 `skipped` with reason `dag-disabled`, the designed sequential shape), `currentStep: 9`, still `status: active` with `endedAt: null` roughly four weeks later.
2. **Supersede never retires.** Two `ws-spec-multi` runs created nine minutes apart are both `status: active` days later with `updatedAt` frozen at creation, and both list the same first item as `in_progress`. The newer run's own notes claim it supersedes the older one.
3. **Queue rows are appended, not transitioned.** A `status: completed` batch run's queue holds 7 rows for 5 items: rows 1–5 `shipped` with PR references, then two extra rows repeating items 4–5 as `pending` carrying the original run-creation timestamp.
4. **Parent-child handoff never propagates.** A batch child worker reached `status: completed` with every step terminal, score 10 against a gate of 9, and `endedAt` set, while the parent queue still listed that item `in_progress` with a pre-completion timestamp and the parent state `updatedAt` stayed frozen at the previous ship event.

Architecture touchpoints: the terminal-close write path in the standard orchestrator (`ws-spec-to-pr` close / Step 8–9 transition) and its state writer, the batch queue mutation and supersede path in `ws-spec-multi` (`STATE.md` schema, `PROTOCOL.md` Phases 2/4b/5/6), and the `ws-monitor` finding model (`monitor_snapshot.cjs`), which currently has no finding code for a completed-child/stale-parent-row shape — so the compact watch stayed green throughout.

## Acceptance Criteria

- AC1: Completing the terminal step writes a terminal `status` and sets `endedAt`, regardless of whether a telemetry file exists on disk.
- AC2: A standard run whose `completedSteps` cover every step and whose `stepStatus` values are all terminal is never reported as `active`; a consumer polling `status == active` sees it close.
- AC3: A superseding batch run retires the run it supersedes (`cancelled` / `superseded`), so at most one `active` runner exists per queue lineage and at most one item is `in_progress` per slug.
- AC4: Batch ship updates transition the existing item row in place; a finished queue table has exactly one row per item, with no stale `pending` rows carrying the run-creation timestamp.
- AC5: When a batch child worker reaches a terminal state, the parent queue row transitions and the parent state `updatedAt` advances — the parent-child handoff propagates instead of freezing.
- AC6: `ws-monitor` emits a finding for the completed-child / stale-parent-row shape, so this class is surfaced rather than staying green.
- AC7: `ws-monitor` emits a finding for a terminal-shaped run still reporting `status: active` (all steps terminal, `endedAt` null).
- AC8: State writes are idempotent: re-applying a close or ship transition does not add rows and does not regress a terminal status.
- AC9: `npm run test`, `ws-check-harness`, and `node test/test-harness-clean.js` exit clean, and the monitor fixture covers the new finding codes.

## Original Issue Context

### Failure class

Terminal-state workflows never transition to a terminal status, and batch-queue updates append rows instead of retiring old ones. The observer (`ws-monitor` snapshot over `{plansDir}` state + telemetry + vault + bounded transcript scan) reports these as live signals; the state files confirm all three cases below from independent sources in one snapshot.

### Evidence (3 cases, one snapshot, all sources read-only)

Snapshot scope: 67 workflows (61 completed, 4 active, 1 cancelled, 1 implemented). Finding distribution in the same run: `missing-artifact` 51, `missing-exec-artifact` 6, `context-mismatch` 14, `empty-files-touched` 15, `vault-unreconciled-workflow` 18 (info), `model-fallback` 1 (warning). The `missing-artifact` / `context-mismatch` clusters skew to old completed runs and are reported here only as background, not as the filed bug.

**Case 1 — standard run stuck `active` with every step terminal**

State file: `{plansDir}/<slug>/<workflowId>.state.md` (`stateVersion: 2`, `workflowType: standard`):

- `status: active`, `endedAt: null`, `currentStep: 9`
- `completedSteps: [0,1,2,3,4,5,6,7,8,9]` (all steps)
- `stepStatus`: every step `completed`, except Step 3 `skipped` with reason `dag-disabled` (the designed sequential shape)
- `stepDispatches` recorded for steps 0-2; telemetry file absent on disk (`eventCount: 0` in snapshot)
- Transcript correlation: `transcript-unavailable (scan-capped)` — bounded host scan found no matching session, so no transcript evidence either way
- Run age: started ~4 weeks before the snapshot; no `endedAt` ever written

Portable contract violated: completing the terminal step should flip `status` to a terminal value and set `endedAt`. A consumer polling `status == active` will wait forever on a finished run.

**Case 2 — two batch runs `active` on the same item; supersede never retires the old run**

State files: `{plansDir}/ws-spec-multi/<runA>.state.md` and `<runB>.state.md` (`workflowType: ws-spec-multi`), created ~9 minutes apart, both still `status: active` ~3 days later (`updatedAt` frozen at creation):

- Both queue tables list the same first item as `in_progress` with `flowMode: standard`; remaining items `pending`
- The newer run's own notes state it "supersedes" the older run (one queued spec no longer exists on disk; a newer spec takes its slot) — yet the older run was never moved to `cancelled`/`completed`/`skipped`
- Result: two `active` batch runners each claim the same item `in_progress`, breaking the strictly-sequential single-`in_progress` batch contract

**Case 3 — completed batch run keeps stale `pending` duplicates beside `shipped` rows**

State file: `{plansDir}/ws-spec-multi/<completedRun>.state.md` (`status: completed`):

- Queue table holds 7 rows for 5 items: rows 1-5 `shipped` (PR references + merge reasons recorded, latest timestamps), then two extra rows repeating items 4-5 as `pending` with the run-creation timestamp
- The stale duplicates carry the original `createdAt` timestamp, i.e. the ship update appended new rows (or never removed the seeded `pending` rows) instead of transitioning each item row in place

### Reproduction (read-only)

1. `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --vault --discover-host-transcripts --json`
2. In the JSON: `activeCount` includes a standard workflow whose `completedSteps` cover every step and whose `stepStatus` values are all terminal, yet `status == "active"` and `endedAt == null`.
3. Under `{plansDir}/ws-spec-multi/`: two `status: active` runs minutes apart share one `in_progress` slug; one `status: completed` run's queue table contains more rows than items (`shipped` + stale `pending` duplicates with older timestamps).
4. Cross-checks: referenced telemetry paths absent (`eventCount: 0`); transcript scan bounded and capped (`transcript-unavailable/scan-capped`); external memory-vault backend lists active records with no on-disk match (secondary `vault-unreconciled-workflow` info signals, consistent with statuses never being closed out).

### Expected contract

- Terminal step completion writes `status: completed` (or another terminal status) and sets `endedAt`, regardless of telemetry presence.
- A superseding batch run retires the run it names (`cancelled`/`superseded`/`skipped`), so at most one `active` runner exists per queue lineage and at most one item is `in_progress` per slug.
- Queue ship updates transition the existing item row in place; a finished table has exactly one row per item.

### Live corroboration (issue comments)

Comment 1 records a 3-minute watch baseline: a then-new batch run was `active` and progressing (first item `shipped`, second `in_progress`, third `pending`, `updatedAt` advancing), and its queue table held exactly one row per item — bounding Case 3 to the older completed run rather than an always-on writer bug. The same baseline still showed the two Case 2 runs `active` on the same item and the Case 1 run `active` with `endedAt: null`.

Comment 2 records a fourth instance at the parent-child handoff: a batch child worker reached `status: completed` with every step terminal, verification score 10 against a gate of 9, and `endedAt` set — while the parent queue still listed that item `in_progress` with a pre-completion timestamp and the parent `updatedAt` was frozen at the previous ship event, roughly four hours stale. It also notes the observer gap: no snapshot finding code covers a completed-child / stale-parent-row shape, so the compact watch stayed green throughout.

### Sources and caps (for the fixer)

- Primary: state Markdown under `{plansDir}` (quoted above) + snapshot JSON (`stepDispatches`, `telemetry.eventCount`, queue tables).
- Secondary: bounded transcript scan (workspace candidate roots + host discovery; capped, no match — no transcript content is quoted or stored here).
- Memory vault: external vault backend active-record list used only to corroborate unclosed statuses; no vault content quoted.
- Sanitization: absolute local paths, host/session identifiers, credential-adjacent values, commit SHAs, PR URLs/numbers, and host-specific model labels are deliberately omitted or tokenized (`{plansDir}`, `{specsDir}`, `{skillsRoot}`). No transcript, prompt history, or private code is included.

Source: https://github.com/jpolvora/workflow-skills/issues/395 (state open, labels none, assignees none, comments 2).

### Prior Work Sweep

Provider sweep on 2026-09-22 (`sweep_prior_work.cjs --issue 395 --keywords "terminal state workflow stays active" "batch queue stale superseded rows" --files .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs .agents/skills/ws-spec-multi/SKILL.md`): status ok, zero exact open PR for #395, no duplicate-risk open work. The two keyword PR hits (#319 ws-wiki, #350 step baton) are unrelated. Commit history on the touched files shows the immediately preceding sibling fix `feat(us-393): key ws-spec-multi queue mutations by spec identity` (Case 3 overlap) plus `fix(#385): pipeline-aware expected artifacts in ws-monitor for lite runs`; neither covers terminal-close propagation, supersede retirement, or the new monitor finding codes.

### Design Intent

Modification, not greenfield: the state schema, the close transition, the batch queue, and the monitor finding model all exist. Three complementary hardening points, each independently verifiable:

1. **Close propagation** — make the terminal step's completion write the terminal `status` + `endedAt` unconditionally, and cover the parent-child handoff so a closed child transitions its parent row and advances the parent `updatedAt` (AC1, AC2, AC5).
2. **Queue lineage hygiene** — transition rows in place, and have a superseding run retire the run it names so the single-`active`-runner / single-`in_progress` invariants hold (AC3, AC4, AC8). This overlaps the just-shipped #393 in-place keying fix; this spec extends it to supersede retirement rather than re-implementing row keying.
3. **Observation** — add the two missing monitor findings so the class cannot stay green (AC6, AC7).

The root cause is not assumed: Case 1 may be a telemetry-gated close, a missing writer call, or a status value that never maps to terminal. AC1 deliberately states the contract independent of telemetry so the fix cannot be "write telemetry instead".

## Notes

- Case 3 is the same shape as the just-fixed #393 duplicate-row defect; the fix here must build on in-place row keying and must not duplicate it. Verify against the merged #393 behavior.
- Comment 1's baseline is the strongest scoping signal: the current runner writes clean one-row-per-item tables, so Case 3 is bounded to the older completed run's writer, not an always-on bug.
- Case 1's telemetry file is absent (`eventCount: 0`). Whether close is gated on telemetry is the key hypothesis to test; AC1 forbids a telemetry-dependent close.
- The fourth instance (comment 2) is the only one that crosses the orchestrator boundary, so AC5 must be asserted at the handoff, not only at single-run close.
- Reproduction is read-only and cheap: one `monitor_snapshot.cjs` run plus a scan of `{plansDir}/ws-spec-multi/`.
- The monitor gap is part of the defect, not a nice-to-have: without AC6/AC7 the class is invisible to the watch that was meant to catch it.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Re-implementing in-place queue row keying | Delivered by the merged #393 fix; this spec extends it to supersede retirement |
| The `missing-artifact` / `context-mismatch` clusters on old completed runs | Explicitly background in the issue, not the filed bug |
| Child workflow artifact persistence (`step-01..08`, telemetry) | Tracked separately by #388; this spec covers status/`endedAt` propagation |
| Backfilling terminal status into historical state files | Consumer-owned run artifacts; the fix is forward-only |
| Redesigning the state schema or `stateVersion` | The existing schema can express terminal status and `endedAt` |
| Changing the sequential execution model itself | Sequential is correct; the defect is that terminal transitions do not propagate |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Terminal status value | `completed` (matching existing usage), with `cancelled` for retired superseded runs | Existing state files already use these values | y |
| Supersede retirement mechanism | The superseding run writes the retired run's status | The issue names the superseding run as the actor that "names" the superseded run | y |
| Close gating | Never gate the terminal write on telemetry presence | AC1 states this explicitly; Case 1 had `eventCount: 0` | y |
| New monitor finding ids | `stale-parent-row` (completed child / non-terminal parent row) and `terminal-run-active` | Follows the existing finding-id naming style | y |
| Parent `updatedAt` semantics | Advances on every queue mutation, including child-handoff transitions | The fourth instance cites a frozen parent `updatedAt` as the signal | y |
| Backfill of historical runs | N/A because the fix is forward-only and run state is disposable | No consumer depends on historical state files | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Close/handoff propagation + queue lineage retirement + two monitor findings; no schema redesign | Diff touches the state writer, `ws-spec-multi` state guidance, and `ws-monitor` only |
| Atomic criteria | AC1–AC9 each pass or fail | Authoring validate plus the commands in AC9 |
| Failure modes | Terminal-shaped run cannot stay `active`; superseded run cannot stay `active`; parent row cannot stay `in_progress` after child close | AC1–AC5 plus negative scenarios |
| Observation telemetry | Two new monitor findings fire on the exact shapes in the issue | AC6, AC7 with a fixture |
| Stack invariants | No `.py` additions; Node-subset respected in touched monitor/state scripts | `scan_stack_invariants.cjs --stack typescript-node` |
| Open blockers | None | Root cause is deliberately not assumed; AC1 states the contract |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0121-us-395.spec.md` exits 0; `node {skillsRoot}/ws-monitor/scripts/monitor_snapshot.cjs --json` reports no terminal-shaped run as `active`; `npm run test` exits 0; `ws-check-harness` exits 0; `node test/test-harness-clean.js` reports 0 findings.
- Artifacts: a closed run's state file carries a terminal `status` and a non-null `endedAt`; a finished batch queue holds exactly one row per item; the monitor JSON exposes the two new finding ids.
- Signals: `activeCount` drops to genuinely in-flight runs; at most one `active` batch run per lineage; parent `updatedAt` advances on child handoff.

### Negative & Failing Test Scenarios

- A run with every step terminal still reports `status: active` with `endedAt: null` (must fail AC1/AC2).
- Close is skipped because the telemetry file is absent (must fail AC1).
- Two batch runs remain `active` on the same item after one supersedes the other (must fail AC3).
- A finished queue table has more rows than items, or a stale `pending` row carrying the run-creation timestamp (must fail AC4).
- A child worker closes while its parent row stays `in_progress` and the parent `updatedAt` stays frozen (must fail AC5).
- The monitor reports no finding for a completed-child / stale-parent-row shape (must fail AC6).
- The monitor reports no finding for a terminal-shaped run still `active` (must fail AC7).
- Re-applying close or ship adds rows or regresses a terminal status (must fail AC8).
- `npm run test`, `ws-check-harness`, or `test-harness-clean.js` fails after the change (must fail AC9).
