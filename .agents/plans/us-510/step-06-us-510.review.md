---
step: 6
slug: us-510
workflowId: us-510-20261013T033129Z
status: completed
startedAt: "2026-10-13T03:39:27.849Z"
endedAt: "2026-10-13T03:39:27.849Z"
acRefs: []
---
# Code Review — us-510 (Step 6)

**Reviewed diff:** `git diff 66175d9c...HEAD` (product commit `f7284f01`), 18 files.
**Reviewer role:** adversarial local review (two-phase: correctness, then contracts/regressions).
**Verdict:** PASS — no Critical or Warning findings; 2 informational notes.

## Phase 1 — Correctness of the new runtime path

| # | Check | Result |
|---|-------|--------|
| 1 | All validation happens before the first write (usage flags → identity → HEAD → baseline → dir match → id shape → spec → pair state) | PASS — no write precedes a refusal |
| 2 | Fresh write order matches the shipped sibling mutators (`mkdirSync` → `syncStateDualWrite` → `refreshPlansIndexForState` → validate) | PASS |
| 3 | `validateSnapshot` runs before the success return so a bad record can never be reported as ok | PASS |
| 4 | Replay path writes nothing to the pair; only the index is reconciled | PASS (byte-identity asserted) |
| 5 | Partial pair is refused naming the missing member (never "completed") | PASS |
| 6 | `revision !== 0` / non-empty `completedSteps` / terminal `status` each refuse with the reason quoted | PASS |
| 7 | Rollback removes only this invocation's artifacts and restores a pre-existing index | PASS (failure-path test) |
| 8 | `atomicWrite` no longer leaks `.tmp-*` on a failed write or rename | PASS — and the double-close path is guarded |
| 9 | Regex escaping for the slug in the workflow-id pattern prevents metacharacter injection | PASS (`escapeRegExp`) |
| 10 | `HEAD` compared case-insensitively and refused | PASS |
| 11 | Result JSON is repo-relative only | PASS |

## Phase 2 — Contracts, regressions, and blast radius

| # | Check | Result |
|---|-------|--------|
| 12 | Existing `dispatch` / `finish` / `finish-batch` / `bypass` / `checkpoint` / `pause-turn` semantics untouched | PASS (`performUpdate` unchanged) |
| 13 | `atomicWrite` change is behavior-preserving on the happy path (same temp+fsync+rename) | PASS |
| 14 | us-506 anchors other than the superseded create-only assertion still hold | PASS (`test-state-bootstrap.js` green) |
| 15 | The operation allowlist still exposes exactly one creation verb | PASS |
| 16 | Docs updated atomically with the flag contract (setup, gates, STEP-DISPATCH, state-hygiene, FEATURES, README) | PASS |
| 17 | Schema documents `branch`; `additionalProperties: true` so pre-existing records stay valid | PASS |
| 18 | Byte budgets: `STEP-DISPATCH.md` net-negative; `test-context-budget.js` green | PASS |
| 19 | No new dependency; no Python; no host-product coupling | PASS |
| 20 | Nothing under `{plansDir}` or a foreign path staged by the product commit | PASS |

## Findings

- **INFO-1 (deliberate breaking contract).** `init` now requires `--branch` and
  `--baseline`, and no longer infers `--slug`/`--workflow-id` from the state path.
  Any caller of the shipped us-506 command shape must add the two flags. The spec
  pins explicit inputs as the boundary, and every canonical call site
  (`setup.md`, `gates.md`, `STEP-DISPATCH.md`, `state-hygiene.md`) was updated in the
  same commit, so no stale recipe remains. No consumer beyond this package is
  in-scope for a migration shim (package ships latest-layout behavior only).
- **INFO-2 (replay does not compare identity).** A repeat with different
  `--branch`/`--baseline` values still replays as a no-op. The spec defines the
  replay window on `revision`/`completedSteps`/`status` only, and a divergence check
  would add a rule the contract does not pin. Recorded as a deliberate scope limit.

## Residual risk

None blocking. The one unbounded input surface (an agent hand-editing a
revision-0 record to look untouched) degrades to a no-op, not to data loss.

## Action

No fix required. No re-review round.
