# spec-prefix-ordering — context

Gray-area product choices for the spec of record. Not a plan artifact.

## Feature Boundary

**In:** Opt-in four-digit prefixes on `{specsDir}` spec-of-record files (`*.spec.md`) and sibling `*.context.md`; a shared Node resolver; a bulk organizer for existing consumer trees; one config boolean defaulting to false.

**Out:** `{plansDir}` workflow copies, tracker ids, frontmatter slugs, install-time silent renames, two competing prefix grammars.

**Users:** Agents that write or list specs; consumers who want a chronological spec board; Workflows-package installs that include `ws-write-spec`.

## Implementation Decisions

1. **Config parent = `plans`.** The flag governs files under `plans.specsDir`. Putting it on `defaults` would mix spec-board layout with orch flags (`enableDag`, `verboseMode`, `autoload`). Runtime key path: `plans.enforceSpecPrefixOrdering`. Alternate (`defaults.enforceSpecPrefixOrdering`) is deferred unless this decision is reversed.

2. **Four-digit prefixes (`0001`–`9999`).** Matches upstream dogfood. `INDEX-TEMPLATE.md` two-digit examples are documentation drift to fix, not a supported grammar.

3. **Create = append next integer; reorder = organizer `--apply`.** Writers do not reshuffle the whole board on each new spec.

4. **Existing path wins.** Resolve never invents a second file for a slug that already has a top-level spec.

5. **Workflows membership.** `ws-spec-organizer` is not Extra. `ws-write-spec` depends on it so `enforce: true` cannot hit a missing-skill STOP on a Workflows-only install.

6. **`--dry-run` default for organize.** `--apply` is the only mutating entry.

## Deferred Ideas

- Auto-prefix on installer `update` (rejected for this spec: too surprising).
- Nested `{specsDir}/{slug}/{slug}.spec.md` layouts in the organizer (register already supports that layout; organizer stays top-level unless a later spec expands it).
- Moving the resolver into `ws-shared/scripts` so Extra-only organizer could exist (rejected while writers must call the helper).
