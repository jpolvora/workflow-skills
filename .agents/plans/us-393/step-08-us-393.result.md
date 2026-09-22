---
slug: us-393
step: 8
workflowId: us-393-20260922T080709Z
status: completed
startedAt: "2026-09-22T09:05:01Z"
endedAt: "2026-09-22T09:20:00Z"
branch: develop
baseBranch: main
branchStrategy: stay
---

# Delivery Result — us-393

## Summary

Hardened the `ws-spec-multi` run-state queue contract so a transition updates the existing row keyed by `specPath`/`slug` in place instead of appending a duplicate row. Added a fail-closed duplicate guard, a frozen `totalItems` count, per-write `updatedAt` advancement, and a completed-with-pending invalidation rule. Added eval id 3 for the duplicate-row scenario.

## Change set

| File | Change |
|------|--------|
| `.agents/skills/ws-spec-multi/STATE.md` | `totalItems` field; § Queue invariants; Resume Policy duplicate guard + completed-with-pending invalidation |
| `.agents/skills/ws-spec-multi/SKILL.md` | Invariant 7 (keyed, idempotent queue writes) |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 1/2/4/5/6 keyed in-place writes, frozen count, guard, `updatedAt` |
| `.agents/skills/ws-spec-multi/evals/evals.json` | Eval id 3 (duplicate-row scenario) |

## Release mechanics

- Version bumped once via `npm run build-site:bump` (0.4.53 → 0.4.54; package.json + `packageVersion` in `bin/skill-dependencies.json` + `.agents/skills/ws-shared/runtime/skill-dependencies.json` + site footer).
- Integrity regenerated + verified (`npm run generate-integrity`, `npm run verify-integrity`).

## Verification (observed exit codes)

| Command | Exit |
|---------|------|
| `npm run test` | 0 (115/115) |
| `node test/test-harness-clean.js` | 0 (0 findings) |
| `node .agents/skills/ws-check-workflows/scripts/check_workflows.cjs` | 0 |
| `node bin/validate-evals.cjs` | 0 |
| `npm run verify-integrity` | 0 |

## Timing

Wall-clock: start `2026-09-22T08:07:09Z` → close `2026-09-22T09:20:00Z`.

## Branch / shipping

- Branch strategy: **stay on `develop`** (operator requirement) — no `feature/us-393` branch created.
- PR target: `main`.
- Ship phase: `ws-ship-pr` (push + create PR), then Step 9 convergence + merge.
- **Shipped:** PR [#396](https://github.com/jpolvora/workflow-skills/pull/396) merged into `main` at `74aecc181e35c9f1c3cef0dd86a6415c5de0e9de` on 2026-09-22T08:22:43Z. `activeThreads: 0`; checks green (`review`, `test` x2).
