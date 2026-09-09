---
slug: specialized-subagents-compiler
title: Optional Compiler and Host Projection for Specialized Workflow Subagents
status: active
shared_understanding: confirmed
step: 2
workflowId: specialized-subagents-compiler-20260909T120930Z
startedAt: "2026-09-09T12:09:30Z"
endedAt: "2026-09-09T12:26:43.472Z"
acRefs: []
---
## 0. Summary & Business Rules

### Objective
Provide an opt-in compiler and projection mechanism (`compile_host_subagents.cjs`) that compiles canonical workflow skills (`.agents/skills/ws-*`) into host-native specialized subagent definitions (e.g. `.cursor/agents/ws-step-*.md` for Cursor IDE), eliminating per-step bootstrap turn latency and conversational token overhead while preserving 100% harness portability and orchestrator FSM determinism.

### Business Rules & Core Invariants
- **Canonical Source of Truth (SoT):** All workflow instructions, checklists, and invariants reside exclusively in `.agents/skills/ws-*/SKILL.md`. Host agents are generated projections, never the SoT.
- **Opt-in Default:** `defaults.specializedSubagents.enabled` defaults to `false`. Without explicit configuration or opt-in, workflow execution uses standard portable generic subagents.
- **FSM & Anti-Rogue Invocation Guard:** Compiled agents MUST have `disable-model-invocation: true` and scoped descriptions that restrict their use strictly to orchestrator dispatch (`dispatch-agent`), preventing opportunistic rogue auto-delegation by host IDE semantic matchers.
- **Graceful Fallback:** If specialized subagents are disabled, missing on disk, or unsupported by the host tool, `dispatch-agent` falls back silently to generic subagent execution without failing workflow steps.
- **Clean & Check Idempotence:** The compiler provides `--clean` to remove compiled projections and `--check` to detect content drift between canonical skills and on-disk compiled files. Non-generated custom agent files (missing compiler signature header) are protected from accidental overwrite unless `--force` is provided.
- **Single Runtime Language Invariant (from MEMORY trap):** Use Node.js (`.cjs`) exclusively for the compiler and configure integrations; avoid redundant dual Python scripts.
- **Cursor Host Integration (from Official Docs):** Target `.cursor/agents/`. Support frontmatter fields: `name`, `description`, `model` (inherit or mapped preset), `readonly` (set true for Step 5 verifier), and mandatory `disable-model-invocation: true`.

---

## 1. Definition of Ready & Scope

### In-Scope
- Schema updates in `.agents/skills/ws-shared/runtime/config.schema.json` and `.agents/skills/ws-shared/templates/config.json.example` adding `defaults.specializedSubagents`.
- Interactive interview additions in `ws-configure-project` and non-interactive gap filling in `.agents/skills/ws-configure-project/scripts/auto_configure.cjs` supporting `--section specializedSubagents`.
- Dedicated standalone compiler script `.agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs` with `--repo-root`, `--host`, `--clean`, `--check`, and `--json` flags.
- Runtime dispatch resolution updates in `.agents/skills/ws-shared/runtime/host-dispatch.md` for Tier 1 named subagent routing with fail-safe fallback.
- Classification of generated projections in `.agents/skills/ws-shared/runtime/hub-layout.json`.
- Comprehensive automated test suite in `test/test-specialized-subagents-compiler.cjs`.

### Out-of-Scope
- Replacing orchestrator FSM with autonomous swarms.
- Deprecating portable generic subagents.
- Modifying general host IDE settings or keybindings.

---

## 2. Technical Design & Architecture

### Architectural Layers
1. **Configuration Layer:**
   - Schema: `defaults.specializedSubagents` object with `enabled` (boolean, default: `false`), `targetHost` (enum: `"auto"`, `"cursor"`, `"claude"`, `"generic"`, default: `"auto"`), and `agentPrefix` (string, default: `"ws"`).
   - Seed template: `config.json.example` updated with commented defaults.
