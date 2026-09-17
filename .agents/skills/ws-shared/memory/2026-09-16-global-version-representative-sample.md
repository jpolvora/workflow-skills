### [2026-09-16] Global install version sampling needs representative skills

- **Layer:** harness
- **Module:** ws-check-harness install-mode detector
- **Severity:** Low
- **PathPattern:** `.agents/skills/ws-check-harness/scripts/detect_install_mode.cjs`;`test/test-check-harness-install-mode.js`
- **Scenario / Context:** Sampling a global install version from the first alphabetical `ws-*` folder picked an external companion (`ws-memo` 1.0.0) instead of the package version (0.4.30), so drift assertions failed.
- **DO NOT:** Derive a global install version from an arbitrary or first `ws-*` `SKILL.md`.
- **INSTEAD DO:** Probe representative ids (`ws-check-harness` → `ws-tdah` → `ws-spec-to-pr` → `ws-senior-developer`), else fall back to the most frequent frontmatter version across the global tree; keep `externalSkills` ids out of package comparisons.
