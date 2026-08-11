---
id: null
slug: workflow-mutation-testing-gate
title: "Mutation testing gate in Spec-to-PR (Step 7)"
source: local
specDate: 2026-08-10
status: completed
---

# Specification — Mutation testing gate in Spec-to-PR (Step 7)

## Description

Add an optional **mutation testing / validation gate** to the standard Spec-to-PR workflow so agents can measure whether unit (and related) tests actually detect faults—not only that coverage exists and suites are green.

### What mutation testing is

Mutation testing is a software-engineering technique that evaluates the **quality and effectiveness of unit tests**. A tool deliberately alters the original production code (creating **mutants** with simulated faults) and re-runs the test suite against each mutant:

| Phase | Behavior |
|-------|----------|
| **Create mutants** | The tool changes operators (e.g. `+` → `-`, `>=` → `<`), removes blocks, or flips booleans / constants. |
| **Run tests** | The existing tests execute against the mutated code. |
| **Kill the mutant** | If a test **fails**, the mutant is **killed** — good: the suite detected the change. |
| **Survive the mutant** | If tests **still pass** on corrupted code, the mutant **survives** — the suite is weak or incomplete and must be improved. |

The **mutation score** (typically killed / (killed + survived), as percent) is the gate signal. Line/branch coverage alone is insufficient: high coverage with many surviving mutants means assertions are shallow.

### Placement decision (analysis)

Standard FSM today (Steps 0–9):

| Step | Skill | Role vs mutation testing |
|------|-------|--------------------------|
| 0–3 | Spec / plan / interview / tasks | Too early — no stable implementation or suite |
| 4 | `ws-implement-tasks` (build) | Too early — tests often incomplete mid-build |
| 5 | `ws-verify-plan` | Wrong axis — scores **feature vs spec**, not **test effectiveness** |
| 6 | `ws-code-review` | Wrong tool — static/diff review; mutation is dynamic suite quality |
| **7** | **`ws-testing`** | **Best fit** — already owns unit/integration/E2E, coverage, and feature-quality checks |
| 8 | `ws-ship-pr` | Too late for first discovery — weak tests should fail before ship gate |
| 9 | `ws-fix-pr` / `ws-goal-fix-pr` | PR-thread loop only; not first-class mutation entry |

**Recommended entry point:** standard orch **Step 7 (`ws-testing`)**, as a **late substep after** build + unit/integration/coverage succeed, and **before** Step 7 reports pass / Advance to Step 8.

Rationale:

1. Mutation testing requires a **green baseline suite**; Step 7 already establishes that.
2. Mutation score complements coverage (coverage ≠ fault detection); keeping both under `ws-testing` avoids a new FSM step and renumbering harness/simulations.
3. Failures should hand off to **`ws-implement-tasks` (fix mode)** to strengthen tests—the same pattern Step 7 uses today for test gaps (no silent code edits inside `ws-testing`).
4. **Do not** invent a new Step 7.5 / renumber ship—portability and `ws-check-workflows` / Phase FSM maps stay stable.
5. **Lite (`ws-spec-to-pr-lite`)** has no Testing step; mutation stays **out of lite default**. Optional later: document as out-of-band standalone `/mutation-test` only if needed—not part of this feature's default lite path.
6. Orthogonal to `continuous-ai-verification-quality-gates` / `fable-judge` (adversarial fraud vs test-kill effectiveness). Mutation does not replace fable audit at ship.

### Goals

- Extend `ws-testing` with a configurable mutation substep and report section.
- Wire config (`verification.mutationTest`, thresholds, skip/opt-in flags) so consumers can enable mutation without hardcoding a runner (Stryker, PIT, mutmut, etc.).
- Gate Advance from Step 7 → 8 on mutation threshold when enabled and not skipped.
- Keep lite orch and `skipTesting` paths free of mutation obligations.

## Acceptance Criteria

- AC1: Standard orch Step 7 (`ws-testing`) documents and runs an optional **Mutation** substep **after** applicable verification build/unit/integration/coverage checks succeed and **before** writing the final pass verdict in `step-07-{slug}.testing.report.md`.
- AC2: Mutation is skipped (logged, not failed) when any of: `defaults.skipTesting` / orch `skipTesting`; Step 7 auto-skip (no test surface + unit green); `defaults.skipMutationTesting` true; or `verification.mutationTest` is empty/unset.
- AC3: `config.json.example` + `config.schema.json` add: `verification.mutationTest` (command string), `verification.mutationThreshold` (number 0–100, mutation score = killed/(killed+survived) percent), and `defaults.skipMutationTesting` (boolean, default `true` so opt-in by default).
- AC4: When mutation runs, `ws-testing` executes `verification.mutationTest` via an explicit launcher per `tools.md`, records killed/survived counts when available, parses or records the mutation score, and compares it to `verification.mutationThreshold` (default threshold `80` when mutation is enabled but threshold omitted).
- AC5: Score **≥ threshold** → Mutation section `status: passed` in `step-07-{slug}.testing.report.md`; Step 7 may complete and Advance to 8. Score **&lt; threshold** (too many surviving mutants) or non-zero exit → `status: failed`; Step 7 does **not** Advance; orch/user-gate offers handoff to `ws-implement-tasks` fix mode (strengthen assertions / add cases that kill survivors)—`ws-testing` itself still does not edit product code.
- AC6: `step-07-{slug}.testing.plan.md` includes a Mutation section (command, threshold, scope note: changed files / project default) when mutation is enabled for the run; `step-07-{slug}.testing.report.md` always records Mutation as `passed` | `failed` | `skipped` with reason, and when run includes score plus killed/survived when the runner reports them.
- AC7: `ws-spec-to-pr` `STEP-DISPATCH.md` / Step 7 summary and `gates.md` document the mutation substep, skip flags, and fail-closed Advance rule; FSM step numbers remain 0–9 (no new step id).
- AC8: `ws-spec-to-pr-lite` does **not** require mutation; docs state mutation is standard-Step-7-only (lite out of scope for this feature).
- AC9: `ws-check-workflows` / harness docs updated so simulations that cover Step 7 include mutation skip/pass/fail branches without breaking existing FSM maps; `ws-check-harness` reports 0 critical after skill/hub edits.
- AC10: Hub/task-router prose (root `AGENTS.md` and/or `ws-shared` as needed) mentions mutation only as part of `ws-testing` / Step 7—not as a separate pipeline skill folder unless a dedicated `ws-mutation-test` skill is explicitly chosen in planning; default implementation embeds in `ws-testing`.

## Notes

- **Default posture:** opt-in (`skipMutationTesting: true` or empty `mutationTest`) — spawning mutants and re-running the suite is expensive; do not force it on every consumer install.
- **Scope:** Prefer project command ownership (consumer sets Stryker/PIT/mutmut/etc. in `verification.mutationTest`). The skill does not vendor a mutation engine; it interprets kill/survive score against the configured threshold.
- **Remediation signal:** Surviving mutants mean weak or incomplete tests—fix handoff targets the **test suite** (stronger assertions, missing cases), not rolling back the intentional mutant edits (the runner owns temp mutants).
- **Related specs (do not merge):** `continuous-ai-verification-quality-gates` (fable/CI/classifier/telemetry); `fable-skills-integration` (adversarial audit points). Mutation is test-effectiveness only.
- **Rejected placements:** Step 5 (wrong metric), Step 6 (wrong tool), Step 8-only gate (too late for first failure), new FSM step (harness churn).
- **Next after this draft:** register via `ws-local-spec-provider` when starting a workflow; classify with `ws-classify-complexity` (likely standard given orch/skill/config surface).