2. **Compiler Engine (`compile_host_subagents.cjs`):**
   - Resolves canonical skills:
     - Step 0: `.agents/skills/ws-spec-write/SKILL.md` -> `ws-step-00-spec-write.md`
     - Step 1: `.agents/skills/ws-plan-write/SKILL.md` -> `ws-step-01-plan-write.md`
     - Step 2: `.agents/skills/ws-plan-interview/SKILL.md` -> `ws-step-02-plan-interview.md`
     - Step 3: `.agents/skills/ws-plan-to-tasks/SKILL.md` -> `ws-step-03-plan-to-tasks.md`
     - Step 4: `.agents/skills/ws-implement-tasks/SKILL.md` -> `ws-step-04-implement-tasks.md`
     - Step 5: `.agents/skills/ws-plan-verify/SKILL.md` -> `ws-step-05-plan-verify.md` (with `readonly: true`)
     - Step 6: `.agents/skills/ws-code-review/SKILL.md` -> `ws-step-06-code-review.md`
     - Step 7: `.agents/skills/ws-testing/SKILL.md` -> `ws-step-07-testing.md`
     - Step 8: `.agents/skills/ws-ship-pr/SKILL.md` -> `ws-step-08-ship-pr.md`
     - Step 9: `.agents/skills/ws-fix-pr/SKILL.md` -> `ws-step-09-fix-pr.md`
   - Host Target Resolution: `cursor` targets `.cursor/agents/`. `claude` targets `.claude/agents/`. `auto` checks workspace markers (e.g. `.cursor/`) or falls back. Unsupported host exits code 1 with actionable list.
   - Generation Signature:
     `<!-- @generated by workflow-skills compile_host_subagents.cjs. DO NOT EDIT DIRECTLY. hash:{sha256} -->`
   - Safety checks: Refuse overwrite of existing files lacking the signature unless `--force` is passed.
   - Verification modes: `--check` validates existing compiled files against canonical skills; `--clean` deletes compiled files safely.
3. **Runtime Dispatch Adapter (`host-dispatch.md`):**
   - Tier 1 named agent resolution when `defaults.specializedSubagents.enabled` is `true`.
   - Silent fallback to generic prompt if agent file is missing, disabled, or if host invocation fails.
4. **Hub Layout & Packaging Manifest:**
   - Update `hub-layout.json` to classify generated host projections.
   - Update `skill-dependencies.json` if needed.

---

## 3. Step-by-Step Plan

### Task T01: Configuration Schema and Examples (AC1)
- Modify `.agents/skills/ws-shared/runtime/config.schema.json` to define `defaults.specializedSubagents` with properties `enabled`, `targetHost`, and `agentPrefix`.
- Modify `.agents/skills/ws-shared/templates/config.json.example` to include the `specializedSubagents` configuration block.
- Verify schema validation via tests.
- **Affected files:**
  - `.agents/skills/ws-shared/runtime/config.schema.json`
  - `.agents/skills/ws-shared/templates/config.json.example`

### Task T02: Hub Layout Classification & Documentation (AC14)
- Update `.agents/skills/ws-shared/runtime/hub-layout.json` to classify generated host projections under `generatedHostProjections` or `generatedLocal`.
- Ensure documentation explains that `.cursor/agents/` may be gitignored or tracked per project policy.
- **Affected files:**
  - `.agents/skills/ws-shared/runtime/hub-layout.json`

### Task T03: Standalone Host Subagent Compiler Engine (AC5, AC6, AC7, AC8, AC9, AC12, AC13, AC15)
- Implement `.agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs`.
- Support CLI arguments: `--repo-root`, `--host`, `--clean`, `--check`, `--json`, `--force`.
- Implement skill extraction logic: read canonical `SKILL.md` bodies, strip frontmatter, assemble specialized agent prompt with role description, behavioral invariants, and JSON `step-output` schemas.
- Implement frontmatter generator with `name: {prefix}-step-{N}-{role}`, scoped `description: "..."` restricting to workflow orchestrator dispatch, and mandatory `disable-model-invocation: true`. Set `readonly: true` for Step 5 verifier.
- Implement signature header `<!-- @generated by workflow-skills compile_host_subagents.cjs. DO NOT EDIT DIRECTLY. hash:{hash} -->`.
- Implement safe clean (`--clean`) removing only signature-matching files.
- Implement drift check (`--check`) comparing on-disk hash with fresh compilation.
- **Affected files:**
  - `.agents/skills/ws-shared/runtime/scripts/compile_host_subagents.cjs`

