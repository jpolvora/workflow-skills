---
id: 490
slug: us-490
title: Add optional retro skill (session retrospective to curated agent/harness/memory improvements)
source: github
specDate: 2026-10-08
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/490"
labels:
  - enhancement
step: 0
workflowId: us-490-20261008T155141Z
status: completed
startedAt: "2026-10-08T14:39:47.945Z"
endedAt: "2026-10-08T14:39:47.945Z"
acRefs: []
---
# Specification — Add optional retro skill (session retrospective to curated agent/harness/memory improvements)

## Description

Add a new optional skill (working name `ws-retro`) inspired by the public `/retro` skill. It reviews a completed workflow run or session and proposes curated, evidence-linked improvements to the project's agent environment, never to the product code itself. The skill is a self-improvement loop for the harness: it observes where a run struggled and turns each struggle into a candidate change to memory, directives, standards, or checks.

The environment surfaces the skill may target:

- **Curated memory entries** — persisted through the configured memory backend (local memory files and/or the spec-memo vault, per `specMemo.enableMemoryFiles` / `enableSpecMemoIntegration`), reusing the existing `ws-self-learning` memory contract instead of a new store.
- **Harness / agent directives** — `AGENTS.md`, hubs, and other steering or instruction files.
- **Reviewer standards** — judgement-call rules consumed by the review step.
- **Automated checks** — lint, type, test, pre-commit, or CI for mechanical violations.
- **Navigation pointers** — added to a file the agent already reads.
- **No-op deletions** — steering lines that changed nothing.

Two invocation modes:

- **Manual** — runnable standalone by the user at any time, with no active workflow run.
- **Config-gated automatic** — a new `config.json` key runs the skill automatically as a workflow step. Candidate placement is after the PR convergence/ship phase (after `ws-ship-pr` / near fix-PR convergence); the exact placement is a design decision that must be analyzed and documented. The default is off (opt-in) and the step never blocks close or shipping.

Behavior contract:

- The skill only proposes candidates by default; nothing is written to memory or directives until the user selects candidates (human-in-the-loop via `user-gate`).
- Candidates are ranked most-severe-first, and each must trace to a specific moment or artifact in the reviewed run — no generic best-practice filler.
- Proposals respect the source-anonymization rule: no private consumer names, absolute paths, hostnames, or customer data.
- The skill is single-run scoped: it does not audit or prune artifacts proposed by earlier runs.

## Acceptance Criteria

- AC1: The project shall provide an optional `ws-retro` skill package under `{skillsRoot}/ws-retro/` containing `SKILL.md` (plus scripts/evals when required), registered in `bin/skill-dependencies.json` with integrity regenerated.
- AC2: The `ws-retro` skill shall be invocable standalone at any time without an active workflow run.
- AC3: When a `ws-retro` auto-run config key is set to explicit `true`, the workflow shall run the skill automatically after the PR convergence/ship phase.
- AC4: If the `ws-retro` auto-run config key is omitted, missing, or `false`, then the workflow shall skip the skill and preserve existing close and ship behavior.
- AC5: The skill shall attribute every proposed candidate to a specific moment or artifact of the reviewed run and label it with exactly one destination category (memory, harness directive, reviewer standard, automated check, navigation pointer, or no-op deletion).
- AC6: Where a curated memory entry is approved, the skill shall persist it through the configured memory backend (local memory files and/or the spec-memo vault) using the `ws-self-learning` memory contract.
- AC7: The skill shall only propose candidates until the user approves them through `user-gate`, and shall not write memory or directives without approval.
- AC8: While the auto-run step executes, the skill shall never block workflow close or shipping on its outcome.
- AC9: The new `config.json` key shall be documented in `config.schema.json` and `config.json.example` and mirrored in the desktop config editor (`Edit-WorkflowSkillsConfig.ps1`) per the config schema sync rule.
- AC10: When the `ws-retro` package ships, `ws-check-harness` and `npm run test` shall pass with integrity regenerated, and `README.md`, `FEATURES.md`, the hubs, and the generated site shall reflect the new skill.

## Original Issue Context

Verbatim request that produced the tracker item:

> add an extra optional skill inspired by retro skill https://www.aihero.dev/skills-retro. It could be called manually any time, or add a config.json key value config to run automatically as a kind of step in workflow (analyze where it fits better, I think it could be after converging PR - this skill should help improve agents/memory/harness instructions/directives for enhancing/improving workflow inside project by adding curated memory entries (file or spec-memo integration).

