---
id: null
slug: reduce-spec-to-pr-tokens
title: Reduce token usage in spec-to-pr-* workflows via prose compaction and deduplication
source: local
specDate: 2026-09-27
step: 0
workflowId: reduce-spec-to-pr-tokens-20260927T043013Z
status: completed
startedAt: "2026-09-27T04:35:53.855Z"
endedAt: "2026-09-27T04:35:53.855Z"
acRefs: []
---
# Specification — Reduce token usage in spec-to-pr-* workflows via prose compaction and deduplication

## Description

The `ws-spec-to-pr` (standard) and `ws-spec-to-pr-lite` (lite) orchestrator workflow instructions currently consume excessive context tokens. The core orchestration documentation—`ws-spec-to-pr/SKILL.md` (~15.4 KB), `ws-spec-to-pr/STEP-DISPATCH.md` (~36.3 KB), `ws-spec-to-pr/PROTOCOLS.md` (~31.6 KB), and `ws-spec-to-pr-lite/SKILL.md` (~13.2 KB)—totals over 96.5 KB (~24,000+ tokens). Whenever an orchestrator agent starts a workflow or reads instructions across step boundaries, this large volume of prose is ingested into the context window, causing high token consumption, higher inference latency, and increased risk of cognitive distraction or lost-in-the-middle omissions.

Much of this text consists of duplicated policies across files (e.g. verbatim duplication of the `autoMode ≠ skip planning` table, repeated model resolution hierarchies, duplicate golden-path state commands, and redundant post-mutating transition sequences), overlapping domain sections between `PROTOCOLS.md` and `STEP-DISPATCH.md` (e.g. duplicating Step 5, Step 6, Step 8, and Step 9 procedures), and historical sediment (prose narratives referencing past user stories, issue numbers, and commit hashes).

This specification defines the structural condensation, deduplication, and compaction of `ws-spec-to-pr` and `ws-spec-to-pr-lite` documentation. It establishes strict single-source-of-truth (SoT) boundaries across files, applies the pruning guidelines from [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md), compacts prose into concise imperative instructions, and enforces an aggregate byte/token reduction of at least 30% across the orchestration documentation while preserving 100% of functional and behavioral invariants.

System boundaries: Prompt prose, tables, and reference structures within `.agents/skills/ws-spec-to-pr/` and `.agents/skills/ws-spec-to-pr-lite/`. No modifications to Node `.cjs` state management logic (`workflow_state.cjs`, `update_state.cjs`, `validate_state.cjs`, `step_coordinator.cjs`), FSM state machines, or gate semantics.

## Acceptance Criteria