### Task T04: Configure-Project Integration & Auto-Configure (AC2, AC3, AC4)
- Update `.agents/skills/ws-configure-project/scripts/auto_configure.cjs` to support `--section specializedSubagents` and `--auto` mode, defaulting `defaults.specializedSubagents.enabled` to `false` without overwriting existing settings.
- Update `.agents/skills/ws-configure-project/SKILL.md` and `.agents/skills/ws-configure-project/INTERVIEW.md` documenting the interactive interview step for specialized subagents.
- Ensure `ws-configure-project` triggers `compile_host_subagents.cjs` when enabled is `true`.
- **Affected files:**
  - `.agents/skills/ws-configure-project/scripts/auto_configure.cjs`
  - `.agents/skills/ws-configure-project/SKILL.md`
  - `.agents/skills/ws-configure-project/INTERVIEW.md`

### Task T05: Runtime Host Dispatch Updates & Fallback Ladder (AC10, AC11, AC16)
- Update `.agents/skills/ws-shared/runtime/host-dispatch.md` to document Tier 1 specialized subagent resolution.
- Define fallback rules: if disabled, missing, or tool unsupported, fall back cleanly to generic subagent prompt or Tier 3 inline execution without failing the workflow.
- **Affected files:**
  - `.agents/skills/ws-shared/runtime/host-dispatch.md`

### Task T06: Automated Test Suite & Negative Scenarios (AC17, NS1, NS2, NS3, NS4, NS5)
- Create `test/test-specialized-subagents-compiler.cjs`.
- Test cases:
  - V01: Configuration schema validation for `defaults.specializedSubagents` (AC1).
  - V02: `compile_host_subagents.cjs` invalid host exits code 1 with actionable message (NS1).
  - V03: `compile_host_subagents.cjs` compiles Cursor subagents with valid frontmatter, `disable-model-invocation: true`, and signature header (AC5, AC6, AC7, AC8, AC9).
  - V04: Check mode detects drift when canonical skill changes (NS2, AC13).
  - V05: Clean mode removes generated agents safely (AC12).
  - V06: Protection of custom non-generated agent files without `--force` (NS5).
  - V07: `auto_configure.cjs --section specializedSubagents` and `--auto` defaults to false (AC2, AC4).
  - V08: Automatic compilation when enabled via `auto_configure.cjs` / wizard (AC3).
  - V09: Runtime host dispatch resolution and fallback behavior (AC10, AC11, AC16, NS3, NS4).
  - V10: Full test suite passes: `npm run test` and `ws-check-harness` exit 0 (AC17).
- **Affected files:**
  - `test/test-specialized-subagents-compiler.cjs`

---

## 4. Permissions, Tenancy & i18n

- **File System Permissions:** All file operations are constrained to repo-root relative paths (`.agents/`, `.cursor/agents/`, `test/`).
- **Tenancy:** Not applicable (local CLI developer tooling).
- **i18n:** English (en-us) only for all compiler messages, generated agent bodies, frontmatter descriptions, and test outputs.

---

## 5. Test Coverage

Map each spec Acceptance Criteria to automated test verification:

| AC ID | Description | Test Verification |
|---|---|---|
| AC1 | `config.json` schema and example define `defaults.specializedSubagents` | V01: `test_config_schema_validation` in `test/test-specialized-subagents-compiler.cjs` |
| AC2 | `ws-configure-project` interview step & `--section specializedSubagents` gate defaults false | V07: `test_auto_configure_section` in `test/test-specialized-subagents-compiler.cjs` |
| AC3 | `ws-configure-project` auto-runs compiler when `enabled: true` | V08: `test_auto_compile_on_enable` in `test/test-specialized-subagents-compiler.cjs` |
| AC4 | `auto_configure.cjs` supports `--section specializedSubagents` and `--auto` | V07: `test_auto_configure_section` in `test/test-specialized-subagents-compiler.cjs` |
| AC5 | Standalone compiler script supporting `--repo-root`, `--host`, `--clean`, `--check`, `--json` | V03: `test_compiler_cli_options` in `test/test-specialized-subagents-compiler.cjs` |
| AC6 | Cursor agent files generated under `.cursor/agents/{prefix}-step-{N}-{role}.md` | V03: `test_cursor_agents_generation` in `test/test-specialized-subagents-compiler.cjs` |
| AC7 | Valid YAML frontmatter with `name`, `description`, `disable-model-invocation: true` | V03: `test_frontmatter_invariants` in `test/test-specialized-subagents-compiler.cjs` |
| AC8 | Description restricts invocation to orchestrator dispatch, excluding general chat keywords | V03: `test_description_anti_rogue` in `test/test-specialized-subagents-compiler.cjs` |
| AC9 | Compiled body contains extracted instructions, invariants, checklists, and JSON output schema | V03: `test_compiled_body_completeness` in `test/test-specialized-subagents-compiler.cjs` |
| AC10 | `host-dispatch.md` updated: Tier 1 delegates to specialized agent when enabled | V09: `test_dispatch_tier1_specialized` in `test/test-specialized-subagents-compiler.cjs` |
| AC11 | When disabled or unconfigured, dispatch-agent operates identically to baseline generic prompt | V09: `test_dispatch_disabled_fallback` in `test/test-specialized-subagents-compiler.cjs` |
| AC12 | Compiler clean mode (`--clean`) removes compiled subagents without touching canonical skills | V05: `test_clean_mode` in `test/test-specialized-subagents-compiler.cjs` |
| AC13 | Compiler check mode (`--check`) detects missing/stale/drifting compiled agents | V04: `test_check_mode_drift` in `test/test-specialized-subagents-compiler.cjs` |
| AC14 | Compiled host agents classified in `hub-layout.json` as generated host projections | V01: `test_hub_layout_classification` in `test/test-specialized-subagents-compiler.cjs` |
| AC15 | Pre-advance validation, state recording, AC ledger tracking remain mandatory & unchanged | V10: `test_harness_integrity` in `test/test-specialized-subagents-compiler.cjs` |
| AC16 | Graceful fallback to generic or inline dispatch if specialized agent missing or tool unsupported | V09: `test_dispatch_missing_fallback` in `test/test-specialized-subagents-compiler.cjs` |
| AC17 | `npm run test`, `ws-check-harness`, and compiler unit tests exit 0 | V10: `test_full_suite_regression` in `test/test-specialized-subagents-compiler.cjs` |

Negative Scenarios:
- NS1: Unsupported host target -> V02: `test_unsupported_host_target`
- NS2: Stale agent drift in check mode -> V04: `test_check_mode_drift`
- NS3: Disabled fallback -> V09: `test_dispatch_disabled_fallback`
- NS4: Missing agent graceful fallback -> V09: `test_dispatch_missing_fallback`
- NS5: Refusal to overwrite non-generated custom agent without `--force` -> V06: `test_refusal_to_overwrite_custom_agent`

---

## 6. Stack & Security Invariants Verification Plan

### Touched Framework Boundaries
1. **Node.js Subprocess Execution & CLI Arguments:**
   - Ensure `compile_host_subagents.cjs` and `auto_configure.cjs` sanitize all file paths and avoid raw shell command interpolation.
   - Use `child_process.spawnSync` with array argument lists and safe path resolution.
2. **File System Safety & Path Traversal Defense:**
   - Constrain file writes strictly within target repo root and host directories (`.cursor/agents/`).
   - Guard against overwriting arbitrary files: verify target is within target host directory and check signature before writing/unlinking.
3. **YAML Frontmatter Integrity:**
   - Ensure generated frontmatter complies strictly with host parsers (valid YAML, quoted strings when containing colons, valid boolean `disable-model-invocation: true`).
4. **Harness Neutrality & No Hardcoded Host Coupling:**
   - Shipped skills under `.agents/skills/ws-*` MUST NOT contain hardcoded `.cursor/` paths in skill bodies.
   - All host directory bindings remain parameterized and encapsulated inside the compiler script and host dispatch adapter.

---

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Domain entities and mappings encapsulated.
- [x] Configuration schema migrations created and validated.
- [x] Authorization and file system safety checks applied.
- [x] Stack & security invariants verified (subprocess safety, path traversal defense, YAML validity).
- [x] Test cases cover all ACs (AC1–AC17) and negative scenarios (NS1–NS5).

---

## 8. Open Questions
*None. All requirements, defaults, and host targets are fully specified in the specification.*
