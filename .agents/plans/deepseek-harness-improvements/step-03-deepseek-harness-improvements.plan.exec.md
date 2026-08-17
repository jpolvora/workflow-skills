---
slug: deepseek-harness-improvements
title: "DeepSeek Harness improvements - P1 execution tasks (sequential)"
status: "tasks defined ok"
execMode: sequential
---

# step-03 - P1 Execution Tasks (deepseek-harness-improvements)

> Produced by ws-plan-to-tasks. execMode is **sequential** because `config.json$`
> `defaults.enableDag` is `false` (default). Tasks execute one after another in
> serial order; there are **no parallel DAG groups**. Source plan:
> `.agents/plans/deepseek-harness-improvements/step-02-deepseek-harness-improvements.plan.refined.md`.

## Scope

**In scope (P1 only):** state integrity + resume gate, and goal/resume contract guards:
- AC4 - monotonic `stateVersion` in state.yaml + reject-old in validate_state.py (exit 1)
- AC5 - fix nested-dict serialization (format_inline_dict / parse_inline_dict) + union
  duplicate `completedSteps` with stderr warning (standard + lite copies)
- AC9 - resume pre-check: `git rev-list --count origin/{base}..HEAD` must be > 0,
  else mark-complete/stop
- AC7 - goal-loop updates revision-guarded (stale revision conflicts loudly)
- AC8 - blocked only after >= 3 consecutive rounds same concrete reason; resume re-arms

**Deferred (follow-up PR - NOT tasks here):** P2 decision notes + single-home-of-fact
(AC1-AC3, AC16), P3 jobs/hygiene (AC10-AC12), P4 verification/DX (AC13-AC15).

## Ordered Sequential Tasks

Each task lists its action, affected real files, verification step, mapped AC(s),
and a test case under `test/`.

### T1 - Add monotonic stateVersion + reject-old in validate_state.py
- **Action:** Add a monotonically increasing `stateVersion` (integer) field to the
  state.yaml frontmatter written by `update_state.py` (bump on each state write,
  never decreases). Add a guard in `validate_state.py` that rejects unknown or
  older `stateVersion` values with exit code 1 and a clear message. No compat shims
  (reject loud - business rule).
