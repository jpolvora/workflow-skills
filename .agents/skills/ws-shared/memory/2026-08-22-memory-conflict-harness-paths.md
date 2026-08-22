### [2026-08-22] Memory conflict must match harness paths
- **Layer**: Harness
- **Module**: ws-spec-to-pr / check_memory_conflict.py / STEP-DISPATCH
- **Severity**: High
- **PathPattern**: .agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.py, test/test-pattern-consult.js
- **Scenario / Context**: Orch Step 1/4 conflict checks returned zero traps on harness plans because path scrape only matched src/web/tests, KNOWN_LAYERS omitted Harness, and module tokens were never extracted from plans or MEMORY Module fields.
- **DO NOT**: Rely on src|web|tests-only path scrape or layer-only Harness matches; do not leave dogfood recipes on self_learning.py when SKILL.md canonical is self_learning.cjs.
- **INSTEAD DO**: Extract .agents/bin/test/docs paths and ws-* tokens; match PathPattern globs against plan paths and prose; suppress Harness-only layer alerts unless path/module/entity also hits; compile/query via node {skillsRoot}/ws-self-learning/scripts/self_learning.cjs.
