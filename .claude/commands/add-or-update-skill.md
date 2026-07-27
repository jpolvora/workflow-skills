---
name: add-or-update-skill
description: Workflow command scaffold for add-or-update-skill in workflow-skills.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-skill

Use this workflow when working on **add-or-update-skill** in `workflow-skills`.

## Goal

Adds a new skill or updates an existing skill, including documentation, evaluation configs, and sometimes scripts.

## Common Files

- `.agents/skills/*/SKILL.md`
- `.agents/skills/*/evals/evals.json`
- `.agents/skills/*/scripts/*.py`
- `.agents/skills/*/README.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update SKILL.md in the skill's directory
- Update or add evals/evals.json for the skill
- Optionally add or update scripts or supporting files in the skill directory
- Update shared skill registry or dependencies if needed

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.