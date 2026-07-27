# Implementation Plan — US-125: Add ws-long-runner skill (sequential multi-spec orchestrator)

## Overview
Implement a new workflow skill `ws-long-runner` that orchestrates sequential batch execution of specs using `spec-to-pr`.

## Proposed Changes

### Component 1: `ws-long-runner` Skill Definition (`.agents/skills/ws-long-runner/`)

#### [NEW] [SKILL.md](file:///l:/source/workflow-skills/.agents/skills/ws-long-runner/SKILL.md)
- Frontmatter: `name: ws-long-runner`, `version: 0.0.1`, `description: Sequential multi-spec batch delivery orchestrator...`
- Native tool contract, audience & load pointers, goals, invariants, trigger patterns (`/ws-long-runner`, `@[ws-long-runner]`).

#### [NEW] [PROTOCOL.md](file:///l:/source/workflow-skills/.agents/skills/ws-long-runner/PROTOCOL.md)
- Master loop 6-phase FSM:
  1. Entry / Resume
  2. Scan / Init Queue
  3. Select next spec
  4. Dispatch `spec-to-pr` worker
  5. Record outcome
  6. Advance / Final Report
- Invariants & dependency matrix.

#### [NEW] [STATE.md](file:///l:/source/workflow-skills/.agents/skills/ws-long-runner/STATE.md)
- State schema for `{plansDir}/ws-long-runner/lr-YYYYMMDDTHHMMSSZ.state.md`.
- Field rules, parseable `step-output` contract (`status`, `slug`, `prNumber`, `prUrl`, `evidence`).
- Already-implemented probe rules (checks 1, 2, 3).
- Blank-list scan policy & user selection gate.
- Resume policy.

#### [NEW] [EXAMPLES.md](file:///l:/source/workflow-skills/.agents/skills/ws-long-runner/EXAMPLES.md)
- Examples for:
  - Blank list scan (`/ws-long-runner`)
  - Explicit spec list (`/ws-long-runner .agents/specs/13-runner.spec.md .agents/specs/14-editor.spec.md`)
  - Resume from existing state (`/ws-long-runner .agents/plans/ws-long-runner/lr-....state.md`)
  - Failure pause gate options (Resume, Skip, Abort).

#### [NEW] [evals.json](file:///l:/source/workflow-skills/.agents/skills/ws-long-runner/evals/evals.json)
- Evaluation prompt test cases for blank list, explicit list, and resume scenarios.

---

### Component 2: Package Registration

#### [MODIFY] [skill-dependencies.json](file:///l:/source/workflow-skills/bin/skill-dependencies.json)
- Add `"ws-long-runner"` to `packages.workflows.skills` array.

---

### Component 3: Skill Indexes & Routing

#### [MODIFY] [AGENTS.md](file:///l:/source/workflow-skills/AGENTS.md)
- Add `long-runner` to Layer 2 / Layer 5 catalog tables and Task router.

#### [MODIFY] [AGENTS.md (.agents)](file:///l:/source/workflow-skills/.agents/AGENTS.md)
- Add `long-runner` to Workflows package skill index and Task router.

#### [MODIFY] [AGENTS.md (shared)](file:///l:/source/workflow-skills/.agents/skills/ws-shared/AGENTS.md)
- Add `long-runner` to Workflows package skill index and Task router.

---

### Component 4: Site & Integrity Build

- Run `node bin/build-site.js` to update site catalog and HTML files.
- Run `npm run generate-integrity` to regenerate `bin/skill-integrity.json`.

## Verification Plan

### Automated Verification
1. `node bin/build-site.js` — Verify site catalog updates.
2. `npm run generate-integrity` — Update integrity manifest.
3. `npm run verify-integrity` — Ensure checksums match.
4. `python .agents/skills/check-workflows/scripts/check_workflows.py` — Run harness workflow checks.
5. `npm run tests -- --local` — Run package & installer tests.
