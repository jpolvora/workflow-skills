---
id: null
slug: specialized-subagents-compiler
title: Optional Compiler and Host Projection for Specialized Workflow Subagents
source: local
specDate: 2026-09-09
step: 0
workflowId: specialized-subagents-compiler-20260909T120930Z
status: active
startedAt: "2026-09-09T12:13:28.922Z"
endedAt: "2026-09-09T12:13:28.922Z"
acRefs: []
---
# Specification — Optional Compiler and Host Projection for Specialized Workflow Subagents

## Description

In `workflow-skills`, the orchestrator (`ws-spec-to-pr`) delegates workflow steps (Steps 0–9) to subagents via the portable capability alias `dispatch-agent` ([`tools.md`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/tools.md)). Currently, host dispatch defaults to spawning generic assistant agents (Tier 1 `subagentTool`) or executing inline (Tier 3 `inline-isolated`). When a generic subagent is spawned, the orchestrator injects context pointers (`{us-dir}`, `{slug}`, handoffs, `ac-ledger.json`) into the turn prompt, requiring the subagent to dynamically read and parse `SKILL.md` files (e.g., `ws-plan-write`, `ws-implement-tasks`, `ws-code-review`) using tool calls (`Read`, `Grep`).

While this architecture guarantees complete host portability and neutrality, it has performance trade-offs:
1. **Bootstrapping Latency & Context Consumption:** Each step uses 1–2 initial tool calls to load skill instructions into context, adding 2,000–8,000 tokens of conversation history per subagent invocation.
2. **Weaker Prompt Position:** Instructions provided inside conversational user turns have lower instruction adherence in LLMs than instructions baked directly into the model's **System Prompt**.
3. **Missing Prompt Cache Leverage:** Generic agents reading skills on-the-fly cannot take full advantage of host-level prefix and prompt caching.

Host environments such as Cursor IDE (`.cursor/agents/*.md`), Claude Code (`.claude/agents/*.md`), and others now support **pre-configured specialized subagents** with dedicated system prompts, distinct model bindings, and isolated context boundaries.

