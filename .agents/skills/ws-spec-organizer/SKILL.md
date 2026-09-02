---
name: ws-spec-organizer
version: 0.3.54
description: Spec-of-record path resolution and chronological NNNN- spec organizer.
disable-model-invocation: true
invocation_names:
  - spec-organizer
  - ws-spec-organizer
---

# ws-spec-organizer

> When this skill is loaded, output "ws-spec-organizer loaded."

**Entry check:** Follow [`config-resolution.md`](../ws-shared/config-resolution.md) § Entry check.

Single source of truth for resolving spec-of-record paths (with optional chronological `NNNN-` sequence prefix) and organizing existing consumer spec boards.

**Specs family:** Role = spec path builder & board organizer. Writers (`ws-write-spec`, `ws-spec-from-provider`, `ws-local-spec-provider`, `ws-sync-spec`, `ws-spec-index`) call `resolve_spec_path.cjs` instead of constructing hardcoded path strings. Router: [`../ws-shared/autoload.md`](../ws-shared/autoload.md).

## Configuration

In `config.json`:

```json
{
  "plans": {
    "specsDir": ".agents/specs",
    "enforceSpecPrefixOrdering": false
  }
}
```

- `plans.enforceSpecPrefixOrdering` (boolean, default: `false`):
  - `false`: Writers output `{specsDir}/{slug}.spec.md`.
  - `true`: Writers output `{specsDir}/NNNN-{slug}.spec.md` where `NNNN` is `max(existing 4-digit prefixes) + 1` (e.g. `0001`).
  - Omitted, non-boolean, or missing config safely resolves to `false`.

**Invariants:**
- Frontmatter `slug` is always unprefixed (`slug: {slug}`).
- Plans under `{plansDir}/{slug}/` are never prefixed.
- Companion `.context.md` files receive matching prefixes.
- Existing on-disk paths always win (no double-prefixing).

## Invocation

### 1. Resolve spec-of-record path

```bash
node {skillsRoot}/ws-spec-organizer/scripts/resolve_spec_path.cjs --slug <slug> [--repo-root <dir>] [--context] [--json]
```

Outputs the repo-relative POSIX path to the spec of record.

### 2. Organize existing board specs

```bash
node {skillsRoot}/ws-spec-organizer/scripts/organize_specs.cjs [--repo-root <dir>] [--dry-run | --apply] [--json]
```

- `--dry-run` (default): inspect proposed renames and index updates without modifying the filesystem.
- `--apply`: execute safe `git mv` (or `fs.renameSync` for untracked files), assigning chronological `0001`… prefixes by `specDate` → git first-add date → file mtime, and update `index.PRD` `spec:` references.
