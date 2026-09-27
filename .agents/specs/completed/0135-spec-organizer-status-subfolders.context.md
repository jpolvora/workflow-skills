# spec-organizer-status-subfolders — context

Gray-area product choices for status-based specification organization. Not a plan artifact.

## Feature Boundary

**In:**
- Organizing `{specsDir}` specifications into standard status subfolders: `pending/`, `completed/`, and `archived/`.
- Opt-in configuration flag `plans.statusSubfolders` in `.ws/config.json`.
- Recursive/multi-subfolder resolution in `resolve_spec_path.cjs` ensuring existing specifications are found regardless of subfolder.
- Global sequence prefix calculation across all subfolders when `plans.enforceSpecPrefixOrdering` is true.
- Status categorization in `organize_specs.cjs --by-status` based on frontmatter status, issueState, and `index.PRD`.
- Moving companion `*.context.md` and `*.assets/` sidecars together with parent specifications.
- Updating `index.PRD` `spec:` references to reflect subfolder locations.

**Out:**
- Organizing `{plansDir}` directories into status subfolders (plans remain flat and unprefixed under `{plansDir}/{slug}/`).
- Arbitrary or custom subfolder directory names.
- Automatic unprompted migrations of existing repositories during package install or update.

## Implementation Decisions

1. **Config Key Name & Location:**
   Placed under `plans` as `plans.statusSubfolders` (boolean, default: `false`). This mirrors `plans.enforceSpecPrefixOrdering` and `plans.specsDir`.

2. **Standard Subfolder Vocabulary:**
   - `pending/`: For draft, todo, open, or in-progress specifications.
   - `completed/`: For delivered, shipped, implemented, or closed specifications.
   - `archived/`: For retired, cancelled, or superseded specifications.

3. **Status Detection Precedence:**
   - Frontmatter `status:` (`completed`, `archived`, `pending`, `draft`).
   - Frontmatter `issueState:` (`closed` maps to `completed` unless frontmatter status is `archived`; `open` maps to `pending`).
   - `index.PRD` Done log or `[x]` checkbox (maps to `completed` if not archived).
   - Default fallback: `pending`.

4. **Existing Path Resolution Precedence:**
   `resolve_spec_path.cjs` checks `{specsDir}` root and all status subfolders for an existing match first. If found, that existing path is returned regardless of configuration flags. Only newly created specifications resolve to the configured target location (`pending/` if `statusSubfolders` is true, root `{specsDir}/` if false).

5. **Monotonic Sequence Prefix Uniqueness:**
   When `plans.enforceSpecPrefixOrdering` is enabled, the next sequential number is `max(prefixes in root and all subfolders) + 1` so that sequence numbers remain unique and monotonically increasing across the entire board.

## Deferred Ideas

- User-customizable status folder mapping in `config.json` (deferred to maintain standard cross-project tooling contracts).
- Automatic archiving of specifications older than a retention threshold (deferred to future lifecycle policies).
