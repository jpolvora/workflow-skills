### [2026-08-27] Retired artifacts need matching stale live-reference patterns

- **Layer**: Harness
- **Module**: ws-shared / retired_artifacts
- **Severity**: High
- **PathPattern**: .agents/skills/ws-shared/scripts/retired_artifacts.cjs, test/test-consumer-migration.js
- **Scenario / Context**: Extending RETIRED_HUB_FILES or RETIRED_DEFAULTS_KEYS without STALE_LIVE_REFERENCE_PATTERNS lets live SKILL.md / hub docs reintroduce retired ids while consumer-migration scans stay green.
- **DO NOT**: Add prune/doctor retirement entries without a matching STALE_LIVE_REFERENCE_PATTERNS row, or use a bare `\bpatterns\b` regex that false-positives on unrelated prose.
- **INSTEAD DO**: Ship STALE_LIVE_REFERENCE_PATTERNS in the same change as new retired keys/templates, using precise regexes (`patternsBackend`, `defaults.patterns`, `_comment_patterns*`, `backend.md.template`). Assert required ids in test-consumer-migration.js.
