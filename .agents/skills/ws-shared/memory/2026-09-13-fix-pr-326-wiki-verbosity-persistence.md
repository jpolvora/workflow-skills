### [2026-09-13] Per-flow run-state verbosity must honor the config default uniformly

- **Layer**: `harness`
- **Module**: `ws-wiki / verbosity persistence`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/SKILL.md; .agents/skills/ws-wiki/PHASE-1-SWEEP.md; test/test-wiki.js`
- **Scenario / Context**: SKILL.md promised uniform verbosity resolution for all four
  page-writing flows via `from-code.state.json`, but sweep persists to
  `sweep.state.json` with a hardcoded condensed default, ignoring a configured
  `plans.wiki.verbosity=detailed`; sync/update never read sweep state, so a sweep
  choice was silently discarded downstream. Test 22 asserted only that verbosity
  strings existed, never precedence or cross-state visibility. Reviewer scored 6/10
  twice on PR 326.
- **DO NOT**: Document a uniform resolution chain that names only one flow's state
  file; do not add a per-flow gate default without an honor-config clause matching
  the sibling flows.
- **INSTEAD DO**: Name per-flow run state in the resolution chain
  (`from-code.state.json` for from-code/sync/update, `sweep.state.json` for sweep),
  mirror the honor-`plans.wiki.verbosity` pre-selected default in every gate, state
  that sweep choice is per-run only, and assert config-honoring strings in Test 22.

### [2026-09-13] Migrated preservation clauses must name current headings

- **Layer**: `harness`
- **Module**: `ws-wiki / from-code merge mode`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/FROM-CODE.md; test/test-wiki.js`
- **Scenario / Context**: FROM-CODE merge mode was updated to fill conditional
  headings but its preservation clause still named legacy `Business Rules` /
  `Architecture` statements, inviting duplication or dropped invariants on new pages.
  A test assert locked the stale wording. Reviewer scored 6/10 on PR 326.
- **DO NOT**: Half-migrate a clause (new action verbs, old heading names); do not let
  test asserts lock pre-migration prose.
- **INSTEAD DO**: Name current headings (`## How it works` / `## Backend`) with a
  legacy-when-present migrate-on-touch qualifier, and update the locking assert to
  the new wording in the same change.
