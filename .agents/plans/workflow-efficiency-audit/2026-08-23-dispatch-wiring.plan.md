# Dispatch wiring leftover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make live `ws-spec-to-pr` / lite dispatch match the Node helpers that already exist, so default runs skip the empty Step 3 subagent, emit ledger/plan-index artifacts, and pre-advance honors skip reasons without lowering the score gate.

**Architecture:** No new skills. Orch recipes in STEP-DISPATCH (and lite SKILL) invoke `ac_ledger.cjs`, `plan_index.cjs`, `write_sequential_dag.cjs`, and `probe_test_surface.cjs`. `workflow_state.cjs` pre-advance becomes pipeline-aware and skip-aware. Tests lock the recipes.

**Tech Stack:** Node 22 `.cjs` helpers, existing `test-*-economy/contract/enable-dag` files.

## Global Constraints

- Fail-closed score ≥ 9, REFUTED, HS-1..HS-5, G2-code, and `{plansDir}`-only-at-ship stay.
- New managed scripts stay Node `.cjs`. Do not start `unique-skill-script-runtime` in this change.
- Path tokens only. en-us skill/gate prose.
- Do not commit consumer `config.json` / MEMORY / CHANGELOG unless the changelog path is the configured ship target.

---

## File map

| File | Responsibility |
|------|----------------|
| `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Standard step recipes |
| `.agents/skills/ws-spec-to-pr/ARTIFACTS.md` | Machine artifact rows + skip contract |
| `.agents/skills/ws-spec-to-pr/PROTOCOLS.md` | Step 4 reads indexed plan |
| `.agents/skills/ws-spec-to-pr/DIAGRAM.md` | Step 3 skip branch |
| `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Ledger + plan-index on lite 0/1 |
| `.agents/skills/ws-shared/scripts/workflow_state.cjs` | Pipeline + skip-aware pre-advance |
| `.agents/skills/ws-shared/setup.md` | Bootstrap from `{plansDir}/index.json` |
| `.agents/skills/ws-plan-to-tasks/SKILL.md` | Dispatch only when `enableDag: true` |
| `.agents/skills/ws-implement-tasks/SKILL.md` | Indexed plan reads |
| `.agents/skills/ws-testing/SKILL.md` | Machine probe before auto-skip |
| `.agents/skills/ws-write-plan/SKILL.md` | AC ids must be mappable |
| `FEATURES.md` | Honest dispatch wording |
| `test/test-artifact-economy.js` | Dispatch recipe assertions |
| `test/test-enable-dag.js` | Sequential stub recipe |
| `test/test-workflow-state-contract.js` | Skip + lite artifact maps |
| `test/test-runtime-portability.js` | Probe cited in testing skill |

---

### Task 1: Skip-aware pre-advance

**Files:** `workflow_state.cjs`, `test-workflow-state-contract.js`

- [ ] Write failing tests: interview skip → pre-advance 3 without `step-02`; testing skip → pre-advance 8 without testing report; lite pre-advance 4 uses `step-06` review; standard pre-advance 4 requires `plan.index.json` + exec stub.
- [ ] Implement `requiredAdvanceArtifact(pipeline, next, state)` and pass `pipeline` into `validateSnapshot`.
- [ ] Run `node test/test-state-observability.js` and confirm pass.

### Task 2: STEP-DISPATCH + ARTIFACTS + PROTOCOLS

- [ ] Step 0 `ac_ledger.cjs init` after register.
- [ ] Step 1 `plan_index.cjs build`; simple path writes sequential DAG and skips 2+3.
- [ ] Step 2 skip vs `force_interview`; rebuild index with `--draft` after interview.
- [ ] Step 3: `enableDag: false` → `write_sequential_dag.cjs` + `finish --status skipped --reason dag-disabled`; true → `ws-plan-to-tasks`.
- [ ] Step 4: indexed reads.
- [ ] Step 7: `probe_test_surface.cjs` before auto-skip.
- [ ] ARTIFACTS rows for `plan.index.json`, `ac-ledger.json`, `run.json`.
- [ ] Assert recipes in `test-artifact-economy.js` and `test-enable-dag.js`.

### Task 3: Pipeline skills + lite + setup + FEATURES

- [ ] `ws-plan-to-tasks`: orch owns sequential stub when DAG off.
- [ ] `ws-implement-tasks` / `ws-testing` / `ws-write-plan` contract lines.
- [ ] Lite Step 0/1 recipes.
- [ ] `setup.md` discovery: `index.json` or `rebuild-index`, not N `*.state.md` reads.
- [ ] Trim `ws-shared/AGENTS.md` to ≤ 14,000 B LF.
- [ ] FEATURES: orch emits ledger/index; default Step 3 is a script stub.

### Task 4: Verify

- [ ] `node test/test-artifact-economy.js`
- [ ] `node test/test-enable-dag.js`
- [ ] `node test/test-state-observability.js`
- [ ] `node test/test-context-budget.js`
- [ ] `node test/test-runtime-portability.js`
- [ ] `python .agents/skills/ws-check-workflows/scripts/check_workflows.py`
- [ ] `npm run generate-integrity && npm run verify-integrity` after hashed skill edits

**Deferred:** unique Node runtime for remaining `.py`; default phase gates; default parallel verify/review.
