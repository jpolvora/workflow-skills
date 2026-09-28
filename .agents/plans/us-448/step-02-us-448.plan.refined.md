---
step: 2
slug: us-448
workflowId: us-448-20260928T011143Z
status: completed
startedAt: "2026-09-28T01:11:43Z"
endedAt: "2026-09-28T01:14:37.119Z"
acRefs: []
---
# us-448 — Refined Implementation Plan

## Goal

Use one directory per batch run:

```text
{plansDir}/{runId}/{runId}.state.md
```

Keep `{plansDir}/ws-spec-multi/{runId}.state.md` readable for legacy resume,
but never create new state there.

## Implementation

1. Update `ws-spec-multi` skill/protocol/state/examples and related monitor
   documentation to describe the canonical per-run path and the legacy
   fallback.
2. Remove the reserved slug checks from child outcome, child artifact, and
   monitor expectation code.
3. Make superseded-run lookup resolve the new per-run path first, then the
   legacy flat path, while validating run IDs and custom plan roots.
4. Keep monitor discovery's immediate-directory scan, adding tests that prove
   both layouts are observed and that missing child state remains reported.
5. Update regression tests for the now-valid `ws-spec-multi` child slug and
   custom plan roots.

## Verification

- `node --check` for modified `.cjs` scripts.
- Targeted child guard, retirement, and monitor tests.
- `npm run test`.
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`
- `node test/test-harness-clean.js`
- `npm run generate-integrity` and `npm run verify-integrity`.

## Scope Guard

Only the listed runtime/docs/tests are product scope. Workflow artifacts stay
under `.agents/plans/us-448/`; `.ws/CHANGELOG.md`, the parent batch state, and
the pre-existing classification artifact are unrelated and remain unstaged.

## Acceptance Criteria Mapping

- AC1: new batch state is written under `{plansDir}/{runId}/{runId}.state.md`.
- AC2: distinct run IDs use distinct directories with one state file each.
- AC3: new-path resume prefers the per-run path and legacy resume falls back
  to `{plansDir}/ws-spec-multi/{runId}.state.md`.
- AC4: the `ws-spec-multi` child slug is accepted by all three guards.
- AC5: contract docs, supersede lookup, monitor discovery, and
  `missing-child-state` behavior are covered.
- AC6: custom plan roots are respected and traversal is rejected.
- AC7: targeted and full test suites pass.
