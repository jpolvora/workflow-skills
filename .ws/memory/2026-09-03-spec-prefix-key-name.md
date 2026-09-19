### [2026-09-03] Spec prefix flag has one canonical config key
- **Layer**: `specs / config`
- **Module**: `ws-spec-write / ws-spec-organizer`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-spec-write/SKILL.md;.agents/skills/ws-spec-organizer/SKILL.md;.agents/skills/ws-shared/config.json`
- **Scenario / Context**: Project `config.json` may omit `plans.enforceSpecPrefixOrdering`. Agents then concatenate `{slug}.spec.md` or invent a second flag name, so prefixed boards get unprefixed new files and parity with `resolve_spec_path.cjs` breaks.
- **DO NOT**: Invent `specNamingPrefixConvention` or other aliases. Do not concatenate `{specsDir}/{slug}.spec.md` when the organizer helper exists. Do not leave the prefix key omitted on a board that already uses `NNNN-*.spec.md`.
- **INSTEAD DO**: Persist `plans.enforceSpecPrefixOrdering` under `plans` when absent (seed `true` if `{specsDir}` already has top-level `NNNN-*.spec.md`, else `false`). Then call `resolve_spec_path.cjs` and write only the returned `SPEC_PATH` / `--context` path. Frontmatter `slug` stays unprefixed.
