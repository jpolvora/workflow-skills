---
id: null
slug: specify-closure-pack
title: Specify-time closure pack for score-10 spec delivery
source: local
specDate: 2026-08-22
step: 0
workflowId: specify-closure-pack
status: active
startedAt: "2026-08-22T20:43:36.916Z"
endedAt: "2026-08-22T20:43:36.916Z"
acRefs: []
---
# Specification — Specify-time closure pack for score-10 spec delivery

## Description

Close feature specs at authoring time so downstream `ws-spec-to-pr*` runs spend fewer turns on interview rework and `scoreAndRefine`, and so Step 5 can reach score ≥ 9 with `file:line` evidence already implied by atomic ACs.

Today `validate_spec.cjs` checks frontmatter, contiguous `ACn`, composite ACs, Prior Work Sweep, and Design Intent. `ws-write-spec` and Step 0 do not invoke that validator. Ambiguity is discovered in `ws-interview` after `step-01`. That is late: missing Out of Scope, silent assumptions, and unstated implicit requirements become plan gaps, then score holes.

This pack ports the highest-leverage Specify practices from [tlc-spec-driven](https://agent-skills.techleads.club/skills/tlc-spec-driven/) onto the existing specs family. It does not merge `{specsDir}` with `{plansDir}`, does not replace `ACn` with `AUTH-01` ids, and does not change product-commit order.

### Goals

| Goal | How this spec moves it |
|------|------------------------|
| Delivery quality | Out of Scope + Assumptions + dimensions sweep land in the spec of record |
| Agent performance | Fail-closed validator before register; lookup facts before user-gate; lazy `context.md` |
| Verify score near 10 | Atomic ACs with logged assumptions; fewer silent guesses that fail Step 5 |

### Baseline (do not re-spec)

Harness-efficiency ACs 27–38 already shipped `validate_spec.cjs`, composite detection, `ac-ledger.json`, and ledger-derived scores. This spec extends that surface. It does not recreate those scripts.

### Design Intent

Existing `FORMAT.md` one-line `ACn` shape, `{specsDir}` vs `{plansDir}` split, and `ac_ledger` AC ids stay. The change adds Specify-time closure around that shape. Interview remains the plan auditor. Design, DAG, verify, review, and testing stay plan artifacts.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Merge spec+design+tasks+validation under `.specs/features/` | Breaks the two-board contract in `autoload.md` |
| Require EARS SHALL on every AC | Conflicts with `ACn` one-liners; optional pattern hints are deferred |
| Stable `AUTH-01` requirement IDs | `ac_ledger` already keys on `ACn` |
| P1/P2/P3 user-story grouping | Optional later; not needed for closure |
| Atomic commit per task | Conflicts with product-commit after verify ≥ 9 |
| Context7 MCP as a required lookup step | Host coupling |
| New `ws-discuss` skill | Discuss stays inside `ws-write-spec` |
| Independent Verifier rewrite | `ws-verify-plan`, `ws-fable-judge`, and sabotage already cover author≠verifier |
| Changing `ac_ledger score` rubric | Already defines 10/10 evidence rules |
| Backfilling closure sections into historical `{specsDir}` files | Compat mode warns; authoring mode applies to new writes only |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Validator default CLI mode | `compat` when `--mode` omitted | Existing `test-spec-validation.js` and hand-run `validate_spec.cjs` keep today’s exit codes | y |
| `ws-write-spec` and Step 0 mode | always `--mode=authoring` | New specs must close; old files can still start a workflow | y |
| Register of a pre-closure spec | allowed; validator runs `compat` | Do not block orch on historical specs | y |
| Gray-area file path | `{specsDir}/{slug}.context.md` next to the spec of record | Companion of the spec, not a `{us-dir}` plan artifact | y |
| Classify Small/Medium/Large inside write-spec | no; always Medium dimensions sweep | Classify runs after the spec exists; avoid a second complexity axis | y |
| Lite safety-valve threshold | opening implement list > 5 atomic steps | Matches TLC safety valve; `dagThresholds.maxImplementationSteps` stays 3 for classify | y |

**Open questions:** none.

## Acceptance Criteria

- AC1: `FORMAT.md` documents `## Out of Scope` as a markdown table with columns Feature and Reason.
- AC2: `FORMAT.md` documents `## Assumptions & Open Questions` as a markdown table with columns Assumption, Chosen default, Rationale, and Confirmed.
- AC3: `FORMAT.md` publishes the nine implicit-requirement dimensions and the `N/A because` collapse rule.
- AC4: `validate_spec.cjs --mode=authoring` exits non-zero when `## Out of Scope` or `## Assumptions & Open Questions` is missing.
- AC5: `validate_spec.cjs --mode=authoring` exits non-zero when an Assumptions data row has an empty or placeholder Chosen default or Rationale.
- AC6: `validate_spec.cjs --mode=authoring` exits non-zero when Out of Scope has zero data rows.
- AC7: `validate_spec.cjs` with omitted `--mode` keeps current errors and prints warnings for missing closure sections without failing.
- AC8: `ws-write-spec` invokes `validate_spec.cjs --mode=authoring` on the written spec and does not finish while the exit code is non-zero.
- AC9: Standard and lite Step 0 skip `ws-local-spec-provider` register when authoring validation of a newly written spec exits non-zero.
- AC10: `ws-write-spec/SKILL.md` requires resolving discoverable facts from the codebase, `{sharedDir}/MEMORY.md`, and the stack file before any `user-gate`.
- AC11: `ws-write-spec` maps each obviously present implicit-requirement dimension to an AC or to an Assumptions `N/A because` row.
- AC12: `ws-write-spec` collapses absent dimensions into one Assumptions row rather than inventing ACs for them.
- AC13: When write-spec detects a user-facing gray area with two or more valid product options, it writes `{specsDir}/{slug}.context.md`.
- AC14: A written `{specsDir}/{slug}.context.md` contains headings Feature Boundary, Implementation Decisions, and Deferred Ideas.
- AC15: `ws-write-spec` creates no `context.md` when no gray area is detected and never writes an empty `context.md`.
- AC16: `autoload.md` vocabulary defines `{specsDir}/{slug}.context.md` as an optional spec companion, not a plan artifact.
- AC17: `ws-spec-to-pr-lite` presents a `user-gate` to continue lite or switch to standard when the opening implement step list exceeds five steps.
- AC18: `test/test-spec-validation.js` asserts authoring failure for missing Out of Scope, empty assumption cells, empty Out of Scope, compat warning-without-fail, and a full authoring-pass fixture.
- AC19: The same change set updates `FEATURES.md` and `autoload.md` to describe the closure pack.

## Original Issue Context

Free-text request (2026-08-22): write a spec for later implementation using the best ideas from the tlc-spec-driven analysis, targeting delivery quality, general performance, and verify score near 10.

### Prior Work Sweep

- Local analysis canvas: TLC Specify practices vs `FORMAT.md` / `validate_spec.cjs` / `ws-write-spec`.
- Related shipped work: `harness-efficiency-and-verifiability` ACs 27–38 (`validate_spec.cjs`, composite heuristic, `ac_ledger` score). Do not duplicate.
- Related specs in `{specsDir}`: `harness-efficiency-and-verifiability.spec.md` (validator+ledger), `ws-spec-list-and-board-management.spec.md` (two boards). No open duplicate for Specify-time closure.
- Upstream reference: [tlc-spec-driven](https://github.com/tech-leads-club/agent-skills/blob/main/packages/skills-catalog/skills/(development)/tlc-spec-driven/SKILL.md) v3.3.0 (CC-BY-4.0). Ideas adapted; layout not copied.

### Design Intent

Keep `ACn` one-liners and the specsDir/plansDir split. Add closure sections, authoring-mode validation, lookup-before-ask, lazy context companion, and a lite safety valve. Interview, ledger scoring, and product commits stay as they are.

## Notes

Deferred from TLC on purpose (see Out of Scope): EARS SHALL errors, requirement-ID matrix, P1–P3 stories, `.specs/features/` tree, atomic commits, Context7, standalone discuss skill, UAT phase.

Dimensions table to publish in `FORMAT.md` (copy, do not invent a parallel list):

| Dimension | What to cover |
|-----------|----------------|
| Input validation and bounds | Limits, formats, sanitization |
| Failure and partial-failure | Timeouts, partial saves, rollbacks |
| Idempotency / retry / dedup | Safe retries, dedup keys |
| Auth boundaries and rate limits | Who can call what, throttle rules |
| Concurrency / ordering | Races, ordering guarantees |
| Data lifecycle / expiry | TTL, archival, deletion |
| Observability | Logging, metrics, tracing hooks |
| External-dependency failure | Fallbacks, timeouts |
| State-transition integrity | Valid transitions, guards |

`ws-write-spec` Medium sweep: cover dimensions obviously present for the feature; one Assumptions row for the rest (`remaining dimensions N/A because [reason]`).

Suggested later orch (not this spec): `/ws-spec-to-pr-lite` or `/ws-spec-to-pr` after `ws-local-spec-provider --register`.
