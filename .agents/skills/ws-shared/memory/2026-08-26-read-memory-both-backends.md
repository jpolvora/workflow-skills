### [2026-08-26] read-memory must hit every enabled backend

- **Layer**: Shared
- **Module**: read-memory / fix-pr / plan / implement
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-self-learning/SKILL.md`, `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md`, `.agents/skills/ws-write-plan/SKILL.md`, `.agents/skills/ws-implement-tasks/SKILL.md`, `.agents/skills/ws-shared/tools.md`
- **Scenario / Context:** Agents consulting knowledge before plan/code/fix grepped only `{sharedDir}/MEMORY.md` even when `enableSpecMemoIntegration` was true, so vault traps were invisible during proactive discovery.
- **DO NOT:** Treat local MEMORY.md as the sole knowledge source when vault integration is on; skip vault `bootstrap`/`search` because files exist; record only a generic `memory` skip when one backend was never attempted.
- **INSTEAD DO:** Always run `read-memory` for every enabled backend (dual → vault first, then local). Record `memory-files` and/or `spec-memo` in `sourcesConsulted` with per-backend `consult-skipped` when unavailable. Persist via `update-memory` the same way.
