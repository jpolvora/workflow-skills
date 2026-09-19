### [2026-09-16] Autoload Always-applied heading must stay exact for configure script
- **Layer**: harness
- **Module**: ws-shared / autoload routing
- **Severity**: Medium
- **PathPattern**: `.agents/skills/ws-shared/runtime/autoload.md;.agents/skills/ws-configure-project/scripts/configure_autoload.py`
- **Scenario / Context**: Splitting Always-applied into required vs optional by renaming the heading to `## Always-applied skills (required)` broke `configure_autoload.py` table replacement (`## Always-applied skills\n` exact match), failing 11 autoload tests.
- **DO NOT**: Rename the `## Always-applied skills` heading with a suffix or reword it when adding required/optional splits; do not put optional rows in the same table.
- **INSTEAD DO**: Keep the heading byte-exact, add a bold required note below it, and put optional skills under a separate `## Optional skills` level-2 section so `parse_always_applied_rows` stops before it.
