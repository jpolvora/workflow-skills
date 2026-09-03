---
id: null
slug: host-capability-binding-v2
title: "Active host tool capability binding with auto-gate hard bypass"
source: local
specDate: 2026-09-03
---

# Specification — Active host tool capability binding with auto-gate hard bypass

## Description

Follow-up to `0056-host-agent-environment-adapter` (commits `7d39160c`, `781a2ef5`).
That spec introduced passive capability discovery (`hasStructuredChoiceTool`,
`hasSubagentTool`, `hasBrowserTool`), a three-tier dispatch ladder, and
normal vs `autoMode` gate rules in `ws-shared/tools.md`, `gates.md`, and
`host-dispatch.md`.

Field report (Cursor, `composer-2.5` / `grok-4.6`): every step halts with a
markdown `user-gate` even in auto mode. Root causes: discovery is passive
palette inspection with no standard alias map, modal choice tools vary by
host (`askQuestion` vs `ask_question` and equivalents), subagent dispatch
entry points vary the same way, and eager models emit gate text plus Step
N+1 tool calls in one turn.

This spec adds an **active, single-turn capability binding probe** at
bootstrap. The orchestrator asks the session, in abstract terms, which
concrete tools implement each required abstract capability, normalizes
variant names to portable aliases, caches the binding in workflow state,
and enforces it for all `ws-spec-to-pr` (Steps 0–9) and `ws-spec-to-pr-lite`
(Steps 0–5) gates and dispatches. `autoMode` becomes a hard bypass: zero
modal and zero markdown prompts at any boundary. Normal mode uses the bound
modal tool when present, else markdown with strict turn-yielding. The probe
runs once per workflow, keeping token and turn overhead minimal.

### Architecture touchpoints

| Layer | Path | Change class |
|-------|------|--------------|
| skills-sot | `.agents/skills/ws-shared/tools.md` | Add abstract alias table + binding probe protocol + cache rule |
| skills-sot | `.agents/skills/ws-shared/gates.md` | Harden auto-gate bypass; bind normal-mode gates to cached `askQuestionTool` |
| skills-sot | `.agents/skills/ws-shared/host-dispatch.md` | Replace passive-only discovery with probe-then-cache; normalize dispatch variants |
| skills-sot | `.agents/skills/ws-spec-to-pr/SKILL.md` | Consume cached binding; forbid re-probe per step |
| skills-sot | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | Dispatch via bound `subagentTool` / runner / inline tier |
| skills-sot | `.agents/skills/ws-spec-to-pr-lite/SKILL.md` | Same binding; inline execution honors bound gate tool |
| tests | `test/test-runtime-portability.js` | Assert neutral alias names; no brand literals in contract tables |

## Acceptance Criteria

- AC1: At bootstrap (Step 0, before first `user-gate` or `dispatch-agent`), the orchestrator emits one active binding probe asking the session to map each abstract alias (`askQuestionTool`, `subagentTool`, `backgroundTaskTool`, `browserTool`) to its concrete session tool name or `none`, persists the result as `state.hostBinding` plus `host-capability-bind | {json} | ISO` telemetry, and reuses it for the whole workflow without re-probing.
- AC2: Alias normalization accepts common variant spellings (e.g. `askQuestion` / `ask_question` / structured-choice equivalents; native subagent / spawn / background-runner equivalents) and binds them to the same abstract alias; unknown or absent tools bind to `none` without failing the workflow.
- AC3: When `autoMode` is true, the orchestrator emits zero `user-gate` prompts of any kind (neither modal tool nor markdown) at every step boundary including entry, transition, G2-code, close, ship, and fix-PR gates, auto-selects index 0 from the auto-gate table, and proceeds continuously across step boundaries.
- AC4: In normal mode with `askQuestionTool` bound to a concrete tool, all `user-gate` occurrences invoke that tool with >=2 options (recommended first) and log `user-gate-modal`; when unbound (`none`), the fallback renders markdown options only with zero tool calls in the same turn and logs `user-gate-fallback`.
- AC5: `dispatch-agent` uses the cached binding in order: bound `subagentTool` (Tier 1 native) with pointers-only payload, else bound `backgroundTaskTool` / configured `cliTemplate` (Tier 2), else Inline Isolated Execution (Tier 3); it never dumps full transcripts and never resumes a subagent across steps.
- AC6: The probe costs at most one extra turn per workflow and its prompt plus binding table stay compact (prompt <= ~150 tokens, table <= 10 rows); no per-step re-probe occurs unless the host signals a toolset change or the user issues an explicit rebind.
- AC7: All contract tables and alias names stay portable and generic (`askQuestionTool`, `subagentTool`, `backgroundTaskTool`, `browserTool`); no host, IDE, or model brand names appear in `tools.md`, `gates.md`, or `host-dispatch.md` normative tables, and `test/test-runtime-portability.js` stays green.
- AC8: Every binding decision, gate application (`user-gate-modal` / `user-gate-fallback` / `auto-gate-apply`), and tier selection is recorded in step telemetry JSONL and workflow state gate history with ISO timestamps for audit.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Host-specific extension packages or brand-named adapters | Violates portability; binding is alias-based only |
| Changing FSM step numbering (standard 0–9 / lite 0–5) | Sequencing is frozen; only binding changes |
| Altering SCM provider contracts or PR flows | Orthogonal to gate/dispatch binding |
| Changing model routing (`modelsPreset` / `stepModels`) semantics | Binding resolves tools, not model selection |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Session can self-report its tool names on request | Ask abstract mapping question at bootstrap; `none` when unknown | Hosts expose their palette to the model; self-report is the only portable probe | y |
| Precedence between config and probe | `defaults.hostAdapter.mode` non-`auto` wins over probe | Explicit consumer override must stay authoritative | y |
| Config key for persisted binding | `state.hostBinding` + telemetry; no new required config keys | Keeps change surgical; config override stays optional | y |
| Implicit-requirement dimensions | N/A because input bounds, auth, concurrency, TTL, and external-fallback dimensions do not apply to a prompt-level tool-name binding with no external I/O | Harness is portable prompts plus local scripts; remaining dimensions are covered by AC1–AC8 | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Touchpoints limited to `tools.md`, `gates.md`, `host-dispatch.md`, both orchs, portability test | Architecture touchpoints table check |
| Atomic Criteria | AC1–AC8 enumerable and testable with pass/fail signals | `validate_spec.cjs --mode=authoring` |
| Failure Modes | AutoMode markdown halt, same-turn eager dispatch, unknown alias, branding leak defined | Negative scenarios review |
| Observation Telemetry | Binding + gate + tier events in JSONL and state history | Telemetry grep on fixture run |
| Zero Open Blockers | Probe script/prose uses existing state/telemetry helpers; no new runtime deps | Repo file existence check |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `host-capability-bind | {askQuestionTool,subagentTool,backgroundTaskTool,browserTool} | ISO` in Step 0 JSONL and `state.hostBinding`.
- `user-gate-modal | {gate} | ISO` vs `user-gate-fallback | {gate} | ISO` vs `auto-gate-apply | {gate} | index-0 | ISO` per boundary.
- `dispatch-tier | {native|cli|inline} | step {N} | ISO` on each dispatch.
- `node test/test-runtime-portability.js` exits 0 with no brand-literal assertion failures.

