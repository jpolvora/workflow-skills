---
id: null
slug: auto-mode-model-preferences
title: "LLM Model Preferences for Auto Mode Phase Switching"
source: local
specDate: 2026-07-31
---

# Specification — LLM Model Preferences for Auto Mode Phase Switching

## Description

Configuring phase-specific LLM model preferences (`plannerModel`, `executionModel`, `reviewerModel`) in `config.json` under `defaults` allows agents to optimize performance, quality, and cost during automated workflow runs (`autoMode: true`). The orchestrator (`ws-spec-to-pr` / `ws-spec-to-pr-lite`) will automatically switch LLM models at key phase transitions (Planning: steps 0–3, Execution: step 4, Review & Verification: steps 5–7).

The `ws-configure-project` setup wizard will be updated to prompt users for these model preferences, suggesting canonical model identifiers according to the detected host IDE and model provider (Cursor, OpenCode, Antigravity). If a model switch fails or is unsupported by the host IDE, the agent gracefully falls back to the current active session model without interrupting execution.

## Acceptance Criteria

- AC1: `config.schema.json` and `config.json.example` define optional string fields `plannerModel`, `executionModel`, and `reviewerModel` under the `defaults` section.
- AC2: `ws-configure-project` adds an interactive interview step/section for configuring `plannerModel`, `executionModel`, and `reviewerModel`, detecting canonical model suggestions based on the active host environment (Cursor, OpenCode, Antigravity).
- AC3: Orchestrator skills (`ws-spec-to-pr`, `ws-spec-to-pr-lite`, `STEP-DISPATCH.md`, and `tools.md`) specify exact timing and directives for automatic model switching during `autoMode` across Planning (Steps 0–3), Execution (Step 4), and Review (Steps 5–7).
- AC4: Portable subagent dispatch conventions in `tools.md` document how model parameters and directives are supplied for Cursor, OpenCode, and Antigravity subagent dispatchers.
- AC5: Non-blocking error/fallback behavior is specified: if a model switch encounters an error, is unconfigured, or is unsupported by the host IDE, execution continues seamlessly using the active session model.

## Notes

- **Phase Model Mappings**:
  - **Planning Phase (Steps 0–3)**: `plannerModel` (e.g. strong reasoning models like `claude-3-5-sonnet`, `o3-mini`, `gemini-2.0-flash-thinking`).
  - **Execution Phase (Step 4)**: `executionModel` (e.g. fast, accurate coding models like `claude-3-5-sonnet`, `gpt-4o`).
  - **Review & Verification Phase (Steps 5–7)**: `reviewerModel` (e.g. meticulous review models like `claude-3-5-sonnet`, `gemini-1.5-pro`, `gpt-4o`).
- **Host IDE Switching Capabilities**:
  - **OpenCode**: Subagent configuration with explicit `model` property.
  - **Antigravity**: Subagent invocation options or prompt model override directive.
  - **Cursor**: Subagent model specification or agent step model hint.
- **Graceful Fallback**: Under all error conditions or host limitations, standard execution resumes using whatever model is currently active.
