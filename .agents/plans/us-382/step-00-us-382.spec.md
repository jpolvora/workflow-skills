---
id: 382
slug: us-382
title: draft integration ws-self-learning skill with ws-project-patterns
source: github
specDate: 2026-09-21
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/382"
step: 0
workflowId: us-382
status: completed
startedAt: "2026-09-21T13:08:22.308Z"
endedAt: "2026-09-21T13:08:22.308Z"
acRefs: []
---
# Specification — draft integration ws-self-learning skill with ws-project-patterns

## Description

Analyze and verify integration between `ws-self-learning` (anti-regression memory: local `MEMORY.md` plus `memory/` plus compile, vault via spec-memo bridge, `read-memory`/`update-memory`, sanitize, traps with DO NOT / INSTEAD DO) and the patterns track (`ws-patterns-generator` shipped generator plus consumer-owned generated `ws-project-patterns` with evidence pointers and autoload row). Both harvest project knowledge; self-learning owns memory writes, the generator owns steering prose and never writes MEMORY or vault traps directly.

Scope the analysis to overlap, duplication, performance, and collaborative features; check other skills for merge or collaborate fit (at least `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, `ws-secrets-leak-review`); produce a draft integration plan with bounded file list, mechanism, targets, and rollback path; then implement approved code reductions, performance improvements, and collaborative features.

Architecture touchpoints: upstream SoT `.agents/skills/ws-*`, `bin/skill-dependencies.json`, `CATALOG.md` router, autoload, installer exclusion for the generated dir, integrity plus `ws-check-harness`, `test/` suite, and the effective changelog plus MEMORY. Generated `ws-project-patterns` stays consumer-owned and installer-excluded. External `spec-memo` package (`ws-memo`) is bridge-only; no upstream edits there.

## Acceptance Criteria

- AC1: Analysis covers `ws-self-learning`, `ws-patterns-generator`, generated `ws-project-patterns`, plus at least `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, and `ws-secrets-leak-review`, with an overlap matrix and a merge/collaborate/keep-separate recommendation per pair recorded in the companion.
- AC2: Draft integration plan exists in `0111-us-382.context.md` with bounded file list, integration mechanism (shared helper versus protocol versus merge), performance targets, feature deltas, explicit non-goals, and a rollback or no-op path.
- AC3: Implemented code reduces duplication via shared helper extraction or removed duplicated blocks with before/after file pointers; all previously passing related tests still pass.
- AC4: Performance is measured and non-regressed (`npm run test` wall time plus touched script runtime plus skill body size); any claimed improvement cites numbers and no suite-time regression exceeds 10 percent without justification.
- AC5: New collaborative features, if any, are explicit, config-gated where behavioral, covered by tests and docs, and introduce no unrequested scope.
- AC6: Memory contracts hold: `read-memory`/`update-memory` backends, trap shape, sanitize plus compile, and vault bridge ownership are unchanged unless the plan approves; the generated skill still never writes MEMORY or vault traps directly.
- AC7: Autoload, installer, and integrity hold: the generated skill stays consumer-owned and installer-excluded; `npm run generate-integrity` plus `npm run verify-integrity` exit 0; `ws-check-harness` exits 0.
- AC8: New or changed Node scripts are `.cjs` with explicit `node` launcher, validate CLI and file inputs against a schema, contain filesystem reads and writes inside the repo root, await or handle every promise, and close all handles; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- AC9: No secrets, tokens, or personal data appear in analysis, plan, code, or tests; pasted consumer traces are anonymized to the failure class and the configured secrets review is clean.

## Original Issue Context

analyze and verify integration ws-self-learning skill with ws-project-patterns

check if there are other skills to merge/collaborate - integrate

it could be complementary/improved/collaborative way these two or more skills (draft/plan)

reduce skill code / improve performance / + features - code

Source: https://github.com/jpolvora/workflow-skills/issues/382 (state open, labels none, assignees none, comments none).

### Prior Work Sweep

Provider sweep on 2026-09-21 (`sweep_prior_work.cjs --issue 382 --keywords self-learning project-patterns integration merge collaborate`): status ok, zero PRs, zero commits, no exact open PR for #382, no duplicate-risk open work. Closest in-tree relatives: `ws-self-learning`, `ws-patterns-generator`, generated `ws-project-patterns` (consumer-owned), `ws-changelog`, `ws-spec-memo`, `ws-configure-project`, `ws-secrets-leak-review`, `ws-wiki`. Local memory hits: spec validator AC-bullet scan (Medium) and CRLF edit anchors (Medium); vault bootstrap returned harness traps with no existing integration plan. Predecessor specs: `0018-project-patterns-memory-skills` (retired layer-split model) and `0110-us-378` (generator plus generated skill).

### Design Intent

Modification plus analysis, not greenfield. `git log --oneline -10 -- .agents/skills/ws-self-learning/` shows long-lived memory ownership; `git log --oneline -10 -- .agents/skills/ws-patterns-generator/` shows only `32076bba feat(#378)` plus `31afaf28 fix(#383)`, confirming the generator is new and intentionally complementary (steering prose with evidence pointers) rather than an accidental duplicate of traps. `ws-project-patterns` is intentionally generator-managed consumer content (`bin/skill-dependencies.json` externalSkills), not an upstream skill. Integration must preserve these ownership boundaries unless the draft plan justifies a merge.

## Notes

- `ws-project-patterns` in the issue means the generated consumer skill from `ws-patterns-generator`, not the retired `ws-patterns` id.
- Shared harvest readers or helpers live under `{skillsRoot}/ws-shared/runtime/scripts/` or the owning skill `scripts/` dir; the generator never gains MEMORY write paths.
- Skill bodies stay en-us, host-neutral, portable tokens, `user-gate` only for gates, one directive per line.
- `0110-us-378.context.md` options B through D already reject merging generator duties into self-learning; this spec reuses that analysis and extends it to other skills.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editing the external spec-memo package or vault protocol | `ws-memo` ships from spec-memo; harness owns bridge flags only |
| Background daemon or scheduled regeneration | Host-owned; harness ships manual invoke plus dry-run only |
| Cross-project pattern sharing | Consumer-local only; no sharing protocol in this spec |
| Auto commit or push of analysis, plan, or code | User commits explicitly; import never runs git writes |
| Embeddings or ML similarity dedup | Agent-judged overlap plus evidence pointers suffice |
| Reviving retired `ws-patterns-backend` or `ws-patterns-frontend` | Absent from tree; different interaction model |
| Editing managed skill bodies outside the approved plan list | Surgical diffs; opportunistic rewrites need separate approval |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| `ws-project-patterns` referent | Generated consumer skill from `ws-patterns-generator` | Only live id with that name; retired `ws-patterns` is absent | y |
| Default integration mechanism | Collaborate via shared helpers plus protocols, keep skills separate | Preserves memory versus steering contracts; merge needs plan justification | y |
| Other-skill candidate set | At least changelog, spec-memo, configure-project, secrets-leak-review | Direct harvest, memory, seeding, and hygiene neighbors | y |
| Performance target | Measured non-regression plus cited improvements | Issue claims improvement; numbers make it testable | y |
| Deliverable shape | Analysis in companion plus code diff plus tests plus docs | Matches draft/plan plus code wording | y |
| Auth, rate limits, concurrency, data expiry, idempotency, external-dependency failure, state transitions | N/A because work is local analysis plus repo-local scripts with no network API, no shared mutable service, no TTL data, and single-writer runs | Dimensions absent | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Analysis plus draft plan plus approved code reductions in listed skills only | Diff lists those paths plus companion only |
| Atomic criteria | AC1–AC9 each pass or fail | Authoring validate plus command checks |
| Failure modes | Missing sources tolerated and noted; no behavior regression; dry-run writes nothing | AC3, AC6, AC7 plus negative scenarios |
| Observation telemetry | Overlap matrix plus plan doc plus test timings plus harness results | Validation notes commands |
| Stack invariants | typescript-node Node-subset enforced on new or changed scripts (awaited promises, validated inputs, contained paths, closed handles); strict-type checks N/A (JavaScript `.cjs`, no `tsc` gate) | `scan_stack_invariants.cjs` plus negative scenarios |
| Open blockers | None | Implementable from this spec plus companion |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Commands: `node {skillsRoot}/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/0111-us-382.spec.md` exits 0; `sweep_prior_work.cjs --issue 382` ok with zero PRs; `git log --oneline -- .agents/skills/ws-self-learning/ .agents/skills/ws-patterns-generator/` shows intentional split; `npm run test` exits 0; `npm run generate-integrity` plus `npm run verify-integrity` exit 0; `ws-check-harness` exits 0; `scan_stack_invariants.cjs --stack typescript-node` reports no new findings.
- Artifacts: `0111-us-382.context.md` with Feature Boundary, Implementation Decisions, Deferred Ideas; before/after file pointers for dedup; perf numbers for suite time and touched scripts.
- Changelog: one entry per applied code run through the effective changelog file when code ships.

### Negative & Failing Test Scenarios

- Analysis omits self-learning or patterns-generator overlap or skips the required other-skill candidates (must fail AC1).
- Companion plan lacks file list, mechanism, targets, or rollback path (must fail AC2).
- Code reduction breaks a previously passing related test (must fail AC3).
- Suite time regresses over 10 percent without justification or claimed improvement lacks numbers (must fail AC4).
- New collaborative behavior ships without config gate, test, or doc (must fail AC5).
- Generated skill writes MEMORY or vault traps directly (must fail AC6).
- Installer overwrites the generated skill or integrity or harness fails (must fail AC7).
- New script floats a promise, builds a path from unsanitized input, or leaks a handle (must fail AC8).
- Secret, token, or personal identifier appears in analysis, plan, code, or tests (must fail AC9).
