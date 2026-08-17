---
us: "step-05"
slug: deepseek-harness-improvements
pass: 2
mode: scoreAndRefine
reportDate: 2026-08-17
evalSource: .agents/plans/deepseek-harness-improvements/step-00-deepseek-harness-improvements.spec.md
pass1Source: .agents/plans/deepseek-harness-improvements/step-05-deepseek-harness-improvements.score-analysis.md
sourcePlans:
  - .agents/plans/deepseek-harness-improvements/step-02-deepseek-harness-improvements.plan.refined.md
  - .agents/plans/deepseek-harness-improvements/step-03-deepseek-harness-improvements.plan.exec.md
inScopeACs: [AC4, AC5, AC7, AC8, AC9]
deferredACs: [AC1, AC2, AC3, AC6-note, AC10, AC11, AC12, AC13, AC14, AC15, AC16]
overall: 10
mean: 9.83
min: 9
tasksBelow7: []
liveChecks:
  - { cmd: "node test/test-update-state-yaml.js", exit: 0 }
  - { cmd: "node test/test-resume-gate.js", exit: 0 }
evalId6:
  - .agents/skills/ws-goal-loop/evals/evals.json
  - .agents/skills/ws-goal-fix-pr/evals/evals.json
---

# Pass 2 score analysis — deepseek-harness-improvements (P1)

Companion to Pass 1 `step-05-deepseek-harness-improvements.score-analysis.md` (do not overwrite). Classifier-facing task-by-task re-score after the second-pass edits.

**Scored tree:** working tree after Pass 2 implement. Do not score last commit alone.

**In scope:** T1–T6 / AC4, AC5, AC7, AC8, AC9. Deferred P2–P4 (AC1–AC3, AC10–AC16) are not penalized. AC6 remains extra (pre-advance artifact check); not in exec T1–T6.

**Live checks this pass:** `node test/test-update-state-yaml.js` exit 0; `node test/test-resume-gate.js` exit 0. Eval id 6 present in both `ws-goal-loop/evals/evals.json` and `ws-goal-fix-pr/evals/evals.json`.

## Classifier table

| Task | Score |
|------|-------|
| T1 | 10 |
| T2 | 10 |
| T3 | 10 |
| T4 | 9 |
| T5 | 10 |
| T6 | 10 |

Mean **9.83**. Min **9**. Tasks scoring below 7: **none**. Overall Pass 2: **10**.

Pass 1 was T1=9 T2=10 T3=9 T4=9 T5=9 T6=9 overall=9. Deltas: T1 +1, T2 0, T3 +1, T4 0, T5 +1, T6 +1.

## T1 — monotonic stateVersion + reject-old (AC4) — 10

| Axis | Notes |
|------|-------|
| Criteria | Met. Both writers stamp `stateVersion: 1`. Both validators reject unread missing / older / unknown / non-integer with exit 1 and a stderr line that names `stateVersion`. `stamp_state_version` still clamps unknown highs (disk 7 → 1) so post-write validate can succeed. |
| Quality | Surgical. Four independent constants remain (keep-in-sync comments) and are now **asserted equal** in the suite. |
| Edge cases | Clamp 7 + retry on standard and lite writers. Unread reject now runs on **both** `VALIDATE_STANDARD` and `VALIDATE_LITE`. Current `stateVersion: 1` exits 0 on both validators. |
| Tests | `testStateVersionStampAndReject`: lite unread reject (missing / 0 / 7 / `"abc"`); lite current=1 OK; `_STATE_VERSION` (std+lite) == `CURRENT_STATE_VERSION` (std+lite) == 1. Live: exit 0. |

**Pass 1 gap closed:** lite unread reject + four-constant equality. Residual: none that affect AC4.

## T2 — nested-dict serialization + completedSteps union (AC5) — 10

| Axis | Notes |
|------|-------|
| Criteria | Unchanged from Pass 1. Met on standard and lite. Nested `telemetry.loc` round-trip; duplicate `completedSteps` union unique ints with stderr warning. |
| Quality | Same as Pass 1. No Pass 2 product edit required. |
| Edge cases | Nested mapping + list-of-inline-dicts; duplicate keys 0/1 then 2; second serialize pass. |
| Tests | `testLocNestedMappingRoundTrip`, `testLiteSerializerMirrorsNestedDictFix`, `testDuplicateCompletedStepsUnion` still green (same live run, exit 0). |

**Enhancement:** none.

## T3 — resume pre-check unique commits vs integration branch (AC9) — 10

