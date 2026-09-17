---
step: 6
slug: ws-preview-before-ship-gate
workflowId: ws-preview-before-ship-gate-20260917T011747Z
status: completed
startedAt: "2026-09-17T01:17:47Z"
endedAt: "2026-09-17T02:03:59.393Z"
acRefs: []
---
# Code Review — ws-preview-before-ship-gate (round 1)

Scope: G2 `cea78a7c` (11 files) vs base `main`; stay-on-`develop` run so the
workflow commit is the review snapshot, not the full `main...HEAD` range.
Plan: `step-01-ws-preview-before-ship-gate.plan.md` §1 surfaces.

## Verdict: clean (no Critical/Warning)

Score: 9/10. One Suggestion, accepted without a fix pass (non-blocking).

### CR-001 [Suggestion] open .agents/skills/ws-ship-pr/SKILL.md:L89-L90

Skip-reason recording surface is explicit for runs (Prepare-to-PR board) but
only implicit for skips ("skipped with reason"). AC2 requires a *recorded*
reason; the natural reading (same board/summary) satisfies it, so this is
prose precision, not a functional gap. Confirm the surface once at Step 4
ship when the gate executes for real.

suggestion:
```text
No change required. If touched again, append "on the board" to the
"skipped with reason" clause for symmetry with the run path.
```

## Investigated and dropped

- H1 (Step 5 gating equivalence): the leading "only when Step 5 Create PR
  will actually run" clause plus the explicit skip list covers standalone
  no-PR paths; no executable case runs the gate while Step 5 is skipped.
- H4 (CHANGELOG agent-name oddity): cosmetic, prior-session line. Discarded.

## Sibling sweep (beyond diff)

- `PREPARE-CHECKLIST.md`: no dry-run row — consistent with the spec
  out-of-scope item (board summary only, never a required row).
- `ws-ship-pr` Step 5 (`validate-auth`, `create-pr`): unchanged; gate runs
  before both per AC1. `CATALOG.md`/`ws-shared` hub rows: no stale
  standalone-only claims (`test-doc-sync` green in the full suite).
- `git grep standalone` over `ws-preview` + `ws-ship-pr`: only pre-existing
  workflow/standalone path wording; nothing claims the dry-run is
  standalone-only.

## Stack Invariant Compliance

- `scan_stack_invariants.cjs` over 9 in-scope files: 0 issues.
- `config.json.invariants`: `commitPlanFilesOnlyAtStep8` respected (G2 holds
  no `{plansDir}` paths); `skipQualityGates: false`.
- Stack pack: `node-skills-package` has no dedicated pack; prose/config
  change only (no runtime boundaries). `localReviewCommand` unconfigured —
  dry-run gate skipped with reason.
- Fable audit (`autoAudit`): 0 frauds — no test files touched (no weakened
  checks), all Step 2 verifications re-ran green in-session (no false
  completion), 11 files exactly match plan §1 (no scope creep), local
  commit+tag only, no push (no unauthorized action). Verdict: **VERIFIED**.

## Apply fixes?

No. Suggestions only, accepted; Advance to Step 4.
