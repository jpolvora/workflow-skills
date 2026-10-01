---
step: 8
slug: us-469
workflowId: us-469-20261001T024600Z
status: completed
startedAt: "2026-10-01T02:46:00Z"
endedAt: "2026-10-01T03:42:00Z"
acRefs: [AC1, AC2, AC3, AC4, AC5, AC6, AC7]
---
# us-469 — Delivery Result

## Expected
<!-- from spec ACs + plan scope -->
`ws-doctor` must stop reporting expansion-base and scanning artifacts as broken install paths. The
scanner shall resolve repo-root-relative citations against the project root (AC1), validate a
Markdown link's href instead of its backticked display text (AC2), skip fenced blocks / shell
redirects / home paths / placeholders / prose (AC3), treat a `{skillsRoot}` citation as resolvable
when a `{globalSkillsRoot}` alternative exists (AC4), expand a hub self-directory citation exactly
once (AC5), exclude archived run/example trees (AC6), and never report a citation that resolves at
the project root (AC7). Genuine broken install paths must remain visible. The scanner stays
read-only.

## Done
<!-- from verify report + review + testing + completed DAG tasks -->
- `doctor.js`: added repo-root resolution (`isRootRelativeCandidate`, `$PWD` handling, anchor/query
  strip, project-root-first prose fallback), Markdown link-text/href handling, fenced-block ranges
  and a prose/placeholder guard, `{globalSkillsRoot}` fallback, own-directory root-first, archived
  tree exclusion, and a `shouldReportMissing` install-citation classifier.
- `test/test-ws-doctor.js`: 7 new fixture tests covering AC1–AC7 + NS1–NS3; all pre-existing smoke
  tests remain green.
- Verification: score 10/10 (`ac_ledger.cjs verify` boundaries `pre-step6`/`step5`); `npm run test`
  exit 0 (159/159); alias `backendTest` observed exit 0; fresh-verify fault injections all detected
  (M1–M6) and the product tree restored; code review clean (0 findings).
- Observed signal on the healthy upstream install: Path errors **205 → 0**, missing cited scripts
  **5 → 0**; a deliberately broken path is still reported.
- Version bumped to 0.5.32; integrity regenerated and verified; harness clean (0 findings).

## Next steps
<!-- open items, reservations, manual follow-ups before PR -->
- Batch master owns code-review convergence (`ws-goal-fix-pr`) and the SCM merge of the
  `develop -> main` PR. Do not merge from the child run.

## References
- Spec: .agents/plans/us-469/step-00-us-469.spec.md
- Plan: step-01-us-469.plan.md (Step 2 bypassed `interview-not-required`)
- Check: step-05-us-469.plan.report.md
- Review: step-06-us-469.review.md
- Fresh verify: step-05b-us-469.fresh-verify.md
- Testing: step-07-us-469.testing.report.md

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 56m 0s (≈3360s agent execution) |
| Steps executed | 8 (0–7; Step 2 skipped `interview-not-required`) |
| Total tokens | 0 (shell/inline; estimated: false) |
| Lines added | +465 (product commits) / +304 net |
| Lines removed | -37 |
| Net LOC delta | +428 |
| Baseline LOC | 0 (src/ web/ tests/ not used by this package) |
| Final LOC | 0 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | deepseek-v4.1-flash | 60s | 0 | 2 |
| 1 | Planning | deepseek-v4.1-flash | 300s | 0 | 1 |
| 2 | Interview | deepseek-v4.1-flash | 0s | 0 | skipped |
| 3 | Plan to tasks | deepseek-v4.1-flash | 120s | 0 | 2 |
| 4 | Implement | deepseek-v4.1-flash | 600s | 0 | 2 |
| 5 | Verify | deepseek-v4.1-flash | 600s | 0 | 2 |
| 6 | Code review | deepseek-v4.1-flash | 180s | 0 | 1 |
| 6b | Fresh verify | deepseek-v4.1-flash | 300s | 0 | 1 |
| 7 | Testing | deepseek-v4.1-flash | 240s | 0 | 1 |
| 8 | Ship | deepseek-v4.1-flash | 300s | 0 | 2 |
