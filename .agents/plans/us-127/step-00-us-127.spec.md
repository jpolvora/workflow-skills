---
title: "Feature: Smart Multi-Spec Orchestrator (`ws-multi-spec`)"
slug: us-127
source: local
version: 1.0.0
status: draft
---

# Feature: Smart Multi-Spec Orchestrator (`ws-multi-spec`)

## Context
We need to evolve `ws-long-runner` into **`ws-multi-spec`**, an intelligent multi-spec batch orchestrator. Beyond sequential queue execution, `ws-multi-spec` evaluates each spec's complexity to dynamically select the optimal workflow mode (`spec-to-pr` full orchestrator vs. `spec-to-pr-lite` fast orchestrator).

## Functional Requirements

### FR-1: Skill rename & structure (`.agents/skills/ws-multi-spec/`)
- Rename skill from `ws-long-runner` to `ws-multi-spec` across all files, scripts, and documentation.
- Frontmatter `name: ws-multi-spec`, version `0.0.84`.
- Triggers: `/ws-multi-spec`, `@[ws-multi-spec]`.

### FR-2: Smart Complexity & Flow Auto-Detection
- Inspect spec metadata and content prior to dispatching worker:
  - Criteria for `spec-to-pr-lite`: ≤3 implementation tasks/steps, ≤6 estimated files touched, ≤2 system layers, or frontmatter `complexity: low|lite`.
  - Criteria for full `spec-to-pr`: >3 steps, >6 files touched, multiple architectural layers, or frontmatter `complexity: high|full`.
- Log selected flow mode (`standard` vs `lite`) in run state file and output banners.

### FR-3: Harness Integration
- Update `check-workflows` (`.agents/skills/check-workflows/scripts/check_workflows.py`) to validate `ws-multi-spec`.
- Update `check-harness` (`.agents/skills/check-harness/SKILL.md` and related phase definitions/scanners) to validate `ws-multi-spec`.

### FR-4: Website Big Card & Design Updates
- Update `bin/build-site.js` and `docs/index.html` to highlight `ws-multi-spec` as a featured big card showcasing the smart multi-spec runner capabilities.

### FR-5: Package & Hub Sync
- Update `bin/skill-dependencies.json` (`ws-multi-spec` replacing `ws-long-runner`).
- Sync `AGENTS.md`, `.agents/AGENTS.md`, `.agents/skills/shared/AGENTS.md`, `README.md`.
- Regenerate site (`node bin/build-site.js --bump` to `0.0.84`) and integrity digests (`npm run generate-integrity`).

## Verification Plan
1. `npm run generate-integrity`
2. `npm run verify-integrity`
3. `python .agents/skills/check-workflows/scripts/check_workflows.py`
4. `npm run tests -- --local`
