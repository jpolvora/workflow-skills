---
step: 6b
slug: us-475
workflowId: us-475-20260930T201858Z
status: completed
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7]
title: Fresh-worker verification — executable foreign-commit guard
startedAt: "2026-09-30T20:41:00Z"
endedAt: "2026-09-30T20:44:00Z"
---
# Fresh verification — us-475

Independent re-derivation from the spec on a scratch worktree
(`.agents/plans/us-475/worktrees/fresh-verify`, detached at `17431a1b`), then one fault
injection per guarded AC. The primary worktree is byte-identical to `HEAD` before and
after (guard blob `7d21494f` == `HEAD:...foreign_commit_guard.cjs`); the scratch worktree
was removed (`git worktree list` shows only the primary).

## AC re-derivation (evidence-or-zero)

| AC | Verdict | Fresh evidence |
|----|---------|----------------|
| AC1 | PASS | Fresh temp repo: `record-baseline` wrote `foreign-commits.json` with `localTip == remoteTip == c1` for slug `us-x`. |
| AC2 | PASS | A commit added after the baseline made `check-advance` exit 1 and name `c2` + subject `foreign change`. |
| AC3 | PASS | `PROTOCOL.md` carries the guard reference and the Resume / Skip / Abort options on the exit-1 pause. |
| AC4 | PASS | `check-convergence --pr-head c1 --local-tip c1` exits 0 `converged:true`. |
| AC5 | PASS | `check-convergence --pr-head c1 --local-tip c2` exits 1 naming `c1` and `c2`. |
| AC6 | PASS | `list-foreign c1..c2` lists `c2` and emits the `### Foreign commits in range` block; `--own c2` excludes it. |
| AC7 | PASS | Unchanged tips: `check-advance` exits 0 `advanced:false`, empty `newCommits`, no state write. |

## Fault injections (one per guarded AC)

| # | Injected fault (scratch worktree) | Expected | Observed |
|---|-----------------------------------|----------|----------|
| 1 | `const converged = prHead === tip;` → `const converged = true;` (AC4/AC5/NS2) | mismatch test fails | `AssertionError: AC5/NS2 mismatch refuses (exit 1) 0 !== 1`; test exit 1 |
| 2 | `const advanced = localChanged || remoteChanged;` → `const advanced = false;` (AC2/NS1/AC7) | advance test fails | test exit 1 (advance not detected) |

Both injects were reverted by removing the scratch worktree; no residual changes.

## Verdict

**Verified** — all seven ACs re-derived with fresh evidence, and the guard's two fail-closed
behaviours (advance pause, convergence refusal) are covered by sensitive tests.
