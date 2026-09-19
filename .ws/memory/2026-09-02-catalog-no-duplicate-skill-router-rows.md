### [2026-09-02] No duplicate skill targets in one catalog router table

- **Layer**: Other
- **Module**: ws-shared/CATALOG task router
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-shared/CATALOG.md`, `CATALOG.md`
- **Scenario / Context**: Adding `/ws-session-tracking` created two rows in the same flat task-router table with different intent wording but the same load target. Agentic review scored 6/10 (PR 264).
- **DO NOT**: Add a second row for the same skill id inside one router table.
- **INSTEAD DO**: Merge intents into one row (combined trigger wording). Distinct sections of root CATALOG may mention the skill once each.
