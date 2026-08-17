---
us: "step-08"
slug: deepseek-harness-improvements
kind: second-pass-report
mode: scoreAndRefine
reportDate: 2026-08-17
pass1Source: .agents/plans/deepseek-harness-improvements/step-05-deepseek-harness-improvements.score-analysis.md
pass2Source: .agents/plans/deepseek-harness-improvements/step-05-deepseek-harness-improvements.score-analysis.pass2.md
evalSource: .agents/plans/deepseek-harness-improvements/step-00-deepseek-harness-improvements.spec.md
inScopeACs: [AC4, AC5, AC7, AC8, AC9]
pass1Overall: 9
pass2Overall: 10
tasksBelow7: []
---

# Second-pass report — deepseek-harness-improvements (P1)

Comparative verification after scoreAndRefine Pass 2 implement. Pass 1 scores are from `step-05-deepseek-harness-improvements.score-analysis.md` (not overwritten). Pass 2 scores are from `step-05-deepseek-harness-improvements.score-analysis.pass2.md`.

**Scope:** T1–T6 / AC4, AC5, AC7, AC8, AC9. Deferred P2–P4 ACs are out of scope and not used as penalties.

## Pass 1 vs Pass 2 comparative summary

| Task | AC | Pass 1 | Pass 2 | Delta | What changed |
|------|----|--------|--------|-------|--------------|
| T1 | AC4 | 9 | 10 | +1 | Lite unread reject (missing / older / unknown / nonint) + four version constants asserted equal |
| T2 | AC5 | 10 | 10 | 0 | No Pass 2 edit (already complete) |
| T3 | AC9 | 9 | 10 | +1 | Skip-check when `origin/{integrationBranch}` absent; origin/main vs origin/develop fixture; lite SKILL.md §4c pointer |
| T4 | AC7 | 9 | 9 | 0 | No Pass 2 edit (contract-only revision guard; Pass 1 enhancement was none) |
| T5 | AC8 | 9 | 10 | +1 | `ws-goal-loop` eval id 6: 3 consecutive identical reasons → blocked / escalated |
| T6 | AC7, AC8 | 9 | 10 | +1 | `ws-goal-fix-pr` eval id 6: same positive blocked path for the fix-pr loop |
| **Overall** | P1 slice | **9** | **10** | **+1** | All five Pass 1 Top 5 items closed |
| Mean | | 9.17 | 9.83 | +0.66 | Min stays 9 (T4) |
| Tasks below 7 | | none | none | — | Advance threshold still met |

## What changed (Pass 2 implement)

Five files, net **+213 / −17** lines versus HEAD (`git diff --stat` on the Pass 2 set):

| File | Role |
|------|------|
| `test/test-update-state-yaml.js` | Drive unread reject through lite `validate_state.py`; assert std/lite `_STATE_VERSION` and both `CURRENT_STATE_VERSION` are equal (all 1). Clamp-7 + retry coverage remains. |
| `test/test-resume-gate.js` | `resumePreCheck` skip-check when `origin/{integrationBranch}` is missing; stale-merge fixture uses `origin/main` vs `origin/develop`; skip-check overrides a null `rev-list` (must not mark-complete-stop). |
| `.agents/skills/ws-goal-loop/evals/evals.json` | Eval **id 6**: 3 consecutive identical failure reasons → blocked (escalated). |
| `.agents/skills/ws-goal-fix-pr/evals/evals.json` | Eval **id 6**: same positive path, worded for fix-pr rounds. |
| `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Bootstrap line points at Resume pre-check vs `{integrationBranch}`: `setup.md` §4c. |

No writer/validator Python behavior was added in Pass 2. The second pass is coverage and contract-pointer polish on behavior that Pass 1 already shipped.

## Quality gains

1. **AC4 lite reject is now a first-class unit path.** Pass 1 (and the Step 6 Suggestion) noted lite unread reject was implemented but only asserted via the standard validator. Pass 2 runs the same four fail cases plus current=1 on lite. A lite-only reject regression would fail the suite.
2. **Schema-version drift fails closed.** Four independent constants (std/lite stamp + std/lite validate) must stay equal. A bump on one copy without the others fails `test-update-state-yaml.js`.
3. **AC8 has a positive blocked eval, not only the 2-round negative.** Eval 4 (not blocked at 2) + eval 6 (blocked at 3) + eval 5 (resume re-arm) is the full AC8 matrix on both goal-loop and goal-fix-pr.
4. **AC9 fixture matches the stale-orch-resume trap.** Unique-commit count is taken against `origin/develop` and `origin/main`, not local branch names. Skip-check is proven when the origin ref is absent so git-less / unfetched resume does not false-stop.
5. **Lite invoke no longer relies on setup.md alone.** `ws-spec-to-pr-lite/SKILL.md` names §4c and `{integrationBranch}` at bootstrap.

## Test metrics

| Check | Pass 1 | Pass 2 | Notes |
|-------|--------|--------|-------|
| `node test/test-update-state-yaml.js` | exit 0 | **exit 0** | Lite unread reject + constant-equality assertions added; nested-dict / union / clamp / AC6 extra still green |
| `node test/test-resume-gate.js` | exit 0 | **exit 0** | New skip-check case; origin/ stale-merge fixture; contract encoding includes skip-check + integrationBranch |
| `ws-goal-loop/evals/evals.json` id 6 | absent | **present** | ids 1–6; JSON parses |
| `ws-goal-fix-pr/evals/evals.json` id 6 | absent | **present** | ids 1–6; JSON parses; prompt is fix-pr-specific |
| Lite SKILL.md §4c pointer | silent | **present** | `Resume pre-check vs {integrationBranch}: §4c` |

Pass 2 did not re-run the full `npm run test` installer suite (out of this verification’s live-check list). The two named Node tests and both eval JSON files are the Pass 2 evidence.

## Residuals (not below-7)

- **T4 = 9:** revision guard stays contract-only (no on-disk revision schema, no mutation fixture). Pass 1 listed no required enhancement.
- **Restore-HEAD** after mark-complete is specified in `setup.md` §4c and is not unit-tested (agent `git checkout {integrationBranch}` only).
- **`testContractEncoded`** still reads `setup.md` + standard `SKILL.md` only; it does not assert the lite §4c pointer.

## Verdict

Pass 2 overall **10 / 10**. No task is below 7. Comparative delivery: Pass 1 9 → Pass 2 10 on the P1 slice. Remaining residuals are optional polish, not missing acceptance criteria.
