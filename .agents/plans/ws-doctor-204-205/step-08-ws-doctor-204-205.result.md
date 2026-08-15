# ws-doctor-204-205 — Delivery Result

## Expected

- AC1–AC3: Canonical scripts rows for `register_local_spec.py --source` in github and azure-devops provider SKILL.md use an explicit `python` launcher; doctor Missing launchers does not flag them.
- AC4–AC7: Skill-folder `docs/` markdown links resolve file-relative; hub/top-level `docs/` stays project-root.
- AC8: `test/test-ws-doctor.js` covers both resolution cases; `npm run test` exits 0.

## Done

- Prefixed `python` on the two Canonical scripts cells.
- `resolveCitedPath` gates `docs/` project-root special-case with `isCitingFromPublishedSkillFolder` (`ws-shared` excluded).
- Extended `test/test-ws-doctor.js` (AC1–AC8). Regenerated `bin/skill-integrity.json`.
- Verify score 10/10, fable VERIFIED. Code review clean (0 Critical / 0 Warning).
- Focused doctor suite exit 0. Full `npm run test` exit 0 after integrity regen. Mutation skipped.

## Next steps

- Step 8: upstream prepare board (build-site:bump, check-harness, secrets scan), commit ship-scope only, PR `develop` → `main`.
- Step 9: `ws-goal-fix-pr` until `activeThreads == 0`. Close GitHub #204 and #205 when the PR merges.
- Do not stage unrelated dirty/untracked files (us-202 artifacts, telemetry aggregate, extra specs).

## References

- Spec: `.agents/plans/ws-doctor-204-205/step-00-ws-doctor-204-205.spec.md`
- Plan: `.agents/plans/ws-doctor-204-205/step-01-ws-doctor-204-205.plan.md`
- Check: `.agents/plans/ws-doctor-204-205/step-05-ws-doctor-204-205.plan.report.md`
- Review: `.agents/plans/ws-doctor-204-205/step-06-ws-doctor-204-205.review.md`
- Testing: `.agents/plans/ws-doctor-204-205/step-07-ws-doctor-204-205.testing.report.md`

## Benchmark

| Metric | Value |
|--------|-------|
| Total wall-clock time | 28m 33s (1713s agent execution) |
| Steps executed | 8 (0–7; interview skipped) |
| Total tokens | 87000 (estimated: true) |
| Lines added | +236 |
| Lines removed | -10 |
| Net LOC delta | +226 |
| Baseline LOC | 20830 |
| Final LOC | 21056 |

Repo has no `src/` `web/` `tests/` trees; LOC delta is `git diff --stat` on ship-scope product files.

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | Cursor Grok 4.6 | 308s | 14500 | 3 |
| 1 | Planning | cursor-grok-4.6-high | 280s | 28500 | 1 |
| 2 | Interview | Cursor Grok 4.6 | 0s (skipped) | 0 | 0 |
| 3 | Plan to tasks | cursor-grok-4.6-high | 90s | 21500 | 2 |
| 4 | Implement | composer-2.5 | 180s | 0 | 4 |
| 5 | Verify | cursor-grok-4.6-high | 210s | 22500 | 1 |
| 6 | Code review | cursor-grok-4.6-high | 420s | 0 | 1 |
| 7 | Testing | composer-2.5 | 225s | 0 | 2 + integrity json |
