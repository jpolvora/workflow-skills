---
step: 8
slug: spec-closure-strengthening
workflowId: spec-closure-strengthening-20260930T095034Z
status: completed
startedAt: "2026-09-30T09:50:34Z"
endedAt: "2026-09-30T11:15:28.530Z"
acRefs: []
---
# spec-closure-strengthening — Delivery Result

## Expected

From spec ACs + refined plan scope: authoring validation enforces EARS-shaped ACs
(AC1), a substantive `## Out of Scope` table (AC2), and a canonical-section table
finder (AC3); `classify.cjs` heading-variant detection verified as baselined
(AC4/AC5 verify-only); compat exit codes frozen (AC6); EARS patterns documented with
examples in `ws-spec-write` + `ws-spec-format` guidance (AC7). Out of scope: bulk
spec migration, semantic AC judgment, heading renames, classifier math.

## Done

- AC1: `earsViolation` + 5 EARS patterns, authoring-only, error code `ac-ears` naming
  the AC (`validate_spec.cjs`); 5 accept + 2 reject + 2 tolerance cases green.
- AC2: substantive-row filter reusing `isPlaceholder` (`N/A because` counts);
  zero-row/placeholder-only fail, mixed passes.
- AC3: last-match canonical finder (`lastHeadingIndex` + `tableAfterCanonicalHeading`,
  exact `^heading\s*$` semantics); shadow-pass/shadow-fail/verbatim-only cases green;
  sabotage proved (inverted exit 1, fixed exit 0; pristine-HEAD validator reproduces).
- AC4/AC5: verified baselined (`classify.cjs` L286-L308, commit 5117abca) via
  `test-classify-open-questions.js` 9/9; file untouched (diff clean).
- AC6: compat exit-code map 0/159 diffs (134 pass / 25 pre-existing fails identical);
  mode-split case green.
- AC7: EARS subsection + template + Validation item in `FORMAT.md`; 5 patterns with
  one example each in both `SKILL.md` files; observed inspection exit 0.
- Test-pinned reshapes (meaning-preserving, zero net lines): 2 test fixtures, 0051
  (9 ACs), 5 benchmark fixtures; composite pre-checked each.
- DAG L1-L4 executed with TDD red/green per task; sibling sweep recorded
  (DoR/Assumptions deferred, classify exempt, others different class).
- Verify 9/10 (all ACs Implemented, 4/4 negatives covered); review R1→R2 (2
  Suggestions opened, both closed; whitespace fix); testing PASS (150/150, canonical
  sabotage passed, mutation skipped per policy).
- Integrity regenerated from slug-only hashed trees twice + verified.

## Next steps

- Ship: create ONE PR develop→main (shared-head rule); no merge (master owns merge).
- Step 9: converge PR threads via ws-goal-fix-pr after CI/review feedback.
- Follow-ups (out of scope, recorded): DoR/Assumptions finder generalization;
  verbatim-table residual revisit on live occurrence; EARS prose pins in
  test-doc-sync.js (optional).

## References

- Spec: .agents/plans/spec-closure-strengthening/step-00-spec-closure-strengthening.spec.md
- Plan: step-02-spec-closure-strengthening.plan.refined.md
- Check: step-05-spec-closure-strengthening.plan.report.md
- Review: step-06-spec-closure-strengthening.review.md (+ .fix.report.md)

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 1h 10m 30s (4230s agent execution) |
| Steps executed | 8 (0-7; step 8 close/ship in progress) |
| Total tokens | 0 (estimated: false; host reports no token counts) |
| Lines added | +240 |
| Lines removed | -19 |
| Net LOC delta | +221 (product commits e37dcc6f+003cc765) |
| Baseline LOC | 103925 |
| Final LOC | 104146 |

LOC scope: `.agents/skills` + `test` + `bin` (this repo has no `src/`/`web/`/`tests/`).
Full diff across all paths: +266/-45 (net +221; the +26/-26 outside the LOC scope is
zero-net EARS reshapes in `.agents/specs` + `benchmarks/fixtures`).

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | current | 46s | 0 | 0 |
| 1 | Planning | current | 659s | 0 | 0 |
| 2 | Interview | current | 117s | 0 | 0 |
| 3 | Plan to tasks | current | 65s | 0 | 0 |
| 4 | Implement | current | 1297s | 0 | 15 |
| 5 | Verify | current | 720s | 0 | 0 |
| 6 | Code review | current | 825s | 0 | 2 |
| 7 | Testing | current | 501s | 0 | 0 |
