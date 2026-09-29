---
name: ws-spec-organizer
description: Spec-of-record path resolution and chronological NNNN- spec organizer.
disable-model-invocation: true
invocation_names:
  - spec-organizer
  - ws-spec-organizer
---
# ws-spec-organizer

> When this skill is loaded, output "ws-spec-organizer loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/runtime/config-resolution.md) § Entry check.

Single source of truth for resolving spec-of-record paths (with optional chronological `NNNN-` sequence prefix) and organizing existing consumer spec boards.

**Specs family:** Role = spec path builder & board organizer. Writers (`ws-spec-write`, `ws-spec-from-provider`, `ws-spec-provider-local`, `ws-spec-update`, `ws-spec-index`) call `resolve_spec_path.cjs` instead of constructing hardcoded path strings. Router: [`../ws-shared/runtime/autoload.md`](../ws-shared/runtime/autoload.md).

## Configuration

In `config.json`:

```json
{
  "plans": {
    "specsDir": ".agents/specs",
    "enforceSpecPrefixOrdering": false,
    "statusSubfolders": false,
    "autoOrganizeByStatus": false
  }
}
```

- `plans.enforceSpecPrefixOrdering` (boolean, default: `false`):
  - `false`: Writers output `{specsDir}/{slug}.spec.md`.
  - `true`: Writers output `{specsDir}/NNNN-{slug}.spec.md` where `NNNN` is `max(existing 4-digit prefixes) + 1` (e.g. `0001`).
  - Omitted, non-boolean, or missing config: `resolve_spec_path.cjs` still treats the flag as `false` (fail-safe). Writers (`ws-spec-write`) **persist** this exact key under `plans` when it is absent so the convention is explicit. Do not invent a second key name.
- `plans.statusSubfolders` (boolean, default: `false`):
  - `false`: Boards stay flat; existing paths under `pending/`, `completed/`, or `archived/` still resolve, and new specs resolve to `{specsDir}/[NNNN-]{slug}.spec.md`.
  - `true`: New specs resolve to `{specsDir}/pending/[NNNN-]{slug}.spec.md`; boards may be filed into `pending/`, `completed/`, `archived/` via `--by-status`.
  - Sequence prefixes stay globally unique: `NNNN` is `max(prefixes across root and all status subfolders) + 1`.
  - No automatic migration: enabling `statusSubfolders` never moves existing files.
- `plans.autoOrganizeByStatus` (boolean, default: `false`):
  - Requires `plans.statusSubfolders: true`. When that is false, this switch is ignored.
  - `true`: `organize_specs.cjs` with no `--slug` and no `--dry-run` runs as `--by-status --apply`. Classification is frontmatter `status:`, then `index.PRD` Archive / Done log / `[x]` (this beats `issueState: open`), then `issueState:`. `--dry-run` stays a preview of that filing.
  - `false`: filing still requires an explicit `organize_specs.cjs --by-status --apply`.

**Invariants:**
- Frontmatter `slug` is always unprefixed (`slug: {slug}`).
- Plans under `{plansDir}/{slug}/` are never prefixed.
- Companion `.context.md` files receive matching prefixes.
- Existing on-disk paths always win (no double-prefixing).

## Invocation

### 1. Resolve spec-of-record path

```bash
node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug <slug> [--repo-root <dir>] [--status pending|completed|archived] [--context] [--json]
```

Outputs the repo-relative POSIX path to the spec of record. Searches `{specsDir}/` root plus `pending/`, `completed/`, `archived/`; an existing spec anywhere wins. `--status` forces the target subfolder for a new spec (default `pending` when `plans.statusSubfolders` is `true`); duplicate slugs across locations exit 2.

### 2. Organize existing board specs

```bash
node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs [--repo-root <dir>] [--dry-run | --apply] [--json]
node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs --by-status [--dry-run | --apply] [--json]
node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs --slug <slug> --status <status> [--dry-run | --apply] [--json]
```

- `--dry-run` (default): inspect proposed renames and index updates without modifying the filesystem.
- `--apply`: execute safe `git mv` (or `fs.renameSync` for untracked files), assigning chronological `0001`… prefixes by `specDate` → git first-add date → file mtime, and update `index.PRD` `spec:` references.
- `--by-status`: file every spec into `pending/`, `completed/`, or `archived/` by frontmatter `status:` (synonyms accepted) → `index.PRD` Archive table, then Done log / `[x]` checkboxes → frontmatter `issueState:` (`closed` → completed, `open` → pending only when the index does not already mark the slug completed or archived). An index `[x]` or Done-log row moves the spec to `completed/` even when `issueState` is `open`. Moves the `*.spec.md` plus companion `*.context.md` and `*.assets/` sidecars, keeping file names; rewrites `index.PRD` `spec:` references to subfolder-relative paths. Fails closed on dirty overlapping paths or target collisions.
- `--slug <slug> --status <status>`: file one spec (used by `ws-spec-index sync` completion transitions).
