---
id: 369
slug: us-369
title: "ws-monitor transcript signals fire false positives on healthy runs (hybrid-path-resolution, model-fallback, subagent-error)"
source: local
specDate: 2026-09-20
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/369"
step: 0
workflowId: us-369
status: completed
startedAt: "2026-09-21T04:25:02.147Z"
endedAt: "2026-09-21T04:25:02.147Z"
acRefs: []
---
# Specification — ws-monitor transcript signals fire false positives on healthy runs (hybrid-path-resolution, model-fallback, subagent-error)

## Description

`ws-monitor` transcript-pattern signals report CRITICAL/WARNING on a fully healthy run, on every snapshot tick, with no failure-shaped evidence behind them. A red-on-green monitor trains operators to ignore it.

On a clean end-to-end standard-pipeline run (verify score above the gate, every telemetry `finish` event with zero errors, all steps `completed` except the designed sequential skip), the monitor reported on every tick:

- CRITICAL `hybrid-path-resolution` (missing-skill / dispatch-context path failure)
- WARNING `model-fallback` (rejected or unavailable model)
- WARNING `subagent-error` (unhandled error or exception trace)

An independent evidence check against the same transcript found zero `ENOENT` occurrences, zero unavailable/unsupported model identifiers, and zero `unhandled` / `traceback` / `fatal` occurrences; the single non-success stream marker was one retried model-stream attempt that succeeded on retry.

Probable match sources are substring patterns hitting benign text: script filenames in directory listings, documentation prose about fallback behavior, routine reconciler outcome records, and retried-then-succeeded stream attempts. Current patterns live in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (transcript scan): `ENOENT|build_dispatch_context`, `unsupported|invalid … model|model … (reject|not available)`, and `fatal error|unhandled rejection|exception in subagent` — none of them require failure-shaped evidence or exclude benign contexts. (Re-verified 2026-09-21 on 0.4.47: predicates byte-identical; a benign-only transcript reproduces all three findings.)

## Acceptance Criteria

- AC1: `hybrid-path-resolution` fires only on an `ENOENT` (or equivalent resolution failure) adjacent to dispatch-context construction; bare script-name substrings, listings, and prose never fire it.
- AC2: `model-fallback` fires only on a rejected/unavailable model identifier inside a dispatch record; documentation prose and benign reconciler outcomes never fire it.
- AC3: `subagent-error` fires only on an actual unhandled-exception trace; retried-then-succeeded attempts and prose mentions of error handling never fire it.
- AC4: Running the monitor against a known-green completed run reports zero critical and zero warning findings (info-only reconciliation notes acceptable).
- AC5: Unit tests cover each signal's positive case (failure-shaped evidence fires) and negative case (benign transcript text stays silent), including the three observed false-positive sources.
- AC6: Authoring validation for this specification exits 0.
- AC7: Sanitize-before-match is preserved: tokens, prompt content, and host-private paths never drive reporting, and finding evidence paths stay repo-relative and sanitized.
- AC8: True positives are preserved: fixtures with a genuine ENOENT-adjacent dispatch-context failure, a rejected-model dispatch record, and an unhandled-rejection trace still produce the same severity findings as before, while a benign-only red regression fixture yields zero findings for the three signals.

## Original Issue Context

`source: github`, `id: 369`.

ws-monitor transcript-pattern signals report CRITICAL/WARNING on a fully healthy run, on every snapshot tick. Expected: each signal requires failure-shaped evidence — `hybrid-path-resolution` needs an `ENOENT` (or equivalent) adjacent to dispatch-context construction, not a bare script-name substring; `model-fallback` needs a rejected/unavailable model identifier inside a dispatch record, excluding prose and benign reconciler outcomes; `subagent-error` needs an actual unhandled-exception trace, excluding retried-then-succeeded attempts and prose mentions. A `CRITICAL` that fires on every tick of a green run is the finding, not the run. Suggested verification: run the monitor against a known-green completed run and expect no critical and no warning findings.

### Prior Work Sweep

