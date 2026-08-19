---
slug: us-220
execMode: sequential
reason: "enableDag is false (defaults.enableDag: false)"
---

# Plan Execution — Add ws-pre-daily skill to upstream (missing from repo)

## Execution Mode
`execMode: sequential` (Tasks executed sequentially)

## Tasks Breakdown

### Task 1: Skill Files Port
- **Target Files**:
  - `.agents/skills/ws-pre-daily/SKILL.md`
  - `.agents/skills/ws-pre-daily/references/OUTPUT.md`
  - `.agents/skills/ws-pre-daily/scripts/collect_window.py`
- **Description**: Port and create skill files under `.agents/skills/ws-pre-daily/`. Ensure SKILL.md has version `0.3.24` and portable path tokens. Ensure `collect_window.py` has pure Python 3 stdlib and UTF-8 safe stdio.
- **AC Coverage**: AC1, AC2, AC3

### Task 2: Package Registration & Hub Routing
- **Target Files**:
  - `bin/skill-dependencies.json`
  - `.agents/skills/ws-shared/installed-skills.json`
  - `AGENTS.md`
  - `.agents/skills/ws-shared/AGENTS.md`
- **Description**: Register `ws-pre-daily` into package metadata and documentation routing tables.
- **AC Coverage**: AC4, AC5

### Task 3: Automated Test Suite & Package Script
- **Target Files**:
  - `test/test-ws-pre-daily.js`
  - `package.json`
- **Description**: Add unit/integration tests asserting window time calculation, git log and status collection, plan state parsing, and JSON output schema. Update `package.json` test scripts.
- **AC Coverage**: AC6

### Task 4: Integrity Digest & Verification
- **Target Files**:
  - `bin/skill-integrity.json`
- **Description**: Generate integrity digests (`npm run generate-integrity`) and verify full test suite passes (`npm run test`).
- **AC Coverage**: AC7
