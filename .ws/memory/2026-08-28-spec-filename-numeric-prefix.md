### [2026-08-28] Spec of record filenames may use a four-digit chronological prefix

- **Layer:** harness
- **Module:** ws-spec-index / ws-local-spec-provider / ws-spec-archive
- **Severity:** Medium
- **PathPattern:** .agents/specs/*.spec.md;.agents/skills/ws-spec-index/scripts/track_index.cjs;.agents/skills/ws-local-spec-provider/scripts/register_local_spec.cjs
- **Scenario / Context:** Board specs under `.agents/specs/` were renamed to `NNNN-{slug}.spec.md` for visual chronological order. Frontmatter `slug` is unchanged. Tools that only open `{specsDir}/{slug}.spec.md` miss the file and treat the spec as missing.
- **DO NOT:** Assume the spec of record path is exactly `{specsDir}/{slug}.spec.md`. Infer slug from the prefixed filename stem (`0001-foo` is not the slug).
- **INSTEAD DO:** Resolve `{slug}.spec.md` first, then `NNNN-{slug}.spec.md`. Prefer frontmatter `slug`. Keep `{plansDir}/{slug}/` unprefixed. Update `index.PRD` `spec:` backticks to the on-disk filename.
