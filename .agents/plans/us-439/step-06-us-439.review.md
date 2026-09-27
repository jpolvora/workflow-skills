---
slug: us-439
title: "[Spec] Create a new skill ws-spec-to-issue"
step: 6
status: completed
workflowId: us-439-20260927T170000Z
acRefs: []
startedAt: "2026-09-27T17:00:00Z"
endedAt: "2026-09-27T18:48:50.071Z"
---
# Code Review — us-439

Reviewed range: `git diff develop...HEAD` (committed product diff, SHA `0d2337df`).

## Findings

No feedback.

## Evidence

| Check | Result |
|-------|--------|
| `git diff --name-status develop...HEAD` | 26 files: new skill (3), version/integrity/site projections, router/docs, tests |
| `node {skillsRoot}/ws-shared/runtime/scripts/scan_stack_invariants.cjs` | 0 issues (0 Critical, 0 Warning) across 39 files |
| Phase 5a `check_skill_load.cjs` | exit 0 (158 skill docs) |
| Phase 5a `check_duplicates.cjs` | exit 0 (no duplicated normative blocks) |
| `check_git_ownership.cjs` | exit 0 (159 docs, 132 scripts) |
| `node test/test-git-ownership-contract.js` | exit 0 (matrix classifies new skill) |
| `node test/test-context-budget.js` | exit 0 (hub byte budgets respected) |
| `node test/test-ws-spec-to-issue.js` | exit 0 (contract tests) |

## Diff hygiene

- New skill body + helper + evals are additive; no sibling skill code rewritten.
- Helper is CommonJS `.cjs`; no `.py` added anywhere under `.agents/skills/` or `bin/`.
- Skill prose names no provider CLI recipe and no host/IDE product; the network call delegates to the provider `create-issue` intent.
- Anonymization at two layers: the SKILL.md prose rule and the helper `scanLeaks()` fail-closed guard (absolute paths, token-shaped text).
- Temp body file is created under `os.tmpdir()` (outside the repo) and removed in `finally`; no token is read or echoed by the skill — only by the provider script from the configured env var.
- No git verbs in the skill or helper; working tree stays clean (matrix class `read-only`).
- Version bumped exactly once (`0.5.5` → `0.5.6`) and synchronised across `package.json`, both `packageVersion` keys, `version.json`, `test/package.json`, and the site footer.

## Stack Invariant Compliance

- Authorization & endpoint protection: N/A (no server endpoint; provider auth reused).
- Concurrency & async safety: N/A (single synchronous CLI invocation).
- Input validation & DTO boundary: anonymization guard + arg parsing (`parseArgs`) validate input; `--title` required.
- Subscription & lifecycle cleanup: temp file removed in `finally`; no long-lived resources.
- Harness invariants: portability (no host product naming), Node-only (0 `.py`), Phase 5a gates green, dependency graph updated in both manifests, integrity regenerated.

## Apply fixes?

No — no Critical/Warning/Suggestion findings.

## Learning

`Learning: N/A (no new project knowledge)` — the skill composes existing provider and reformulation contracts; no new trap surfaced. Two pre-existing harness gates (`test-git-ownership-contract.js`, `test-context-budget.js`) required the expected additive rows/budget-aware rows; both are documented project contracts, not new traps.