- **Affected files:**
  - `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
  - `.agents/skills/ws-spec-to-pr/scripts/validate_state.py`
- **ACs:** AC4
- **Verification:** `python .agents/skills/ws-spec-to-pr/scripts/validate_state.py <fixture-with-bad-version>; echo $?` returns 1; unknown/older version state fails with clear stderr message.
- **Test case:** `test/test-update-state-yaml.js` - new `stateVersion reject (exit 1)` case.

### T2 - Fix nested-dict serialization + completedSteps union (standard + lite)
- **Action:** Harden `update_state.py` (standard) and the `ws-spec-to-pr-lite` copy so
  nested dict values round-trip cleanly through `format_inline_dict` / `parse_inline_dict`
  (the [2026-08-13] memory-trap regression - no corrupting nested maps). Union duplicate
  `completedSteps` keys into unique ints with a warning on stderr instead of last-wins.
  Both copies must behave identically.
- **Affected files:**
  - `.agents/skills/ws-spec-to-pr/scripts/update_state.py`
  - `.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py`
- **ACs:** AC5
- **Verification:** `node test/test-update-state-yaml.js` (nested-dict round-trip + duplicates-union cases pass); `npm run test` green.
- **Test case:** `test/test-update-state-yaml.js` - new cases: `nested-dict round-trip`, `duplicates union (stderr warning, unique ints)`.

### T3 - Resume pre-check (unique commits vs base) in orchestrator resume flow
- **Action:** In the orchestrator resume entry (ws-spec-to-pr state/bootstrap where the
  workflow re-enters after a Pause/interrupt), add a mechanical pre-check before
  re-implementing: run `git rev-list --count origin/{base}..HEAD`. If the count is
  NOT > 0 (i.e. zero unique commits on the feature tip vs base), stop and
  mark-complete instead of re-implementing (the stale-orch-resume memory trap).
- **Affected files:**
  - `.agents/skills/ws-spec-to-pr/SKILL.md` (resume contract/protocol wording + resume pre-check step)
  - `.agents/skills/ws-spec-to-pr/README.md` (resume usage note, if needed)
  - orchestrator resume scripts under `.agents/skills/ws-spec-to-pr/scripts/` (bootstrap/entry logic that implements the resume gate)
- **ACs:** AC9
- **Verification:** Resume test fixture with 0 unique commits exercises the mark-complete/stop path; a fixture with >= 1 unique commit proceeds to re-implement.
- **Test case:** `test/test-resume-gate.js` (new, or a case in an existing state test) - `0 unique commits -> mark-complete/stop` path.

### T4 - Goal-loop revision-guarded contract + evals
- **Action:** Update the `ws-goal-loop` SKILL.md contract so goal updates are
  revision-guarded: a stale revision conflicts loudly and is never silently overwritten.
  Mirror the guard in `evals/evals.json` as an eval case. Contract-only enforcement
  (no runtime loop code - matches existing architecture). 
- **Affected files:**
  - `.agents/skills/ws-goal-loop/SKILL.md`
  - `.agents/skills/ws-goal-loop/evals/evals.json`
- **ACs:** AC7
- **Verification:** `ws-goal-loop/evals` run passes; `stale-revision conflict` eval case fails when a stale revision would be silently applied.
- **Test case:** `ws-goal-loop/evals/evals.json` - `stale-revision conflict` eval.

### T5 - Goal-loop >=3-round blocked + resume re-arm contract + evals
- **Action:** Update the `ws-goal-loop` SKILL.md contract so a blocked goal verdict is
  allowed only after >= 3 consecutive rounds with the same concrete reason, never before;
  and resume re-arms the objective. Mirror both guards in `evals/evals.json`.
- **Affected files:**
  - `.agents/skills/ws-goal-loop/SKILL.md`
  - `.agents/skills/ws-goal-loop/evals/evals.json`
- **ACs:** AC8
- **Verification:** `ws-goal-loop/evals` run passes; `3-round blocked` and `resume re-arm` eval cases behave as specified.
- **Test case:** `ws-goal-loop/evals/evals.json` - `3-round blocked` + `resume re-arm` evals.

### T6 - Goal-fix-pr revision + blocked/resume contract + evals
- **Action:** Update the `ws-goal-fix-pr` SKILL.md contract (and its eval suite) to the
  same revision-guarded / >=3-round-blocked / resume-re-arms objective contract as
  `ws-goal-loop` (AC7-AC8 applied to the PR-thread fix loop). Contract-only wording +
  evals, no runtime loop code.
- **Affected files:**
  - `.agents/skills/ws-goal-fix-pr/SKILL.md`
  - `.agents/skills/ws-goal-fix-pr/evals/evals.json`
- **ACs:** AC7, AC8
- **Verification:** `ws-goal-fix-pr/evals` run passes; stale-revision conflict, 3-round blocked, and resume re-arm eval cases pass.
- **Test case:** `ws-goal-fix-pr/evals/evals.json` - `stale-revision conflict`, `3-round blocked`, `resume re-arm` evals.

## AC -> Task Map (P1)

| AC | Task(s) |
|----|---------|
| AC4 | T1 |
| AC5 | T2 |
| AC7 | T4, T6 |
| AC8 | T5, T6 |
| AC9 | T3 |

## Task -> Test Case Map

| Task | Test case |
|------|-----------|
| T1 | `test/test-update-state-yaml.js` - stateVersion reject (exit 1) |
| T2 | `test/test-update-state-yaml.js` - nested-dict round-trip, duplicates union |
| T3 | `test/test-resume-gate.js` - 0 unique commits -> mark-complete/stop |
| T4 | `ws-goal-loop/evals/evals.json` - stale-revision conflict |
| T5 | `ws-goal-loop/evals/evals.json` - 3-round blocked, resume re-arm |
| T6 | `ws-goal-fix-pr/evals/evals.json` - stale-revision conflict, 3-round blocked, resume re-arm |

## Deferred (follow-up PR)

P2 (AC1-AC3, AC16 decision notes + one-home docs), P3 (AC10-AC12 jobs/hygiene),
P4 (AC13-AC15 verification/DX). Not in-scope for this P1 step; tasks above cover AC4-AC9 only.
