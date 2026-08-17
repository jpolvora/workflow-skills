---
us: "step-05"
slug: deepseek-harness-improvements
pass: 1
mode: scoreAndRefine
reportDate: 2026-08-17
evalSource: .agents/plans/deepseek-harness-improvements/step-00-deepseek-harness-improvements.spec.md
sourcePlans:
  - .agents/plans/deepseek-harness-improvements/step-02-deepseek-harness-improvements.plan.refined.md
  - .agents/plans/deepseek-harness-improvements/step-03-deepseek-harness-improvements.plan.exec.md
inScopeACs: [AC4, AC5, AC7, AC8, AC9]
deferredACs: [AC1, AC2, AC3, AC6-note, AC10, AC11, AC12, AC13, AC14, AC15, AC16]
overall: 9
mean: 9.17
min: 9
tasksBelow7: []
---

# Pass 1 score analysis — deepseek-harness-improvements (P1)

Companion to the quick-score report `step-05-deepseek-harness-improvements.plan.report.md` (9/10). This file is the classifier-facing task-by-task Pass 1 score.

**Scored tree:** working tree (uncommitted P1 follow-ups included): resume gate retargeted to `{integrationBranch}` = `config.project.workingBranch` else `baseBranch`; `stamp_state_version` always emits `_STATE_VERSION` (clamps unknown highs). Do not score last commit alone.

**In scope:** T1–T6 / AC4, AC5, AC7, AC8, AC9. Deferred P2–P4 (AC1–AC3, AC10–AC16) are not penalized. AC6 was treated as extra in the Step 6 review-fix (pre-advance artifact check); it is not in exec T1–T6 and is not used to raise or lower these scores.

**Live checks this pass:** `node test/test-update-state-yaml.js` exit 0; `node test/test-resume-gate.js` exit 0.

## Classifier table

| Task | Score |
|------|-------|
| T1 | 9 |
| T2 | 10 |
| T3 | 9 |
| T4 | 9 |
| T5 | 9 |
| T6 | 9 |

Mean **9.17**. Min **9**. Tasks scoring below 7: **none**. Overall Pass 1: **9**.

## T1 — monotonic stateVersion + reject-old (AC4) — 9

| Axis | Notes |
|------|-------|
| Criteria | Met. Both `update_state.py` copies stamp `stateVersion: 1`. Both `validate_state.py` copies reject unread missing / older / unknown / non-integer with exit 1 and a clear stderr line. Working-tree `stamp_state_version` always assigns `_STATE_VERSION` (no `max(current, schema)`), so a disk value of 7 is clamped to 1 and post-write validate can succeed. Unread files still fail loud until a writer rewrite. |
| Quality | Surgical, en-us, portable. Comments document the clamp trap. Four independent version constants remain (`_STATE_VERSION` x2, `CURRENT_STATE_VERSION` x2) with keep-in-sync comments only. |
| Edge cases | Clamp 7 + retry covered for standard and lite writers. Unread reject covers missing / 0 / 7 / `"abc"` / current=1. Lite unread reject is implemented but not asserted directly. |
| Tests | `testStateVersionStampAndReject` stamps both writers, clamps 7 + retry on both, rejects unread files via `VALIDATE_STANDARD` only. |

**Enhancement:** Run the same four unread reject cases (missing / older / unknown / nonint) against `VALIDATE_LITE`, and add a constant-equality assertion (`std _STATE_VERSION` == `lite _STATE_VERSION` == both `CURRENT_STATE_VERSION`).

## T2 — nested-dict serialization + completedSteps union (AC5) — 10

| Axis | Notes |
|------|-------|
| Criteria | Met on standard and lite. `format_inline_dict` / `parse_inline_dict` round-trip nested `telemetry.loc`; duplicate `completedSteps` keys union unique ints with a stderr warning (not last-wins). |
| Quality | Matches existing serializer style; no host product names; lite mirrors standard. |
| Edge cases | Nested mapping + list-of-inline-dicts; duplicate keys 0/1 then 2; second-pass loc round-trip. |
| Tests | `testLocNestedMappingRoundTrip`, `testLiteSerializerMirrorsNestedDictFix`, `testDuplicateCompletedStepsUnion` — all green this pass. |

**Enhancement:** none.

## T3 — resume pre-check unique commits vs integration branch (AC9) — 9

| Axis | Notes |
|------|-------|
| Criteria | Met in the working tree. `setup.md` §4c and `ws-spec-to-pr/SKILL.md` Pause/Revert resolve `{integrationBranch}` = `config.project.workingBranch` when set, else `{baseBranch}`; `git rev-list --count origin/{integrationBranch}..HEAD`; zero unique commits → mark-complete / stop / restore HEAD to the integration branch. Comparing only to `origin/{baseBranch}` (main) is explicitly forbidden. |
| Quality | Contract lives in shared `setup.md` (lite also loads it). Prose is harness-neutral. No dedicated resume-gate script (agent-contract, consistent with other orch gates). Lite `SKILL.md` body is silent on AC9. |
| Edge cases | Trap covered: merged into `develop` while `baseBranch` is `main` → vs-main would proceed, vs-develop is 0 → mark-complete. Fallback when `workingBranch` is empty uses `baseBranch`. Skip-check when `origin/{integrationBranch}` is missing, and restore-HEAD after mark-complete, are specified but not unit-tested. Git fixture uses local refs, not `origin/` remotes. |
| Tests | `test/test-resume-gate.js`: 0 unique → stop; >=1 → proceed; `testMergedIntoDevelopWhileBaseIsMain`; contract encoding on `setup.md` + standard `SKILL.md`. Exit 0 this pass. |

