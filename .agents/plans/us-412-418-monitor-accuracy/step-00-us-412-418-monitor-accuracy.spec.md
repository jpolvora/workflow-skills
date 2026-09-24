---
id: 418
slug: us-412-418-monitor-accuracy
title: "Monitor accuracy: step-membership artifact expectations, legacy terminal tolerance, transcript correlation windows, discovery budget"
source: github
specDate: 2026-09-24
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/418"
step: 0
workflowId: us-412-418-monitor-accuracy
status: completed
startedAt: "2026-09-24T12:45:22.766Z"
endedAt: "2026-09-24T12:45:22.766Z"
acRefs: []
---
# Specification — Monitor accuracy

## Description

This specification fixes `ws-monitor` accuracy defects that make healthy runs look broken: the missing-artifact detector over-reports on completed and partial-pipeline runs, and transcript discovery/correlation defects mask the `worker-session-stall` signal. Implement this group **third and last**: the monitor observes runs, so the observed system (Groups 1–2: documented commands, truthful run state) is fixed first, reducing noise while validating monitor changes.

- **Expectation model (#418):** `expectedArtifacts` in `ws-monitor/scripts/monitor_snapshot.cjs` gates each artifact on `Number(state.currentStep) >= N || isCompleted(state, step)`, so high-watermark runs demand every earlier artifact and legacy terminal runs with artifact-name drift are flagged `critical`.
- **Transcript collection (#412):** discovery-enabled scans exhaust the per-tick file/time budget on unrelated roots (`filesScanned: 0`, `capped: true`), and the scan filter (256 KB window) vs `resolveTranscriptSource` (8 KB tail) correlation mismatch reports correlated sessions as unavailable — both mask `worker-session-stall`.

Verified live against the current tree on 2026-09-24 (all claims still reproduce; nothing outdated): the `currentStep` gate shape confirmed in `monitor_snapshot.cjs`; `maxBytesPerFile: 262144` (256 KB tail) plus `capped` / `filesScanned` confirmed in the same file; no `slice(-8000)` literal — the implementer must locate the current resolve-side tail constant and confirm the window mismatch. The monitor stays strictly read-only throughout.

## Acceptance Criteria

- AC1: `expectedArtifacts` requires an artifact only when its step is in `completedSteps` (or `stepStatus: completed`); the `currentStep >= N` watermark survives only as a fallback when step lists are absent.
- AC2: A fix-PR-only run shape (`completedSteps: [8, 9]`, `currentStep: 9`, empty plan dir) yields zero `critical` missing-artifact findings.
- AC3: Terminal runs (`status: completed`) with companion-evidence drift (e.g. `step-02-*.plan.refined.md` present, no separate `step-02-*.plan-interview.md`) do not emit `critical` for the missing registry file — downgrade to `warning`/`info` or accept refined-plan presence as interview evidence, including grandfathering for historical runs with empty `skippedSteps`.
- AC4: Sequential legacy runs are not flagged for `step-03-*.plan.exec.md` absence handling that only suppresses on `skippedSteps[3].reason === 'dag-disabled'`; the same membership rule from AC1 applies.
- AC5: A genuinely live run that advanced past verification without artifacts is still flagged (no over-correction into silence).
- AC6: With `--discover-host-transcripts`, the correlated target session's recent window is always read within one tick (correlate-first or per-root budget reservation), so `filesScanned >= 1` whenever the correlated session exists.
- AC7: The scan filter and `resolveTranscriptSource` share one correlation window (same tail length or a persisted bounded match flag); a session counted by the scan filter resolves to `transcriptSource.status: available`, never `scan-capped`/`no-matching-session` for the same file.
- AC8: `worker-session-stall` fires for an active workflow whose correlated session is idle beyond the stall window in the issue's reproduction shape (discovery on + explicit root, large nested session history).
- AC9: New evals cover the #418 shapes A/B/C and the #412 discovery + mismatch shapes; the snapshot stays quiet on partial and legacy terminal runs.
- AC10: Existing suites (`npm run test`, `ws-check-harness`) stay green; the monitor remains strictly read-only (no state writes).

## Original Issue Context

### Prior Work Sweep

- Exact open PRs for the same tracker ids: none (`gh pr list --state open --search {412,418}` empty on 2026-09-24) — no stop/reuse gate; proceed.
- Related hits recorded, continue: `expectedArtifacts` gate and `maxBytesPerFile: 262144` / `capped` / `filesScanned` confirmed in `ws-monitor/scripts/monitor_snapshot.cjs`; the resolve-side tail constant was not located by literal search — implementer must find and reconcile it (AC7).

### Issue #418 (verbatim)

# ws-monitor: missing-artifact detector over-reports on completed / partial-pipeline runs

## Summary
`ws-monitor` reports `critical` `missing-artifact` / `missing-exec-artifact` for runs that are terminal (`status: completed`, all close-step steps terminal) or that never executed the early pipeline steps. The detector's expectation model makes historical and partial-pipeline runs look broken when they are not live defects.

## Observed failure class (portable, no consumer data)
Function `expectedArtifacts` in `ws-monitor/scripts/monitor_snapshot.cjs` gates each artifact on:

```js
Number(state.currentStep) >= N || isCompleted(state, step)
```

Consequences:

1. **High-watermark over-expectation** ΓÇö any run with a high `currentStep` requires every earlier artifact, even when `completedSteps` never included those steps. Example shape: a fix-PR-only run with `completedSteps: [8, 9]` and `currentStep: 9` is expected to have spec (`step-00`), plan (`step-01`), interview/refined (`step-02`), exec (`step-03`), verify (`step-05`), review (`step-06`), testing (`step-07`) artifacts. Empty plan dir for such a run yields a wall of `critical` findings.
2. **Legacy terminal-run noise** ΓÇö completed standard runs that contain `step-02-*.plan.refined.md` but no separate `step-02-*.plan-interview.md` are flagged `critical`, even though the run is terminal and the refined plan evidences that Step 2 ran. The only suppression is `skippedSteps[2].reason === 'interview-not-required'`; historical runs with empty `skippedSteps` get no grandfathering.
3. **Same shape for exec artifact** ΓÇö `step-03-*.plan.exec.md` is required on any `currentStep >= 4` run unless `skippedSteps[3].reason === 'dag-disabled'`. Sequential legacy runs without that explicit reason are flagged.

## Expected contract
- Artifact expectations should follow `completedSteps` / `skippedSteps` membership (the step actually ran), not the `currentStep` watermark.
- Terminal runs (`status: completed`, or terminal-shaped per `terminalShape`) with historical artifact-name drift should not emit `critical` for missing optional-registry files when the companion artifact (e.g. refined plan) is present. Downgrade to `warning`/`info` or add a legacy-tolerance window.
- `ws-plan-interview` canonical outputs state both interview registry and refined plan are written and distinct; if that contract postdates historical runs, the monitor needs a version/age-aware rule rather than flagging every old run.

## Generic repro shapes (no local paths)
- Shape A: standard run, `status: completed`, `currentStep: 9`, `completedSteps: [8, 9]`, plan dir contains zero `step-*` files ΓåÆ N `critical` missing-artifact findings.
- Shape B: standard run, `status: completed`, `currentStep: 9-10`, `completedSteps` includes `2`, plan dir contains `step-02-*.plan.refined.md` but no `step-02-*.plan-interview.md` ΓåÆ `critical` missing-artifact for the interview file.
- Shape C: standard run with `completedSteps` sparse (e.g. `[0, 4, 5, 6, 7, 8, 9]`, steps 1-3 never ran) and high `currentStep` ΓåÆ missing `step-01`, `step-02`, `step-03` flagged `critical`.

## Proposed fix scope (report only, no auto-fix)
- In `expectedArtifacts`, require an artifact only when its step is in `completedSteps` (or `stepStatus: completed`), not on `currentStep >= N` alone. Keep the watermark only as a fallback when step lists are absent.
- For terminal/historical runs, either accept refined-plan presence as interview evidence or downgrade isolated interview-registry absence to `warning`.
- Add evals covering Shape A/B/C so the snapshot stays quiet on partial and legacy terminal runs while still flagging a genuinely live run that advanced past verification without artifacts.

## Guardrails
- Observer is read-only; this report contains no repository names, local paths, hostnames, tracker ids, transcripts, secrets, or customer data ΓÇö only the generic failure class and portable contract above.

### Issue #412 (verbatim)

## Failure class

`ws-monitor` transcript collection. Two compounding defects cause a scanned, workflow-correlated host session to be reported as unavailable, and cause a discovery-enabled scan to correlate zero files. Both mask the `worker-session-stall` signal the observer needs to detect an active-but-idle run.

## Expected contract

- With `--discover-host-transcripts`, the recent-window scan for the target workflow's session must complete before the per-tick budget is exhausted by unrelated roots (or be bounded per root), so `filesScanned >= 1` whenever the correlated session exists.
- A session counted by the scan filter (matched on the bounded tail) must resolve to `transcriptSource.status: available`, using the **same** correlation window. `worker-session-stall` must be able to fire for an active workflow whose correlated session is idle beyond the stall window.

## Observed evidence

All sanitized; no consumer names, paths, session ids, or transcript content.

1. **Discovery flood / zero files scanned.** With `--discover-host-transcripts` plus an explicit `--transcript-root <session-dir>`:
   - `transcript.filesScanned: 0`, `transcript.capped: true`, `elapsedMs` Γëê the per-tick time cap (~2000 ms), 61 candidate roots.
   - The same run with the explicit root only (discovery off): `filesScanned: 2`, `capped: false`, `elapsedMs: 9`.
   - The host's session store nests per-day session dirs, each with `subagent/` and `tool-outputs/` subtrees; the 200-file / 2000 ms budget is consumed collecting unrelated roots before the correlated session is read.

2. **Scan-vs-resolve correlation mismatch.** The correlated `session.jsonl` tail contains the workflow id/slug within the 256 KB scan window (12├ù/6├ù) but not within the trailing 8 KB:
   - `scanTranscriptRoots` filters on the full `maxBytesPerFile` tail and counts the file as scanned.
   - `resolveTranscriptSource` re-correlates on `item.tail = text.slice(-8000)` ΓåÆ `candidates.length === 0` ΓåÆ returns `transcript-unavailable` with reason `scan-capped` (when capped) or `no-matching-session`.

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

## Scope

- [x] No product fix was applied by the observer
- [x] No managed consumer skill copy was patched
- [x] All private data was removed

## Notes

### Design Intent

#418's gate shape and #412's scan-window/budget shapes were verified against current source (not misreads). The exact resolve-side tail expression needs locating during implementation (no `slice(-8000)` literal found; confirm current constant before changing). Treat divergent windows and watermark-based expectations as accidental gaps. The implementer must still run `git log -p -S "<symbol>"` on `expectedArtifacts`, the scan/resolve correlation path, and the stall-signal path, and record intent vs accident per finding.

### Implementation order

Group 3 of 3 (implement last, after Group 1 golden-path commands and Group 2 run-state integrity).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Golden-path command docs and CLI diagnostics | Group 1 (`us-415-416-script-ux-golden-path`) owns help text, boundary errors, exit codes. |
| Run-state integrity (preset, ship, rounds, skips) | Group 2 (`us-414-run-state-integrity`) owns state-side truthfulness. |
| New transcript host adapters | The adapter set is unchanged; only scan budget and correlation windows change. |
| Optional `--watch --until-terminal` mode | Suggested direction in #412; follow-up enhancement, not required for correctness. |
| Monitor write powers | Observer stays read-only; no state mutation. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Watermark fallback | Keep `currentStep >= N` only when step lists are absent | Preserves signal on legacy states without `completedSteps` | y |
| Legacy tolerance shape | Downgrade to `warning`/`info` or companion-evidence acceptance | Either removes false `critical`s; implementer picks per artifact | y |
| Correlation fix shape | Shared window or persisted match flag | Either removes the scan/resolve mismatch class | y |
| `--until-terminal` | Out of scope (see table) | Not needed to fix the reported defects | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | `expectedArtifacts`, scan budget/discovery path, scan/resolve correlation, stall signal, monitor evals | Plan maps each AC to a file |
| Atomic criteria | Every AC is a single pass/fail statement | `validate_spec.cjs --mode=authoring` exits 0 |
| Failure modes | Negative scenarios enumerate expected red tests | Test run before fix (expected red) |
| Observation telemetry | Snapshot JSON assertions for shapes A/B/C, `filesScanned`, `transcriptSource.status`, stall emission | Monitor evals + JSON assertions |
| No open blockers | Both issues reproduced with code citations; no open PR owns them | Prior Work Sweep and code citations above |
| Stack invariants | Node-only skill scripts; monitor stays read-only; no secrets or machine paths in findings | `ws-check-harness` + secrets review |

## Validation & Observation Notes

- Telemetry: `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` must PASS; `npm run test` and `ws-check-harness` green with exit codes cited.
- Evals: `node monitor_snapshot.cjs --slug <slug> [--discover-host-transcripts] [--transcript-root <dir>] --json` asserting quiet shapes A/B/C, `filesScanned >= 1`, `available` correlation, and stall emission.

### Negative & Failing Test Scenarios

- NEG1: Shape A/B/C fixtures must currently yield `critical` findings (red = bug reproduced) and go quiet after the fix.
- NEG2: discovery-on scan of the issue shape must currently report `filesScanned: 0` + `capped: true` (red), `>= 1` + correlated after.
- NEG3: a live run past verification with genuinely missing artifacts must still flag after the fix (guards AC5 against over-correction).

## Related specs

- Group 1: `us-415-416-script-ux-golden-path` (implement first).
- Group 2: `us-414-run-state-integrity` (implement second).
- Precedent: `0125-us-412-413-liveness-checkpoints.spec.md` (grouped-issue consolidation shape).