- Refreshed 2026-09-21 against HEAD (0.4.47); reproduction confirms the issue still applies in full.
- Open-issue scan shows #369 plus unrelated #378 (consumer skill generator) — no duplicate or sibling issue covers these three signals.
- `git log --all --grep="369"` returns only the spec import (`eff3eaba`) and spec draft (`82bb0744`); no implementation commit exists.
- `6308cf36` ("resolve false positives in ws-monitor transcript signals") touched only `.agents/specs/index.PRD` (tracking), not the predicates.
- The #377 review-thread series touched monitor files but not the three predicates: blame dates the `hybrid-path-resolution` / `model-fallback` patterns to `5db6f9f75` (2026-09-09) and `subagent-error` to `d97f48a2d` (2026-09-11), both before the issue was filed (2026-09-19).
- Reproduction on HEAD (0.4.47): a benign-only transcript (listing, docs prose, healthy reconciler note, retried-then-succeeded stream, green summary) fires all three signals — the issue applies in full.
- Foundation is the merged us-356 series (transcript discovery and read-only snapshot contract in `ws-monitor`, e.g. `c0750bc0`, `ac55d68f`, `2d089427`), which this spec tightens at the predicate level without changing discovery.
- Current predicates verified at `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` transcript scan (bare-substring matches, no evidence guards).

### Design Intent

- Greenfield predicate fix: no existing evidence-guard or benign-exclusion logic to restore — modification archaeology is skipped with reason (scan code has none; history has no prior fix).
- The `ws-monitor` read-only contract stays; only the match predicates gain evidence requirements, so healthy runs go silent without losing true-positive detection.

## Notes

- "Adjacent to dispatch-context construction" means a bounded proximity window around dispatch-context records; the exact window is chosen during implementation and pinned by tests.
- Retried-then-succeeded attempts stay silent by default (no info-level note unless implementation finds a cheap, non-noisy carrier).
- Enhanced from converter output during ws-spec-from-provider import (GitHub); AC7–AC8 adopted from the parallel develop-side draft during merge resolution.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing signal severity levels or snapshot tick cadence | Issue is about match precision, not severity or cadence |
| Consumer product transcript content or host-side log formats | Monitor-side predicate fix only |
| `ws-monitor` host adapters and transcript discovery (us-356 series) | Discovery is settled; only predicates change |
| Auto-remediation of findings | The monitor stays read-only |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Failure-shaped evidence is expressible per signal as regex plus proximity/content guard | Guarded substring + window, no semantic parsing | Keeps the scan cheap and bounded like today | y |
| A green-run transcript (or derived fixture) is available as the AC4 gate input | Synthetic benign transcript embedded in monitor tests (listing, prose, reconciler, retry-then-success lines) | Pinned by negative tests; rerunnable without a recorded run | y |
| Exclusion lists (prose markers, reconciler outcomes, retry-then-success) cover the observed sources | The three observed sources plus obvious siblings | Matches the issue's probable-match-source list | y |
| Input validation and idempotency dimensions | N/A: scan is a pure function over transcript text, no writes or new inputs | Predicate-only change | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Three predicate guards + exclusions + tests; no discovery or severity changes | Plan file list matches AC touchpoints (scan script + tests) |
| Atomic acceptance criteria | AC1–AC8 each independently checkable (unit cases, green-run gate, sanitize, true positives, validator) | `validate_spec.cjs --mode=authoring` passes |
| Failure modes covered | Benign listing/prose/reconciler/retry inputs silent; genuine ENOENT still fires | Negative scenarios section lists both directions |
| Observation telemetry | Per-signal positive/negative unit results plus green-run gate counts | Telemetry section names the signals |
| Zero open blockers | Green-run fixture source chosen at plan time; proximity window is plan-owned | Assumptions table shows plan-owned defaults |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Per-signal unit results: positive fixtures fire, negative fixtures stay silent.
- Green-run gate: critical count 0 and warning count 0 on the known-green transcript.
- No new telemetry plumbing; results observed through existing test output and one live snapshot tick.

### Negative & Failing Test Scenarios

- Transcript containing only a directory listing with `build_dispatch_context` script names: no `hybrid-path-resolution` finding (fails today).
- Transcript containing docs prose describing model fallback plus routine reconciler outcomes: no `model-fallback` finding (fails today).
- Transcript with one retried-then-succeeded stream attempt and prose about error handling: no `subagent-error` finding (fails today).
- Transcript with a genuine `ENOENT` inside dispatch-context construction: `hybrid-path-resolution` still fires (no overcorrection to silence).
- Malformed or empty transcript input: scan completes without throwing; findings empty, not an error.

## Revision History

### [2026-09-21] Revision: refreshed sweep against HEAD (0.4.47), confirmed issue still reproduces 3/3, pinned green-run fixture source (Prompt: "update the spec based on latest fixes/current project state")
