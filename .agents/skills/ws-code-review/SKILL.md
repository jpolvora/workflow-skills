---



name: ws-code-review
description: Two-phase code review engine — audits correctness, security, policy, and diff quality, executing targeted fix → re-review loops (max 3 rounds) before ship.
version: 0.0.102
disable-model-invocation: true
invocation_names:
  - code-review
  - ws-code-review
---

# ws-code-review

Perform a comprehensive local code review of all modified files, relative to the base branch, before a PR is raised. Act as a **Senior Code Reviewer** conducting static and logical analysis for style, security, tenancy, performance, correctness, and architectural invariants.

**Canonical output:** `{us-dir}/step-06-{slug}.review.md`. Optional fix summary: `{us-dir}/step-06-{slug}.fix.report.md`.

## Invocation

Standalone:

```
/code-review [base=<ref>] [plan=<plan-path>]
```

Workflow (ws-spec-to-pr Step 6 / lite Step 3): dispatched automatically, receives `base` and `planPath` from orchestrator state.

| Parameter | Default | Notes |
|-----------|---------|-------|
| `base` | `origin/main`/`origin/master` (auto-detected) | Git ref to diff against |
| `plan` | (optional) | `step-02-*.plan.refined.md` or `step-01-*.plan.md` to cross-reference planned changes |

## Fix → re-review loop (workflow)

Fix is not its own workflow step. **Do not advance with open Critical/Warning** — clear them in this step so defects do not accumulate downstream.

| Case | Behavior |
|------|----------|
| Clean (no Critical/Warning) | Complete Step 6 / lite Step 3; Advance |
| Critical or Warning findings | Run **fix → re-review** rounds until clean or max rounds |
| Suggestions only | Optional one fix pass; do not block Advance |
| Residual Critical/Warning after max rounds | **Pause** (fail closed) — do not Advance |

**Round loop (max 3):**

1. Dispatch [ws-implement-tasks](../ws-implement-tasks/SKILL.md) `mode=fix` against current findings (include Suggestions in the same surgical pass when fixing).
2. Targeted re-review of touched scope (Steps 1–6 below, focused on prior findings + new regressions).
3. Update `step-06-{slug}.review.md` (and append round notes to `step-06-{slug}.fix.report.md`).
4. **State / memory each round:** log `review-fix | round={n}/3 | fixed=… | remaining=…` in gate history; append traps/gaps to `## Workflow memory` in state; when a durable anti-regression trap appears, write via [ws-self-learning](../ws-self-learning/SKILL.md) (or `Learning: N/A` if none).
5. Exit when no Critical/Warning remain, else continue until round 3.

**Modes:**

| Mode | Gate / auto |
|------|-------------|
| Interactive | Gate after first report: **Apply fixes and re-review** (Recommended) / **Pause**. Do not offer “Proceed without fixing” while Critical/Warning remain. |
| `autoMode` | Autofix without asking; same max **3** rounds; residual Critical/Warning → Pause |

Log `review-fix` in gate history; do not add a separate `completedSteps` entry for the fix substep. Standalone `/code-review`: same loop after user confirms Apply fixes (Step 8).

## Steps

1. **Detect stack & diff**: read `config.json.stack` to scope backend/frontend layers; exclude `bin/`, `obj/`, `dist/`, `node_modules/`, CI YAML, translations. Run `git diff --name-status {base}...HEAD` over in-scope paths.
   - Done when: the in-scope modified file list is known.

2. **Triage**: flag lines with real defect potential; discard cosmetic nits, untouched pre-existing code, and low-risk TSX without security surface.
   - Done when: a hypothesis list of candidate findings exists.

3. **Investigate**: for each hypothesis, complete all four proof steps: Evidence Read, Failure Scenario, Missing Protection, Discards. Drop any hypothesis that cannot complete all four.
   - Done when: every retained finding has all four proof steps documented.

4. **Generalize defect class**: for each proven finding, search the full diff for sibling occurrences of the same pattern and report them together.
   - Done when: sibling occurrences are searched and reported (or none found).

5. **Sweep known patterns**: grep each ID in `MEMORY.md → ## Review Patterns` against the modified file set; report confirmed violations.
   - Done when: the pattern sweep ran and results are reported.

6. **Check invariants**: cross-check `config.json.invariants` / `config.json.rules`: tenancy filters, DB-migrations-CLI-only, domain rules, React hook cleanup/dependency arrays, and i18n keys present in every locale from `config.json.stack.frontend.i18n.locales[]`.
   - Optional `fable` integration: If `config.json.fable.enabled` and `autoAudit` are `true`, run [`ws-fable-judge`](../ws-fable-judge/SKILL.md) to perform adversarial audit for the 4 classic frauds (Weakened Checks, False Completion, Scope Creep, Unauthorized Action). Report detected frauds as Critical or Warning findings so the fix → re-review loop runs.
   - Done when: each applicable checklist item is checked.

7. **Write report**: save `step-06-{slug}.review.md`. No findings: write `No feedback` and stop (clean). Findings: use severity sections Critical / Warning / Suggestion, each with `path:L#`, description, score `/10`, sibling occurrences, and a `suggestion` block; end with **Apply fixes?** (workflow: answer follows the loop table above).
   - Done when: the report file matches the format described above.

8. **Apply fixes + re-review**: under workflow (and standalone after YES), run the fix → re-review loop (max 3). Each round: surgical fixes via `ws-implement-tasks` `mode=fix`, run `build-backend`, `test-backend`, `build-frontend` (+ `test-frontend` if UI logic touched), re-review, update `step-06-{slug}.fix.report.md`, record state/memory. Stop when clean or after round 3 with Pause on residual Critical/Warning.
   - Done when: no Critical/Warning remain, or Pause after max rounds with residual findings documented.

## Rules of engagement

- Precision before volume: include only findings with complete evidence, no speculative comments.
- Convergence goal: clear Critical/Warning before Advance; use fix → re-review (max 3), not a single drive-by report.
- Do not commit: changes stay in the working tree for the orchestrator or developer to stage.

Language: en-us only.
