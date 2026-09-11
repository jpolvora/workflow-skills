### [2026-09-11] Anchor G2 staging skip-filters to the plans dir

- **Layer**: Harness
- **Module**: ws-spec-to-pr / G2-code staging
- **Severity**: High
- **PathPattern**: `.agents/skills/ws-*/SKILL.md`; `.agents/plans/ws-spec-multi/`
- **Scenario / Context**: A G2 staging skip-list used the unanchored regex `/ws-spec-multi\//` to exclude the multi-spec state dir (`.agents/plans/ws-spec-multi/`) but it also matched the skill package (`.agents/skills/ws-spec-multi/SKILL.md`), silently dropping a version-synced file from the product commit. The committed tree then failed CI `skill-integrity --check` (the manifest had hashed the bumped bytes) while local verify passed.
- **DO NOT**: Use unanchored substring regexes (`/ws-spec-multi\//`, `/CHANGELOG/`) to exclude foreign paths from staging — skill ids and plan dirs share name fragments.
- **INSTEAD DO**: Anchor exclusions to the plans dir (e.g. `/^\.agents\/plans\/ws-spec-multi\//`) and diff the staged set against the pre-commit `git status` (every intended `M`/`??` accounted for, zero foreign staged) before committing.
