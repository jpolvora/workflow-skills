### [2026-08-24] Partial plans index needs rebuild-index on resume
- **Layer**: `Harness`
- **Module**: `setup.md / validate_state.cjs rebuild-index`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-shared/setup.md, .agents/skills/ws-spec-to-pr/docs/faq.md, test/test-workflow-state-contract.js`
- **Scenario / Context**: PR 239 review. Discovery rebuilt `{plansDir}/index.json` only when the file was absent. A partial index hid on-disk `*.state.md` from the unfinished-workflow gate while validate fail-closed on missing rows.
- **DO NOT**: Treat a present `index.json` as complete. Do not skip `rebuild-index` after package update or when the resume list looks incomplete.
- **INSTEAD DO**: Run `validate_state.cjs rebuild-index` when the index is missing, stale after upgrade, or an expected workflow is absent. Document the `plans index missing workflow entry` recovery in FAQ. Assert rebuild restores the row.
