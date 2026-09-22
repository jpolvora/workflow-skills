---
slug: us-388
step: 1
workflowId: us-388-20260922T080709Z
status: draft
createdAt: "2026-09-22T15:00:00Z"
branch: develop
baseBranch: main
branchStrategy: stay
complexityClass: complex
---

# Implementation Plan — us-388

## 1. Problem

Standard child workers dispatched by `ws-spec-multi` can complete a full delivery
(implementation, review-fix, PR merge) while `{plansDir}/{slug}/` carries no
workflow state, no step artifacts, and no telemetry. The blind spot is structural:
`monitor_snapshot.cjs` sets `expectedArtifacts: []` for `workflowType: ws-spec-multi`
while the same helper computes a real expected list for single workflows, so an
absent child state produces no finding.

## 2. Prior-work probe (Before-implementation evidence)

Three sibling fixes merged earlier the same day, and child persistence now
demonstrably works:

| Evidence | Observation |
|----------|-------------|
| `.agents/plans/us-393/us-393-20260922T080709Z.state.json` + `.state.md` | Child state persisted (machine SoT + render) |
| `.agents/plans/us-389/`, `.agents/plans/us-395/` (14 files each) | `step-01…step-08`, `telemetry.jsonl`, `ac-ledger.json` present |
| `#399` (us-395) | Terminal-close propagation, supersede retirement, parent-child handoff, `stale-parent-row`, `terminal-run-active` |

Contract-name probe: sibling artifacts use `step-01-{slug}.plan.md` etc., never a
bare `plan.md`. Therefore AC1, AC2, AC3, AC7 are already satisfied by prior work
and are verified by cite (not re-implemented).

## 3. Confirmed remaining gap

`node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --repo-root . --json`
returns `expectedArtifacts: []` for all 9 multi-spec runs and no `missing-child-state`
finding. This is the AC6 blind spot.

## 4. Change set (planned)

| # | File | Change |
|---|------|--------|
| 1 | `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | `listChildStateFiles`; `expectedChildArtifacts(items, plansDir, repoRoot)`; populate the multi-spec `expectedArtifacts`; emit `missing-child-state` for advanced items lacking child state (via `classifyMultiSpecWorkflow` 4th param); export the helper |
| 2 | `.agents/skills/ws-monitor/SKILL.md` | Multi-spec queue signals + signal map row for `missing-child-state` |
| 3 | `.agents/skills/ws-monitor/evals/evals.json` | Eval id 5 for the missing-child-state shape |
| 4 | `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 4: state the required child artifact set + `{child-workflow-id}`; Phase 4b/5: fail-closed exit guard via `verify_child_artifacts.cjs`; Phase 6: no delivery-evidence claim without child state |
| 5 | `.agents/skills/ws-spec-multi/STATE.md` | Child artifact set note in the step-output contract section |
| 6 | `.agents/skills/ws-spec-multi/evals/evals.json` | Eval id 5 for child artifact-set enforcement |
| 7 | `.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs` | New deterministic child-exit guard (state + `step-01`), fail closed, `--json` |
| 8 | `test/test-ws-monitor-us388.js` | Fixture: populated multi-spec `expectedArtifacts`; `missing-child-state` fires on an advanced item without state and stays silent when state exists; no overlap with `stale-parent-row` |
| 9 | `test/test-verify-child-artifacts-us388.js` | Fixture: guard exits 0 with state+step-01, non-zero (fail closed) without |
| 10 | `test/test-suites.json` | Register both fixtures |
| 11 | Version + integrity + docs | `npm run build-site:bump`, `generate-integrity`, `verify-integrity`, README/AGENTS/FEATURES sync |

## 5. AC mapping

| AC | Plan |
|----|------|
| AC1 | Verified (prior work + child state present). No change. |
| AC2 | Verified (contract names present). |
| AC3 | Verified (`telemetry.jsonl` present). |
| AC4 | Change 4 (PROTOCOL states required child artifact set + workflow id). |
| AC5 | Change 7 + PROTOCOL guard wiring. |
| AC6 | Changes 1–3. |
| AC7 | Verified (`step-08-*.result.md` present). |
| AC8 | Change 4 Phase 6 report rule. |
| AC9 | Changes 8–11 and the standard verification battery. |

## 6. Stack & Security Invariants Verification Plan

- Node-only runtime: all touched scripts are `.cjs`; no `.py`.
- `scan_stack_invariants.cjs --stack typescript-node` must exit 0.
- Monitor is read-only: `expectedChildArtifacts` only stats files, never writes.
- Guard script is read-only and fail-closed; no writes, no `-Force` semantics.
- Harness neutrality: no host product names in skill bodies; path tokens only.

## 7. Risks

| Risk | Mitigation |
|------|------------|
| `missing-child-state` false-positives a freshly-dispatched `in_progress` row before the child state flushes | Warning severity; only advanced rows are considered; contract requires state at dispatch |
| Overlap with `stale-parent-row` | Distinct predicates: stale-parent-row needs a closed/claiming child; missing-child-state needs an absent child state |
| Existing monitor tests assert finding-set shape | Only additive changes; existing assertions check presence, not absence, of unrelated codes |
