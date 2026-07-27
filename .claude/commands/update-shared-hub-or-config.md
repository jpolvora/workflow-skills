---
name: update-shared-hub-or-config
description: Workflow command scaffold for update-shared-hub-or-config in workflow-skills.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /update-shared-hub-or-config

Use this workflow when working on **update-shared-hub-or-config** in `workflow-skills`.

## Goal

Renames, restructures, or updates the shared hub directory and related config files, propagating changes across skills and documentation.

## Common Files

- `.agents/skills/ws-shared/*`
- `.agents/skills/ws-shared/config*.json*`
- `.agents/skills/ws-shared/AGENTS.md`
- `.agents/skills/ws-shared/setup.md`
- `.agents/skills/ws-shared/gates.md`
- `bin/install-rules.js`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Rename or move shared hub directories
- Update config files and schema (config.json.example, config.schema.json)
- Update documentation (AGENTS.md, setup.md, gates.md, etc.)
- Propagate path and config changes across skills and installer scripts

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.