### Negative & Failing Test Scenarios

- **Scenario 1 (AutoMode markdown halt):** `autoMode: true` run emits any markdown or modal `user-gate` at a step boundary instead of auto-applying index 0. Test fails closed (violates AC3).
- **Scenario 2 (Eager same-turn dispatch):** Normal-mode markdown fallback turn contains both gate text and Step N+1 tool calls. Test fails closed (violates AC4).
- **Scenario 3 (Transcript dump):** Dispatch payload embeds full conversation history instead of pointers (`step-00` spec, `plan.index.json`, `ac-ledger.json`, prior handoff). Test fails closed (violates AC5).
- **Scenario 4 (Branding leak):** Contract table edit adds a host/IDE/model brand literal to `tools.md`, `gates.md`, or `host-dispatch.md`. Portability test fails (violates AC7).
- **Scenario 5 (Per-step re-probe):** Non-rebind run emits the binding probe more than once per workflow. Test fails closed (violates AC6).

## Original Issue Context

Field report: spec `0056-host-agent-environment-adapter` no longer holds in Cursor with `composer-2.5` / `grok-4.6` — every step, even in auto mode, stops for a markdown `user-gate`. Modal tool naming differs per host (`askQuestion` vs `ask_question`), subagent dispatch entry points differ the same way, and remaining `ws-spec-to-pr` actions need the same abstract mapping. Request: new spec that asks the model for available tools per abstract action (`askQuestionTool = ask_question | askQuestion | …`, `subagentTool = …`, plus other `ws-spec-to-pr` intents), improved for portability, generality, token efficiency, and performance, to be executed later.

### Prior Work Sweep

- `git log -S "hasStructuredChoiceTool"`: only `7d39160c feat(host-adapter)` — passive discovery origin; no prior active-probe implementation.
- `git log -S "autoMode" -- gates.md`: `781a2ef5 fix(gates)` clarified normal vs autoMode; the auto-bypass rule exists but has no probe or alias-normalization backing.
- Keyword sweep (`askQuestion`, `ask_question`, `dispatch-agent`, `hostAdapter`): matches confined to `tools.md`, `gates.md`, `host-dispatch.md`, `STEP-DISPATCH.md`, and `0056` spec/context; no open PR for a v2 binding found in local history.

### Design Intent

`7d39160c` intentionally chose passive palette inspection plus a static three-tier ladder to stay brand-neutral. `781a2ef5` intentionally split normal (One Step Per Turn, modal-preferred) from `autoMode` (continuous, index-0). Neither commit anticipated per-host tool-name variance or eager-model same-turn steamrolling in Cursor's current models, so the gap is accidental drift, not an intentional constraint. This spec preserves both intents and adds the missing active binding + normalization layer.

## Notes

- Probe wording must be abstract ("which session tool implements structured choice?") and must never list brand or product names as the contract.
- `defaults.hostAdapter.mode` (`native-tool` | `cli-command` | `inline-isolated`) still forces a tier regardless of probe output.
- Lite honors the same binding; its inline execution only changes who runs the step, not which gate tool is used.
