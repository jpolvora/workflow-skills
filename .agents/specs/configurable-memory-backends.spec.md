---
id: null
slug: configurable-memory-backends
title: "Configurable memory backends: enableMemoryFiles and enableSpecMemoIntegration dual routing"
source: local
specDate: 2026-08-26
---

# Specification — Configurable memory backends: enableMemoryFiles and enableSpecMemoIntegration dual routing

## Description

Enhance the agent harness memory subsystem to support explicit, orthogonal control over memory storage backends via two configuration toggles in `config.json`: `enableMemoryFiles` and `enableSpecMemoIntegration`.

This update formally defines the architectural separation of roles between the upstream [spec-memo](https://github.com/jpolvora/spec-memo) runtime skill (`ws-memo`) and the workflow-skills integration bridge (`ws-spec-memo`):
- **Upstream `ws-memo` (owned by spec-memo):** Provides host-agnostic runtime tools and command interfaces for day-to-day vault operations (MCP tools: `bootstrap`, `search`, `get`, `upsert`, `append`, `forget`, `gc`, `promote`, `check_version`, `install_skills`, and CLI extras like `canvas`, `serve`, `doctor`, `rank`, `sync-vault`, `export-vault`, `import-vault`).
- **Bridge `ws-spec-memo` (owned by workflow-skills):** Covers all integration gaps between `workflow-skills` and `spec-memo`. It manages project-level configuration, interactive wizard setup, lifecycle hook translation (translating `ws-self-learning` failure reflections, `ws-fable-judge` adversarial verdicts, and `ws-changelog` task completions into vault operations), dual-mode fallback coordination, legacy data migration (`memo import`), pre-commit git boundaries (`memo hook install`), and diagnostic health checks (`check_spec_memo.cjs`).

When `enableMemoryFiles: true`, memory traps, issues, failure reflections, and learnings are stored in local `{sharedDir}/memory/` markdown files and compiled into `{sharedDir}/MEMORY.md`. When `enableSpecMemoIntegration: true`, memory operations interact directly with the `spec-memo` MCP server tools or `memo` CLI. Both backends can be active concurrently (dual mode), or both disabled.

The project configuration wizard `ws-configure-project` will interview users on their preferred memory backend configuration. All `ws-*` skills and helper scripts that perform memory lookups (`read-memory`) or trap recording (`update-memory`) will respect these configuration settings. Project documentation (`FEATURES.md`, `README.md`, `AGENTS.md`, website) and automated test suites will be updated accordingly.

### Design Intent

- **Segregated skill roles without duplicate functionality:** `ws-memo` remains the single source of truth for runtime MCP/CLI commands, while `ws-spec-memo` acts strictly as the bridge covering workflow-skills lifecycle gaps, configuration, and fallback handling.
- **Orthogonal backend toggles:** Replacing overloaded `specMemo.mode` with explicit boolean properties `enableMemoryFiles` and `enableSpecMemoIntegration` provides deterministic configuration without hidden side-effects.
- **Backward compatibility:** Existing configs with `specMemo.enabled` and `specMemo.mode` must continue resolving cleanly, mapping `mode: "vault"` to `enableMemoryFiles: false, enableSpecMemoIntegration: true` and `mode: "hybrid"` to `enableMemoryFiles: true, enableSpecMemoIntegration: true`.
- **Graceful degradation:** When `enableMemoryFiles` is `false`, skills and conflict checkers must not crash or fail quality gates due to a missing `MEMORY.md` file.
- **Unified capability aliases:** The portable aliases `read-memory` and `update-memory` in `tools.md` remain the stable contract used by agent skills, routing dynamically to the enabled backend(s).

## Acceptance Criteria

- AC1: `config.schema.json` and `config.json.example` declare boolean properties `enableMemoryFiles` (default `true`) and `enableSpecMemoIntegration` (default `false`) for memory storage routing.
- AC2: When `enableMemoryFiles` is `true` and `enableSpecMemoIntegration` is `false`, `read-memory` reads only `{sharedDir}/MEMORY.md` and `update-memory` writes only to `{sharedDir}/memory/*.md` compiled into `MEMORY.md`.
- AC3: When `enableMemoryFiles` is `false` and `enableSpecMemoIntegration` is `true`, `read-memory` queries only spec-memo MCP/CLI and `update-memory` writes traps only to spec-memo MCP/CLI without creating or updating local markdown memory files.
- AC4: When both `enableMemoryFiles` and `enableSpecMemoIntegration` are `true`, `read-memory` queries spec-memo MCP/CLI and `{sharedDir}/MEMORY.md`, while `update-memory` persists traps to both local markdown files and spec-memo MCP/CLI.
- AC5: When both `enableMemoryFiles` and `enableSpecMemoIntegration` are `false`, `read-memory` returns empty results and `update-memory` skips writing without raising an error.
- AC6: Legacy configuration resolution maps `specMemo.enabled: true` to `enableSpecMemoIntegration: true`, setting `enableMemoryFiles: false` for `mode: "vault"` and `enableMemoryFiles: true` for `mode: "hybrid"`.
- AC7: `ws-spec-memo` serves as the integration bridge managing configuration, setup, lifecycle hooks, and dual-mode fallback, delegating runtime vault tool execution to upstream `ws-memo`.
- AC8: `ws-spec-memo` translates `ws-self-learning` failure reflections, adversarial audit findings, and `ws-changelog` events into spec-memo `upsert` and `append` operations when `enableSpecMemoIntegration` is `true`.
- AC9: `ws-spec-memo` scripts (`configure_spec_memo.cjs` and `check_spec_memo.cjs`) configure and validate `enableSpecMemoIntegration`, `enableMemoryFiles`, MCP reachability, and git pollution.
- AC10: `ws-configure-project` wizard presents a four-choice gate offering local markdown files only, spec-memo integration only, both, or none, persisting the selected booleans to `config.json`.
- AC11: `ws-self-learning` and workflow orchestrators (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `ws-write-plan`, `ws-senior-developer`, `ws-fable-method`) handle missing local `MEMORY.md` gracefully when `enableMemoryFiles` is `false`.
- AC12: `ws-shared/tools.md` and `ws-spec-memo/references/INTEGRATION.md` document capability mapping, segregated skill boundaries, and handoff to `ws-memo` across all configuration combinations.
- AC13: `FEATURES.md`, `README.md`, `AGENTS.md`, and project documentation reflect the dual memory backend options and the segregated bridge architecture.
- AC14: Automated tests in `test/` verify configuration resolution, wizard choices, script execution, lifecycle hook translation, and memory routing across all four boolean combinations.

## Notes

- Upstream developer protocol: Run `npm run test`, `npm run verify-integrity` (or `npm run generate-integrity` if skill files changed), and `ws-check-harness` before finalizing implementation.
- Skill boundary discipline: `ws-spec-memo` must not duplicate or re-implement the 10-tool MCP catalog or CLI command documentation already defined in `ws-memo`.
- Path tokens: Skill documentation must use `{sharedDir}` and `{skillsRoot}` instead of hardcoded paths.
- Source anonymization: Maintain generic wording in all documentation and reports.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Modifying spec-memo MCP server core implementation | External package owned by https://github.com/jpolvora/spec-memo |
| Duplicating the 10-tool MCP surface and CLI encyclopedia in `ws-spec-memo` | Owned by `ws-memo` from the spec-memo repository |
| SQLite or database-backed memory storage in workflow-skills | Outside current architectural scope; spec-memo handles structured persistence |
| Auto-migrating existing memory files on project startup without user consent | Migrations must be explicitly prompted via `ws-configure-project` or `ws-spec-memo` |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default values for new installations | `enableMemoryFiles: true`, `enableSpecMemoIntegration: false` | Preserves classic zero-external-dependency behavior for new projects | y |
| Placement in `config.json` | Top-level or within `specMemo` / `memory` section | Preserves clean grouping while maintaining backward compatibility | y |
| Precedence when both backends enabled | Query spec-memo MCP first, then supplement with local `MEMORY.md` | Spec-memo contains rich indexed semantic knowledge; local file provides repository-specific baseline | y |
| Role demarcation between `ws-memo` and `ws-spec-memo` | `ws-memo` owns runtime tool usage; `ws-spec-memo` owns workflow bridging | Eliminates functional duplication and keeps skills lean | y |
| Auth, rate limits, latency, TTL | N/A because local file operations and local stdio MCP processes do not incur external network rate limits | No remote cloud APIs required for standard operation | y |
