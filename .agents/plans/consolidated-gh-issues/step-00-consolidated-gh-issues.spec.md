---
id: null
slug: consolidated-gh-issues
title: "Consolidated GitHub Issues Fix: #106, #109, and #110"
source: local
specDate: 2026-07-23
---

# Specification — Consolidated GitHub Issues Fix: #106, #109, and #110

## Description

This specification consolidates all currently open GitHub issues in the `jpolvora/workflow-skills` repository into a unified implementation scope for execution via `spec-to-pr`. 

The open issues consolidated are:
1. **Issue #106:** `check-harness: residual AGENTS.md wording in report outline + DoD checklist after #103`
2. **Issue #109:** `Fresh consumer install leaves check-harness suggestions that should be near-zero`
3. **Issue #110:** `bug(check-workflows): improve script path resolution, Windows encoding, and error handling in check_workflows.py`

### Detailed Breakdown by Issue

#### Issue #106: Residual `AGENTS.md` Wording in `check-harness`
- **Context:** Follow-up to #103. While Phase 4 heading was updated to reference the "resolved hub", residual text in `check-harness/SKILL.md` (lines ~672 and ~720) and `REPORT-FORMAT.md` (lines ~47 and ~57) still hardcodes bare `` `AGENTS.md` ``, causing confusion in consumer mode where the hub is `shared/AGENTS.md`.
- **Target Files:**
  - [.agents/skills/check-harness/SKILL.md](.agents/skills/check-harness/SKILL.md)
  - [.agents/skills/check-harness/REPORT-FORMAT.md](.agents/skills/check-harness/REPORT-FORMAT.md)

#### Issue #109: Near-Zero `check-harness` Suggestions on Fresh Consumer Install
- **Context:** A fresh install in a consumer repository currently yields 5 suggestion items in `check-harness` due to seed defaults (placeholders in `config.json.example`, optional uncreated files like `CONTEXT.md` / `DESIGN.md`, template rows in `STACK.md`, and unresolved optional rules like `rules.seniorDeveloper`).
- **Target Files & Changes:**
  - [.agents/skills/shared/config.json.example](.agents/skills/shared/config.json.example) / `config.json`: Clear `domain.glossaryFile` and `domain.designTokens` to `""`.
  - [.agents/skills/shared/STACK.md.example](.agents/skills/shared/STACK.md.example) / `STACK.md`: Clean up template layer rows to prevent false broken inventory signals.
  - [.agents/skills/check-harness/SKILL.md](.agents/skills/check-harness/SKILL.md): Update consumer-mode check-harness classification so unconfigured seed placeholders and optional missing rules do not populate the correction plan as required edits.

#### Issue #110: `check-workflows` Path Resolution, Windows Encoding, and Error Handling
- **Context:** Execution of `check_workflows.py` encounters edge cases:
  1. `REPO_ROOT = SKILL_DIR.parents[2]` assumes fixed 3-level depth, failing when installed at non-standard paths or global roots.
  2. Subprocess calls or file reads without explicit `encoding='utf-8'` trigger `UnicodeDecodeError` / `UnicodeEncodeError` on Windows (cp1252).
  3. Hardcoded references to `.agents/skills` ignore custom `pathTokens` from `shared/config.json`.
- **Target Files:**
  - [.agents/skills/check-workflows/scripts/check_workflows.py](.agents/skills/check-workflows/scripts/check_workflows.py)

---

## Acceptance Criteria

- **AC1 (#106):** In `.agents/skills/check-harness/SKILL.md`, update L672 output format text to reference `the resolved hub` instead of `AGENTS.md`.
- **AC2 (#106):** In `.agents/skills/check-harness/SKILL.md`, update L720 DoD checklist text to reference `the resolved hub` (with explicit consumer note for `shared/AGENTS.md`).
- **AC3 (#106):** In `.agents/skills/check-harness/REPORT-FORMAT.md`, update L47 section title and L57 intro text to refer to `resolved hub` instead of bare `AGENTS.md`.
- **AC4 (#109):** In `.agents/skills/shared/config.json.example` (and seeded `config.json`), set `domain.glossaryFile` and `domain.designTokens` to `""` by default to avoid pointing to non-existent files.
- **AC5 (#109):** In `.agents/skills/shared/STACK.md` (and template), clean up placeholder table rows so check-harness does not treat template markers as broken/incomplete inventory.
- **AC6 (#109):** In `.agents/skills/check-harness/SKILL.md`, adjust consumer-mode rules to classify seed placeholder debt and optional empty rules (`rules.seniorDeveloper`) as informational bootstrap notes rather than correction-plan items.
- **AC7 (#110):** In `check_workflows.py`, replace `parents[2]` root calculation with dynamic root detection that searches upward for `.git`, `package.json`, or `.agents/`.
- **AC8 (#110):** In `check_workflows.py`, enforce explicit `encoding='utf-8', errors='replace'` across all subprocess executions, `sys.stdout` reconfig, and file read/write operations.
- **AC9 (#110):** In `check_workflows.py`, load and respect `pathTokens.skillsRoot` and `pathTokens.sharedDir` from `shared/config.json` when present.
- **AC10 (Verification):** Running `check-harness` and `python .agents/skills/check-workflows/scripts/check_workflows.py` passes cleanly without errors or regressions.

---

## Child Tasks

### Task #106 — check-harness residual AGENTS.md wording
- **Status:** Open
- **Description:** Replace bare `AGENTS.md` in `check-harness/SKILL.md` and `REPORT-FORMAT.md` with `resolved hub`.

### Task #109 — Fresh consumer install check-harness suggestions
- **Status:** Open
- **Description:** Update seed configs/STACK template and adjust check-harness consumer-mode policy for zero-friction fresh install.

### Task #110 — check-workflows script path resolution & encoding fixes
- **Status:** Open
- **Description:** Fix `check_workflows.py` root detection, UTF-8 subprocess encoding, and pathTokens resolution.

---

## Notes

- All 3 issues are closely related to harness robustness, doc precision, and cross-platform installation stability.
- Canonical specification path: `.agents/plans/consolidated-gh-issues/step-00-consolidated-gh-issues.spec.md`.
- Mirror registered at `.agents/specs/consolidated-gh-issues.spec.md`.
