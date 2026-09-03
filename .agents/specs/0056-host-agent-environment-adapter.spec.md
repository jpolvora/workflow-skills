---
id: null
slug: host-agent-environment-adapter
title: "Agent-agnostic host detection, subagent fallback, and interactive gate execution"
source: local
specDate: 2026-09-03
---

# Specification — Agent-agnostic host detection, subagent fallback, and interactive gate execution

## Description

This specification addresses critical execution gaps when running workflow skills across diverse AI coding agent environments (such as Google Antigravity / Gemini IDE, Cursor, OpenCode, Claude Code, and headless CLI runners).

While the harness contract mandates that skills must be agent- and IDE-neutral, existing orchestrators (`ws-spec-to-pr`, `ws-spec-to-pr-lite`) historically contained implicit operational assumptions that cause failures in certain host platforms:
1. **Subagent Tool Availability Gap:** Orchestrator rules strictly mandate that *"Orch never edits code — hard stop. Use dispatch-agent only"*. In environments where the host tool palette lacks a dedicated `dispatch-agent` tool (such as Antigravity IDE, which provides file tools and `browser_subagent` but no generic subagent tool), this creates a deadlock where the orchestrator cannot proceed.
2. **Interactive Gate Bypassing & Eager Execution:** In fast/high-throughput models (such as Gemini Flash), presenting user gates as plain markdown text often fails because the model generates both the question text and subsequent tool calls in the exact same response turn, steamrolling past user confirmations without pausing. Conversely, hosts that provide native interactive modal tools (such as `ask_question`) can reliably block execution, but skills currently lack instructions to identify and invoke them.
3. **Absence of a Dynamic Capability Discovery Protocol:** Skills currently lack instructions for inspecting the active session tool palette and environment signals at runtime to dynamically bind abstract capabilities (`user-gate`, `dispatch-agent`) to real session tools.

This feature establishes an agent-agnostic host capability discovery protocol, a three-tier subagent dispatch fallback ladder, strict interactive turn-cadence constraints, and explicit interactive gate binding, ensuring consistent, verifiable workflow execution across all host environments without violating harness portability rules.

### Architecture touchpoints

| Layer | Path | Change class |
|-------|------|--------------|
| skills-sot | `.agents/skills/ws-shared/tools.md` | Add host tool inspection protocol, `user-gate` interactive binding, and `dispatch-agent` fallback tiers |
| skills-sot | `.agents/skills/ws-shared/gates.md` | Add modal gate tool binding, mandatory turn-yielding constraint on text fallback, and interactive cadence rules |
| skills-sot | `.agents/skills/ws-shared/host-dispatch.md` | Formalize dynamic capability matrix, CLI execution patterns, and Inline Isolated Execution protocol |
| skills-sot | `.agents/skills/ws-spec-to-pr/SKILL.md` | Reconcile "Orch never edits code" invariant when operating under Inline Isolated Execution |
| skills-sot | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Update step dispatch protocol to honor detected host execution mode |
| skills-sot | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Reinforce interactive gate binding and single-turn cadence in inline workflows |
| tests | `test/test-runtime-portability.js` | Assert neutrality of updated documentation and test capability resolution rules |

## Acceptance Criteria

