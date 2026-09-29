---
superseded: true
supersededBy: step-02-us-448.plan.refined.md
step: 1
slug: us-448
workflowId: us-448-20260928T011143Z
status: completed
startedAt: "2026-09-28T01:11:43Z"
endedAt: "2026-09-28T01:14:04.161Z"
acRefs: []
---
# us-448 — Implementation Plan

## 0. Goal

Move `ws-spec-multi` batch state to a unique per-run directory while keeping
legacy flat state files resumable. Remove the reserved-slug exception so
`ws-spec-multi` is a normal child plan directory.

## 1. Scope

Product files:

- `.agents/skills/ws-spec-multi/SKILL.md`
- `.agents/skills/ws-spec-multi/STATE.md`
- `.agents/skills/ws-spec-multi/PROTOCOL.md`
- `.agents/skills/ws-spec-multi/EXAMPLES.md`
- `.agents/skills/ws-spec-multi/scripts/record_child_outcome.cjs`
- `.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs`
- `.agents/skills/ws-spec-multi/scripts/retire_superseded_run.cjs`
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- `.agents/skills/ws-monitor/SKILL.md`
- `SPEC-MANAGEMENT.md`
- `test/test-record-child-outcome-us388.js`
- `test/test-verify-child-artifacts-us388.js`
- `test/test-retire-superseded-run.js`
- `test/test-ws-monitor-us388.js`
- `test/test-ws-monitor.js`

## 2. Design

1. New batch runs use `{plansDir}/{runId}/{runId}.state.md`.
2. Resume and supersede resolution prefer the new per-run path and fall back
   to `{plansDir}/ws-spec-multi/{runId}.state.md`.
3. Child artifacts always use `{plansDir}/{slug}/`; no slug is reserved.
4. Monitor discovery continues scanning immediate plan directories, which
   naturally finds both new per-run states and legacy flat states.
5. All run-id and slug path construction remains validated and contained.

## 3. Acceptance-Criteria Checks

| AC | Evidence |
|----|----------|
| AC1–AC2 | Docs and regression tests create two distinct per-run directories. |
| AC3 | Retirement tests resolve legacy and new state paths without duplication. |
| AC4 | Child guard tests accept the literal `ws-spec-multi` slug. |
| AC5 | State/protocol/skill/examples and monitor tests cover discovery and missing child state. |
| AC6 | Custom `plans.dir` tests and path-safe resolution; no batch-script hardcoded default. |
| AC7 | `npm run test`, harness checks, and integrity verification. |

## 4. Stack & Security Invariants Verification Plan

- Node-only runtime: run `node --check` on modified CommonJS scripts and
  the configured `npm run test`.
- Path safety: reject traversal in slugs/run ids and contain resolved state
  paths under the configured plans directory.
- Scope safety: stage only the product files listed above for G2-code; keep
  pre-existing `.ws/CHANGELOG.md`, parent batch state, and classification
  artifact untouched.
- No external input, authorization, tenancy, migration, or i18n boundary is
  introduced.
