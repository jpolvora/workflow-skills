# per-task-test-adequacy-review — Delivery Result

## Expected

Per-task Test Adequacy review inside `ws-implement-tasks` build mode (AC1-AC7): per-task adequacy records with AC-to-test file:line bindings, non-shallow litmus per mapped test (inversion or documented wrong-code run), orphan remove-or-remap rule, TDD re-entry within existing bounds, step-output + ledger evidence so Step 5 scores observed adequacy, false-positive rejection without litmus, and the same review in fix mode.

## Done

- Recipe: new build step 5 Test Adequacy review (binding map, litmus forms, orphan rule, false-positive rejection, helper validation, ledger link, TDD re-entry with workflow-level bound); old steps renumbered 6-9; fix step 5 extended; `adequacy:` step-output block; handoff guardrail.
- Helper: `check_test_adequacy.cjs` (exit 0/1/2, range-contained bindings after review fix, orphan + false-positive rules).
- Ledger: `link --adequacy-file` verb with per-AC coverage enforcement + `adequacyHistory[]` (review fix); inadequate-adequacy score rule (knownDefect cap 8), missing adequacy ignored (backward compatible).
- Verify: Step 3 adequacy-evidence bullet (observed-adequacy scoring).
- Tests: `test-per-task-adequacy.js` (AC1-AC7 + 4 NS + 3 fix regressions, all named blocks), registered in `test-suites.json`.
- DAG T1-T6 all executed within byte budgets; verify score 10/10; review round 1 (2 Warnings + 1 Suggestion) fixed and closed in round 2; testing pass with sabotage bite confirmed and byte-identical restore.
- Dogfood: adequacy records T1-T5 + FIX1 authored for this implementation, helper-validated adequate, ledger-linked; Step 5 scored observed adequacy.

## Next steps

- Ship: version bump + delivery commit + spec-index sync, then PR develop→main (shared-head rule), then Step 9 fix-pr convergence (no merge — master merges after independent checks).
- No open items, no reservations, no manual follow-ups before PR.

## References

- Spec: .agents/specs/pending/0156-per-task-test-adequacy-review.spec.md
- Plan: step-02-per-task-test-adequacy-review.plan.refined.md (or step-01-per-task-test-adequacy-review.plan.md if Step 2 was bypassed)
- Check: step-05-per-task-test-adequacy-review.plan.report.md
- Review: step-06-per-task-test-adequacy-review.review.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 48m 48s (2928s agent execution) |
| Steps executed | 8 (0-7; step 8 close/ship in progress) |
| Total tokens | 0 (estimated: false; host reports no token counts) |
| Lines added | +589 |
| Lines removed | -16 |
| Net LOC delta | +573 (product commits f4cfd836+e56d7a0c; excludes release/delivery/spec-sync commits) |
| Baseline LOC | 115061 |
| Final LOC | 115636 |

LOC scope: `.agents/skills` + `test` + `bin` (this repo has no `src/`/`web/`/`tests/`). Raw-count delta (+575) vs diff-stat net (+573) differs by trailing-newline accounting.

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | unknown | 43s | 0 | 2 |
| 1 | Planning | unknown | 364s | 0 | 1 |
| 2 | Interview | unknown | 191s | 0 | 2 |
| 3 | Plan to tasks | unknown | 232s | 0 | 0 |
| 4 | Implement | unknown | 683s | 0 | 7 |
| 5 | Verify | unknown | 286s | 0 | 1 |
| 6 | Code review | unknown | 673s | 0 | 4 |
| 7 | Testing | unknown | 456s | 0 | 2 |
