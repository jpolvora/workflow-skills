---
slug: us-388
step: 8
workflowId: us-388-20260922T080709Z
status: completed
startedAt: "2026-09-22T16:21:00Z"
endedAt: "2026-09-22T16:25:00Z"
branch: develop
baseBranch: main
branchStrategy: stay
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9]
---

# Delivery Result - us-388

## Summary

Closed the silent blind spot where `ws-spec-multi` children could advance while
leaving no observable workflow state. `ws-monitor` now derives multi-spec
child-state expectations from the batch queue rows (previously `expectedArtifacts: []`)
and emits the `missing-child-state` finding for an item that advanced without child
state. The batch dispatch contract states the required child artifact set and the
`{child-workflow-id}`, and a new fail-closed guard (`verify_child_artifacts.cjs`)
blocks a `shipped` row when child state or `step-01-{slug}.plan.md` is absent.

AC1/AC2/AC3/AC7 were verified as already satisfied by prior work (sibling child runs
left complete 14-file artifact sets) and are cited rather than re-implemented.

## Change set

| File | Change |
|------|--------|
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | `listChildStateFiles`, `expectedChildArtifacts`, populated multi-spec `expectedArtifacts`, `missing-child-state` (via `classifyMultiSpecWorkflow` 4th param), unsafe-slug guard |
| `.agents/skills/ws-monitor/SKILL.md` | Multi-spec queue signal + signal map row |
| `.agents/skills/ws-monitor/evals/evals.json` | Eval id 5 |
| `.agents/skills/ws-spec-multi/PROTOCOL.md` | Phase 4 required child artifact set; Phase 5 fail-closed guard; Phase 6 evidence honesty |
| `.agents/skills/ws-spec-multi/STATE.md` | Required child artifact set section |
| `.agents/skills/ws-spec-multi/evals/evals.json` | Eval id 5 |
| `.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs` | New fail-closed child-exit guard |
| `test/test-ws-monitor-us388.js`, `test/test-verify-child-artifacts-us388.js` | New fixtures |
| `test/test-suites.json` | Fixtures registered |
| `README.md`, `FEATURES.md`, version/integrity/site | Release mechanics + docs |

## Release mechanics

- Version bumped once via `npm run build-site:bump` (0.4.56 → 0.4.57; `package.json` + `packageVersion` in `bin/skill-dependencies.json` + `ws-shared/runtime/skill-dependencies.json` + site footer + fixture tarball ref).
- Integrity regenerated + verified after the review-fix commit.
- No `config.schema.json` / `config.json.example` change → `Edit-WorkflowSkillsConfig.ps1` untouched.

## Verification (observed exit codes)

| Command | Exit |
|---------|------|
| `npm run test` (post-fix, 120 entries) | 0 |
| `node test/test-harness-clean.js` | 0 (0 findings) |
| `node test/test-ws-monitor-us388.js` | 0 |
| `node test/test-verify-child-artifacts-us388.js` | 0 |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node` | 0 |
| `npm run verify-integrity` | 0 |
| `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --repo-root . --json` | 0 (multi-spec `expectedArtifacts` populated 4/4) |
| `node .agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs --slug us-388 --plans-dir .agents/plans --json` | 0 |

## Timing

Wall-clock: start `2026-09-22T15:00:00Z` → close `2026-09-22T16:25:00Z`.

## Branch / shipping

- Branch strategy: **stay on `develop`** (operator requirement) — no `feature/us-388` branch created.
- PR target: `main`.
- Ship phase: `ws-ship-pr` (push + create PR), then Step 9 convergence + merge.
- **Shipped:** PR [#400](https://github.com/jpolvora/workflow-skills/pull/400) merged into `main` at `927af867` with `activeThreads: 0` and green checks.

## Step 9 convergence

Five agentic-review rounds were resolved (all threads answered and resolved):

1. reserved `ws-spec-multi` batch-dir alias; machine `.state.json` required (no `.state.md` substitute).
2. parseable + identity-bearing child state JSON.
3. child state `slug` must match the inspected queue item.
4. critical: the guard needed an executable caller → `record_child_outcome.cjs`.
5. reserved slug rejection in both guard scripts.
6. child-state shape validation + `completed` required at the shipped transition.
