---
slug: us-440
step: 7
status: completed
workflowId: us-440-20260927T162130Z
acRefs: [AC8, AC13, AC14]
---

# Testing Plan — us-440

Doc-only change: 6 shipped skill bodies converted to token-centered skill loading (+ mechanical version/integrity/site projections).

## Surface

- `hasTestSurface: true` (`probe_test_surface.cjs`) — repository test battery exists.
- Primary alias: `verification.backendTest` = `npm run test` (`node test/run-tests.cjs`).

## Battery

| # | Check | Rationale |
|---|-------|-----------|
| 1 | `node .agents/skills/ws-check-harness/scripts/check_skill_load.cjs` | Phase 5a gate: converted lines must not re-introduce a raw load recipe (AC8/AC13) |
| 2 | `node .agents/skills/ws-check-harness/scripts/check_duplicates.cjs` | No duplicated normative block from the inserted links (AC8) |
| 3 | `node test/test-harness-clean.js` | Full harness self-audit, 0 findings (AC13) |
| 4 | `npm run test` (138 entries) | Repository suite, incl. integrity/version/hub tests (AC13) |
| 5 | `npm run verify-integrity` | Integrity manifest matches tree after regeneration (AC14) |
| 6 | `rg -n "\{skillLoader\}"` over the 6 files | Every converted site carries the token (AC1–AC6) |
| 7 | Emitter/consumer contract: `host-capability-tokens.md` § Skill-load procedure unchanged | The link target stays canonical; no procedure text duplicated at call sites (AC7/AC8) |

## Mutation testing

`defaults.skipMutationTesting: true` and `verification.mutationTest` empty → not configured; regression sabotage not armed for this change.

## Out of scope

No runtime behavior, so no unit/integration/E2E surface beyond the harness gates above.
