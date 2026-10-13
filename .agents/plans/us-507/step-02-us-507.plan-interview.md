---
step: 2
slug: us-507
workflowId: uswf-us-507-20261012T235108Z
status: completed
startedAt: "2026-10-12T23:51:08Z"
endedAt: "2026-10-12T23:51:08Z"
acRefs: []
---
# Plan Interview — us-507

Audit of `step-01-us-507.plan.md` before implementation.

## Questions and resolutions

1. **Does state-less detection need a new discovery source or a new detector?**
   Neither. It reuses the existing step-artifact model: `isStepArtifactName`
   matches the same `step-NN-{slug}.` naming that `expectedArtifacts()` emits, and
   the record carries the discovered artifacts. This follows the us-388 precedent
   (`missing-child-state` derived from queue rows, not a parallel list) recorded in
   memory `[2026-09-22] ws-monitor multi-spec expectation blindness`.
2. **Does a malformed state file count as "no state"?** No. State *presence* on
   disk is the discriminator, not parse success (AC10); the directory goes down
   the existing state path (where a null-parse is already skipped) and never
   raises `run-without-state`.
3. **How does severity interplay with the existing severity contract?** The
   memory trap `[2026-09-25] Monitor severity contract: status-literal beats
   shape-derived` forbids softening findings from a shape-derived terminal. This
   change only *adds* a new code with its own window rule; it does not reintroduce
   shape-derived tolerance on any existing code.
4. **Can the new records inflate `activeCount` without bound?** No. Only a run
   whose newest artifact is inside the effective stall window is `active`; older
   runs are `stale` (not counted), so `--until-terminal` still terminates (AC8,
   AC9, Assumptions).
5. **Where does the freshness window come from?** The same `stallWindowMs`
   already computed for the liveness stopwatch (`:1889-1892`), default 600s (AC6).
   No new flag.
6. **Does the batch `{plansDir}/ms-*` directory or a worktree directory get
   mis-flagged?** A batch directory holds `ms-*.state.json`, so it is skipped
   (AC10). Nested `worktrees/` artifacts are never scanned because the scan is
   top-level only (AC14).
7. **Does `--workflow-id` select a state-less run?** Never — a state-less run has
   no recorded identity, so `--workflow-id` yields nothing for it (Assumptions).

## Gaps found and folded into the refined plan

- Guard the existing transcript/liveness loop with the `stateless` flag so no
  session/stopwatch/`worker-session-stall` work runs for a record with no state.
- Include the state-less record in the memory-vault `diskSlugs` set (record
  placed before vault reconciliation) so a matching vault record is not double
  reported as `vault-unreconciled-workflow`.
- Add an explicit Markdown branch so a state-less run renders evidence and
  `State: none` instead of an empty `null` state line.

## Verdict

Plan approved; no open questions block implementation.
