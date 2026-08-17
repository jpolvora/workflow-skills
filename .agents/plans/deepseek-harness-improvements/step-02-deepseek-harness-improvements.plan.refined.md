---
slug: deepseek-harness-improvements
title: "Implement DeepSeek Harness suggestions to improve workflow-skills"
status: "plan refined ok"
---

# step-02 - DeepSeek Harness-inspired improvements (refined)

> Refined by ws-interview. This file mirrors the step-01 plan structure with interview resolutions applied. `step-01-deepseek-harness-improvements.plan.md` is left untouched. Only the step-01 working plan (sections 0-8) is restated below with resolved decisions; the appended `## Interview registry` captures every audit finding.

## 0. Summary & Business Rules

Adopt the highest-value operational practices from the DeepSeek Harness (DSH) checkout into this package: decision records with mandatory alternatives, versioned/reject-old workflow state, revision-guarded goal loops with fail-closed blocking, first-class background jobs with kill/collect, loop-hygiene guards (repeat-tool, step timeout), keyless transcript snapshots, an effective-config dump, provider parity tests, and single-home-of-fact doc checks.

Business rules: no compatibility shims for old on-disk state (reject loud); non-trivial changes update an owning decision note in the same PR; goals fail closed after N rounds, never silently overwrite; dispatches are killable; tests replay without an API key.

Security mitigations: none new (no auth/tenancy surface); state and note gates give deterministic, machine-checked failures over silent corruption.

## 1. Definition of Ready & Scope

Assumptions:
- Layer targets (config.json stack): skills-sot (.agents/skills), installer-cli (bin), tests (test). No database, no frontend framework, no i18n locales.
- State files: `{us-dir}/state.yaml` written by ws-spec-to-pr/scripts/update_state.py, validated by validate_state.py.
- Goal skills are agent-driven SKILL.md contracts + evals JSON (no runtime loop code exists - confirmed: ws-goal-loop/SKILL.md is a contract skeleton with sentinel/report conventions only, no imperative loop engine); guards are implemented as documented contract + orchestration driver checks + simulation coverage.
- Decision-note gate joins ws-check-harness as a new phase.

Acceptance Criteria: AC1-AC16 (see spec specs/deepseek-harness-improvements.spec.md).

Out of scope: DSH plugin/Cordis runtime, session log infra, TUI/Web UI, zh i18n, old-format compat.

## 2. Technical Design & Architecture

- State hardening (W2): state.yaml gains monotonic stateVersion; update_state.py serializes nested maps with format_inline_dict / parses with parse_inline_dict (memory trap [2026-08-13]); duplicate completedSteps unioned with stderr warning; validate_state.py rejects unknown/older stateVersion (exit 1).
- Resume gate (W3/W9): orchestrator resume runs a mechanical pre-check - git rev-list --count origin/{base}..HEAD must be > 0, else mark-complete/stop instead of re-implementing (memory trap stale-orch-resume).
- Goal guards (W3): ws-goal-loop / ws-goal-fix-pr contracts + evals: revision-guarded updates, blocked only after >=3 consecutive rounds with same concrete reason, resume re-arms. Enforcement is contract wording + evals JSON + orchestration-driver checks + workflow simulation - no new runtime loop code (matches existing contract-only architecture).
- Jobs & hygiene (W4/W5): dispatch driver records job handles as plain files under `{us-dir}` jobs registry (portable, no host process primitives - consistent with ws-goal-loop file-based sentinel under `{us-dir}/.runtime` and ws-multi-spec runId batch tracking); exposes list/kill; repeat-tool guard and per-step timeout in orchestrator dispatch + fix-pr heartbeat loop.
- Notes & docs (W1/W9): docs/decisions/ tree under repo root (proposed|implemented|rejected, archived frozen); new ws-check-harness phase for note format/links + single-home-of-fact checks.
- Verification/DX (W6/W7/W8): snapshot record/replay scripts (record needs key, replay keyless) over step artifacts; ws-doctor --dump-config effective tree; one provider-parity scenario across github/azure/local.

Invariant checks (config.json.invariants): commitPlanFilesOnlyAtStep8 stays (plans never staged before Step 8); no EF/tenancy/migrations invariants apply (config.invariants.migrationsCliOnly/efOnlyInInfrastructure/tenancyViaGlobalQueryFilters etc. are false).

## 3. Step-by-Step Plan

### Step 1 - State integrity + resume gate (P1, safety first)
- Actions: version state.yaml (add stateVersion), fix nested-dict serialization in update_state.py, union duplicate completedSteps, add version reject in validate_state.py; add resume pre-check (unique commits vs base) to orchestrator resume flow.
- Files: .agents/skills/ws-spec-to-pr/scripts/update_state.py, scripts/validate_state.py, orchestrator resume section (ws-spec-to-pr state/bootstrap scripts), test/test-update-state-yaml.js (new cases: version reject, nested dict round-trip, duplicates union), test/ resume-gate case.
- Engineering checks: node test/test-update-state-yaml.js; npm run test.

