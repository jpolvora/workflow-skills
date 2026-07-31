---
id: null
slug: clear-learning-memory-instructions
title: "Actionable Directives in Learning Steps, state.md, and MEMORY.md"
source: local
specDate: 2026-07-30
---

# Specification — Actionable Directives in Learning Steps, state.md, and MEMORY.md

## Description

Standardize and simplify how traps, gaps, learnings, and anti-regression solutions are recorded across the `workflow-skills` package (`ws-self-learning`, `{sharedDir}/MEMORY.md`, individual `memory/*.md` files, and `state.md` `## Workflow memory`).

Currently, learnings and memory entries can sometimes be written as passive observations or complex narratives that are difficult for human engineers and LLM agents to quickly parse and execute during pre-work checks (`read-memory`).

This enhancement mandates that all captured traps, gaps, and learnings adopt clear, direct, and actionable "DO / DO NOT" directives (e.g., "When dealing with X implementation: DO NOT use Y pattern because Z; INSTEAD DO W"). This structure ensures that both humans and AI agents instantly understand what to avoid and what alternative implementation pattern to use, preventing repeated mistakes across workflow runs.

## Acceptance Criteria

- **AC1**: Update `ws-self-learning/SKILL.md` and individual memory template to enforce a simplified, actionable memory format featuring explicit **Scenario / Context**, **DO NOT**, and **INSTEAD DO** fields.
- **AC2**: Update `MEMORY.md.template` and compiler script (`ws-self-learning/scripts/self_learning.py`) to compile memory entries into concise, easily parseable DO/DO NOT rule blocks.
- **AC3**: Update state hygiene and protocol documentation (`ws-spec-to-pr/PROTOCOLS.md`, `ws-spec-to-pr-lite/SKILL.md`) for `state.md` `## Workflow memory` so that `step-output.learning` outputs require actionable DO/DO NOT guidance when recording new step-level findings.
- **AC4**: Update pre-work consult instructions across pipeline skills (`ws-implement-tasks`, `ws-write-plan`, `ws-code-review`, `ws-senior-developer`, `ws-karpathy-guidelines`) so agents explicitly check and incorporate DO/DO NOT rules during preflight.
- **AC5**: Add automated tests in `test/` (or script assertions in `self_learning.py`) to verify that memory template generation and compilation enforce the actionable directive format.

## Notes

- **Backwards Compatibility**: Existing `memory/*.md` entries remain supported, while new entries and compilation logic will format and enforce the simplified DO/DO NOT directive style.
- **Skill Portability**: All path references continue to use portable `{sharedDir}` and `{skillsRoot}` path tokens per harness rules.
