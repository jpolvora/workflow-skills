# Feature Boundary

This companion records the user-facing architectural and implementation decisions for `host-agent-environment-adapter`: adapting `workflow-skills` to operate reliably and portably across diverse host agent environments (such as Cursor, Google Antigravity / Gemini IDE, OpenCode, Claude Code, and headless CLI runners) without violating harness neutrality or leaking product brand names into core skill contracts.

In scope:
- Dynamic session capability probing (detecting available interactive choice tools, subagent dispatch tools, and CLI environments).
- Interactive gate binding (routing `user-gate` to host structured choice tools when available, and strictly enforcing turn-yielding on text/markdown fallback).
- Multi-tier subagent dispatch fallback ladder (Native Tool -> Background CLI Task -> Inline Isolated Execution with Clean Context Pointers).
- Reconciliation of the "Orch never edits code" invariant under Inline Isolated Execution.
- Interactive execution cadence guardrail ("One Step Per Turn") to prevent fast/flash LLMs from eagerly running ahead across step boundaries.

Out of scope:
- Creating proprietary host-specific extension bundles or IDE-specific plugins.
- Hardcoding product brand names into `ws-shared/tools.md` or `ws-shared/gates.md`.
- Rewriting downstream verification tools or altering SCM provider contracts.

# Implementation Decisions

1. **Chosen Detection Mechanism: Dynamic Tool Palette & Environment Inspection**
   - *Rationale:* Rather than maintaining static lists of IDE product names or requiring manual user configuration before every session, the orchestrator dynamically inspects the session's declared tool palette at bootstrap.
   - If a modal choice tool (such as `ask_question`) is declared, the session binds `user-gate` to it.
   - If a subagent dispatch tool (such as `dispatch-agent` or `Task`) is declared, the session utilizes native dispatch.
   - If neither is declared, the session automatically falls back to Inline Isolated Execution.
   - Config override (`defaults.hostAdapter.mode` in `config.json`) retains top precedence if a user explicitly wishes to force a mode (`native-tool`, `cli-command`, `inline-isolated`).

2. **Chosen Gate UX: Modal Tool Preferred, Strict Turn-Yielding on Fallback**
   - *Rationale:* Fast models like Gemini Flash suffer from eager completion: when presented with a choice in text, they often generate the question and immediately issue tool calls for the subsequent step in the exact same response turn.
   - In hosts with modal choice tools (e.g. Antigravity IDE), calling the modal tool physically halts execution until the user submits their choice.
   - In hosts without modal choice tools, the prompt must contain an imperative negative constraint forbidding any tool calls in the same turn as a markdown gate prompt.

3. **Chosen Subagent Fallback: Inline Isolated Execution (Clean Context Pointers)**
   - *Rationale:* In hosts lacking native subagent spawning tools (like Antigravity or standard IDE sidebars), demanding that the orchestrator spawn a subagent leads to execution deadlocks.
   - By enabling Inline Isolated Execution, the session model temporarily adopts the specific persona of the step (e.g., Coder for Step 4), strictly scoped to discrete context pointers (`handoff/step-{N-1}.json`, `ac-ledger.json`), edits files using native file tools, runs checks, emits `step-output`, and logs state. This unlocks full workflow execution without needing external subagent processes.

# Deferred Ideas

- Building a standalone capability-probing script (`probe_host_capabilities.cjs`) that outputs a JSON summary of the detected environment. (Deferred to keep the initial implementation prompt-driven and zero-overhead).
- Auto-switching to `ws-spec-to-pr-lite` when the complexity classifier evaluates the task as simple and no subagent runner is detected.
