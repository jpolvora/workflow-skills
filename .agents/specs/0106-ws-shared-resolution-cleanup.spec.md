---
id: null
slug: ws-shared-resolution-cleanup
title: ".ws resolution vs ws-shared folders cleanup"
source: local
specDate: 2026-09-19
status: Final
---

# Specification — .ws resolution vs ws-shared folders cleanup

## Description

Cleanup pass over path resolution mistakes between the project consumer hub (`.ws/`, token `{sharedDir}`) and the upstream skill source of truth (`.agents/skills/ws-shared/`, token `{skillsRoot}/ws-shared`). Skills, hubs, installer scripts, tests, and site docs must resolve consumer config, managed runtime, and skill bodies through portable tokens and documented install layouts instead of hardcoded paths.

System boundaries: all 55 skills under `.agents/skills/ws-*`, root `AGENTS.md`, `.ws/AGENTS.md`, `ws-shared/runtime/` contract files (`tools.md`, `config-resolution.md`, `gates.md`), plus wider scope `bin/`, `test/`, and site/docs (`docs/index.html`, `README.md`, `CATALOG.md`, `FEATURES.md`). Must account for global (`$HOME/.agents/skills`, `{globalSkillsRoot}`) vs vendored project-local (`.agents/skills`) installation and hybrid mode (global bodies + project `.ws/config.json`).

## Acceptance Criteria

- AC1: Every skill resolves consumer config via `{sharedDir}/config.json` with project-local precedence over global, never a hardcoded `.ws/config.json` path where a token applies — verified by grep audit over `.agents/skills/ws-*/SKILL.md`.
- AC2: Managed runtime references resolve via `{sharedDir}/runtime/` in consumer context and `{skillsRoot}/ws-shared/runtime/` in upstream-authoring context, with no bare `ws-shared/` shorthand in link targets — verified by `check_harness_links.cjs` and `test-harness-clean.js` with 0 findings.
- AC3: Global vs vendored resolution is explicit: `{skillsRoot}` expansion (explicit override, then project `.agents/skills`, then `{globalSkillsRoot}`) is honored in prose and scripts, and global execution checks for project `config.json` for config-dependent skills — verified by `ws-check-harness` consumer/global/hybrid cases.
- AC4: `bin/` installer, `test/` gates, and site/docs describe the same layout (SoT `.agents/skills/ws-*`, project hub `.ws/`, global fallback) with no stale host-specific folder defaults — verified by `npm run test` and `ws-check-harness` green.
- AC5: Negative case: a skill invoked globally without a project hub fails closed with a `ws-configure-project` pointer instead of silently reading global config as project config — verified by a config-missing test.

## Notes

- Grill Draft — decisions settled so far:
- D1 (wider scope, accepted): workforce covers all 55 `ws-*` skills plus hubs, `bin/`, `test/`, site/docs. Global install tree itself is not edited.
- D2 (settled): must account for global vs vendored skill installation (bodies from global or project-local; config always from project `.ws/`; hybrid fallback rules per `config-resolution.md`).
- D3 (settled): strict tokens — upstream-authoring links use relative `../ws-shared/runtime/` only between sibling skills; all consumer-facing prose and scripts use `{sharedDir}` / `{skillsRoot}` / `{globalSkillsRoot}` expanded before tool calls, project `.ws/config.json` wins over global, never hardcode `.ws/` or `.agents/skills/ws-shared/` as consumer instructions.
- D4 (settled): single-agent cleanup — one ordered pass over everything (grill Q4 option 3).
- D5 (settled): strict gates — `test-harness-clean.js` 0 findings, `npm run test` green, `verify-integrity` clean, plus `ws-check-harness` consumer, global, and hybrid cases (grill Q5 option 1).
- D6 (settled): standard resolution order — `{skillsRoot}` expands as explicit override, then project `.agents/skills`, then `{globalSkillsRoot}`; `{sharedDir}` is project `.ws`, project `config.json` wins over global, global bodies stay read-only fallback; sibling-skill links may stay relative `../ws-shared/runtime/`, everything consumer-facing uses tokens (grill Q6 option 1).
- D7 (accepted): settled contract text accepted, grill closed; basic rules frozen, implementation still requires a separate explicit request.
- Stack: Node 22 skill package; no product runtime change.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editing `$HOME/.agents/skills` live installs | Managed consumer installs; update overwrites them |
| Behavior changes beyond path resolution | Keep diffs surgical to resolution mistakes only |
| New host adapters or marketplace manifests | Host-private, not part of portable skill contract |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Canonical tokens `{sharedDir}`, `{skillsRoot}`, `{globalSkillsRoot}` cover all cases | Strict tokens per D3 | Matches `tools.md` Path tokens contract, grill Q3 option 1 | y |
| Global vs vendored matrix needs explicit per-skill rules | Record matrix in basic rules before workforce scan | User directive this session | y |
| Workforce shape (parallel agents vs script scan) | Single-agent ordered pass per D4 | Simplest coordination for wider scope | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Scope bounded | Wider scope plus global/vendored matrix locked in grill | Read this spec Draft vs user acceptance |
| Atomic criteria | AC1-AC5 each testable with named check | Run listed checks per AC |
| Failure modes | Global-without-hub and bare-shorthand cases covered | AC2 negative plus AC5 |
| Observation telemetry | Harness + tests named as signals | See Validation section |
| Zero open blockers | Basic rules accepted before scan starts | Grill acceptance |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node test/test-harness-clean.js` (0 findings required)
- `node .agents/skills/ws-check-harness/scripts/check_harness_links.cjs`
- `npm run test` and `npm run verify-integrity`
- `ws-check-harness` consumer / global / hybrid cases

### Negative & Failing Test Scenarios

- Bare `ws-shared/MEMORY.md` shorthand without braces yields warning, prefers `{memoryDir}/MEMORY.md`.
- Token inside Markdown link target flags as broken-link finding.
- Globally invoked config-dependent skill with no project `.ws/config.json` must prompt `ws-configure-project`, never silently use global config.
