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
