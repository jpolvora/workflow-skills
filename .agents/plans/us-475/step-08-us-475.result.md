---
step: 8
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
startedAt: "2026-09-30T20:18:58Z"
endedAt: "2026-09-30T20:57:23Z"
---
# Delivery result — us-475

## Summary

Shared-head multi-spec batches now own an executable foreign-commit guard. The batch records
a per-dispatch baseline of the local and `origin` run-branch tips, pauses (Resume / Skip /
Abort) and names the new commits when a tip advances unexpectedly, refuses a convergence merge
whose PR head differs from the local tip, and lists the foreign commits that ride a PR range
for the PR body and audit notes. The guard is git-read-only; the quiet single-writer path adds
no gate.

## Deliverables

| Artifact | Kind |
|----------|------|
| `.agents/skills/ws-spec-multi/scripts/foreign_commit_guard.cjs` | batch guard: record-baseline / check-advance / check-convergence / list-foreign |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 4 pause wiring (Resume/Skip/Abort) + Phase 4b convergence/foreign audit |
| `.agents/skills/ws-spec-multi/STATE.md` | baseline store schema + exit vocabulary + invariants |
| `.agents/skills/ws-spec-multi/SKILL.md` | Native Tool Contract row + Goals invariant |
| `.agents/skills/ws-shared/runtime/git-ownership.md` | shared-head foreign-commit section |
| `.agents/skills/ws-ship-pr/SKILL.md` | PR-body foreign-commit note |
| `test/test-foreign-commit-guard.js` | AC1–AC7 + NS1–NS3 fixtures (registered in `test-suites.json`) |
| `bin/skill-integrity.json` | regenerated (v0.5.26) |

## Verification

| Check | Result |
|-------|--------|
| `npm run test` (configured `backendTest`) | exit 0 — 155/155 |
| `node test/test-harness-clean.js` | exit 0 — 0 findings |
| `npm run verify-integrity` | OK (v0.5.26 matches tree) |
| Step 5 check-implementation | 10/10 (earned 70/70) |
| Step 6 code review | clean after the R1 dispatch-ordering fix |
| Step 6b fresh-verify | 7/7 ACs PASS; 2/2 fault injections killed the suite |

## Commits

- `266ad05c` — `feat(us-475): executable foreign-commit guard for shared-head batches`
- `c8bbc05d` — `chore(us-475): regenerate skill integrity for the new guard`
- `17431a1b` — `fix(us-475): review round 1 - dispatch ordering check->record`

Diff vs baseline `bf53ad8e`: product + docs + tests + integrity (see the PR).

## Timing

- Workflow baseline: 2026-09-30T20:18:58Z
- Close: 2026-09-30T20:57:23Z
- Total wall-clock: ~38 min
- Steered by: batch worker `us-475`, flowMode `standard`, autoMode (Tier 3 inline-isolated).