### Prior Work Sweep

- Sweep on issue `#490` returned only incidental references to merged PRs that cite the id (`#368`, `#432`, `#433`, `#223`); none implements an agent session-retrospective skill.
- No open PR implements the same feature, so there is no duplicate-risk conflict.
- Closest existing surfaces: `ws-self-learning` (memory trap capture) and `ws-monitor` / evidence tooling (session observation). `ws-retro` composes them; it does not replace either.

### Design Intent

Greenfield new skill: no prior implementation to preserve, so `git log -p -S` archaeology is skipped.

## Notes

- Implementation touchpoints: new `.agents/skills/ws-retro/` package; `bin/skill-dependencies.json` and the hub `skill-dependencies.json`; `config.schema.json` + `config.json.example` + `Edit-WorkflowSkillsConfig.ps1` for the opt-in key; docs (`README.md`, `FEATURES.md`, hubs, site).
- `ws-retro` should load `ws-self-learning` and reuse the memory contract (`read-memory` / `update-memory`, `rules.memoryDir`, spec-memo routing) rather than introduce a store.
- The auto-run hook slots after the workflow's terminal phase; it must be advisory and never gate close or shipping.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Automatic hook that edits memory, lint rules, or CI without user approval | Violates the human-in-the-loop contract the requester specified |
| Auditing or pruning checks proposed by earlier runs | The skill sees a single run, so it cannot judge long-term rule value |
| Replacing `ws-code-review` or the adversarial audit step | Those deliver a verdict on code; this skill improves the environment |
| Diagnostics derived from private consumer data | Source-anonymization rule |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Config key name and location | dedicated `retro.*` block with `enabled` default `false` | groups the opt-in switch and avoids overloading `defaults.*` | n |
| Orchestrator coverage | standard and lite both, gated by the opt-in key | the close step exists in both; confirm during design | n |
| Input source | workflow state and artifacts first, raw transcripts optional | avoids a new transcript store; reuses existing observation tooling | n |
| Auth, rate limits, external fetch | N/A because no new tracker or network intent is added | reuses existing provider contracts | y |
| Concurrency / ordering | N/A because the skill runs once at a terminal phase and only proposes | no concurrent writers | y |
| Data lifecycle / expiry | N/A because candidates are ephemeral until approved and approved entries follow the existing memory lifecycle | reuses `rules.memoryDir` / spec-memo | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Skill package, opt-in config key, and docs only; no product-code change | Review diff scope against `files_touched` |
| Atomic criteria | Every AC is single-outcome and testable | `validate_spec.cjs --mode=authoring` |
| Failure modes | Negative scenarios defined for opt-out, unapproved writes, and ungrounded candidates | Review `### Negative & Failing Test Scenarios` |
| Observation telemetry | Named commands report integrity, harness, and tests | Run `verify-integrity` + `test-harness-clean.js` |
| Zero open blockers | Open Questions resolved or explicitly deferred with a default | Review Assumptions table |
| Stack invariants (typescript-node) | Node helpers use argument arrays (no shell concatenation), contain all repo-relative writes under the resolved root, keep async calls awaited or caught, and avoid unchecked `any` | `scan_stack_invariants.cjs --stack typescript-node` + script review |

## Validation & Observation Notes

### Telemetry & Observable Signals

- Stack scan: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.
- Integrity: `npm run generate-integrity` then `npm run verify-integrity` (must report `matches tree`).
- Harness invariants: `node test/test-harness-clean.js` (expect `Harness OK ... 0 findings`).
- Skill load / frontmatter: `ws-check-harness` Phase 5 `check_skill_load.cjs` includes the new package and its aliases.
- Test suite: `node test/run-tests.cjs`.

### Negative & Failing Test Scenarios

- NS1: If the auto-run key is omitted or `false`, then no `ws-retro` proposal artifact is produced and no memory file is modified.
- NS2: If a candidate cites no specific run moment, then the skill reports it as rejected and emits no generic advice.
- NS3: If the user declines at `user-gate`, then no memory or directive file changes and `git status --porcelain` is unchanged.
- NS4: If a helper concatenates untrusted input into a shell command or escapes the repo root, then `scan_stack_invariants.cjs --stack typescript-node` flags it and the deliverable is rejected.
