---
id: 90
slug: us-90
title: "Fix skill integrity mismatch: source package digests out of sync with bin/skill-integrity.json"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/90"
specDate: 2026-07-20
---

# Specification — Fix skill integrity mismatch: source package digests out of sync with bin/skill-integrity.json

**State:** open

## Description

## Summary

Installing skills from `workflow-skills` fails the integrity gate: every tracked file reports `digest-mismatch` against `bin/skill-integrity.json`. The installer aborts before any skill copy.

## Repro

From a consumer project (e.g. `jskills`), run the install for the Full / workflow package (30 skills). Observed output:

```text
Installing 30 skill(s): 00-write-spec, 01-write-plan, 02-interview, 03-plan-to-tasks, 04-implement-tasks, 05-verify-plan, 06-code-review, 07-testing, 08-ship-pr, 09-fix-pr, azure-devops-provider, caveman, changelog, check-harness, check-workflows, configure-project, gabarito, github-provider, goal-fix-pr, goal-loop, karpathy-guidelines, local-spec-provider, secrets-leak-review, self-learning, show-harness, spec-format, spec-to-pr, spec-to-pr-lite, update-plan-implementation, write-a-skill
Starting installation...
Integrity: source package mismatch vs bin/skill-integrity.json
  - 00-write-spec/SKILL.md (digest-mismatch)
  - 01-write-plan/SKILL.md (digest-mismatch)
  - 01-write-plan/SKILL.md (digest-mismatch)
  ... (all listed files below)
Aborting before any skill copy. Re-run with --force-integrity to override (unsafe).
```

Workaround mentioned by installer: `--force-integrity` (unsafe).

## Expected

Integrity digests in `bin/skill-integrity.json` match the current source package contents so a normal install succeeds without `--force-integrity`.

## Actual

Widespread `digest-mismatch` across skills and hub templates — looks like the integrity manifest was not regenerated after package content changed (or hashing/canonicalization changed).

## Affected paths (from install log)

### Skills
- `00-write-spec/SKILL.md`
- `01-write-plan/SKILL.md`
- `02-interview/SKILL.md`
- `03-plan-to-tasks/SKILL.md`
- `04-implement-tasks/SKILL.md`
- `05-verify-plan/SKILL.md`
- `05-verify-plan/TEMPLATE.md`
- `06-code-review/SKILL.md`
- `07-testing/SKILL.md`
- `08-ship-pr/GOAL-OVERRIDES.md`
- `08-ship-pr/PREPARE-CHECKLIST.md`
- `08-ship-pr/SKILL.md`
- `08-ship-pr/examples.md`
- `09-fix-pr/README.md`
- `09-fix-pr/SKILL.md`
- `09-fix-pr/scripts/AUTO_FIX.md`
- `09-fix-pr/scripts/COOPERATIVE_FIX.md`
- `09-fix-pr/scripts/fetch_threads.cjs`
- `09-fix-pr/scripts/resolve_thread.cjs`
- `azure-devops-provider/SKILL.md`
- `caveman/README.md`
- `caveman/SKILL.md`
- `changelog/SKILL.md`
- `check-harness/REPORT-FORMAT.md`
- `check-harness/SKILL.md`
- `check-workflows/SKILL.md`
- `configure-project/INTERVIEW.md`
- `configure-project/SKILL.md`
- `gabarito/README.md`
- `gabarito/SKILL.md`
- `github-provider/SKILL.md`
- `github-provider/scripts/fetch_threads.cjs`
- `github-provider/scripts/resolve_thread.cjs`
- `goal-fix-pr/SKILL.md`
- `goal-fix-pr/examples.md`
- `goal-loop/SKILL.md`
- `karpathy-guidelines/SKILL.md`
- `local-spec-provider/SKILL.md`
- `secrets-leak-review/REFERENCE.md`
- `secrets-leak-review/SKILL.md`
- `self-learning/SKILL.md`
- `show-harness/SKILL.md`
- `spec-format/SKILL.md`
- `spec-to-pr/ARTIFACTS.md`
- `spec-to-pr/DIAGRAM.md`
- `spec-to-pr/README.md`
- `spec-to-pr/SKILL.md`
- `spec-to-pr/STEP-DISPATCH.md`
- `spec-to-pr/protocols/artifact-cleanup.md`
- `spec-to-pr/protocols/delivery-result.md`
- `spec-to-pr/protocols/progress-board.md`
- `spec-to-pr/protocols/state-hygiene.md`
- `spec-to-pr/scripts/ado-workitem-to-spec.py`
- `spec-to-pr/scripts/github-issue-to-spec.py`
- `spec-to-pr/spec-to-pr-run-test.md`
- `spec-to-pr-lite/SKILL.md`
- `update-plan-implementation/SKILL.md`
- `update-plan-implementation/plan-delta-template.md`
- `write-a-skill/GLOSSARY.md`
- `write-a-skill/SKILL.md`
- `write-a-skill/agents/openai.yaml`

### Hub
- `hub/AGENTS.md`
- `hub/CHANGELOG.md.template`
- `hub/MEMORY.md.template`
- `hub/STACK.md.example`
- `hub/config-resolution.md`
- `hub/config.json.example`
- `hub/config.schema.json`
- `hub/gates.md`
- `hub/hub.gitignore`
- `hub/setup.md`
- `hub/tools.md`

## Suggested fix

1. Regenerate `bin/skill-integrity.json` from the current packaged source (same hash/normalization the installer uses).
2. Confirm CI/release gates fail when digests drift (so this cannot ship again).
3. Optionally document when/how integrity is refreshed after skill edits.

## Context

- Consumer: `jskills` install attempt
- Environment: Windows / MINGW64
- Error class: `Integrity: source package mismatch vs bin/skill-integrity.json` (all `digest-mismatch`)

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