- AC1: Retain the `autoMode ≠ skip planning` table in `ws-spec-to-pr/SKILL.md` as canonical, and replace its duplicate in `STEP-DISPATCH.md` with a concise link/reference to `SKILL.md § autoMode ≠ skip planning`.
- AC2: Centralize host execution mode, subagent model resolution, verbose preview format, and golden-path state command recipes in their canonical runtime documentation (`gates.md`, `tools.md`, `PROTOCOLS.md`), replacing repetitive paragraph-length duplicates across `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, and `ws-spec-to-pr-lite/SKILL.md` with concise single-sentence pointers.
- AC3: Consolidate `PROTOCOLS.md` by removing redundant per-step implementation and execution procedures for Step 5 (check-implementation / score gate), Step 6 (code review + fix loop), Step 8 (ship / close phase), and Step 9 (fix-pr), establishing `STEP-DISPATCH.md` as the sole source of truth for step actions and `gates.md` for gate transitions.
- AC4: Compact prose and eliminate sediment across `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md`, and `ws-spec-to-pr-lite/SKILL.md` per `SKILL_AUTHORING.md` §6 (removing historical story/issue citations, no-ops, echo statements, and run-on parentheticals, while converting narrative instructions into structured imperative bullets).
- AC5: Align `ws-spec-to-pr-lite/SKILL.md` to the same lean standard by referencing shared runtime contracts (`gates.md`, `tools.md`, `git-ownership.md`) instead of restating long paragraphs of duplicate rules for models, preview formatting, and post-mutating transitions.
- AC6: Achieve a measurable reduction in UTF-8 byte size for each refactored file without altering behavior:
  - `ws-spec-to-pr/SKILL.md` ≤ 11.5 KB (≥ 25% reduction from 15.4 KB baseline)
  - `ws-spec-to-pr/STEP-DISPATCH.md` ≤ 23.5 KB (≥ 35% reduction from 36.3 KB baseline)
  - `ws-spec-to-pr/PROTOCOLS.md` ≤ 20.5 KB (≥ 35% reduction from 31.6 KB baseline)
  - `ws-spec-to-pr-lite/SKILL.md` ≤ 10.0 KB (≥ 25% reduction from 13.2 KB baseline)
  - Total combined size of these 4 files reduced by at least 30% (from ~96.5 KB to ≤ 65.5 KB).
- AC7: Maintain 100% behavioral parity: all FSM phases F0–F6, Steps 0–9, continuous `autoMode` host-turn progression, mid-step pause/checkpoint fallbacks, native modal and markdown gate rules, required G2-code commits (after Step 5 in standard, Step 2 in lite, and review-fix), delivery commits at Step 8 close, step-baton multi-CLI compatibility, and execution observer contracts remain intact.
- AC8: Add automated byte-budget assertions to `test/test-context-budget.js` enforcing maximum allowed sizes for `ws-spec-to-pr/SKILL.md`, `STEP-DISPATCH.md`, `PROTOCOLS.md`, and `ws-spec-to-pr-lite/SKILL.md` to prevent future prose inflation.
- AC9: All existing test suites, including `test-liveness-checkpoints.js`, `test-context-budget.js`, `test-workflow-state-contract.js`, and `test-run-state-integrity.js`, pass with zero regressions.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying Node `.cjs` execution scripts | Focus is strictly on prompt/instruction token reduction and deduplication |
| Changing FSM state machine transitions or step numbering | FSM steps 0–9 (standard) and 0–5 (lite) are stable contracts |
| Changing specialized subagent skills (`ws-implement-tasks`, etc.) | Specialized skills are separate packages with their own subagent contracts |
| Altering telemetry JSON schemas or `.state.json` structure | Machine SoT contracts remain completely backward-compatible |
| Removing functional guardrails or safety stops (HS-1 to HS-5) | Safety invariants must remain strictly enforced |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Token consumption proxy | Normalized UTF-8 LF byte count | Deterministic, environment-independent, and directly proportional to BPE tokens | y |
| Canonical step actions SoT | `STEP-DISPATCH.md` for standard, `ws-spec-to-pr-lite/SKILL.md` for lite | Prevents dual-maintenance drift between `PROTOCOLS.md` and `STEP-DISPATCH.md` | y |
| Canonical gate contracts SoT | `ws-shared/runtime/gates.md` | Already the cross-cutting contract for interactive gates, autoMode, and G2 commits | y |
| Canonical artifact names SoT | `ARTIFACTS.md` | Eliminates duplicate artifact name enumerations in skill prose | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Baseline metrics recorded | Baseline file sizes established (SKILL.md: 15.4 KB, STEP-DISPATCH.md: 36.3 KB, PROTOCOLS.md: 31.6 KB, lite SKILL.md: 13.2 KB) | `node -e "..."` stat check |
| Target budgets specified | File-by-file byte targets established with ≥ 30% aggregate reduction | AC6 target table |
| Invariants identified | Invariants cataloged (autoMode continuous chaining, G2 commits, HS-1..HS-5, gates) | Cross-reference with `test-liveness-checkpoints.js` and `gates.md` |
| Test coverage mapped | Target tests identified for regression protection (`test-liveness-checkpoints.js`, `test-context-budget.js`) | Test suite inspection |
| Stack invariants verified | Node 22 / CommonJS `.cjs`, surgical diffs, LF line endings, zero Python dependency | Invariant compliance check |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-spec-format/scripts/validate_spec.cjs --mode=authoring .agents/specs/pending/0142-reduce-spec-to-pr-tokens.spec.md` exits 0.
- `node test/test-context-budget.js` exits 0 and asserts byte budgets across all 4 files.
- `node test/test-liveness-checkpoints.js` exits 0, confirming that `autoMode` continuous chaining and pause-turn fallback contracts remain present.
- `npm run test` exits 0 with all test suites passing.

### Negative & Failing Test Scenarios

- Reintroducing duplicated sections into `STEP-DISPATCH.md` or inflating prose beyond the maximum thresholds in AC6 fails `test-context-budget.js`.
- Omitting `autoMode` host-turn chaining language or `turn-boundary pause` fallback from `SKILL.md` or `PROTOCOLS.md` fails `test-liveness-checkpoints.js` D1.
- Removing required G2-code or pre-advance validation instructions breaks workflow state validation in `test-run-state-integrity.js`.

## Notes

### Design Intent

Over successive release iterations, `ws-spec-to-pr` and `ws-spec-to-pr-lite` accumulated operational clarifications, bugfix disclaimers, and guardrail notes. While each addition was individually justified, their accumulation created substantial prose duplication across `SKILL.md`, `STEP-DISPATCH.md`, and `PROTOCOLS.md`. The design intent of this specification is to refactor these markdown documents into lean, clean, single-source-of-truth instructions adhering to `SKILL_AUTHORING.md`, making the workflows cheaper to run, faster to process, and less prone to agent confusion without changing any operational behavior.

## Original Issue Context

`source: local` — Prompt-driven workflow optimization: "reduce spec-to-pr-* workflows token consumption/usage, by condensing/consolidating/compacting prose instructions and dedup, making it more simple to understand, efficient to execute". No tracker id.