- AC1: The orchestrator inspects the active session's declared tool palette and environment signals at bootstrap (and prior to first dispatch) to dynamically determine host capabilities for interactive choice tools (`hasStructuredChoiceTool`), subagent dispatch tools (`hasSubagentTool`), and browser verification tools (`hasBrowserTool`).
- AC2: When an interactive modal choice tool (accepting structured options and blocking execution until user submission) is present in the session tool palette, the orchestrator and shared skills MUST invoke that tool for all `user-gate` occurrences rather than falling back to text.
- AC3: When no interactive modal choice tool is present and a `user-gate` must be presented as text/markdown, the agent MUST output ONLY the question and options, and MUST NOT emit any tool calls in the same response turn, immediately yielding the turn to wait for user input.
- AC4: When a native subagent tool is declared in the host session (Tier 1), `dispatch-agent` dispatches steps to that tool using discrete context pointers (`handoff/step-{N-1}.json`, `ac-ledger.json`, `plan.index.json`) without dumping full conversation transcripts.
- AC5: When no native subagent tool is declared but a CLI subagent runner is configured or available in PATH (Tier 2), the orchestrator launches the step as a background task via `run_command` using the configured CLI template.
- AC6: When neither a native subagent tool nor a CLI runner is available (Tier 3), the orchestrator automatically executes in **Inline Isolated Execution mode**, where the session model temporarily adopts the specific step persona (e.g. Coder for Step 4, Reviewer for Step 6), reads strictly the discrete context pointers, performs edits via native file tools, validates, emits `step-output`, and logs state.
- AC7: The invariant *"Orch never edits code"* in `ws-spec-to-pr` explicitly allows an exception for Inline Isolated Execution mode: while the orchestrator persona does not edit code, the session model executing under the step's temporary Coder persona is authorized to edit product files using native file manipulation tools.
- AC8: In interactive execution mode, the orchestrator enforces an interactive cadence constraint ("One Step Per Turn"): completing Step N (dispatch, execution, state finish, pre-advance validation, and transition gate) must halt the turn, and Step N+1 must never be initiated within the same interaction turn without explicit user confirmation.
- AC9: All changes to `tools.md`, `gates.md`, `host-dispatch.md`, and orchestrator skills strictly adhere to harness portability rules, using neutral capability descriptions rather than hardcoded IDE/agent brand names in core contract tables, preserving green status in `test/test-runtime-portability.js`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Creating proprietary host-specific extension packages | Violates portability; all behavior must execute through standard prompts, markdown contracts, and Node helpers. |
| Hardcoding product brand names into `ws-shared/tools.md` or `gates.md` | Explicitly prohibited by harness neutrality rules and checked by portability tests. |
| Changing step numbering or FSM sequencing in `ws-spec-to-pr` | FSM remains Steps 0–9 for standard and Steps 0–5 for lite. |
| Altering SCM provider contracts or PR creation flows | Out of scope for host environment and gate dispatch. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| How host tools are discovered | Session tool palette inspection | Modern agent hosts inject declared tool definitions directly into the system prompt or tool registry. | y |
| Precedence between config and dynamic discovery | `defaults.hostAdapter.mode` overrides auto-discovery when set to a specific mode | Allows consumers to force a specific mode (`native-tool`, `cli-command`, `inline-isolated`) when desired. | y |
| Implicit-requirement dimensions | N/A because all error handling, concurrency, and observability dimensions are addressed directly within the ACs (AC1-AC9). | Harness operates as portable prompts and local scripts without external server infrastructure. | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Clearly identified documentation and skill touchpoints in `ws-shared` and `ws-spec-to-pr` | Architecture touchpoints table verification |
| Atomic Criteria | AC1 through AC9 define unambiguous, testable criteria | Validation via `validate_spec.cjs --mode=authoring` |
| Failure Modes | Three-tier subagent fallback ladder (Native -> CLI -> Inline) and markdown turn-yielding defined | Verification against negative scenarios |
| Observation Telemetry | Host detection and gate execution recorded in step telemetry JSONL | State file and JSONL log inspection |
| Zero Open Blockers | All scripts and test utilities exist in repository | `node test/test-runtime-portability.js` execution |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `host-capability-detect | subagent={mode} | gate={mode} | ISO` logged to step telemetry JSONL during Step 0.
- `user-gate-modal | {gate} | ISO` or `user-gate-fallback | {gate} | ISO` recorded in workflow state gate history.
- `inline-isolated-step | step {N} | ISO` logged when running steps without native subagents.
- `node test/test-runtime-portability.js` exits with code 0 and passes all portability assertions.

### Negative & Failing Test Scenarios

- **Scenario 1 (Eager Tool Execution Failure):** An agent in an interactive host without an interactive modal tool renders a markdown gate and proceeds to invoke tools for Step N+1 in the same response turn. Test fails closed (violates AC3 / AC8).
- **Scenario 2 (Missing Subagent Deadlock):** An orchestrator in a host without `dispatch-agent` halts execution or fails to modify code because of the *"Orch never edits code"* invariant without adopting Inline Isolated Execution. Test fails closed (violates AC6 / AC7).
- **Scenario 3 (Product Branding Leak):** An edit adds product-specific brand names (e.g., "Cursor", "Antigravity", "OpenCode") to `ws-shared/tools.md` or `ws-shared/gates.md`. Test `test-runtime-portability.js` fails with assertion error (violates AC9).

## Notes

- Builds upon the foundation laid in `ws-shared/host-dispatch.md` and formalizes runtime adoption across both standard and lite orchestrators.
- Specifically resolves usability friction in Google Antigravity / Gemini IDE and lightweight chat interfaces without degrading the rich multi-agent experience in Cursor or Claude Code.

## Original Issue Context

### Design Intent

Greenfield adaptation protocol. Not a regression restore of deleted code. Extends the portability contract of `workflow-skills` to actively discover session capabilities, bridging the gap between multi-agent hosts and single-session interactive environments in a clean, agent-agnostic manner.
