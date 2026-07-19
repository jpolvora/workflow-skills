# Design: uninstall + installed-skills manifest

**Approved:** 2026-07-19

## Decisions

| Topic | Choice |
|-------|--------|
| Uninstall scope | Skills only — never delete `shared/` hub wholesale |
| Orphans | Always cascade: remove dependents of named skills, then drop unused deps |
| Existing installs | Bootstrap manifest from disk on next install/update |
| Storage | `.agents/skills/shared/installed-skills.json` (consumer-owned) |

## Manifest shape

```json
{
  "version": 1,
  "updatedAt": "ISO-8601",
  "skills": ["skill-folder-id", "..."],
  "selected": ["user-or-package-root-ids"]
}
```

`skills` = all managed folders (roots + transitive deps). `selected` = install roots (inferred: not a dep of another installed skill). Uninstall keeps `closure(remaining selected)` only.

## Commands

- `install` / interactive / `update` — write or merge manifest
- `uninstall --skills <csv> [--yes]` — remove named + cascade; rewrite manifest
- `update` — refresh skills listed in manifest (bootstrap from disk if missing)

## Non-goals

- Removing `shared/config.json`, MEMORY, stack
- Interactive uninstall menu (CLI first; may add later)
