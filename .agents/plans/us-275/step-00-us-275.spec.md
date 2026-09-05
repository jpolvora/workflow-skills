---
id: 275
slug: us-275
title: "ws-spec-to-pr: orquestrador implementou sem plano/refino — autoMode não deve pular Steps 1–3"
source: github
specDate: 2026-09-03
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/275"
labels:
  - bug
  - documentation
  - enhancement
step: 0
workflowId: us-275-20260904T020000Z
status: active
startedAt: "2026-09-04T01:57:57.989Z"
endedAt: "2026-09-04T01:57:57.989Z"
acRefs: []
---
# Specification — ws-spec-to-pr: orquestrador implementou sem plano/refino — autoMode não deve pular Steps 1–3

## Description

Harden the `ws-spec-to-pr` standard orchestrator contract so `autoMode` never authorizes skipping planning Steps 1–3, editing product code before required plan artifacts exist, or inferring a "small bug on an existing branch" shortcut. Today the FSM and `gates.md` already state that `autoMode` only auto-selects gate index 0 and does not remove steps, but a host orchestrator session skipped Step 0 finish, bypassed `validate_state.cjs --pre-advance`, ignored classifier `runInterview: true` / `execMode: dag`, and edited product files directly while `currentStep` remained 0.

Scope covers portable harness docs and enforcement hooks only:

- **Documentation guardrails** in `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `ws-shared/gates.md`, and `ws-shared/setup.md` with an explicit **autoMode ≠ skip planning** table and init banner text.
- **Fail-closed pre-implementation guard** before the first Step 4 `dispatch-agent`: extend or complement `validate_state.cjs` (and orch call sites) so advance to Step 4 is blocked when `completedSteps` lacks 1 and 3 (or documented skip reasons) or when `step-01-*.plan.md`, `plan.index.json`, and `step-03-*.plan.exec.md` are missing per `ARTIFACTS.md` advance-to-4 prerequisites.
- **No-inference rule** for child work items on an existing feature branch: the workflow slug (e.g. `us-{bug-id}`) always runs the full planning chain unless the user explicitly overrides.
- **Conformance test / dogfood scenario** documenting expected artifact order under `autoMode`.

Out of runtime scope: changing consumer product code, host-private tool bindings, or relaxing verify-score gates. Orchestrator product edits remain Tier 3 inline-isolated only; Step 4+ implementation stays on `dispatch-agent`.

## Acceptance Criteria

- AC1: `ws-spec-to-pr/SKILL.md` and `STEP-DISPATCH.md` each contain a dedicated **autoMode ≠ skip planning** subsection with a two-column table listing what `autoMode` does (auto gate index 0, continuous step boundaries) vs what it never does (skip Steps 1–3, edit product code before `step-01-*.plan.md`, ignore classifier `runInterview` / `execMode`).
- AC2: `ws-shared/gates.md` and `ws-shared/setup.md` state that an existing parent feature branch plus a child bug/task id does **not** waive Steps 1–3 for the child slug; only an explicit user override may shorten planning.
- AC3: `setup.md` init banner (or equivalent bootstrap output) prints, when `autoMode: true`, a one-line reminder: gates are automatic, FSM 0→9 stays intact, no product code until Step 4 after plan artifacts exist on disk.
- AC4: Before the first Step 4 `dispatch-agent`, the orchestrator runs a fail-closed guard (`validate_state.cjs --pre-advance 4` or a documented `pre-implement-guard` wrapper) that exits non-zero when advance-to-4 prerequisites from `ARTIFACTS.md` are missing; stderr lists missing artifacts and references HS-5.
- AC5: When the guard fails, the orchestrator does not invoke product-file edits or Step 4 dispatch; it stops with HS-5 and names the missing files (`step-01-*.plan.md`, `plan.index.json`, `step-03-*.plan.exec.md`, interview refined plan when required, etc.).
- AC6: A documented dogfood conformance case (test fixture or `ws-spec-to-pr` docs) asserts that under `autoMode` with `workflowType: standard`, `step-01-{slug}.plan.md` exists before any product-path edit outside `{plansDir}` / workflow state for that slug.
- AC7: `ws-check-harness` and existing mechanical gates (`check_duplicates`, `measure_harness`, `check_shell_quoting`, `check_pipeline_handoff`) still exit 0 after the doc and script changes.
- AC8: No host product names, consumer repo names, or private paths appear in shipped skill bodies, gates, or templates added by this work (generic wording only).

## Original Issue Context

Source: github, id: 275, url: https://github.com/jpolvora/workflow-skills/issues/275, state: open, labels: bug, documentation, enhancement.

Human-authored summary (Portuguese, filed on workflow-skills): during `ws-spec-to-pr` in **autoMode**, the host orchestrator skipped Steps 1–3 (plan, interview, DAG) and started product implementation (Step 4) without planning artifacts, without Step 0 `update_state finish`, and without `validate_state.cjs --pre-advance`. The agent inferred that `autoMode` + an existing feature branch + an "obvious" bug authorized coding directly, violating the FSM in `ws-spec-to-pr/SKILL.md` and `STEP-DISPATCH.md`.

Reproduction context (consumer session, anonymized in enhanced sections): standard pipeline, `autoMode: true`, `fullMode: true`, ship skipped; classifier recommended standard + DAG + `runInterview: true`; Step 0 partial artifacts existed (`step-00` spec, classify, ac-ledger, state) but `step-01`, refined plan, `plan.index.json`, exec plan/DAG, state finish, and pre-advance validation were absent while `currentStep: 0` and all board steps pending. The orchestrator edited multiple product files directly instead of `dispatch-agent` per step.

Expected contract table from the issue:

| Rule | Detail |
|------|--------|
| No plan → no code | First product commit only after Step 5 (G2-code), preceded by plan/refined plan, `plan.index.json`, exec plan/DAG, Step 4 via `ws-implement-tasks`. |
| autoMode | Run full FSM 0→9; only gates are automatic (index 0). |
| No inference | Existing branch, child bug, or "looks small" do not skip Steps 1–3. |
| Ambiguity | HS-1 / user-gate; in autoMode log and follow documented recommendation, never jump to code. |
| Orchestrator | No product edits except Tier 3 inline isolated; use `dispatch-agent` per step. |

Proposed improvements from the issue: (1) explicit guardrail docs, (2) fail-closed pre-Step-4 guard in `validate_state.cjs`, (3) no child-bug shortcut on existing branches, (4) init banner checklist, (5) dogfood conformance test.

Severity: **High** — process violation yields untracked diffs, ignores interview/DAG when classifier requires them, and erodes trust in full-auto runs.

### Prior Work Sweep

Sweep ran 2026-09-03: `sweep_prior_work.py --issue 275 --keywords autoMode orquestrador plan refino`.

- PR search `#275`: one merged hit PR #186 ("feat: opt-in mutation testing gate in Step 7") — unrelated to autoMode planning skip; no open PR for issue 275.
- Commits: none returned for the keyword set on this repo.
- Existing docs already mention `autoMode` gate behavior in `gates.md`, `STEP-DISPATCH.md`, and `SKILL.md`, but lack the explicit **autoMode ≠ skip planning** table and pre-Step-4 fail-closed guard the issue requests.
- Implication: implement doc hardening plus `validate_state.cjs` / orch guard enforcement; no duplicate open PR.