| Axis | Notes |
|------|-------|
| Criteria | Met. `{integrationBranch}` = `workingBranch` else `baseBranch`; `git rev-list --count origin/{integrationBranch}..HEAD`; zero unique → mark-complete / stop / restore HEAD to the integration branch. Skip-check when the origin ref is missing (dry-run / git-less never blocks). Lite invoke now points at `setup.md` §4c. |
| Quality | Shared contract in `setup.md` §4c. Lite `SKILL.md` bootstrap line cites Resume pre-check vs `{integrationBranch}`: §4c (Pass 1 lite body was silent). Harness-neutral. Still no dedicated resume-gate script (agent-contract, consistent with other orch gates). |
| Edge cases | Stale-merge trap now uses **origin/main vs origin/develop**. Skip-check when `origin/develop` is absent: proceed, and skip-check overrides a null `rev-list` that would otherwise look like stop. Restore-HEAD after mark-complete remains specified in §4c and is not unit-tested (agent git checkout). |
| Tests | `test/test-resume-gate.js`: 0 unique → stop; >=1 → proceed; `testMergedIntoDevelopWhileBaseIsMain` (origin refs); `testSkipCheckWhenOriginIntegrationRefAbsent`; contract encoding on `setup.md` + standard `SKILL.md`. Live: exit 0. `testContractEncoded` does not yet read the lite SKILL.md pointer. |

**Pass 1 gap closed:** skip-check coverage, origin/ fixture, lite §4c pointer. Residual: restore-HEAD untested; lite pointer not encoded in the contract test.

## T4 — goal-loop revision-guarded contract + evals (AC7) — 9

| Axis | Notes |
|------|-------|
| Criteria | Unchanged from Pass 1. Met. Stale revision conflicts loudly, never last-wins. Eval id 3. Contract-only (no runtime loop engine) per refined-plan G-05. |
| Quality | Portable path tokens; en-us; no host product names. |
| Edge cases | No on-disk revision field schema (agent-carried). Matches contract-only design. Pass 2 did not add a mutation fixture. |
| Tests | `ws-goal-loop/evals/evals.json` eval 3. |

**Enhancement:** none required for P1. Optional later: a tiny fixture that a stale revision must not mutate round state. Score stays 9 (no Pass 2 work on this task).

## T5 — goal-loop >=3-round blocked + resume re-arm (AC8) — 10

| Axis | Notes |
|------|-------|
| Criteria | Met. Blocked only after >=3 consecutive rounds with the same concrete reason; reason change resets the counter; resume re-arms. |
| Quality | Same guard table as T4. Loop step 3 still agrees with the >=3 rule. |
| Edge cases | Eval 4 = not-yet-blocked at 2 rounds; eval 5 = resume re-arm; **eval 6 = 3 consecutive identical reasons → blocked / escalated** (Pass 1 positive-path gap). |
| Tests | evals 4, 5, and **6** in `ws-goal-loop/evals/evals.json`. JSON-valid; id 6 present. |

**Pass 1 gap closed:** 3-round-positive blocked eval.

## T6 — goal-fix-pr revision + blocked/resume (AC7, AC8) — 10

| Axis | Notes |
|------|-------|
| Criteria | Met. Guard table mirrors goal-loop with fix-loop specifics. Evals 3–5 from the review-fix tree; **eval 6** adds the 3-round-positive blocked path. |
| Quality | Cross-link to `ws-goal-loop`; en-us; harness-neutral. Eval 6 names consecutive **fix-pr** rounds (not a copy-paste of the goal-loop prompt). |
| Edge cases | 2-round-negative (eval 4) and 3-round-positive (eval 6) now both present. Resume re-arm remains eval 5. |
| Tests | `ws-goal-fix-pr/evals/evals.json` evals 3–6 present and JSON-valid. Id 6 confirmed. |

**Pass 1 gap closed:** 3-round-positive blocked eval on the fix-pr loop.

## Deferred / out of scope (not scored)

- P2 AC1–AC3, AC16 (decision notes, one-home docs)
- P3 AC10–AC12 (jobs, repeat-tool, timeouts)
- P4 AC13–AC15 (snapshots, dump-config, provider parity)
- AC6 extra from review-fix: `testArtifactReproducibilityPreAdvance` + SKILL.md item 8 — not in T1–T6

## Pass 1 Top 5 — disposition

1. **T1 lite unread reject** — done (VALIDATE_LITE, four cases + current=1).
2. **T5 / T6 3-round blocked eval** — done (eval id 6 on both skills).
3. **T3 skip-check + origin/ fixture** — done.
4. **T1 four schema-version constants equal** — done (assert all 1).
5. **T3 lite SKILL.md AC9 pointer** — done (`setup.md` §4c).

## Overall Pass 2

**10 / 10.** All six exec tasks still meet their ACs. Five of six tasks are 10. T4 remains 9 (contract-only revision guard; Pass 2 did not change it). No task is below 7. Remaining residuals (restore-HEAD untested; lite pointer not in `testContractEncoded`) are polish, not missing P1 behavior.
