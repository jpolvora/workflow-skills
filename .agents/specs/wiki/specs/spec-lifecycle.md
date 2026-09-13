# Spec Lifecycle (`specs`)

> Provenance: `.agents/skills/ws-spec-write/SKILL.md`, `.agents/skills/ws-spec-format/scripts/validate_spec.cjs`, `.agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs`, `.agents/skills/ws-spec-index/SKILL.md`, living synthesis of specs 0009, 0040, 0045, 0051, 0053, 0065.

## Feature

Specifications are point-in-time delivery contracts. Operators author them in free text or reformulate tracker issues into testable acceptance criteria, then route them through planning, indexing, listing, explanation, drift repair, and archival. The `ws-spec-manager` router (`/spec`) dispatches to specialists without reimplementing their logic: `ws-spec-write` authors specs, `ws-spec-format` validates schema, `ws-spec-organizer` resolves paths and prefix ordering, `ws-spec-index` maintains `index.PRD`, `ws-spec-list` inventories both boards, `ws-spec-explain` provides read-only panorama, `ws-spec-update` fixes surgical drift, and `ws-spec-archive` harvests history and cleans shipped plan directories. Creation flows run `ws-spec-write` → `ws-spec-organizer` → `ws-spec-format` → `ws-spec-index track`. The human Spec Board (`{specsDir}/*.spec.md`) stays strictly separate from the transient Plan Board (`{plansDir}` runs), with gated destructive actions on the list skill.

## How it works

Authoring mode requires sections for Out of Scope, Assumptions, Definition of Ready, Validation and Observation Notes, and Negative and Failing Test Scenarios. Every stated requirement maps to at least one acceptance criterion or an explicit out-of-scope row. `validate_spec.cjs --mode=authoring` must exit zero before registration proceeds. Gray areas with two or more product options get a `{slug}.context.md` companion that is never empty.

Plans are interrogated against DoR during the plan interview step. Implementation follows failing-tests-first discipline with positive and negative scenario verification. `ws-spec-update` (delta spec drift) and `ws-spec-index sync` (phase status) serve different purposes and must not be interchanged. Prefix ordering is opt-in via `plans.enforceSpecPrefixOrdering`; when true, specs-of-record use `NNNN-{slug}.spec.md` ordered by `specDate`, git first-add, or mtime, while frontmatter `slug` and `{plansDir}/{slug}/step-00` paths stay unprefixed. Reorder runs only through explicit `organize_specs.cjs --apply` with `git mv`; install never auto-renames existing files.

The dispatcher never reimplements specialist scripts. Slice specs for task-lifecycle work never create `{plansDir}` trees.

## Backend

Path authority lives in `resolve_spec_path.cjs`, which reads `plans.specsDir` (default `.agents/specs`) and the prefix flag. `organize_specs.cjs` supports `--dry-run` and `--apply` with index backtick updates after moves. Tracking order for index operations walks `FEATURES.md` → `PLAN.md` → `PRODUCT.PRD` → `index.PRD`, skipping missing files with a note.

Validation tooling includes `validate_spec.cjs --mode=authoring|compat`, covered by `test/test-spec-dor-tdd.js` and `test/test-ws-spec-manager.js`. Local registration copies specs into `{plansDir}/{slug}/step-00-*.spec.md` through `register_local_spec.cjs` after the specs-of-record file exists under `{specsDir}`.
