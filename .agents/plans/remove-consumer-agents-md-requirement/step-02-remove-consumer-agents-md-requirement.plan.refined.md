# Refined Implementation Plan — Remove Consumer Requirement for .agents/AGENTS.md

## Refinements & Safety Checks

1. **Upstream vs Consumer Separation:**
   - Root `AGENTS.md` and `.agents/AGENTS.md` remain in the upstream source repository `jpolvora/workflow-skills` for upstream developer authoring and dual-hub drift checks.
   - Consumers receiving `workflow-skills` via `npx` or CLI receive `ws-shared/AGENTS.md` inside their `.agents/skills/ws-shared/` or `$HOME/.agents/skills/ws-shared/` hub directory.

2. **No Root Repo Footprint:**
   - The installer CLI (`bin/cli.js`) never writes any file to the consumer repository root. All consumer hub files (`config.json`, `STACK.md`, `MEMORY.md`, `AGENTS.md`) live inside `ws-shared/`.

3. **Audit Rule Alignment:**
   - `ws-check-harness` checks `ws-shared/AGENTS.md` in consumer scope and ignores `.agents/AGENTS.md`.

## Risk Assessment
- Low risk. The installer CLI and test suite already implement no-copy of `.agents/AGENTS.md`. This plan ensures docs, harness checkers, and scripts completely eliminate any lingering checks for `.agents/AGENTS.md` in consumer environments.