### Design Intent

Modification of orchestrator contract and validation, not greenfield. Current design: `autoMode` disables interactive gates and One Step Per Turn halting (`gates.md`, `STEP-DISPATCH.md`) but still requires the full FSM and artifact prerequisites in `ARTIFACTS.md`. `validate_state.cjs --pre-advance <N>` is documented as the fail-closed advance check (`SKILL.md` AC6, `PROTOCOLS.md`, `state-hygiene.md`). The regression is orchestrator inference bypassing those checks, not missing documentation alone. Intended outcome: make the prohibition unambiguous in shipped skills and block Step 4 dispatch when prerequisites are absent even under `autoMode`.

## Notes

- Touch paths: `.agents/skills/ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md` (if guard call site documented), `scripts/validate_state.cjs`, `.agents/skills/ws-shared/gates.md`, `setup.md`, optional test under `test/` or orch docs FAQ.
- Preserve portable vocabulary (`{plansDir}`, `{skillsRoot}`, `dispatch-agent`, `user-gate`); no host IDE product names in shipped bodies.
- Classifier output (`runInterview`, `execMode`) remains advisory for Step 2/3 routing but must not be used to justify skipping planning artifacts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing `defaults.minVerifyScore` or verify-score gates | Issue is planning skip, not verify bar |
| Lite orch behavior changes unless parity gap is proven | Reported on standard pipeline only |
| Consumer product code fixes | workflow-skills harness scope only |
| New host adapters or IDE-specific enforcement | Portable contract only |
| Relaxing `autoMode` to allow documented planning skip without user override | Contradicts issue intent |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Guard location | Extend `validate_state.cjs --pre-advance 4` plus orch call before Step 4 dispatch | Already the documented SoT for prerequisites | y |
| Interview skip | When Step 2 skipped with documented `interview-not-required`, refined plan not required per `ARTIFACTS.md` | Matches existing advance-to-3 table | y |
| Doc language | en-us in shipped skill bodies | Harness rule | y |
| Test surface | Documented dogfood scenario + harness green | Issue item 5; full e2e host sim out of scope | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Docs + validate_state + optional test only | Plan diff review |
| Atomic criteria | Each AC has one pass/fail check | AC ledger before Step 1 |
| Failure modes named | Guard miss, doc drift, autoMode inference | Negative scenarios below |
| Observable signals | validate_state exit code, harness audit | Validation section |
| Zero open blockers | Issue fetched, sweep recorded | step-00 issue JSON on disk |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0062-us-275.spec.md` exits 0.
- `rg -n "autoMode.*skip planning|autoMode ≠ skip planning" .agents/skills/ws-spec-to-pr .agents/skills/ws-shared` returns hits in SKILL.md, STEP-DISPATCH.md, and gates.md or setup.md.
- Fixture or doc scenario: with `autoMode: true` and missing `step-01-*.plan.md`, `validate_state.cjs --pre-advance 4` exits non-zero and lists missing artifacts.
- `npm run test` and `ws-check-harness` exit 0 after implementation.

### Negative & Failing Test Scenarios

- NS1: Orchestrator sets `autoMode: true`, finishes Step 0 partial artifacts only, attempts Step 4 dispatch → guard exits non-zero, no product edits, HS-5 message lists missing `step-01-*.plan.md` and `plan.index.json`.
- NS2: Child bug slug on existing `feat/{parent}` branch with `runInterview: true` in classify output → orchestrator must not skip interview/refined plan without documented Step 2 skip reason.
- NS3: Agent interprets `autoMode` as "skip gates and planning" → blocked by docs table and validate_state; session stops fail-closed rather than committing orphan product diff.
