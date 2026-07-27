---
name: plan-and-execute-feature
description: Workflow command scaffold for plan-and-execute-feature in workflow-skills.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /plan-and-execute-feature

Use this workflow when working on **plan-and-execute-feature** in `workflow-skills`.

## Goal

Creates and executes a structured plan for a new feature or user story, including issue, spec, plan, execution, review, and result files.

## Common Files

- `.agents/plans/*/step-00-*.issue.json`
- `.agents/plans/*/step-00-*.spec.md`
- `.agents/plans/*/step-01-*.plan.md`
- `.agents/plans/*/step-*.plan.refined.md`
- `.agents/plans/*/step-*.plan.exec.md`
- `.agents/plans/*/step-*.exec.dag.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create step-00-<feature>.issue.json and step-00-<feature>.spec.md
- Write step-01-<feature>.plan.md and optionally further refined plan files
- Add execution and report files (e.g., exec.dag.json, plan.exec.md, plan.report.md, testing.report.md)
- Add review and result files (review.md, result.md)
- Update state.md to reflect current progress

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.