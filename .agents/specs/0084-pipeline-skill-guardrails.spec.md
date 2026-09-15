---
id: null
slug: pipeline-skill-guardrails
title: "Pipeline skill guardrails: dedup shared contracts and add blast-radius guardrails"
source: local
specDate: 2026-09-15
---

# Specification — Pipeline skill guardrails: dedup shared contracts and add blast-radius guardrails

## Description

Pipeline step skills (`ws-spec-write` … `ws-fix-pr`) **restate** contracts already owned by single-source files: [`gates.md`](../../.agents/skills/ws-shared/runtime/gates.md), [`PROTOCOLS.md`](../../.agents/skills/ws-spec-to-pr/PROTOCOLS.md), [`STEP-DISPATCH.md`](../../.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md), [`tools.md`](../../.agents/skills/ws-shared/runtime/tools.md), [`config-resolution.md`](../../.agents/skills/ws-shared/runtime/config-resolution.md), and [`scm-provider-contract.md`](../../.agents/skills/ws-shared/runtime/scm-provider-contract.md). Standard orch dispatch via `build_dispatch_context.cjs` already inlines enhancing `## Subagent contract` from `ws-karpathy-guidelines`, `ws-senior-developer`, `ws-tdah`, and `ws-self-learning` plus a MEMORY slice.

At the same time, several step skills are **missing** blast-radius do/don't guardrails that only they can enforce (writable paths, no-self-commit, Shell-required verify, `force_interview` override, probe-only testing skip).

This spec therefore has two coupled goals: (1) **add lean, skill-owned guardrails** for the verified gaps; (2) **dedup** repeated prose into one full-prose owner per concern, leaving callers a one-line Contract pointer plus their blast-radius delta. Net result: shorter skill bodies with stronger, single-source contracts. Source plan: [`.cursor/plans/pipeline_skill_guardrails_8b7695b2.plan.md`](../../.cursor/plans/pipeline_skill_guardrails_8b7695b2.plan.md).

## Acceptance Criteria

- AC1: A single-owner map exists (concern → full-prose owner → caller keeps) and each duplicated concern has exactly one full-prose owner.
- AC2: The handoff boilerplate `After step finish, orch persists the handoff` is removed from every pipeline step `SKILL.md`; it remains only in `PROTOCOLS.md` Base Prompt Prefix and `STEP-DISPATCH.md` post-mutating transition.
- AC3: `ws-plan-verify` and `ws-implement-tasks` replace minVerifyScore / scoreAndRefine / Reach-10 prose tables with a one-line `Contract: gates.md` pointer; the rules "do not author or override the numeric score; `ac_ledger.cjs` owns the math" and the ledger CLI recipes remain intact.
- AC4: The G2 hunk-separation algorithm (preExistingDirty inspection, `git apply --cached`, `git restore --staged`) exists in full only in `tools.md` `commit-code`; `gates.md` keeps the timing table plus a pointer; `COOPERATIVE_FIX.md` and `ws-fix-pr` keep a one-line pointer plus batch-path staging scope.
- AC5: The Step 8 combined gate (five options, close→ship, Phase A cleanup) exists in full only in `gates.md` / `artifact-cleanup.md`; `PROTOCOLS.md`, `STEP-DISPATCH.md`, and lite keep short pointers plus the `ws-ship-pr` invocation args.
- AC6: The subagent model-role chain exists in full only in `tools.md`; `ws-fix-pr` keeps its two-row `fixPrPlan`/`fixPrExec` table; `PROTOCOLS.md`, `STEP-DISPATCH.md`, and the gates banner keep pointers; internal Step 9 roles never consult numeric `"9"`.
- AC7: SCM provider resolution tables in `ws-fix-pr`, `ws-goal-fix-pr`, and `ws-ship-pr` are reduced to `config-resolution.md` + `scm-provider-contract.md` pointers (call intents by name; never raw `gh`/`az`; reject `scm: "local"` for PR/thread/merge).
- AC8: Pasted stack anti-pattern cheat sheets in `ws-implement-tasks`, `ws-plan-verify`, and `ws-code-review` are replaced by "run `scan_stack_invariants.cjs`; honor `{sharedDir}/runtime/stacks/`"; `ws-code-review` keeps its unique four-part proof.
- AC9: P0 guardrails are added (one line each): `ws-implement-tasks` exact `files_touched` and no `git add`/`commit`/`push`/`{plansDir}`; `ws-plan-verify` Shell-required and no product edits; `ws-plan-interview` `force_interview` overrides soft-skip; `ws-plan-write` no git and §6 invariant plan mandatory; `ws-testing` no product/test-source edits and `skipQualityGates` never skips build/test.
- AC10: P1 guardrails are added: `ws-spec-write` anonymization pointer; `ws-code-review` portable `localReviewCommand` only (no `cursor-reviewer` branded path; grep of skill bodies returns 0); `ws-ship-pr` no-benchmark + `workflowMode` push/PR-only; `ws-plan-to-tasks` no git/state writes and no invented stubs; `ws-fix-pr` managed-skill one-liner; `ws-classify-complexity` consolidated Don't; `ws-spec-to-pr-lite` MEMORY consult routes through `tools.md read-memory` (both backends).
- AC11: `setup.md` § External dependencies gains a **Source anonymization** hub pointer row; provider skills need no new guardrails (contract already owns spec-first, reformulate-not-copy, `--force`-only overwrite, delegate-or-STOP, `validate-auth` before remote mutation).
- AC12: The `Visual References` phrase is preserved in the skills asserted by [`test-visual-attachment-ingest.js`](../../test/test-visual-attachment-ingest.js).
- AC13: Standalone/lite safety holds: skills invoked without `build_dispatch_context.cjs` (`/fix-pr`, `/plan-verify`, lite orch) still carry skill-local Guardrails and Contract links; no commit/score rule is deleted while relying only on injection.
- AC14: Verification passes with no resurrected duplicates: targeted skill tests, `test/test-context-budget.js` (root `CATALOG.md` ≤ 24000 B normalized), harness duplicate checks, and (only when preparing a ship commit) regenerated integrity.

