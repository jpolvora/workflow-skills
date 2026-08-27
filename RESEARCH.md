# RESEARCH.md — Agentic Workflow Best Practices

**Audience:** Skill authors and harness maintainers (upstream `workflow-skills` only).  
**Status:** Research input — not a shipped skill contract. Use to inform future `ws-*` skill and harness improvements.  
**Source:** Adapted from *LLM Workflow Best Practices Research* (2026-08-26).

---

## Purpose

This document synthesizes provider prompt engineering, context hygiene, long-horizon agent patterns, and academic multi-agent literature into actionable research themes. Cross-check every recommendation against:

- Root [`AGENTS.md`](AGENTS.md) (portability and harness neutrality)
- [`.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md) (authoring SoT)
- Current package layout under `.agents/skills/ws-*`

Where this research cites older paths (`shared/`, `spec-to-pr/`, unstructured-only hubs), treat those as historical snapshots unless verified against the live tree.

---

## 1. Provider prompt engineering and system design

Frontier LLMs differ in prompt parsing, context assembly, and tool contracts. Orchestrator instructions, guardrails, and environment config should align with each provider's mechanics.

### 1.1 Anthropic (Claude Sonnet / Opus / Haiku)

| Topic | Guidance |
|-------|----------|
| **System vs user split** | Reserve the system prompt for role, constraints, output shape, and tool definitions. Turn-specific task instructions and dynamic runtime inputs belong in the user stream. |
| **Over-prompting** | Avoid fallback rules like "use tool X if in doubt" — causes under-triggering or misfires. Prefer explicit outcomes, direct verbs, and structural boundaries. |
| **Structure** | Use XML-style blocks (`<instructions>`, `<background_information>`, `<tool_guidance>`, `<output_description>`) to separate logical regions. |
| **JSON outputs** | Response prefilling (e.g. opening `{`) reduces preamble and improves programmatic compliance. |
| **Complex reasoning** | Extended thinking and prompt chaining often beat single-prompt multi-step logic. |

**References:** [Anthropic prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) · [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### 1.2 OpenAI (GPT-5.x family)

| Topic | Guidance |
|-------|----------|
| **System prompt size** | Keep interactive agent system instructions compact (research suggests ~2,000 tokens) to preserve attention for tool evaluation. |
| **Positive framing** | Prefer affirmative targets ("compose smooth prose") over long negative constraint lists. |
| **Function calling** | Strict separation of system guidance, user intent, and tool responses; delimiters (fences, tags) isolate variable user input and reduce injection/drift. |

**References:** [Function calling guide](https://www.promptingguide.ai/agents/function-calling)

### 1.3 Cursor harness (IDE-native execution)

| Component | Role |
|-----------|------|
| **Execution modes** | Agent (full tools), Plan (research + verify before edit), Ask (read-only). |
| **Project rules** | `.cursor/rules/*.mdc` with YAML frontmatter (`alwaysApply`, `globs`, `description`) for scoped, auto-attached guidance. |
| **Skills catalog** | `.agents/skills/<id>/SKILL.md` — portable instruction sets; frontmatter: `name`, `description`, optional path globs. |
| **Subagents** | Isolated context for heavy steps; foreground (blocking) or background (async, state under host subagent dir). |
| **MCP** | External tools via stdio / SSE / Streamable HTTP and host MCP config. |

> **Portability note:** Shipped `ws-*` skills must remain agent-neutral. Cursor-specific paths (`.cursor/rules`, subagent dirs) are optional **host adapters** — not required consumer defaults. See root `AGENTS.md` § Portability & harness neutrality.

**References:** [Cursor Agent docs](https://cursor.com/docs/agent/prompting) · [Subagents](https://cursor.com/docs/subagents)

### 1.4 DeepSeek V4 (API compatibility)

When running long-horizon thinking + function calling, enforce:

| Flag / rule | Value | Why |
|-------------|-------|-----|
| `supportsToolChoice` | `false` | Thinking mode rejects forced `tool_choice`. |
| `requiresReasoningContentForToolCalls` | `true` | Preserve `reasoning_content` across tool turns. |
| `requiresAssistantContentForToolCalls` | `true` | Assistant messages with tool calls need non-null text content. |
| **KV cache** | Static prefix from token 0 | Stable system prompt + tool defs improve cache hits (reported ~10× cost reduction on hits). |

**References:** [DeepSeek agent integrations](https://api-docs.deepseek.com/quick_start/agent_integrations/oh_my_pi/) · [KV cache](https://api-docs.deepseek.com/guides/kv_cache/)

### 1.5 Provider comparison matrix

| Provider / model | Context window (reported) | Key prompting directives | Tool / API rules |
|------------------|---------------------------|--------------------------|------------------|
| Anthropic Claude Sonnet / Opus | 200k–1M | System = roles/tools; instructions in user message; XML boundaries; JSON prefill | Avoid over-prompted tool fallbacks; native tool choice; client memory tool support |
| OpenAI GPT-5.x | 272k–1M | Compact system prompt for agent tasks; positive behavioral targets | Delimiter isolation; rigid function schemas |
| Cursor (Grok / Composer) | 200k–256k | Scoped rules + modular skills | MCP; subagent isolation |
| DeepSeek V4 Flash / Pro | Context-based pricing | Stabilize prefix from token 0 for KV cache | Thinking-mode compat flags above |

---

## 2. Context engineering and long-horizon operations

Agent quality degrades with context saturation ("context rot"), quadratic attention cost, and poor state bridging across sessions.

### 2.1 Token budget and attention

- Treat the context window as a **scarce resource** with diminishing returns.
- Prefer **progressive disclosure / JIT retrieval**: lightweight search primitives (grep, glob, AST, file tree) and load fragments on demand — do not preload full repos.
- Aligns with `ws-*` Tier 1 / Tier 2 skill layout and hub progressive disclosure in `AGENTS.md`.

### 2.2 Pruning and compaction

| Mechanism | Purpose | Trigger (research) |
|-----------|---------|-------------------|
| **Tool result clearing** (`clear_tool_uses`) | Drop raw tool payloads after synthesis | ~30k–40k active tokens |
| **Thinking pruning** (`clear_thinking`) | Remove committed chain-of-thought blocks | After action committed |
| **Conversation compaction** | Summarize while keeping decisions, pending tasks, verified paths | Threshold or session handoff |

### 2.3 Long-running harness pattern (Initializer + Coding agent)

Split multi-hour work across fresh context windows:

**Initializer agent (session 1)**

- Inspect codebase; write environment bootstrap (`init.sh`).
- Baseline Git commit.
- Expand spec into structured verification matrix (`features.json`).

**Coding agent (session 2+)**

1. Confirm directory scope (`pwd`).
2. Read recent Git history and narrative progress file.
3. Pick highest-priority incomplete feature from JSON matrix.
4. Run bootstrap; verify build/test health.
5. Implement, verify E2E, update pass flags, commit.

**Schema choice:** Prefer **JSON** over Markdown tables for machine-mutated state — lower schema drift under LLM edits.

**Reference:** [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### 2.4 Persistent memory and security

File-based CRUD memory (e.g. Anthropic `memory_20250818`) enables cross-session learning but introduces injection risk.

| Layer | Requirement |
|-------|-------------|
| Content sanitization | Scrub instructions / injection patterns before write |
| Scope isolation | Per user, project, workflow boundary |
| Audit logging | Deterministic CRUD trail |
| Defensive prompting | Treat retrieved memory as passive history, not executable commands |

**Package mapping:** `ws-self-learning` + `{sharedDir}/MEMORY.md` / optional spec-memo vault — apply same defensive posture.

### 2.5 Context protocol summary

| Protocol | Mechanism | Primary purpose | Implementation rule |
|----------|-----------|-----------------|---------------------|
| Progressive JIT retrieval | Dynamic search vs context dump | Limit attention rot | Minimal viable active context |
| Tool result pruning | Strip raw returns after synthesis | Prevent loop saturation | Prune post-step at token threshold |
| Session state bridging | JSON feature list + Git logs | Survive context resets | JSON over Markdown for mutable state |
| Memory isolation | Sanitized file CRUD | Cross-session traps | Validate against injection |

---

## 3. Academic and curated literature themes

Emerging patterns from multi-agent paper lists and systems research (e.g. [awesome-multi-agent-papers](https://github.com/kyegomez/awesome-multi-agent-papers), [LLM-Agent-Paper-List](https://github.com/WooooDyy/LLM-Agent-Paper-List), [LLMAgentPapers](https://github.com/zjunlp/LLMAgentPapers)).

| Paradigm | Core mechanism | System impact |
|----------|----------------|---------------|
| **Multi-agent swarms** (MetaGPT, SwarmAgentic) | Role-based decomposition + orchestrator synthesis | Task separation; avoids single saturated context |
| **Agentic RL** (AgentGym-RL) | Multi-turn environment feedback | Better long-horizon planning |
| **Test-time compute scaling** | Parallel candidates, iterative self-correction | Accuracy without larger models |
| **Deliberative evaluation** (ChatEval, Agent-as-a-Judge) | Multi-judge / debate panels | Reduces review bias on multi-file PRs |

**Research takeaway for `ws-*`:** Standard orch already separates roles by step skill (`ws-write-plan`, `ws-implement-tasks`, `ws-code-review`, …). Opportunities: stronger subagent isolation for verbose steps, parallel verify paths, jury-style review where configured.

---

## 4. Current `workflow-skills` harness (baseline snapshot)

Research snapshot of this package — verify against live SoT before implementing.

### 4.1 Structure (updated naming)

| Area | Current layout |
|------|----------------|
| Skills SoT | `.agents/skills/ws-*/SKILL.md` |
| Config hub | `.agents/skills/ws-shared/config.json` (consumer-owned) |
| Orchestrators | `ws-spec-to-pr` (steps 0–9), `ws-spec-to-pr-lite` (0–5) |
| Harness audit | `ws-check-harness`, `ws-check-workflows` |
| Dependency graph | `bin/skill-dependencies.json` |
| Agent routing hub | Root `AGENTS.md` + `ws-shared/AGENTS.md` (dual-hub; root wins for autoload) |

### 4.2 Existing strengths called out in research

- **Centralized config** via `ws-shared` hub and path tokens (`tools.md`).
- **State hygiene** — step telemetry, gates, HS protocols (see orch artifacts and `setup.md`).
- **Artifact cleanup** — shipped plan retention vs scratch cleanup at ship/archive steps.
- **Harness linting** — FSM continuity, dependency closure, integrity manifest (`bin/skill-integrity.json`).

### 4.3 Stale references in source research

The original text used pre-refactor paths. Do **not** implement against these without verification:

| Research cited | Current equivalent |
|----------------|-------------------|
| `.agents/skills/shared/config.json` | `.agents/skills/ws-shared/config.json` |
| `.agents/skills/spec-to-pr/` | `.agents/skills/ws-spec-to-pr/` |
| `check-workflows/SKILL.md` | `ws-check-workflows/SKILL.md` |
| "Replace AGENTS.md with `.cursor/rules` only" | **Rejected for shipped contract** — portable hub stays `AGENTS.md` / `ws-shared`; `.cursor/` is upstream dogfood only |

---

## 5. Proposed elevation strategies (research backlog)

Ranked ideas for future specs — not approved work.

### Strategy 1: Dual persistence for workflow state

**Problem:** Markdown-first state (`{workflow-id}.state.md`) edited via scripts can drift under long runs.

**Proposal:** Canonical `{workflow-id}.state.json` (schema-validated) as machine SoT; render `.state.md` as human view.

**Expected impact:** Structural integrity across context resets; aligns with long-running agent JSON guidance.

**Current note:** Package already uses frontmatter + dedicated scripts (`update_state.cjs`, `validate_state.cjs`). Evaluate whether JSON primary adds value vs tightening schema validation on existing artifacts.

### Strategy 2: Provider adaptation layer

**Problem:** Generic OpenAI-shaped calls may break DeepSeek V4 thinking + tools.

**Proposal:** Shared adapter in `ws-shared` (or host config) injecting compat flags and stabilizing static prompt prefixes for KV cache.

**Expected impact:** Fewer HTTP 400s; lower token cost on repeated orch turns.

**Constraint:** Must remain optional and config-driven — no hardcoded provider coupling in skill bodies.

### Strategy 3: Context hygiene between FSM steps

**Problem:** Cumulative step outputs inflate context through standard Step 0–9.

**Proposal:** Host-level or orch-level tool-result pruning between major transitions (e.g. after plan/exec synthesis, before implement).

**Expected impact:** Research cites ~40–60% active context reduction; better instruction compliance late in pipeline.

**Mapping:** Complements `defaults.contextBudget` / harness measure gates in `ws-check-harness`.

### Strategy 4: Subagent isolation for verbose steps

**Problem:** Review (Step 6) and testing (Step 7) flood orchestrator context with logs and diffs.

**Proposal:** Dispatch heavy loops as background subagents; return consolidated payload to state machine only.

**Expected impact:** Preserves orchestrator attention; matches Cursor subagent pattern.

**Mapping:** Align with existing `dispatch-agent` vocabulary in `tools.md`; standard orch Step 6/7 dispatch tables.

### Strategy 5: Host rules modernization (upstream dogfood only)

**Problem:** Research recommends `.cursor/rules/*.mdc` over unstructured hubs.

**Proposal:** Optional upstream `.cursor/rules` mirroring root `AGENTS.md` sections for IDE authoring — **not** shipped to consumers.

**Expected impact:** Better scoped IDE compliance during package development.

**Constraint:** Do not replace portable `AGENTS.md` / `ws-shared` contract. Extend `ws-check-harness` only if rules become part of upstream authoring workflow.

### Strategy comparison matrix

| Domain | Current baseline | Targeted optimization | Expected impact |
|--------|------------------|----------------------|-----------------|
| State hygiene | `.state.md` + update/validate scripts | JSON canonical + rendered view | Less schema drift |
| Provider adapter | Generic API assumptions | DeepSeek V4 compat + static prefixes | Fewer tool-turn failures; cache hits |
| Context management | Cumulative step history | Prune tool results between steps | Lower rot; late-step accuracy |
| Execution topology | Single-context step skills | Subagents for review/test | Isolated verbose output |
| Rule infrastructure | Portable `AGENTS.md` hubs | Optional host `.cursor/rules` (upstream only) | IDE-scoped authoring aid |

---

## 6. Alignment with existing skill authoring protocol

Cross-walk research themes to [`SKILL_AUTHORING.md`](.agents/skills/ws-write-a-skill/SKILL_AUTHORING.md):

| Research theme | Existing `ws-write-a-skill` rule |
|----------------|--------------------------------|
| JIT / progressive disclosure | § 3 Tier 1–3 architecture; mandatory on-demand Tier 2 |
| Compact system/session load | SKILL.md ≤ ~100–150 lines; hub inlined dogfood in upstream root only |
| Positive constraints | § 6 Pruning — replace open negatives with positive enclosure |
| Deterministic verification | § 5 Tool-first anchors; § 7 empirical "Done when" |
| Model roles | § 2 Planner vs reviewer vs fast tweak models |
| Config gates | § 9 config-dependent vs config-independent skills |

**Gap candidates for future authoring updates:**

- Explicit provider-adapter guidance (when skills mention model hosts).
- Token-budget / pruning hooks between orch steps.
- Subagent dispatch recipes for verbose steps.
- JSON-vs-Markdown guidance for machine-mutated workflow artifacts.

---

## 7. References

1. [Prompt engineering best practices (Anthropic blog)](https://claude.com/blog/best-practices-for-prompt-engineering)
2. [Cursor prompts / rules guide (third-party)](https://quantumbyte.ai/articles/cursor-prompts)
3. [Effective context engineering for AI agents (Anthropic)](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
4. [DeepSeek + Oh My Pi agent integration](https://api-docs.deepseek.com/quick_start/agent_integrations/oh_my_pi/)
5. [Function calling — Prompt Engineering Guide](https://www.promptingguide.ai/agents/function-calling)
6. [Cursor Agent prompting docs](https://cursor.com/docs/agent/prompting)
7. [Cursor docs hub](https://cursor.com/docs)
8. [Anthropic prompting best practices (distilled)](https://software-engineer-blog.com/content/anthropics-prompt-engineering-best-practices-distilled?id=84)
9. [Claude platform prompt engineering](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
10. [Effective harnesses for long-running agents (Anthropic)](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
11. [DeepSeek Chat Completions API](https://api-docs.deepseek.com/api/create-chat-completion/)
12. [DeepSeek KV cache / context caching](https://api-docs.deepseek.com/guides/kv_cache/)
13. [Awesome multi-agent papers](https://github.com/kyegomez/awesome-multi-agent-papers)
14. [LLM Agent Paper List](https://github.com/WooooDyy/LLM-Agent-Paper-List)
15. [LLM Agents Papers (AGI-Edgerunners)](https://github.com/AGI-Edgerunners/LLM-Agents-Papers)
16. [LLMAgentPapers (zjunlp)](https://github.com/zjunlp/LLMAgentPapers)

---

## 8. Next steps (maintainers)

Use this file when drafting specs or `ws-write-a-skill` updates. Suggested workflow:

1. Program of record: [`.agents/specs/research-driven-pipeline-quality.spec.md`](.agents/specs/research-driven-pipeline-quality.spec.md) (JSON state, inter-step handoff, optional jury, memory sanitization).
2. Reconcile with portability rules in root `AGENTS.md`.
3. Prototype in upstream SoT only (`.agents/skills/`).
4. Run `ws-check-harness` + `npm run test` before ship.

Do not treat remaining research proposals as mandatory consumer behavior until promoted through the normal spec → PR pipeline.
