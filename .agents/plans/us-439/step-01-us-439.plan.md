---
superseded: true
supersededBy: step-02-us-439.plan.refined.md
slug: us-439
step: 1
workflowId: us-439-20260927T170000Z
status: completed
startedAt: "2026-09-27T17:00:00Z"
endedAt: "2026-09-27T18:42:06.504Z"
acRefs: []
---
# Implementation Plan — [Spec] Create a new skill ws-spec-to-issue

Spec of record: `.agents/plans/us-439/step-00-us-439.spec.md` (source: github issue #439).

## 1. Objective

Ship the packaged skill `ws-spec-to-issue`: turn a free-text feature idea into an
agentically reformulated, anonymized tracker item (GitHub issue or Azure DevOps
User Story) with **no local spec** and **no git mutation**, then route/index it in
every harness surface, register it in both dependency manifests, and bump the
package version once for this release PR.

The skill already exists on the working tree (implemented earlier in this session
before the workflow restarted); Steps 1–7 formalize the plan, verify the
implementation against the 14 ACs, and close/ship it. Implementation work is
therefore mostly verification plus the remaining doc-surface gap (`FEATURES.md`
and `docs/llms.txt` were filled during Step 0 doc sweep).

## 2. Architecture & touchpoints

| Layer | Path | Role |
|-------|------|------|
| Skill body | `.agents/skills/ws-spec-to-issue/SKILL.md` | Invocation, tracker resolution, reformulation + anonymization, steps, guardrails |
| Helper | `.agents/skills/ws-spec-to-issue/scripts/run_spec_to_issue.cjs` | Node-only CLI: resolve tracker, anonymization guard, dry-run, delegate to provider `create-issue` |
| Evals | `.agents/skills/ws-spec-to-issue/evals/evals.json` | Skill eval fixtures |
| Tests | `test/test-ws-spec-to-issue.js` | Contract tests (frontmatter, both manifests, `--help`, dry-run, local STOP, leak guard) |
| Manifests | `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json` | Package membership + `dependencies` graph |
| Owned graph | `.agents/skills/ws-shared/runtime/git-ownership.md` | §5 compatibility matrix row (`read-only`) |
| Version | `package.json`, `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`, `.agents/skills/ws-shared/version.json`, `test/package.json`, `docs/index.html` footer | One release bump |
| Router/docs | root `AGENTS.md`, `.ws/AGENTS.md`, `.ws/autoload.md`, `.agents/skills/ws-shared/runtime/AGENTS.md`, `.../CATALOG.md`, `.../autoload.md`, `CATALOG.md`, `README.md`, `FEATURES.md`, `SPEC-MANAGEMENT.md`, `docs/llms.txt`, `docs/index.html` | Index + routes |
| Wiki | `.agents/specs/wiki/specs/spec-lifecycle.md` (+ regenerated `docs/wiki/**` HTML) | Living feature doc |

## 3. Reuse (do not fork)

- Reformulation protocol: `ws-spec-write` § Agentic Reformulation & Enhancement Protocol.
- Anonymization rule: hub `AGENTS.md` § Source anonymization.
- Network call: active provider `create-issue` intent (GitHub `create_issue.cjs`;
  ADO `create_issue.cjs --type "User Story"`) — no provider CLI recipe embedded.
- Runtime resolution: `resolve_consumer_root.cjs` from the skills install.
- Config resolution: `config-resolution.md` § Entry check.

## 4. Acceptance-criteria → work → verification map

| AC | Work | Named verification |
|----|------|--------------------|
| AC1 | SKILL.md frontmatter (`name`, `description`, `invocation_names`) | `test/test-ws-spec-to-issue.js` §1 |
| AC2 | Both manifests: package membership + `dependencies` row | `test/test-ws-spec-to-issue.js` §2 |
| AC3 | `resolveTracker()` in helper: `--tracker` → `providers.active` → `issueTrackers.*` → `project.repoUrl`; STOP otherwise | helper §`resolveTracker`; test §6 |
| AC4 | Skill prose: run provider `validate-auth` before mutating call | SKILL.md §Tracker resolution & auth; review |
| AC5 | Skill prose: reformulate via `ws-spec-write` protocol (not verbatim) | SKILL.md §Payload shaping; review |
| AC6 | Skill prose + guard: anonymize before create | SKILL.md §Payload shaping; test §7 |
| AC7 | Helper delegates to provider `create-issue` intent with `--body-file` | helper §providerScriptFor/main; review |
| AC8 | No local artifact / no git verbs; byte-identical tree | test §6 (`treeSnapshot`); review |
| AC9 | `--dry-run` prints tracker/title/body, exits 0 | helper §dryRun; test §4, §5 |
| AC10 | Token from env only; temp body outside repo, removed | helper §tmpDir/finally; review |
| AC11 | Non-zero provider exit reported; no partial artifact | helper §spawnSync branch; review |
| AC12 | Round-trip via `ws-spec-from-provider` / provider `fetch-to-spec` | provider contract reuse; review |
| AC13 | Router/index surfaces + harness clean | `check_skill_load.cjs`, `test-harness-clean.js`, `check_git_ownership.cjs`, `test-context-budget.js` |
| AC14 | Integrity + one version bump | `npm run generate-integrity` + `verify-integrity`; version alignment |

## 5. Task DAG (enableDag: true)

- T00 — Finalize skill body + helper (verify against AC1, AC3–AC11). Paths: `.agents/skills/ws-spec-to-issue/**`. Verify: `node test/test-ws-spec-to-issue.js`.
- T01 — Manifests + ownership matrix (AC2, AC13 partial). Paths: `bin/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/skill-dependencies.json`, `.agents/skills/ws-shared/runtime/git-ownership.md`. Depends on T00.
- T02 — Router/doc surfaces (AC13). Paths: `AGENTS.md`, `.ws/AGENTS.md`, `.ws/autoload.md`, `CATALOG.md`, `README.md`, `FEATURES.md`, `SPEC-MANAGEMENT.md`, `docs/llms.txt`, ws-shared runtime `AGENTS.md`/`CATALOG.md`/`autoload.md`, `.agents/skills/ws-spec-manager/SKILL.md`. Depends on T01.
- T03 — Test registration + contract test (AC1, AC2, AC9, AC13). Paths: `test/test-ws-spec-to-issue.js`, `test/test-suites.json`. Depends on T02.
- T04 — Version bump + integrity + site (AC14, AC13). Paths: `package.json`, manifests' `packageVersion`, `.agents/skills/ws-shared/version.json`, `test/package.json`, `docs/index.html`, `docs/wiki/**`, `bin/skill-integrity.json`. Depends on T03.
- T05 — Wiki doc (spec-lifecycle) + site regeneration (AC13). Paths: `.agents/specs/wiki/specs/spec-lifecycle.md`, `docs/wiki/**`. Depends on T04.

## 6. Stack & Security Invariants Verification Plan

| Invariant | Verification |
|-----------|--------------|
| Node-only runtime (no Python) | `ws-check-harness` critical Python check; helper is `.cjs`; no `.py` under `.agents/skills/` or `bin/` |
| Path tokens / config resolution | Helper resolves `{sharedDir}`/config through `resolve_consumer_root.cjs`; `--repo-root` honored (tests create temp roots) |
| No secret embedding | Skill prose + helper guard: token read only from configured env var inside the provider script; no secret echoed |
| Anonymization (hub AGENTS.md) | `scanLeaks()` fails closed on absolute paths / token-shaped text; test §7 asserts exit 2 and untouched tree |
| No git mutation by the skill | git-ownership matrix class `read-only`; test asserts tree snapshot unchanged |
| Integrity / hashed install content | `npm run generate-integrity` + `verify-integrity` exit 0 after every hashed-content edit |
| en-us skill bodies / gates | `ws-check-harness` language check; manual review of new prose |
| Hub byte budgets | `test-context-budget.js` (root CATALOG ≤ 24500 B, ws-shared AGENTS.md ≤ 14000 B) |
| Version one-bump-per-release | `packageVersion` aligned across manifests + `package.json` strictly above merge-base `0.5.5` |

## 7. Ordered execution

1. T00 → T01 → T02 → T03 (sequential; T00–T02 touch disjoint surfaces but graph keeps order)
2. Gate: `node test/test-ws-spec-to-issue.js`, `check_skill_load.cjs`, `check_git_ownership.cjs`
3. T04 (version + integrity + site)
4. Full battery: `npm run test`, `test-harness-clean.js`, `ws-check-harness` Phases 0–5c
5. T05 wiki + `node bin/build-site.js` + `--check`

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hub byte budgets (root CATALOG, ws-shared AGENTS.md) exceeded by new rows | Keep new rows terse; `test-context-budget.js` gates |
| Integrity drift after doc edits | Regenerate integrity last, in the same commit as content |
| Matrix row missing for new skill | `check_git_ownership.cjs` + `test-git-ownership-contract.js` fail closed |
| Overtaking `packageVersion` semantics | One bump (`0.5.5` → `0.5.6`) via `node bin/build-site.js --bump` |

## 9. Handoff

Plan path: `.agents/plans/us-439/step-01-us-439.plan.md`. Next: Step 2 plan interview (classifier `runInterview: true`).