### Step 2 - Goal loop + jobs + loop hygiene (P1/P3)
- Actions: update ws-goal-loop and ws-goal-fix-pr SKILL.md contracts + evals (revision guard, >=3-round blocked, resume re-arm); add job registry (list/kill) to dispatch driver (ws-implement-tasks, ws-multi-spec) as plain files under `{us-dir}`; add repeat-tool guard and per-step timeout to orchestrator dispatch and fix-pr loop.
- Files: .agents/skills/ws-goal-loop/SKILL.md, evals/evals.json; .agents/skills/ws-goal-fix-pr/SKILL.md, evals/evals.json; ws-implement-tasks / ws-multi-spec dispatch docs+scripts; workflow simulation fixtures.
- Engineering checks: run goal evals; python .agents/skills/ws-check-workflows/scripts/check_workflows.py -> 0 critical (FSM/dispatch changed).

### Step 3 - Decision notes + single-home-of-fact (P2)
- Actions: create docs/decisions/ lifecycle tree (repo root) + NOTES.md format contract; archive manifest for frozen notes; add AGENTS.md rule (owning note in same PR); add ws-check-harness phase for note format/links and one-home fact checks (path tokens/tools.md/plans dirs); seed the first decision note (this adoption decision).
- Files: docs/decisions/** (new, under repo root), root AGENTS.md, .agents/skills/ws-shared/AGENTS.md, tools.md, ws-check-harness phase scripts/tests, test/test-agent-notes.js (new), test/ one-home case.
- Engineering checks: ws-check-harness (new phase passes, 0 critical); npm run test.

### Step 4 - Verification & diagnostics (P4)
- Actions: add snapshot record/replay (record runs one real pipeline example manually; replay is keyless) covering step-06 review, step-01 plan, delivery HTML with LF/portable fixtures; add ws-doctor --dump-config; add provider-parity scenario test.
- Files: scripts/ or bin/ snapshot tooling + fixtures, package.json scripts, .agents/skills/ws-doctor/scripts/doctor.js, test/test-ws-doctor.js, provider scripts + test/test-provider-parity.js.
- Engineering checks: node bin/cli.js --check; keyless replay run (CI runs keyless replay only); npm run test.

## 4. Permissions, Tenancy & i18n

- RBAC/tenancy: N/A - no tenancy field, no auth surface in this package (config.domain.tenancyField empty; invariants tenancyViaGlobalQueryFilters false).
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
| AC13 | Keyless snapshot replay over recorded step-artifact fixtures (cross-platform; CI runs replay only) |
| AC14 | test/test-ws-doctor.js: --dump-config precedence assertions |
| AC15 | test/test-provider-parity.js: identical step-00 output across github/azure/local |
| AC16 | ws-check-harness one-home drift test (duplicated token path via second home -> gate failure) |

## 6. Invariants (Do Not Violate)

- commitPlanFilesOnlyAtStep8 - workflows never stage `{plansDir}` artifacts before Step 8 / lite Step 4.
- Portability: no host/IDE product names in skill bodies or gates; no host process primitives for the job registry (plain files under `{us-dir}` only); consumer paths resolve from config.
- Integrity: any change to hashed skill content -> npm run generate-integrity + verify-integrity in the same commit.
- Hub drift: root AGENTS.md <-> ws-shared/AGENTS.md stay in sync when routing/index changes.
- en-us only for skill bodies, gates, banners, harness docs.
- Decision notes live under docs/decisions/ (repo root) - kept separate from consumer-owned `{sharedDir}` and from `{plansDir}` workflow artifacts (never staged before Step 8).

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected (skills-sot / installer-cli / tests).
- [ ] npm run test green (installer + integrity + tree verification).
- [ ] npm run generate-integrity && npm run verify-integrity (exit 0) for hashed content.
- [ ] ws-check-harness 0 critical (incl. new note + one-home phases).
- [ ] ws-check-workflows 0 critical (FSM/dispatch/jobs changes).
- [ ] node bin/build-site.js / npm run build-site:bump when catalog/version changes.
- [ ] Root AGENTS.md + ws-shared/AGENTS.md + autoload.md synced.
- [ ] Owning decision note updated in the same PR (AC2).

## 8. Open Questions - RESOLVED

1. Priority phasing: RESOLVED - ship P1 first (State integrity + resume gate, and goal/resume contract guards), then a follow-up PR for P2-P4. Rationale: spec Notes already fixes the P1->P4 priority; surgical-scope precedence favors small, verifiable diffs. Evidence: specs/deepseek-harness-improvements.spec.md Notes; root AGENTS.md §1.
2. Decision-note location: RESOLVED - docs/decisions/ under repo root. Rationale: AC1 literal names docs/decisions/; no ADR dir exists yet in this package (glob empty); docs/ tree is the single home for harness/site content while `{sharedDir}` is consumer-owned gitignored runtime data; keeps notes separate from workflow artifacts and consumer config. Evidence: canonical spec AC1; glob docs/**/decisions/** empty; ws-shared/AGENTS.md Consumer-owned table.
3. Snapshot recorder key policy: RESOLVED - CI runs keyless replay only; record is an explicit manual tool run (one real pipeline example, requires model key). Rationale: AC13 mandates the suite runs without an API key, so any CI invocation must be replay-only. Evidence: canonical spec AC13.
4. Job registry: RESOLVED - plain files under `{us-dir}` (portable, no host process handles). Rationale: portability rule forbids host-specific primitives; ws-goal-loop already uses a file-based sentinel under `{us-dir}/.runtime` (`sentinel.pid`) and ws-multi-spec tracks batch runId; file registry is the established pattern. Evidence: ws-goal-loop/SKILL.md RUNTIME_DIR/Track rules; tools.md path-token `{us-dir}`; root AGENTS.md portability rule.
5. Goal revision guard: RESOLVED - agent-contract + evals enforcement only (SKILL.md wording + evals JSON + orchestration-driver checks + simulation), no runtime loop code introduced. Rationale: ws-goal-loop is already contract-only (parameters + loop skeleton + sentinel conventions; no imperative loop engine); adding runtime loop code would conflict with surgical scope and the existing architecture. Evidence: ws-goal-loop/SKILL.md full body; evals/evals.json; plan §1 assumption.

## Interview registry

| id | class | section | gap | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|--------|-----------|-----------------|----------|
| G-01 | non-blocking | 8.1 | Phasing: ship all 4 steps in one PR vs P1-first | resolved | Ship P1 (state integrity + resume gate, goal/resume contract guards) first, then a follow-up PR for P2-P4. Matches spec priority phasing and surgical-scope rule. | project | specs/deepseek-harness-improvements.spec.md Notes (P1->P4 priority); root AGENTS.md §1 Surgical scope |
| G-02 | non-blocking | 8.2 | Decision-note location: docs/decisions/ vs `{sharedDir}/notes/` | resolved | docs/decisions/ under repo root. No ADR dir exists yet; keep notes separate from consumer-owned gitignored `{sharedDir}` and from workflow artifacts. | project | canonical spec AC1 (`docs/decisions/` literal); glob docs/**/decisions/** empty; ws-shared/AGENTS.md Consumer-owned table; tools.md path tokens |
| G-03 | non-blocking | 8.3 | Snapshot recorder needs a real pipeline run (key); replay must be keyless | resolved | CI runs keyless replay only; record is an explicit manual tool run documented for devs. Suite always runs without an API key. | project | canonical spec AC13 (`suite runs without an API key`); plan §3 Step4 |
| G-04 | non-blocking | 8.4 | Job registry: plain files under `{us-dir}` vs process handles | resolved | Plain files under `{us-dir}` jobs registry. No host process primitives (portability); consistent with ws-goal-loop file-based sentinel and ws-multi-spec runId tracking. | project | ws-goal-loop/SKILL.md RUNTIME_DIR + sentinel.pid; tools.md `{us-dir}`; root AGENTS.md portability rule |
| G-05 | non-blocking | 8.5 | Goal revision guards: agent-contract + evals vs (nonexistent) runtime loop code | resolved | Enforcement is SKILL.md contract wording + evals JSON + orchestration-driver checks + workflow simulation; no runtime loop code introduced. Matches existing contract-only architecture. | project | ws-goal-loop/SKILL.md (contract skeleton only); goal-loop & goal-fix-pr evals/evals.json; plan §1 assumption |
| G-06 | non-blocking | 2 | Plan §2 invariant claims: config.invariants entries beyond commitPlanFilesOnlyAtStep8 | resolved | Only commitPlanFilesOnlyAtStep8 is on; EF/tenancy/migration invariants all false - plan already reflects this (`no EF/tenancy/migrations invariants apply`). No code change needed. | project | .agents/skills/ws-shared/config.json invariants block |
| G-07 | non-blocking | 3 | Step 2 jobs registry must be file-based and portable (portability rule) | resolved | Jobs registry recorded as plain files under `{us-dir}`; list/kill read/write the registry, no host process handles. | project | ws-goal-loop sentinel.pid precedent; root AGENTS.md portability rule |
| G-08 | non-blocking | 6 | Decision-note location must not collide with the no-`{plansDir}`-before-Step-8 invariant | resolved | docs/decisions/ is repo-root product content (not under `{plansDir}`), so it is committed in the owning PR; workflow artifacts still only staged at Step 8. | project | root AGENTS.md no-`{plansDir}`-before-Step8; AC2 owning-note-in-same-PR |

> Resolution sources: all 8 gaps resolved from project evidence (canonical/step-00 spec ACs, config.invariants, existing skill contract structure, path-token & portability contract). No needs_user emitted (autoMode / workflow interview); no blocking gaps remain unresolved.
