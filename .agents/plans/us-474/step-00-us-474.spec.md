---
id: 474
slug: us-474
title: Shipped spec can stay under pending/ while index marks done
source: github
specDate: 2026-09-30
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/474"
step: 0
workflowId: us-474-20260930T192724Z
status: completed
startedAt: "2026-09-30T18:49:01.811Z"
endedAt: "2026-09-30T18:49:01.811Z"
acRefs: []
---
# Specification — Shipped spec can stay under pending/ while index marks done

**State:** open

## Description

During a multi-spec batch run, one item's Step 8 close ran the `ws-spec-index` sync: the `index.PRD` row flipped to `[x]` done with a delivery-commit cite, but the spec file itself was never filed from `pending/` to `completed/`. The run closed with the index and the tree disagreeing: a done-marked spec still living under `pending/`, with the index `spec:` reference pointing at the stale location. Nothing failed closed — close, sync, and ship all passed while the filing was outstanding. A later manual organizer pass (`--slug ... --status completed --apply`) plus a follow-up commit repaired it.

Sibling items in the same run filed correctly, so the close path normally covers this; the gap is the missing verification, not the organizer itself. The deliverable is that the sync either files the spec and rewrites its refs atomically, or reports the filing as outstanding, and that close verification and the harness fail closed on a `pending/`-located spec that the index already marks done.

### Design Intent

The spec organizer already supports status filing, and most items use it. The index sync and the tree filing are two separate steps, and only the sync is guaranteed at close, so a partial failure leaves the index ahead of the tree with no error. The intended contract is that index status and on-disk location cannot disagree silently.

## Acceptance Criteria

- AC1: When the spec-index sync marks a spec done, the sync shall file the spec under `completed/` together with its `.context.md` and assets sidecars.
- AC2: When the sync files the spec, the sync shall rewrite the index `spec:` references to the filed location in the same operation.
- AC3: If the sync cannot file the spec, then the sync shall report the filing as outstanding instead of succeeding silently.
- AC4: When the tracked spec for a completed run still resolves under `pending/`, the Step 8 close verification shall fail closed.
- AC5: If the close verification fails closed, then the error shall name the stale `pending/` path.
- AC6: The harness check shall flag any index `[x]` row whose `spec:` reference points under `pending/`.
- AC7: When the spec file and the index already agree, the workflow shall not re-file the spec or add a gate.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Bulk historical re-filing beyond flagged rows | One-off repair, human-owned |
| Changing the `pending/`/`completed/` status-folder convention | The convention is sound; the sync is the gap |
| Provider or tracker behavior | Local specs only |
| Changing `ws-spec-index init` output | Unrelated to filing state |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| File operation | Delegate to the `ws-spec-organizer` status filing | Existing, tested organizer path | y |
| Harness check home | Existing spec-index/harness check surface | Reuses current audit entry point | y |
| Sidecar handling | Move `.context.md` and assets with the spec | Keeps refs valid after filing | y |
| Input validation, auth, concurrency, data lifecycle, idempotency | N/A because this is a local file/ref move with no network or user payload | Those dimensions do not apply | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Sync filing + close verification + harness check only | Spec Out of Scope + diff review |
| Atomic criteria | AC1–AC7 each have a pass/fail observation | Authoring validator + implementation check |
| Failure modes | Already-filed specs stay untouched; unfiled specs report outstanding | AC3, AC7 |
| Stack invariant | Node-only helper, launched with `node`; no hand edits of `index.PRD` rows | `ws-check-harness` + spec-index contract |
| Observation telemetry | Named sync result and close-verification error | Validation notes below |
| Open blockers | None | Prior-work sweep found no open PR for issue 474 |

## Validation & Observation Notes

### Telemetry & Observable Signals

- A done-marked spec resolves under `completed/` after sync, or the sync prints a filing-outstanding result.
- The index `spec:` reference points at the filed path.
- Close verification errors name the stale path when the spec is still under `pending/`.
- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring` on this spec exits 0 before register.

### Negative & Failing Test Scenarios

- Mark a spec done in the index while it stays under `pending/`: close verification must fail closed and name the path.
- Run the harness on an index `[x]` row whose `spec:` ref points under `pending/`: the check must flag it.
- Sync a spec already under `completed/`: the run must not re-file it or add a gate.

## Original Issue Context

## Description

During a multi-spec batch run, one item's Step 8 close ran the spec-index sync (the index row flipped to `[x]` done with a delivery-commit cite) but the spec file itself was never filed from `pending/` to `completed/`. The run closed with the index and the tree disagreeing: a done-marked spec still living under `pending/`, with the index `spec:` ref pointing at the stale location. A later manual organizer pass repaired it.

Nothing failed closed: close, sync, and ship all passed while the filing was outstanding. Sibling items in the same run filed correctly, so the close path normally covers this — the gap is the missing verification, not the organizer itself.

Observed: done-marked index row citing a delivery commit while `git ls-files` showed the spec only under `pending/`; repaired via the spec organizer (`--slug … --status completed --apply`) plus a follow-up commit.

### Acceptance Criteria (as filed, verbatim)

> - AC1: When the spec-index sync marks a spec done, the spec file is filed under `completed/` (plus `.context.md`/assets sidecars) and the index `spec:` refs are rewritten in the same operation, or the sync reports the filing as outstanding instead of silently leaving it.
> - AC2: Step 8 close verification fails closed when the tracked spec for a completed run still resolves under `pending/`, naming the stale path in the error.
> - AC3: A harness check flags any index `[x]` row whose `spec:` ref points under `pending/` (and any Done-log entry for a `pending/`-located spec).
> - AC4: Runs where the file and the index already agree are unaffected (no re-file churn, no new gates on the quiet path).

### Out of Scope (as filed, verbatim)

- Bulk historical re-filing beyond flagged rows.
- Changing the `pending/`/`completed/` status-folder convention itself.
- Provider/tracker behavior; local specs only.

### Prior Work Sweep

No open pull request references issue 474. Keyword search (`spec organizer`, `completed`, `pending`) returned only merged release PRs (#433, #454). None repair the sync/tree disagreement. Design-intent note: the organizer filing and the index sync are separate steps, and only the sync is guaranteed at close.

## Notes

Lookup: status filing lives in `ws-spec-organizer` (`resolve_spec_path.cjs`, status subfolders); index sync lives in `ws-spec-index`; close integrity is checked by `ws-check-harness` / `ws-check-workflows`. Stack file is the Node 22 skill package. MEMORY had no trap that changes this fix.
