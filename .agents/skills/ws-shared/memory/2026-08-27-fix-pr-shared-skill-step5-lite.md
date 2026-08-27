### [2026-08-27] Shared pipeline skills must not say unqualified Step 5

- **Layer**: Harness
- **Module**: ws-implement-tasks / dual-mode
- **Severity**: Medium
- **PathPattern**: .agents/skills/ws-implement-tasks/SKILL.md, .agents/skills/ws-spec-to-pr-lite/SKILL.md
- **Scenario / Context**: Shared implement-tasks prose said Step 5 fail-closes on uncovered negative scenarios. Lite maps Step 5 to Fix-PR and never runs ws-verify-plan, so that gate never fires.
- **DO NOT**: Name numeric Step 5 as a verify/score gate in orch-agnostic pipeline skills.
- **INSTEAD DO**: Split standard (ws-verify-plan scores negativeScenarios) vs lite (linking is mandatory implement evidence). Keep numeric step ids in the owning orchestrator SKILL.md only.