However, naive adoption of IDE-specific subagents introduces severe architectural hazards:
- **Portability Violation:** Hardcoding host-specific folders into core workflow skills violates the mandatory Harness Neutrality contract ([`AGENTS.md`](file:///l:/source/workflow-skills/AGENTS.md)).
- **Source of Truth (SoT) Drift:** Manually maintaining duplicate agent definition files alongside `.agents/skills/ws-*` leads to immediate desynchronization.
- **Rogue Auto-Delegation:** Host-level semantic routers (such as Cursor's `description:` matcher) could opportunistically trigger subagents out-of-order, bypassing the orchestrator's deterministic Finite State Machine (FSM), quality gates, and mandatory pre-advance validation guards (`validate_state.cjs --pre-advance 4`).

### Proposed Solution: The Projected Host Subagent Compiler

This specification introduces an **opt-in compiler and projection mechanism** that bridges canonical skills with host-native specialized subagents while preserving 100% of the portable architecture:

```
.agents/skills/ws-* (Canonical SoT)
         │
         ▼
[compile_host_subagents.cjs]
         │
         ├─── (defaults.specializedSubagents.enabled: true)
         │       │
         │       ▼
         │   .cursor/agents/ws-step-*.md (Compiled Host Projections)
         │   - Pre-compiled system prompts from canonical skills
         │   - disable-model-invocation: true (prevents rogue auto-delegation)
         │   - Step-specific roles and output schemas
         │
         └─── (defaults.specializedSubagents.enabled: false)
                 │
                 ▼
             Default Generic Subagent Dispatch (Unchanged)
```

1. **Canonical Source of Truth:** All skill instructions, checklists, invariants, and schemas remain authored solely in `.agents/skills/ws-*/SKILL.md`.
2. **Project Configuration (`config.json`):** A new configuration block `defaults.specializedSubagents` controls enablement:
   ```json
   {
     "defaults": {
       "specializedSubagents": {
         "enabled": false,
         "targetHost": "auto",
         "agentPrefix": "ws"
       }
     }
   }
   ```
3. **Interactive Configuration Wizard (`ws-configure-project`):** An additional interview step asks the user whether to enable specialized subagents:
   - Option 1 (Recommended): `No (false) — Use standard portable subagents (generic subagents loading skills dynamically)`
   - Option 2: `Yes (true) — Compile specialized subagents for detected host IDE`
   When `Yes` is selected, the wizard invokes the compiler to generate/refresh the host agent files.
4. **Compiler Engine (`compile_host_subagents.cjs`):** Extracts system prompts, invariants, and output contracts from canonical skills, applies host-specific templates (e.g., Cursor Markdown frontmatter), enforces `disable-model-invocation: true`, and emits clean agent files.
5. **Runtime Host Dispatch Linking (`host-dispatch.md`):** When `defaults.specializedSubagents.enabled` is `true`, Tier 1 dispatch resolves the compiled specialized agent name for the active step (e.g., `ws-step-4-implementer`, `ws-step-6-reviewer`) and passes only runtime context pointers. When disabled or if the specialized agent is missing, dispatch falls back cleanly to the existing generic subagent execution ladder.

---

## Acceptance Criteria

- AC1: `config.json` schema (`config.schema.json`) and template (`config.json.example`) define `defaults.specializedSubagents` with properties `enabled` (boolean, default: `false`), `targetHost` (enum: `"auto"`, `"cursor"`, `"claude"`, `"generic"`, default: `"auto"`), and `agentPrefix` (string, default: `"ws"`).
- AC2: `ws-configure-project` includes an interactive interview step and `--section specializedSubagents` flag that asks the user whether to enable specialized subagents via a `user-gate` with Option 1 (Recommended) defaulting to `false` (standard portable dispatch).
- AC3: When `defaults.specializedSubagents.enabled` is `true`, `ws-configure-project` automatically runs `compile_host_subagents.cjs` to materialize the compiled agent projections for the detected or configured host IDE without manual user intervention.
- AC4: `auto_configure.cjs` supports `--section specializedSubagents` and `--auto` mode, defaulting `defaults.specializedSubagents.enabled` to `false` when missing or unconfigured, preserving existing configuration values.
- AC5: A dedicated compiler script `node {skillsRoot}/ws-shared/runtime/scripts/compile_host_subagents.cjs` compiles canonical skills into host-specific agent definitions supporting arguments `--repo-root <dir>`, `--host <cursor|claude|generic|auto>`, `--clean`, `--check`, and `--json`.
- AC6: For Cursor IDE (`targetHost: "cursor"` or detected `.cursor/` workspace), the compiler generates agent definition files under `.cursor/agents/` named `{agentPrefix}-step-{N}-{role}.md` (e.g., `ws-step-00-spec-write.md`, `ws-step-01-plan-write.md`, `ws-step-04-implement-tasks.md`, `ws-step-05-plan-verify.md`, `ws-step-06-code-review.md`, `ws-step-07-testing.md`, `ws-step-08-ship-pr.md`, `ws-step-09-fix-pr.md`).
- AC7: Every compiled Cursor subagent file contains valid YAML frontmatter specifying `name`, `description`, and mandatory `disable-model-invocation: true`.
- AC8: The `description` frontmatter field in all compiled subagents explicitly restricts invocation to workflow orchestrator dispatch and excludes general conversational keywords to prevent opportunistic rogue auto-delegation.
- AC9: The compiled subagent body contains the extracted domain instructions, behavioral invariants, checklists, and the canonical JSON `step-output` schema from the corresponding `ws-*` skill, eliminating the need for the subagent to read `SKILL.md` on boot.
- AC10: [`host-dispatch.md`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/host-dispatch.md) Tier 1 dispatch protocol is updated: when `defaults.specializedSubagents.enabled` is `true` and a matching compiled agent exists, `dispatch-agent` delegates to the specialized agent by name; otherwise, it executes via the existing generic subagent prompt.
- AC11: When `defaults.specializedSubagents.enabled` is `false`, disabled, or unconfigured, `dispatch-agent` operates identically to the baseline implementation, spawning generic subagents with context pointers and dynamic skill reading.
- AC12: Compiler clean mode (`--clean`) removes compiled subagent files from the target host directory without affecting canonical skills or consumer-owned configuration.
- AC13: Compiler check mode (`--check`) compares on-disk compiled agent files against canonical skills and exits non-zero if compiled agents are missing, stale, or have drifted from upstream skills.
- AC14: Compiled host agents are classified in `hub-layout.json` as generated host projections; documentation clarifies that `.cursor/agents/` may either be gitignored or committed to version control per team policy.
- AC15: Pre-advance validation (`validate_state.cjs --pre-advance <N>`), state recording (`update_state.cjs`), AC ledger tracking (`ac_ledger.cjs`), and quality gates remain mandatory and unchanged regardless of whether specialized subagents are enabled.
- AC16: When the subagent tool does not support named subagent routing or if dispatching to a named specialized subagent fails, `dispatch-agent` falls back silently to Tier 1 generic dispatch or Tier 3 inline execution without failing the workflow step.
- AC17: `npm run test`, `ws-check-harness`, and compiler unit tests exit 0, verifying compiler idempotence, syntax validity of generated markdown, and non-regression of default workflow paths.

---

## Notes

### Prior Work Sweep

- [`host-dispatch.md`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/host-dispatch.md): Defines the 3-tier dispatch ladder (`native-tool`, `cli-command`, `inline-isolated`) and context pointers architecture. This spec extends Tier 1 resolution to support named specialized agents.
- [`tools.md`](file:///l:/source/workflow-skills/.agents/skills/ws-shared/runtime/tools.md): Defines `dispatch-agent` capability alias and model presets (`plannerModel`, `executionModel`, `reviewerModel`, `testingModel`).
- [`0070-ws-shared-hybrid-config-layout.spec.md`](file:///l:/source/workflow-skills/.agents/specs/0070-ws-shared-hybrid-config-layout.spec.md): Established classification of runtime, templates, consumer configuration, and generated metadata in `hub-layout.json`.
- `ws-configure-project`: Manages interactive setup of `config.json` sections (stack, verification, defaults, autoload, specMemo, preview). This spec adds the `specializedSubagents` section.

### Design Intent

This is a projection/compilation enhancement designed to dramatically speed up step execution and reduce LLM token overhead in environments like Cursor IDE. It is **not** a migration away from portable skills. Shipped skill bodies under `.agents/skills/ws-*` remain the only canonical source of truth. The compiler merely "bakes" the skill prompt into the host's native agent file when the consumer opts in.

### Detailed Trade-Off Analysis (Pros & Cons)

| Dimension | Default Generic Subagents (`enabled: false`) | Compiled Specialized Subagents (`enabled: true`) |
| :--- | :--- | :--- |
| **Bootstrapping Turn Overhead** | **Cons:** Incurs 1–2 initial tool calls per step to inspect and read `SKILL.md`. | **Pros:** **0 turn overhead**. The agent boots with full instructions already in its system prompt. |
| **Context Window Consumption** | **Cons:** Consumes 2,000–8,000 tokens of conversation history per step for the skill body. | **Pros:** Skill body is part of the system prompt; leverages host-level **prompt caching / prefix caching**. |
| **Instruction Adherence** | **Cons:** Instructions reside in conversational user turns, where LLMs are more prone to drifting or forgetting negative constraints. | **Pros:** Instructions are compiled into the **System Prompt**, providing maximum constraint adherence. |
| **Host Portability & Neutrality** | **Pros:** 100% portable across any IDE, CLI, or host with a basic agent/subagent tool. | **Cons:** Requires host-specific compilation targets (e.g. `.cursor/agents/` for Cursor). |
| **Maintenance & Synchronization** | **Pros:** Zero sync overhead; changes to `SKILL.md` take effect immediately. | **Cons:** Compiled agent files must be recompiled when upstream skills are updated (`--check` / `update`). |
| **FSM Safety Risk** | **Pros:** Impossible to trigger accidentally from the host chat UI. | **Cons:** Requires strict frontmatter (`disable-model-invocation: true`) to prevent host auto-delegation. |

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing the orchestrator FSM with autonomous multi-agent swarms | Workflow integrity depends on deterministic, validated FSM transitions (Steps 0–9) and fail-closed quality gates. |
| Deprecating portable generic subagents | Portable dispatch across diverse hosts is a non-negotiable core principle of `workflow-skills`. |
| Cloud-based proprietary agent registries | All compilation and projection must occur locally within the consumer workspace. |
| Automatic modification of non-agent IDE settings | The compiler touches only agent definitions (`.cursor/agents/`), not user keybindings or general IDE settings. |

---

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default enablement state | `defaults.specializedSubagents.enabled: false` | Preserves baseline portable behavior; avoids creating unrequested host files. | y |
| Target host discovery | `auto` | Autodetects `.cursor/` directory or host capabilities; falls back gracefully. | y |
| Accidental host invocation guard | `disable-model-invocation: true` | Cursor IDE honors this flag to prevent models from spontaneously triggering subagents outside the orchestrator. | y |
| File location for Cursor | `.cursor/agents/` | Standard project-level agent path recognized by Cursor IDE. | y |
| Out-of-tree host requirements | N/A because non-Cursor hosts fall back to generic Tier 1 or Tier 3 dispatch | Only hosts with established agent folder conventions are compiled. | y |

---

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Feature bounded to `config.json` schema, `ws-configure-project` wizard, compiler script, and `host-dispatch.md` runtime resolution. | Inspect file diffs and ensure core orchestrator FSM logic is untouched. |
| Portability Invariant | Shipped skill bodies in `.agents/skills/ws-*` remain completely host-neutral. | Automated grep verifying zero `.cursor/` hardcoded paths inside `.agents/skills/ws-*/SKILL.md`. |
| FSM Guard Invariant | Compiled subagents cannot be invoked spontaneously by the host to bypass Step 0–3 planning. | Validate `disable-model-invocation: true` and scoped descriptions in generated files. |
| Fallback Safety | Disabling the feature or running on unsupported hosts causes zero workflow failures. | Run test suite with `defaults.specializedSubagents.enabled: false` and verify identical baseline behavior. |
| Authoring Validation | Specification passes canonical authoring validation. | Run `validate_spec.cjs --mode=authoring` with exit code 0. |

---

## Validation & Observation Notes

### Telemetry & Observable Signals

- `compile_host_subagents.cjs` execution logs:
  - `compiled-host-agents | host=cursor | count=8 | status=ok | ISO`
  - `clean-host-agents | host=cursor | removed=8 | ISO`
- Step telemetry in `{plansDir}/{slug}/telemetry.jsonl`:
  - `specialized-subagent-dispatch | step={N} | agent={agentName} | ISO`
  - `specialized-subagent-fallback | step={N} | reason={missing|disabled|unsupported} | ISO`
- Automated test command:
  - `node test/test-specialized-subagents-compiler.cjs`

### Negative & Failing Test Scenarios

- **Scenario 1 (Compiler invalid host target):** Executing `compile_host_subagents.cjs --host unsupported-ide` exits with code 1, emitting an actionable error message listing supported hosts (`cursor`, `claude`, `generic`, `auto`).
- **Scenario 2 (Stale agent detection in check mode):** When a canonical skill `SKILL.md` is updated and `compile_host_subagents.cjs --check` is run, it detects the content hash mismatch, outputs the drifting agent names, and exits with code 1.
- **Scenario 3 (Disabled fallback):** When `defaults.specializedSubagents.enabled` is `false`, `dispatch-agent` emits `specialized-subagent-fallback | reason=disabled` and executes via the generic prompt without attempting to call named specialized agents.
- **Scenario 4 (Missing agent graceful fallback):** When `defaults.specializedSubagents.enabled` is `true` but a specific step agent file (e.g. `ws-step-06-code-review.md`) was deleted from `.cursor/agents/`, `dispatch-agent` logs `specialized-subagent-fallback | reason=missing` and falls back to standard Tier 1 dispatch without throwing an unhandled exception or aborting the workflow.
- **Scenario 5 (Refusal to overwrite modified non-generated agents):** If a user has a custom agent in `.cursor/agents/` that does not contain the generated compiler signature header, the compiler refuses to overwrite it without an explicit `--force` flag.