**Enhancement:** Cover skip-check when the integration remote-ref is absent; optionally fixture `origin/develop` vs `origin/main`. Add a one-line AC9 pointer on `ws-spec-to-pr-lite/SKILL.md` (lite already follows `setup.md` §4c).

## T4 — goal-loop revision-guarded contract + evals (AC7) — 9

| Axis | Notes |
|------|-------|
| Criteria | Met. `ws-goal-loop/SKILL.md` Goal-contract-guards table: stale revision conflicts loudly, never last-wins overwrite. Eval id 3 mirrors that. Contract-only (no runtime loop engine) per refined-plan G-05. |
| Quality | Portable path tokens; en-us; no host product names. |
| Edge cases | Stale vs current revision is specified. No on-disk revision field schema (agent-carried), which matches contract-only design. |
| Tests | `ws-goal-loop/evals/evals.json` eval 3 (prompt/assertion). Not an executable unit test — planned architecture. |

**Enhancement:** none (optional later: a tiny fixture that a stale revision must not mutate round state).

## T5 — goal-loop >=3-round blocked + resume re-arm (AC8) — 9

| Axis | Notes |
|------|-------|
| Criteria | Met. Guard table: blocked only after >=3 consecutive rounds with the same concrete reason; reason change resets the counter; resume re-arms the objective and re-initializes the blocked-round counter. Eval 4 = not-yet-blocked at 2 rounds; eval 5 = resume re-arm. |
| Quality | Same contract table as T4; surgical insert. Loop step 3 still says "3x identical failure → stop and escalate", which agrees with the >=3 rule. |
| Edge cases | Negative path (2 rounds → not blocked) and resume re-arm are eval-covered. No eval whose prompt is exactly 3 identical rounds and whose expected output is **blocked**. |
| Tests | evals 4 and 5 in `ws-goal-loop/evals/evals.json`. |

**Enhancement:** Add one eval whose prompt is three consecutive identical reasons and whose expected output is a blocked/escalated verdict (positive path).

## T6 — goal-fix-pr revision + blocked/resume (AC7, AC8) — 9

| Axis | Notes |
|------|-------|
| Criteria | Met after the Step 6 review-fix (W1). `ws-goal-fix-pr/SKILL.md` guard table mirrors goal-loop with fix-loop specifics (thread/round state; PR number + success criterion re-arm). `evals/evals.json` now has evals 3–5 (stale-revision, 3-round threshold, resume re-arm). Original P1 miss of this evals file is closed in the scored tree. |
| Quality | Cross-link to `ws-goal-loop`; en-us; harness-neutral. |
| Edge cases | Same 2-round-negative vs missing 3-round-positive gap as T5. Fix-loop evals name PR/success-criterion re-arm (not a copy-paste of goal-loop prompts). |
| Tests | `ws-goal-fix-pr/evals/evals.json` evals 3–5 present and JSON-valid. |

**Enhancement:** Same as T5 — add a 3-round-positive blocked/escalated eval on the fix-pr loop.

## Deferred / out of scope (not scored)

- P2 AC1–AC3, AC16 (decision notes, one-home docs)
- P3 AC10–AC12 (jobs, repeat-tool, timeouts)
- P4 AC13–AC15 (snapshots, dump-config, provider parity)
- AC6 extra from review-fix: `testArtifactReproducibilityPreAdvance` + SKILL.md item 8 — not in T1–T6; not used as a penalty or bonus

## Top 5 enhancement recommendations

1. **T1:** Direct unread-file reject coverage for lite `validate_state.py` (missing / older / unknown / nonint), matching standard.
2. **T5 / T6:** Add a 3-consecutive-identical-reason **blocked** eval (positive path), not only the 2-round not-yet-blocked case.
3. **T3:** Unit-cover skip-check when `origin/{integrationBranch}` is missing; use `origin/` refs in the git fixture if cheap.
4. **T1:** Assert the four schema-version constants stay equal (std/lite writer + both validators).
5. **T3:** One-line AC9 resume pre-check on `ws-spec-to-pr-lite/SKILL.md` so lite invoke does not rely only on `setup.md`.

## Overall Pass 1

**9 / 10.** All six exec tasks meet their ACs in the working tree. No task is below 7. Remaining work is coverage and contract-pointer polish, not missing P1 behavior. The two known traps (stale-orch-resume vs `develop`, `stamp_state_version` clamp of unknown highs) are addressed in the scored tree and covered by regression tests.
