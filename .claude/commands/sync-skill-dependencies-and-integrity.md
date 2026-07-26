---
name: sync-skill-dependencies-and-integrity
description: Workflow command scaffold for sync-skill-dependencies-and-integrity in workflow-skills.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /sync-skill-dependencies-and-integrity

Use this workflow when working on **sync-skill-dependencies-and-integrity** in `workflow-skills`.

## Goal

Synchronize skill dependency definitions and regenerate integrity digests to ensure consistency between shared and binary dependency files.

## Common Files

- `.agents/skills/shared/skill-dependencies.json`
- `bin/skill-integrity.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit .agents/skills/shared/skill-dependencies.json to update dependencies.
- Regenerate bin/skill-integrity.json to reflect updated dependencies.

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.