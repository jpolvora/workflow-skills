---






name: ws-code-review
description: Local two-phase code review with fix → re-review loops (max 3). Trigger when reviewing a branch/diff before ship, or when orch Step 6 / lite Step 3 runs.
version: 0.3.13
disable-model-invocation: true
invocation_names:
  - code-review
  - ws-code-review
---

# ws-code-review

> When this skill is loaded, output "ws-code-review loaded."

Review modified files vs the base branch for correctness, security, policy, and diff quality. Clear Critical/Warning via fix → re-review before Advance.

**Entry check:** Verify `$PWD/.agents/skills/ws-shared/config.json`. If missing or unconfigured, `user-gate` → run [`ws-configure-project`](../ws-configure-project/SKILL.md) (or invoke it now).

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

2. **Triage**: flag lines with defect hypotheses; discard cosmetic nits, untouched pre-existing code, and low-risk UI without security surface.
   - Done when: a hypothesis list of candidate findings exists.

3. **Investigate**: for each hypothesis, complete all four proof steps: Evidence Read, Failure Scenario, Missing Protection, Discards. Drop any hypothesis that cannot complete all four.
   - Done when: every retained finding has all four proof steps documented.

4. **Generalize defect class**: for each proven finding, search the full diff for sibling occurrences of the same pattern and report them together.
   - Done when: sibling occurrences are searched and reported (or none found).

5. **Sweep known patterns**: grep each ID in `MEMORY.md → ## Review Patterns` against the modified file set; report confirmed violations.
   - Done when: the pattern sweep ran and results are reported.

6. **Check invariants**: cross-check `config.json.invariants` / `config.json.rules`: tenancy filters, DB-migrations-CLI-only, domain rules, React hook cleanup/dependency arrays, and i18n keys present in every locale from `config.json.stack.frontend.i18n.locales[]`.
   - Optional `fable` integration: If `config.json.fable.enabled` and `autoAudit` are `true`, run [`ws-fable-judge`](../ws-fable-judge/SKILL.md) for Weakened Checks, False Completion, Scope Creep, Unauthorized Action. Report detected frauds as Critical or Warning.
   - Done when: each applicable checklist item is checked.

7. **Write report**: save `step-06-{slug}.review.md`. No findings: write `No feedback` and stop (clean). Findings: use severity sections Critical / Warning / Suggestion, each with `path:L#`, description, score `/10`, sibling occurrences, and a `suggestion` block; end with **Apply fixes?** (workflow: answer follows the loop table above).
   - Done when: the report file matches the format described above.

8. **Apply fixes + re-review**: under workflow (and standalone after YES), run the fix → re-review loop (max 3). Each round: surgical fixes via `ws-implement-tasks` `mode=fix`, run `config.json.verification` build/test aliases for touched layers, re-review, update `step-06-{slug}.fix.report.md`, record state/memory. Stop when clean or after round 3 with Pause on residual Critical/Warning.
   - Done when: no Critical/Warning remain, or Pause after max rounds with residual findings documented.

## Rules of engagement

- Include only findings with complete Investigate proof (all four steps); no speculative comments.
- Clear Critical/Warning before Advance via fix → re-review (max 3).
- Do not commit: changes stay in the working tree for the orchestrator or developer to stage.
