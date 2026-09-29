---
name: ws-version
disable-model-invocation: true
description: >-
  Read-only install snapshot: loaded skill directory, global vs project-local
  scope, package semver from .agents/skills/ws-shared/version.json, and stored hub path tokens.
  Trigger on /ws-version or version.
invocation_names:
  - ws-version
  - version
---
# ws-version

> When this skill is loaded, output "ws-version loaded."

Print a short, read-only report of which skills tree this copy of `ws-version` came from and which package version that tree carries. No workflow start, no file writes, no confirmation gates.

## Boundaries

- Read `{loadedSkillsRoot}/ws-shared/version.json` and `$PWD/.ws/config.json` only.
- Emit helper stdout and stop. Do not mutate disk or call network services.
- Host-neutral: no agent or IDE product names in skill prose or helper output.

## Invocation

```text
/ws-version
version
```

## Steps

1. **Run helper** — From the **same skills tree that loaded this skill**, run:
   ```bash
   node {skillsRoot}/ws-version/scripts/report_version.cjs
   ```
   When the loaded copy is under the global skills install, use that global `{skillsRoot}` so `SKILL.md` and the helper stay aligned.
   - Done when: stdout is printed and the process exits (non-zero only when `version.json` is missing or invalid).

## Output fields

| Line | Meaning |
|------|---------|
| `installScope:` | `global` when the skill folder is under `WORKFLOW_SKILLS_GLOBAL_DIR` or `$HOME/.agents/skills`; otherwise `project-local` |
| `skillDir:` | Absolute path of the loaded `ws-version` skill folder |
| `packageVersion:` | Semver from `{loadedSkillsRoot}/ws-shared/version.json` property `version`, or `unavailable` |
| `pathTokens.*` / `plans.*` | Values stored in `.ws/config.json` when parse succeeds (no brace expansion) |
| `project config: unavailable` | Missing or invalid `.ws/config.json` (scope, directory, and version still print) |
