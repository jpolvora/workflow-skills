---
slug: deepseek-harness-improvements
title: "Implement DeepSeek Harness suggestions to improve workflow-skills"
status: "plan to be refined"
---

# step-01 - DeepSeek Harness-inspired improvements

## 0. Summary & Business Rules

Adopt the highest-value operational practices from the DeepSeek Harness (DSH) checkout into this package: decision records with mandatory alternatives, versioned/reject-old workflow state, revision-guarded goal loops with fail-closed blocking, first-class background jobs with kill/collect, loop-hygiene guards (repeat-tool, step timeout), keyless transcript snapshots, an effective-config dump, provider parity tests, and single-home-of-fact doc checks.

Business rules: no compatibility shims for old on-disk state (reject loud); non-trivial changes update an owning decision note in the same PR; goals fail closed after N rounds, never silently overwrite; dispatches are killable; tests replay without an API key.

Security mitigations: none new (no auth/tenancy surface); state and note gates give deterministic, machine-checked failures over silent corruption.

## 1. Definition of Ready & Scope

Assumptions:
- Layer targets (config.json stack): skills-sot (.agents/skills), installer-cli (bin), tests (test). No database, no frontend framework, no i18n locales.
- State files: {us-dir}/state.yaml written by ws-spec-to-pr/scripts/update_state.py, validated by validate_state.py.
- Goal skills are agent-driven SKILL.md contracts + evals JSON (no runtime loop code exists); guards are implemented as documented contract + orchestration driver checks + simulation coverage.
- Decision-note gate joins ws-check-harness as a new phase.

Acceptance Criteria: AC1-AC16 (see spec specs/deepseek-harness-improvements.spec.md).

Out of scope: DSH plugin/Cordis runtime, session log infra, TUI/Web UI, zh i18n, old-format compat.

## 2. Technical Design & Architecture

- State hardening (W2): state.yaml gains monotonic stateVersion; update_state.py serializes nested maps with format_inline_dict / parses with parse_inline_dict (memory trap [2026-08-13]); duplicate completedSteps unioned with stderr warning; validate_state.py rejects unknown/older stateVersion (exit 1).
- Resume gate (W3/W9): orchestrator resume runs a mechanical pre-check - git rev-list --count origin/{base}..HEAD must be > 0, else mark-complete/stop instead of re-implementing (memory trap stale-orch-resume).
- Goal guards (W3): ws-goal-loop / ws-goal-fix-pr contracts + evals: revision-guarded updates, blocked only after >=3 consecutive rounds with same concrete reason, resume re-arms.
- Jobs & hygiene (W4/W5): dispatch driver records job handles (files under {us-dir} jobs registry), exposes list/kill; repeat-tool guard and per-step timeout in orchestrator dispatch + fix-pr heartbeat loop.
- Notes & docs (W1/W9): docs/decisions/ tree (proposed|implemented|rejected, archived frozen); new ws-check-harness phase for note format/links + single-home-of-fact checks.
- Verification/DX (W6/W7/W8): snapshot record/replay scripts (record needs key, replay keyless) over step artifacts; ws-doctor --dump-config effective tree; one provider-parity scenario across github/azure/local.

Invariant checks (config.json.invariants): commitPlanFilesOnlyAtStep8 stays (plans never staged before Step 8); no EF/tenancy/migrations invariants apply.

## 3. Step-by-Step Plan

### Step 1 - State integrity + resume gate (P1, safety first)
- Actions: version state.yaml (add stateVersion), fix nested-dict serialization in update_state.py, union duplicate completedSteps, add version reject in validate_state.py; add resume pre-check (unique commits vs base) to orchestrator resume flow.
- Files: .agents/skills/ws-spec-to-pr/scripts/update_state.py, scripts/validate_state.py, orchestrator resume section (ws-spec-to-pr state/bootstrap scripts), test/test-update-state-yaml.js (new cases: version reject, nested dict round-trip, duplicates union), test/ resume-gate case.
- Engineering checks: node test/test-update-state-yaml.js; npm run test.

### Step 2 - Goal loop + jobs + loop hygiene (P1/P3)
- Actions: update ws-goal-loop and ws-goal-fix-pr SKILL.md contracts + evals (revision guard, >=3-round blocked, resume re-arm); add job registry (list/kill) to dispatch driver (ws-implement-tasks, ws-multi-spec); add repeat-tool guard and per-step timeout to orchestrator dispatch and fix-pr loop.
- Files: .agents/skills/ws-goal-loop/SKILL.md, evals/evals.json; .agents/skills/ws-goal-fix-pr/SKILL.md, evals/evals.json; ws-implement-tasks / ws-multi-spec dispatch docs+scripts; workflow simulation fixtures.
- Engineering checks: run goal evals; python .agents/skills/ws-check-workflows/scripts/check_workflows.py -> 0 critical (FSM/dispatch changed).