## Notes

- Dedup rule: full prose lives **once**; callers keep a 1–2 line Contract pointer plus their own blast-radius delta. Prefer links over new shared fragment files.
- Do not create a new monolithic `guardrails.md`; `gates.md` remains the portable single source of truth for gates.
- Fold new guardrails into an existing `## Rules of Engagement` / `## Subagent contract` heading when that is shorter than adding another heading.
- Query strings in skill bodies stay path-token free (`{skillsRoot}` / `{sharedDir}`) and portable; en-us only.
- If the plan's estimated shrink cannot be fully achieved without weakening a contract, defer the residual bullet and report it as a caveat rather than deleting enforcement.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full Extra/utility `ws-*` audit (benchmarks, wiki, doctor, monitor, …) | This spec targets the Spec-to-PR pipeline skills only |
| Wiring lite orch to `build_dispatch_context.cjs` | Recommended follow-up; separate behavioral change |
| New monolithic shared guardrails skill or `guardrails.md` | Progressive disclosure + context budget; `gates.md` already owns gates |
| Renaming or removing canonical gate/SoT files | Dedup keeps owners; it does not restructure the hub |
| Changing gate semantics (HS rules, minVerifyScore default, G2 timing) | Terminology and ownership only; behavior stays identical |
| Integrity/hash regeneration unless hashed skill bytes change during implementation | Upstream ship checklist owns regeneration |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Which file owns the full G2 hunk algorithm | `tools.md` `commit-code` | It already carries the full path-scoped staging + hunk-separation recipe | y |
| Whether step skills may drop gate tables entirely | No; keep a one-line Contract pointer | Standalone/lite runs do not receive `build_dispatch_context` injection | y |
| Plan estimated shrink (200–260 lines) as a hard AC | No; treat as a target with caveats allowed | Enforcement strength outranks a line-count target | y |
| Input validation / rate limits / data lifecycle / concurrency / external dependency failure | N/A because this is a documentation-and-contract refactor of static Markdown skill bodies, not a networked or stateful runtime | Only test/lint outcomes are observable | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only pipeline `ws-*` SKILL bodies + `gates.md` / `PROTOCOLS.md` / `STEP-DISPATCH.md` / `tools.md` / `setup.md` / `COOPERATIVE_FIX.md` prose | Diff vs this spec ACs |
| Atomic criteria | AC1–AC14 each map to a named file and a grep or test check | Reviewer checklist |
| Failure modes | Standalone skill loses a commit/score guardrail; duplicate prose resurrects; `Visual References` phrase dropped; branded path reintroduced | AC4, AC12, AC13, AC14 |
| Observation telemetry | Grep counts for each removed/added phrase; `npm run test`; `test/test-context-budget.js` | Validation & Observation Notes |
| Open blockers | None | N/A |
| Stack invariants | Markdown-only edits; no new runtime code; no shell recipe changes; no path-token violation | Code review + harness checks |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Grep counts (must drop): `After step finish` → 0 pipeline SKILLs; `Commit configured delivery artifacts` → `gates.md` only; `cleanup_workflow_git` → `artifact-cleanup.md` + one pointer per orch; `Starting step` template → `config-resolution.md` only; `cursor-reviewer` branded path → 0; G2 hunk prose (`git apply --cached`) → `tools.md` only; minVerifyScore tables → `gates.md` + one-line pointers.
- Grep counts (must appear): `force_interview` in `ws-plan-interview`; `question-only` in `ws-plan-verify`; `skipQualityGates` in `ws-testing`; git prohibition in `ws-plan-write` / `ws-plan-to-tasks`; managed `ws-*` no-rewrite in implement/plan-write/fix-pr; `read-memory` both-backends in lite; anonymization pointer in spec-write/ship-pr/fix-pr.
- `npm run test` (includes `test/test-visual-attachment-ingest.js`, `test/test-provider-parity.js`, `test/test-context-budget.js`).
- Integrity (only when preparing a ship commit): `npm run generate-integrity && npm run verify-integrity`.

### Negative & Failing Test Scenarios

- NS1: A step skill deletes its commit/score guardrail and relies only on orch injection → **fail** AC13 (standalone `/fix-pr` and `/plan-verify` must still gate).
- NS2: `ws-code-review` re-adds a `cursor-reviewer` / `scripts/cursor-reviewer` literal contract path instead of `localReviewCommand` → **fail** AC10 grep.
- NS3: `ws-testing` omits the `skipQualityGates` boundary and implies quality bypass also skips build/test/leak scans → **fail** AC9.
- NS4: `## Visual References` heading removed or renamed so `test-visual-attachment-ingest.js` fails → **fail** AC12.
- NS5: The Step 8 five-option gate or G2 hunk algorithm is re-pasted into a caller file, or root `CATALOG.md` normalized size exceeds 24000 B → **fail** AC5/AC14.
