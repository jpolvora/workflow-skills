---
id: 110
slug: us-110
title: "bug(check-workflows): improve script path resolution, Windows encoding, and error handling in check_workflows.py"
source: github
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/110"
specDate: 2026-07-23
---

# Specification — bug(check-workflows): improve script path resolution, Windows encoding, and error handling in check_workflows.py

**State:** open

## Description

### Summary
During execution of \check-workflows\ (\check_workflows.py\), script syntax and path validation can encounter edge cases depending on execution context, OS encoding (Windows cp1252), and skill installation depth.

### Observed Issues & Improvement Points
1. **Repository Root Resolution (\parents[2]\)**:
   - \REPO_ROOT = SKILL_DIR.parents[2]\ assumes a fixed 3-level directory hierarchy (\.agents/skills/check-workflows/scripts\). If installed via alternate path configurations or global skills roots, \REPO_ROOT\ calculation fails or resolves to an incorrect parent folder.
2. **Windows Stdio & Process Encoding**:
   - Although \ensure_utf8_stdio()\ is invoked, subprocess calls (\
ode --check\) or file reading without explicit encoding fallbacks can trigger \UnicodeDecodeError\ / \UnicodeEncodeError\ on Windows systems using default code pages (e.g., \cp1252\).
3. **Non-Interactive Execution Handling**:
   - Interactive prompt check \sys.stdin.isatty()\ when running \--fix\ in non-interactive CI/CD or background task runners needs explicit non-interactive fail-safe handling.
4. **Path Token & Custom Config Resolution**:
   - Hardcoded references to \.agents/skills\ should respect custom \pathTokens.skillsRoot\ and \pathTokens.sharedDir\ defined in \shared/config.json\.

### Proposed Fix
- Dynamically detect project root by scanning upward for \.git\, \package.json\, or \.agents/\ marker directory instead of fixed parent depth \parents[2]\.
- Enforce explicit \encoding='utf-8', errors='replace'\ across all subprocess executions and file readers.
- Respect \pathTokens\ from \shared/config.json\ when present.

## Acceptance Criteria

_No explicit acceptance criteria in the issue — extract/validate during refinement._

## Notes

_Automatically generated from gh issue view JSON (GitHub)._