### Step 3 - Decision notes + single-home-of-fact (P2)
- Actions: create docs/decisions/ lifecycle tree + NOTES.md format contract; archive manifest for frozen notes; add AGENTS.md rule (owning note in same PR); add ws-check-harness phase for note format/links and one-home fact checks (path tokens/tools.md/plans dirs); seed the first decision note (this adoption decision).
- Files: docs/decisions/** (new), root AGENTS.md, .agents/skills/ws-shared/AGENTS.md, tools.md, ws-check-harness phase scripts/tests, test/test-agent-notes.js (new), test/ one-home case.
- Engineering checks: ws-check-harness (new phase passes, 0 critical); npm run test.

### Step 4 - Verification & diagnostics (P4)
- Actions: add snapshot record/replay (record runs one real pipeline example; replay is keyless) covering step-06 review, step-01 plan, delivery HTML with LF/portable fixtures; add ws-doctor --dump-config; add provider-parity scenario test.
- Files: scripts/ or bin/ snapshot tooling + fixtures, package.json scripts, .agents/skills/ws-doctor/scripts/doctor.js, test/test-ws-doctor.js, provider scripts + test/test-provider-parity.js.
- Engineering checks: node bin/cli.js --check; keyless replay run; npm run test.

## 4. Permissions, Tenancy & i18n

- RBAC/tenancy: N/A - no tenancy field, no auth surface in this package.
- i18n: N/A - frontend i18n locales are empty; repo language is en-us only (portability rule).

## 5. Test Coverage

| AC | Test case |
|----|-----------|
| AC1-AC2 | test/test-agent-notes.js: format gate, status/lifecycle agreement, link checks; ws-check-harness phase |
| AC3 | Archive frozen-manifest test (edit rejected) |
| AC4-AC6 | test/test-update-state-yaml.js: version reject (exit 1), nested-dict round-trip, duplicates union, artifact-reproducibility check |
| AC7-AC8 | ws-goal-loop/evals/evals.json + ws-goal-fix-pr/evals/evals.json: stale-revision conflict, 3-round blocked, resume re-arm |
| AC9 | Resume-gate test: 0 unique commits -> mark-complete/stop path |
| AC10-AC12 | Workflow simulation fixtures (ws-check-workflows): job list/kill, repeat-tool stop, step timeout |
| AC13 | Keyless snapshot replay over recorded step-artifact fixtures (cross-platform) |
| AC14 | test/test-ws-doctor.js: --dump-config precedence assertions |
| AC15 | test/test-provider-parity.js: identical step-00 output across github/azure/local |
| AC16 | ws-check-harness one-home drift test (duplicated token path via second home -> gate failure) |

## 6. Invariants (Do Not Violate)

- commitPlanFilesOnlyAtStep8 - workflows never stage {plansDir} artifacts before Step 8 / lite Step 4.
- Portability: no host/IDE product names in skill bodies or gates; consumer paths resolve from config.
- Integrity: any change to hashed skill content -> npm run generate-integrity + verify-integrity in the same commit.
- Hub drift: root AGENTS.md <-> ws-shared/AGENTS.md stay in sync when routing/index changes.
- en-us only for skill bodies, gates, banners, harness docs.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / installer-cli / tests).
- [ ] npm run test green (installer + integrity + tree verification).
- [ ] npm run generate-integrity && npm run verify-integrity (exit 0) for hashed content.
- [ ] ws-check-harness 0 critical (incl. new note + one-home phases).
- [ ] ws-check-workflows 0 critical (FSM/dispatch/jobs changes).
- [ ] node bin/build-site.js / npm run build-site:bump when catalog/version changes.
- [ ] Root AGENTS.md + ws-shared/AGENTS.md + autoload.md synced.
- [ ] Owning decision note updated in the same PR (AC2).

## 8. Open Questions

- Priority: ship all 4 steps in one PR vs P1-only first (recommended: P1 first, then 2-4).
- Decision-note location: docs/decisions/ (proposed) vs {sharedDir}/notes/ - reviewer input wanted.
- Snapshot recorder runs one real pipeline example (needs model key); replay is keyless - confirm CI runs replay only.
- Job registry: plain files under {us-dir} (portable) vs process handles - confirm no host-specific primitives.
- Goal revision guard is agent-contract + evals only (no runtime loop code exists) - accept contract-level enforcement?