---
id: null
slug: close-implementation-before-pr
title: "Close implementation before opening the PR"
source: local
specDate: 2026-08-30
---

# Specification — Close implementation before opening the PR

## Description

Workflow `status: completed` marks the end of spec/plan implementation, not PR merge. Step 8 / lite Step 4 close persists delivery artifacts, MEMORY, changelog, and completed state before any push or PR. Shipping uses `shipStatus`. Phase A git cleanup runs when shipping is terminal.

## Acceptance Criteria

- AC1: Standard Step 8 / lite Step 4 close sets `status: completed`, `endedAt`, and `shipStatus: pending` before push/PR.
- AC2: `ws-ship-pr` in `workflowMode` does not own the delivery commit; it pushes and creates the PR only.
- AC3: Phase A `cleanup_workflow_git.py` runs when `shipStatus` is terminal (`skipped` | `merged` | `stopped`), not when `status` flips to `completed` with shipping still pending.
- AC4: Resume, spec-list Continue, and ws-cleanup treat `completed` + non-terminal `shipStatus` as unfinished shipping, not a shipped plan.
- AC5: Multi-spec already-implemented requires merge evidence; a whole-line `status: completed` in `step-08-*.result.md` is not enough.
- AC6: `update_state.cjs finish` on the close step persists `shipStatus` (default `pending`) without requiring hand-edited YAML.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New numeric pipeline steps | Keep 0–9 / lite 0–5 |
| Changing G2-code product-commit timing | Still after verify / review-fix |
| Standalone `/ship-pr` as the only PR path | Same-run ship after close stays |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Same-run ship after close | `fullMode` recommends create-PR | User chose continue-in-run | y |
| Input validation / auth / concurrency / TTL | N/A because this is harness sequencing, not a product API | Dimensions collapse to orch/state docs | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Semantics | Close vs ship split agreed | Plan + `workflow-state.schema.json` `shipStatus` enum |
| Dual-mode | Standard Step 8 and lite Step 4 share gates.md | Grep lite SKILL + STEP-DISPATCH |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `update_state.cjs finish --step 8` (lite `--step 4`) writes `status: completed` and `shipStatus: pending` in `{workflow-id}.state.json`.
- `list_disposable.cjs` omits plan roots with `shipStatus: pending`.

### Negative & Failing Test Scenarios

- NS1: `status: completed` in `step-08-*.result.md` without merge evidence must not omit the spec from pending lists.
- NS2: `completed` + `shipStatus: pending` must not delete the plan root in ws-cleanup.
