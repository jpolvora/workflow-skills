---
slug: auto-mode-model-preferences
title: "LLM Model Preferences for Auto Mode Phase Switching"
status: "plan to be refined"
---

## 0. Summary & Business Rules
This feature introduces phase-specific LLM model preferences (`plannerModel`, `executionModel`, `reviewerModel`) under `defaults` in `config.json`. When running in `autoMode: true`, orchestrators (`ws-spec-to-pr` and `ws-spec-to-pr-lite`) will automatically apply phase-matched model preferences during step dispatches and transitions across Planning (Steps 0–3), Execution (Step 4), and Review (Steps 5–7). The setup wizard `ws-configure-project` is updated to prompt users for these preferences with canonical model suggestions for Cursor, OpenCode, and Antigravity. If a model switch fails or is unsupported by the host IDE, the agent falls back to the current active session model seamlessly.

## 1. Definition of Ready & Scope
- **AC1**: `config.schema.json` & `config.json.example` updated with optional `plannerModel`, `executionModel`, `reviewerModel` in `defaults`.
- **AC2**: `ws-configure-project` (`SKILL.md` & `INTERVIEW.md`) updated with interactive interview & detection for model preferences across Cursor, OpenCode, and Antigravity.
- **AC3**: `ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr-lite/SKILL.md`, `STEP-DISPATCH.md`, and `tools.md` updated with phase model switching rules.
- **AC4**: `tools.md` documents portable subagent dispatch model parameterization for Cursor, OpenCode, and Antigravity.
- **AC5**: Fallback rules documented and enforced so model switch failures do not interrupt workflow execution.

Out of Scope:
- Modifying IDE host binaries or host-specific CLI binaries outside workflow skills.

## 2. Technical Design & Architecture

### Affected Files:
1. **`.agents/skills/ws-shared/config.schema.json`**: Add `plannerModel`, `executionModel`, `reviewerModel` under `defaults.properties`.
2. **`.agents/skills/ws-shared/config.json.example`**: Add example entries in `defaults`.
3. **`.agents/skills/ws-configure-project/SKILL.md` & `.agents/skills/ws-configure-project/INTERVIEW.md`**: Update interview section and heuristics for model preferences.
4. **`.agents/skills/ws-shared/tools.md`**: Update `dispatch-agent` section with subagent model specification for Cursor, OpenCode, and Antigravity + fallback behavior.
5. **`.agents/skills/ws-spec-to-pr/SKILL.md` & `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`**: Document `autoMode` model switching rules by phase.
6. **`.agents/skills/ws-spec-to-pr-lite/SKILL.md`**: Document `autoMode` phase model switching rules for lite pipeline.

## 3. Step-by-Step Plan

### Step 1 — Config Schema & Example Updates (AC1)
- Update `.agents/skills/ws-shared/config.schema.json`: Define string schema for `plannerModel`, `executionModel`, `reviewerModel` under `defaults.properties`.
- Update `.agents/skills/ws-shared/config.json.example`: Add commented example values under `defaults`.

### Step 2 — Configure Wizard Update (AC2)
- Update `.agents/skills/ws-configure-project/INTERVIEW.md`: Add detection and interview steps for `defaults.plannerModel`, `defaults.executionModel`, and `defaults.reviewerModel`. Suggest canonical names based on detected host IDE (Cursor: `claude-3-5-sonnet`, `gpt-4o`; OpenCode: `claude-3-5-sonnet`, `gemini-2.0-flash`; Antigravity: `gemini-3.6-flash`, `claude-3-5-sonnet`).
- Update `.agents/skills/ws-configure-project/SKILL.md`: Reference `defaults` model section in step 4 interview.

### Step 3 — Portable Tools & Subagent Dispatch Specifications (AC4 & AC5)
- Update `.agents/skills/ws-shared/tools.md`: In `## Agent dispatch tools`, document how `dispatch-agent` accepts subagent model overrides/hints for Cursor, OpenCode, and Antigravity. Explicitly state the graceful fallback rule: on failure/unsupported host, maintain active model.

### Step 4 — Orchestrator Skills Integration (AC3 & AC5)
- Update `.agents/skills/ws-spec-to-pr/SKILL.md` & `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`: In `autoMode`, inspect `defaults.plannerModel` (steps 0–3), `defaults.executionModel` (step 4), and `defaults.reviewerModel` (steps 5–7). Pass model override during `dispatch-agent` or prompt transition.
- Update `.agents/skills/ws-spec-to-pr-lite/SKILL.md`: Document inline phase model switching for `autoMode`.

### Step 5 — Harness Verification
- Run `ws-check-harness` to verify schema, links, portability, and harness integrity.

## 4. Permissions, Tenancy & i18n
- N/A (Skill documentation & JSON schemas only; no multi-tenant runtime DB modifications).

## 5. Test Coverage
- AC1: Schema validation test checking `config.schema.json` accepts `plannerModel`, `executionModel`, `reviewerModel`.
- AC2: Verify `INTERVIEW.md` and `ws-configure-project/SKILL.md` contain model interview questions and canonical options for Cursor, OpenCode, Antigravity.
- AC3: Verify `ws-spec-to-pr/SKILL.md`, `ws-spec-to-pr-lite/SKILL.md`, and `STEP-DISPATCH.md` contain phase model switching instructions.
- AC4: Verify `tools.md` contains subagent dispatch model parameterization per host environment.
- AC5: Verify all updated skill files document non-blocking fallback to current active model on error.

## 6. Invariants (Do Not Violate)
- Enforce strict en-us language across all skills.
- Maintain harness portability (no IDE product lock-in; fallback to active session model).
- Do not make breaking schema changes to existing required properties in `config.json`.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected.
- [x] Schema and examples updated.
- [x] All ACs mapped to implementation steps and verification checks.

## 8. Open Questions
None. Scope and design are fully defined.
