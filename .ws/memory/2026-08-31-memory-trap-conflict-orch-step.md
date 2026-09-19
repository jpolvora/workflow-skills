### [2026-08-31] Conflicting MEMORY traps can undo a High forbid

- **Layer**: Harness
- **Module**: ws-shared / MEMORY compile
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/MEMORY.md;.agents/skills/ws-shared/memory/**
- **Scenario / Context**: A High trap forbade loading `ws-run-benchmark/references/ORCH.md` during spec-to-pr, while an older Medium trap still normalized "ORCH.md loads at Step 5" with no pipeline exclude. Agents consulting MEMORY during Step 5 could follow the older guidance.
- **DO NOT**: Leave overlapping MEMORY traps where a newer High forbid and an older Medium step-label tip can both match the same Step 5 / ORCH phrase.
- **INSTEAD DO**: When narrowing a forbid, update every related trap source under `memory/` in the same change (explicit exclude on legacy tips) and recompile; lock the invariant in a regression test that reads MEMORY.
