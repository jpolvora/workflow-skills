---
slug: us-217
status: "ready_to_ship"
pr_action: "create"
---

# Delivery Result — us-217

## Summary
Completed implementation and validation of GitHub Issue #217:
- Extended Base Prompt Prefix in `PROTOCOLS.md` and `ws-spec-to-pr-lite/SKILL.md` to mandate pattern file consultation (`frontend.md`, `backend.md`) and `MEMORY.md` keyword grep.
- Extended `step-output` schema in `ws-implement-tasks/SKILL.md` and `PROTOCOLS.md` with `pattern_consult` and `memory_consult` proof blocks.
- Refactored `ws-spec-to-pr/scripts/check_memory_conflict.py` for robust dynamic `{sharedDir}` resolution across global and project-local installations, and wired into Step 1 and Step 4.
- Updated `ws-code-review/SKILL.md` to sweep compiled `MEMORY.md` entries and inspect `frontend.md`/`backend.md` when corresponding layers are modified.
- Added full automated test coverage in `test/test-pattern-consult.js`.
