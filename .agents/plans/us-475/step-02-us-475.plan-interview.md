---
step: 2
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: []
title: Plan interview — executable foreign-commit guard
startedAt: "2026-09-30T20:20:00Z"
endedAt: "2026-09-30T20:22:00Z"
---
# Plan Interview — us-475

## 1. Audit summary

The step-01 plan is sound: one Node-only guard plus protocol wiring. Six gaps were surfaced
and resolved; none changed the AC set.

## 2. Gap registry

| # | Gap | Resolution (assumed-default when not otherwise noted) |
|---|-----|-------------------------------------------------------|
| G1 | Baseline store is named "batch state file" but the run `.state.md` frontmatter is written by `update_state.cjs` / `record_child_outcome.cjs`; nesting guard records there is brittle. | Store a dedicated sidecar `{plansDir}/{runId}/foreign-commits.json` under the run's plan folder. It is batch state under the run folder, kept out of the managed state writer. |
| G2 | "Foreign commit" has no definition in the spec. | A commit is foreign when it is reachable from the range head but not in the batch's own-commit set. The guard takes the own set explicitly (`--own`). |
| G3 | The guard needs the batch's own commits to separate foreign ones. | The master aggregates `commits[].sha` from every child `{workflow-id}.state.json` in the run (plus already-shipped rows) and passes them as `--own`. Absent `--own`, every commit in the range is listed — the conservative direction (over-report, never hide). |
| G4 | `origin/<branch>` may not exist (local-only repo). | `record-baseline` stores `remoteTip: null`; `check-advance` compares local only and does not fabricate a remote diff. |
| G5 | Pause semantics are master-owned, not script-owned. | The guard signals the pause with exit 1 + `{advanced:true, ...}`; `PROTOCOL.md` Phase 4 owns the Resume / Skip / Abort `user-gate`. |
| G6 | Quiet path could accidentally gate. | `check-advance` on an unchanged baseline exits 0 and adds no state, no gate, no artifact. |

## 3. Resolved decisions

- D1: Sidecar JSON baseline store keyed by slug (last writer per slug wins; re-baseline is idempotent).
- D2: Foreign = range commits − own set; over-report on empty own set.
- D3: Remote-absent degrades to local-only comparison, never a false advance.
- D4: Guard is git-read-only; the only write is the sidecar.
- D5: Convergence refusal is exit 1 naming both heads; the master blocks merge on that exit.
- D6: AC3's menu is protocol prose, asserted by a doc-surface test.

## 4. Exit

Assumed-default resolution accepted; no escalation needed. Plan refined to
`step-02-us-475.plan.refined.md`.
