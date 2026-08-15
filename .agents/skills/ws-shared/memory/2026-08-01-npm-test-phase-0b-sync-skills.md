### [2026-08-01] Npm Test Phase 0B Sync Skills
- **Layer**: `Infrastructure`
- **Module**: `test-install / Phase 0b`
- **Severity**: `Medium`
- **Scenario / Context**: After SoT move (2026-08-08), Phase 0b reads tracked skill bodies under `.agents/skills` (no sync-skills bridge). Historical trap: dogfood tree was gitignored and required `npm run sync-skills` from `src/skills`.
- **DO NOT**: Reintroduce `scripts/sync-skills.js` / `npm run sync-skills`, or treat `.agents/skills/ws-*` bodies as generated/ignored copies; do not point install/integrity/site tooling at `src/skills` for skill content.
- **INSTEAD DO**: Author and commit skill bodies under `.agents/skills/ws-*` (consumer-owned `ws-shared` hub files stay gitignored); run `npm run test` against tracked SoT; after skill content changes run `npm run generate-integrity && npm run verify-integrity`.
