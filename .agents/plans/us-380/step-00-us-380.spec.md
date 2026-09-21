---
id: 380
slug: us-380
title: increase test coverage to near 100%
source: github
specDate: 2026-09-21
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/380"
step: 0
workflowId: us-380
status: completed
startedAt: "2026-09-21T13:10:53.813Z"
endedAt: "2026-09-21T13:10:53.813Z"
acRefs: []
---
# Specification — increase test coverage to near 100%

## Description

Raise automated test coverage to near 100 percent for this Node 22 skill package. The suite runs via `npm run test` (`node test/run-tests.cjs`) across 105 `test/test-*.js` files covering upstream SoT `.agents/skills/ws-*`, installer CLI `bin/`, and authoring utilities. No line or branch coverage gate is configured today; coverage is file and behavior based.

Work: audit testable units versus existing tests, define near-100 percent with a measurable gate (file coverage plus configured line or branch thresholds via `c8` or an equivalent Node 22 tool), write a prioritized missing-test plan, then implement deterministic isolated tests until the gate passes. Tests stay fast, hermetic (temp fixtures, no repo writes, no live network, no global mutations), and order independent.

Architecture touchpoints: `test/` runner plus fixtures, `package.json` scripts, skill scripts under `.agents/skills/**/scripts/`, `bin/` entries, integrity plus `ws-check-harness`. No product behavior changes except test-only helpers and coverage wiring.

## Acceptance Criteria

- AC1: A coverage audit exists listing testable units (skills, scripts, bin entries) versus existing tests with an explicit gap list and a measurable near-100 percent definition.
- AC2: A prioritized missing-test plan exists covering gap order, test types, isolation rules, and flake guards; no test writes outside temp fixtures or the plan-approved paths.
- AC3: Missing tests per the plan are implemented and the full suite passes via `npm run test` with zero failures, flakes, or order dependencies.
- AC4: The configured coverage gate passes (file coverage complete plus line and branch thresholds met) or every uncovered line carries a written justification; the gate runs in one command.
- AC5: New tests are isolated and deterministic (temp-repo fixtures, mocked network and clocks, restored env and cwd, closed handles) and complete within the existing suite time budget plus a stated allowance.
- AC6: `npm run generate-integrity` plus `npm run verify-integrity` exit 0 and `ws-check-harness` exits 0 after test and coverage wiring edits.
- AC7: New test helpers are Node-only (`.cjs` or `.js`, explicit `node` launcher), validate file and CLI inputs, contain filesystem reads and writes inside temp or repo roots, await or handle every promise, and close all handles; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- AC8: No secrets, tokens, PATs, or personal data appear in tests, fixtures, or logs; the configured secrets review is clean.

## Original Issue Context

create a plan and implement missing tests to increase coverage

Source: https://github.com/jpolvora/workflow-skills/issues/380 (state open, labels none, assignees none, comments none).

### Prior Work Sweep

Provider sweep on 2026-09-21 (`sweep_prior_work.cjs --issue 380 --keywords test coverage missing tests`): status ok, zero commits, 30 merged PRs, no exact open PR for #380, no duplicate-risk open work. Keyword hits are testing-adjacent release work only (examples: #251 retired ws-patterns cleanup, #246 memory backends, #285 reviewer-aligned gates, #339 preview gate, #350 step baton); `#380` text search returned only merged #333 and #154. Closest in-tree relatives: `test/run-tests.cjs`, `test/test-*.js` (105 files), `package.json` scripts, `bin/generate-skill-integrity.js`, `ws-check-harness`, `ws-testing`.

### Design Intent

Modification, not greenfield. `Get-ChildItem test/test-*.js` shows 105 files and `package.json` pins `npm run test` to `node test/run-tests.cjs`, confirming the suite is intentionally custom-runner based rather than an accidental gap. Enhancement preserves the runner contract and adds a measurable coverage gate plus missing tests.

## Notes

- Near-100 percent means file-complete plus thresholds (suggested starting point: lines at or above 95 percent and branches at or above 90 percent); the plan pins final numbers.
- Coverage tooling prefers `c8` with Node 22; an equivalent with one-command gate is acceptable when justified.
- Slow or networked tests use mocks or fixtures; live `gh`, `git` remote, or marketplace calls are forbidden in tests.
- Flake guards: no wall-clock asserts without mocks, no port collisions, no shared temp names, no parallel writes to one fixture.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Product behavior changes | Tests plus coverage wiring only; behavior fixes need separate specs |
| Mutation testing gate changes | `verification.mutationThreshold` stays as configured unless the plan justifies it |
| Benchmark or load testing | `ws-run-benchmark` owns harness benchmarks; this spec owns correctness coverage |
| Live network or marketplace integration tests | Hermetic suite only; live checks stay manual |
| Auto commit or push of tests | User commits explicitly; import never runs git writes |
| Rewriting the test runner | Runner contract stays; only additive coverage wiring |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Testable unit | Each skill, script, and bin entry with logic | File-complete is checkable without a prior gate | y |
| Coverage tool | `c8` with Node 22, one-command gate | Standard Node coverage; equivalent allowed with reason | y |
| Thresholds | Lines at or above 95 percent and branches at or above 90 percent, file-complete | Near-100 percent made measurable; plan pins finals | y |
| Isolation root | Temp fixtures under the OS temp dir or test-approved paths | No repo writes keeps the suite hermetic | y |
| Suite time | Existing budget plus a stated allowance in the plan | New tests must not stall the suite | y |
| Auth, rate limits, concurrency, data expiry, idempotency, external-dependency failure, state transitions | N/A because tests are local, hermetic, single-process, and foreground with mocked network and clocks | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Audit plus plan plus missing tests plus coverage wiring in `test/` and scripts only | Diff lists those paths only |
| Atomic criteria | AC1–AC8 each pass or fail | Authoring validate plus command checks |
| Failure modes | Gaps listed; flakes forbidden; invalid fixtures fail fast with messages | AC2, AC3, AC5 plus negative scenarios |
| Observation telemetry | Audit plus plan docs plus suite output plus coverage report | Validation notes commands |
| Stack invariants | typescript-node Node-subset enforced on new helpers (awaited promises, validated inputs, contained paths, closed handles); strict-type checks N/A (JavaScript, no `tsc` gate) | `scan_stack_invariants.cjs` plus negative scenarios |
| Open blockers | None | Implementable from this spec |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0113-us-380.spec.md` exits 0; `npm run test` exits 0; coverage gate command exits 0 with report showing thresholds met; `npm run generate-integrity` plus `npm run verify-integrity` exit 0; `ws-check-harness` exits 0; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- Artifacts: audit file with unit-versus-test matrix plus gap list; plan file with priority plus isolation rules; coverage report with lines, branches, and uncovered justifications.
- Suite: 105 plus new files, zero flakes across two consecutive runs.

### Negative & Failing Test Scenarios

- Audit missing testable units or gap list without a measurable definition (must fail AC1).
- Plan without priority, isolation rules, or flake guards (must fail AC2).
- Full suite fails, flakes, or depends on file order (must fail AC3).
- Coverage gate fails or uncovered lines lack written justification (must fail AC4).
- New test writes outside temp fixtures, calls live network, or leaks a handle (must fail AC5).
- Integrity or harness fails after test edits (must fail AC6).
- New helper floats a promise, builds a path from unsanitized input, or leaks a handle (must fail AC7).
- Secret, token, PAT, or personal identifier appears in tests, fixtures, or logs (must fail AC8).
