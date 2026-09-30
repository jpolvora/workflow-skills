---
slug: per-step-context-budgets
step: 7
status: completed
workflowId: per-step-context-budgets-20260930T125526Z
startedAt: "2026-09-30T14:05:00Z"
endedAt: "2026-09-30T14:20:00Z"
acRefs: []
---
# Testing report — per-step-context-budgets

Plan: `step-07-per-step-context-budgets.testing.plan.md`.
Surface probe: `hasTestSurface: true` (`backendTest: npm run test`).

## Base build

No `*Build` aliases configured — nothing to run. `backendTest` is the only
verification alias.

## Unit tests

`npm run test`: **152/152 entries passed** (mode=local), exit 0, fresh re-run
after sabotage restoration. Hub config byte-identity verified (no mutation, no
leftover backup). Includes the new `test-step-context-budgets.js` (AC1–AC8 +
negatives) and the extended audit/GUI/context suites.

## DB / API / UI

Skipped per plan and stack: no databases, endpoints, credentials, or UI
surface in this change (CLI scripts, schema, GUI row, skill prose).

## Mutation

`status: skipped` — `defaults.skipMutationTesting: true` and
`verification.mutationTest` empty (both skip rules apply; no engine vendored).

## Regression Sabotage

`status: passed` — invert patch flipped the builder resolution ternary
(`stepOverride === null ? configured : stepOverride` →
`? stepOverride : configured`) in `build_dispatch_context.cjs`; `npm run test`
under inversion exited 1 (new suite caught both the ignored override and the
null global); helper restored byte-identical content (`restored: true`,
working tree clean for the path). Ledger event `testing-sabotage`
(`--sabotage-exit 0` on AC2).

## Accessibility

No forms, validation errors, or alert indicators in this change (CLI scripts,
schema, and skill prose only) — nothing to contrast-check.

## Verdict

**Pass** — unit/integration green, sabotage passed, mutation skipped per policy,
no failures. Advance to Step 8.
