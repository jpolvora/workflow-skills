---
id: null
slug: spec-dor-tdd-refinement-hardening
title: "Harness: Spec Creation Hardening with Definition of Ready, Validation Notes, and TDD Execution Protocol"
source: local
specDate: 2026-08-27
---

# Specification — Harness: Spec Creation Hardening with Definition of Ready, Validation Notes, and TDD Execution Protocol

## Description

Harden the specification authoring, refinement, and execution pipeline across workflow skills by integrating a formal Definition of Ready (DoR), explicit Validation and Observation Notes, and a Test-Driven Development (TDD) execution protocol.

Currently, specifications authored via `ws-write-spec` and formatted according to `ws-spec-format` structure high-level descriptions and acceptance criteria, but lack explicit failure-mode contracts, observation criteria, and pre-implementation readiness gates. Consequently, downstream implementation (`ws-implement-tasks`) may write code before verifying test failure baselines, and plan interrogation (`ws-interview`) lacks a formalized checklist to audit whether tasks define both success and failure states.

This enhancement extends `ws-spec-format` and `ws-write-spec` to require Definition of Ready (DoR) gates and Validation & Observation Notes (including negative and failing test cases), empowers `ws-interview` to interrogate plans against DoR criteria, and updates `ws-implement-tasks` and `ws-verify-plan` to enforce a strict TDD lifecycle:
`Task Goal -> Failing Tests (Red) -> Implementation that corrects the test (Green) -> Acceptance Criteria Verification -> Definition of Ready Satisfaction`.

### Design Intent

- **TDD Contract as Ground Truth:** High-scoring, regression-free autonomous implementations require deterministic test baselines where failing scenarios are defined up front before code modifications occur.
- **Readiness Before Execution:** Introducing a structured Definition of Ready (DoR) ensures that ambiguous requirements, missing edge cases, and unbounded scopes are caught during authoring and plan grilling rather than mid-implementation.
- **Backward Compatibility:** Existing historical specs continue to pass under compat mode (`--mode=compat`), while new specs enforce DoR and Validation Notes under authoring mode (`--mode=authoring`).
- **Lean Meta-Instruction:** Keep skill instruction files (`SKILL.md`) compact and modular per `SKILL_AUTHORING.md` guidelines, delegating detailed schema validation to reusable helper scripts.

## Acceptance Criteria

- AC1: `ws-spec-format/FORMAT.md` documents required `## Definition of Ready (DoR)` and `## Validation & Observation Notes` sections with standard table schemas and checklist items.
- AC2: `ws-spec-format/scripts/validate_spec.cjs` in `--mode=authoring` validates that new specs include non-empty `## Definition of Ready (DoR)` and `## Validation & Observation Notes` sections.
- AC3: `ws-write-spec/SKILL.md` Agentic Reformulation Protocol instructs agents to draft atomic ACs, negative failure scenarios, observation notes, and DoR readiness checklists.
- AC4: `ws-interview/SKILL.md` grilling protocol audits draft plans against the spec Definition of Ready, registering gaps when tasks lack failing test baselines.
- AC5: `ws-implement-tasks/SKILL.md` build mode executes the TDD cycle by authoring failing tests first before applying minimal code corrections.
- AC6: `ws-verify-plan/SKILL.md` verifies both positive acceptance criteria compliance and negative test scenario coverage prior to advancing the pipeline.
- AC7: `ws-spec-format/scripts/validate_spec.cjs` preserves `--mode=compat` for historical specs without breaking backwards compatibility.
- AC8: Unit and integration tests in `test/test-spec-dor-tdd.js` and `test/test-validate-spec.js` verify authoring validation, DoR checking, and TDD execution rules.
- AC9: Harness integrity checks (`ws-check-harness` and `npm test`) pass with zero errors across all updated skills and test suites.

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Clear problem statement, system boundaries, and explicit out-of-scope declarations | Inspected in `## Description` and `## Out of Scope` |
| Atomic Criteria | Acceptance criteria are deterministic, enumerable, and non-composite | Validated via `validate_spec.cjs` regex and rules |
| Failure Modes Defined | Negative test cases and expected failure states are explicitly articulated | Documented under `### Negative & Failing Test Scenarios` |
| Observation Telemetry | Logging, signals, and verification commands are declared | Documented under `## Validation & Observation Notes` |
| Zero Open Blockers | All assumptions have chosen defaults and no unresolved blocking questions remain | Validated via `## Assumptions & Open Questions` table |

## Validation & Observation Notes

### Telemetry & Observable Signals

- **Authoring Validator Output:** `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring <spec>` outputs structured PASS/FAIL diagnostic messages.
- **TDD Test Baselines:** Test runners (e.g. `npm test`) emit non-zero exit codes when executing new negative/failing tests against unmodified codebases, followed by zero exit codes after implementation.
- **Verification Scoring:** `ws-verify-plan` links observed test artifacts and AC ledger evidence to produce verified scores without manual score authoring.

### Negative & Failing Test Scenarios

- **Missing DoR Section:** When a new spec authored under `--mode=authoring` omits `## Definition of Ready (DoR)`, `validate_spec.cjs` fails with exit code 1 and emits `Required section is missing: ## Definition of Ready (DoR)`.
- **Empty Observation Notes:** When a spec contains `## Validation & Observation Notes` with only placeholder text, `validate_spec.cjs` fails with exit code 1.
- **TDD Inversion Baseline:** When implementing a feature task, `ws-implement-tasks` runs the newly created test suite before code modification; if the test suite passes prematurely, the task flags a false-positive test hazard.

## Notes

- Upstream developer workflow: run `npm run generate-integrity`, `npm test`, and `ws-check-harness` before submitting pull requests.
- Progressive disclosure: schemas and helper utilities reside under `ws-spec-format/scripts/` to maintain lean `SKILL.md` instruction files.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Forcing retroactive DoR updates on historical specs | Historical specs are preserved under `--mode=compat` to prevent churn on frozen specifications |
| Language-specific TDD runner frameworks | Testing harnesses remain agent- and framework-agnostic via `config.json.verification` aliases |
| Replacing existing FSM orchestrator states | TDD hardening operates within existing step contracts (`ws-implement-tasks` Step 4, `ws-verify-plan` Step 5) without altering FSM state definitions |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Validation mode default | Keep `--mode=compat` as default for CLI invocations without flags | Ensures backward compatibility with existing external workflows while enforcing strict rules in `ws-write-spec` via `--mode=authoring` | y |
| DoR section requirement | Require DoR and Validation Notes for new authoring mode | Guarantees high quality and testability for all newly authored specifications | y |
| TDD execution enforcement | Instruct implementer to verify test failure prior to code edits | Eliminates false-positive test passes and guarantees test efficacy | y |
