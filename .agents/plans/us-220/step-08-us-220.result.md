---
slug: us-220
status: "ready_to_ship"
pr_action: "create"
---

# Delivery Result — us-220

## Summary
Completed porting and verification of `ws-pre-daily` skill from local environment to upstream repository `jpolvora/workflow-skills` (GitHub Issue #220):
- Created `.agents/skills/ws-pre-daily/SKILL.md` (version `0.3.24`), `.agents/skills/ws-pre-daily/references/OUTPUT.md`, and `.agents/skills/ws-pre-daily/scripts/collect_window.py`.
- Registered `ws-pre-daily` in `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` under `workflows` package.
- Documented `ws-pre-daily` in `AGENTS.md` and `.agents/skills/ws-shared/AGENTS.md`.
- Added automated test suite `test/test-ws-pre-daily.js` and wired into `package.json` test scripts.
- Regenerated integrity digests in `bin/skill-integrity.json` and site catalog in `docs/index.html`.
- Verified all unit and integration tests pass with 0 failures.
