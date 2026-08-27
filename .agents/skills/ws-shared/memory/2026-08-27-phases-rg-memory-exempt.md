### [2026-08-27] Phase 4 rg vs MEMORY traps

- **Layer:** harness
- **Module:** ws-check-harness
- **Severity:** Medium
- **PathPattern:** `.agents/skills/ws-check-harness/PHASES.md`
- **Scenario / Context:** After adding retired-artifact tokens to the Phase 4 `rg` recipe, anti-regression MEMORY entries that name `session-lease.schema.json` match as if they were live skill references.
- **DO NOT:** Treat `{sharedDir}/MEMORY.md` or `memory/*` hits as live retired-id violations.
- **INSTEAD DO:** Glob-exempt `MEMORY.md` and `memory/**` (same class as CHANGELOG) so the recipe stays empty on a clean tree.
