---
slug: test-workflow
title: US Test Workflow
---

# Test Workflow

## Description

Add a `test-workflow` entry to the AGENTS.md catalog under **Layer 5 — Utility & Meta** to verify the full spec-to-pr pipeline end-to-end.

## Acceptance Criteria

- **AC1:** AGENTS.md contains a new row `test-workflow` in the Layer 5 table, following the same format as existing rows (`| skill | path | description |`)
- **AC2:** The `test-workflow` entry points to a valid path `.agents/skills/test-workflow/SKILL.md`
- **AC3:** The `test-workflow` entry does not duplicate any existing name in the catalog
- **AC4:** The entry is placed in correct alphabetical position within Layer 5

## Notes

- This is a **documentation-only** change: only `AGENTS.md` is modified
- No new files or directories are created — the entry is a pointer to a future skill
- The change is fully revertible via `git checkout AGENTS.md`
