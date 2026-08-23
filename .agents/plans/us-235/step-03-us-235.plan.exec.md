---
slug: us-235
execMode: sequential
reason: "enableDag is false (defaults.enableDag: false)"
step: 3
workflowId: us-235-20260823T151631Z
status: active
startedAt: "2026-08-23T15:16:31Z"
endedAt: "2026-08-23T15:28:52.093Z"
acRefs: []
---
# Plan Execution — Step 5 to 6 deadlock: comment aliases, skipReason, state hash, .runtime allowlist

## Execution Mode
`execMode: sequential` (Tasks executed sequentially; `defaults.enableDag: false`)

## Tasks Breakdown

Sequential order matches refined plan Steps A–I. Same implementer, no file overlap concerns.

### Task A: Failing tests first
- **Target Files**: `test/test-ac-ledger.js`, `test/test-workflow-state-contract.js`
- **Description**: Add AC1–AC15 assertions that fail on current HEAD.
- **AC Coverage**: AC14, AC15, and test scaffolding for AC1–AC13

### Task B: Alias filter + skipReason
- **Target Files**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`
- **Description**: Omit `/^_/` keys; persist valid `skipReason`; skip counts as observed; both `knownDefect` sites honor skip.
- **AC Coverage**: AC1, AC3–AC6, AC14

### Task C: Example config
- **Target Files**: `.agents/skills/ws-shared/config.json.example`
- **Description**: Remove `_comment_mutationTest`.
- **AC Coverage**: AC2

### Task D: Runtime allowlist
- **Target Files**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Description**: Allow `*.cjs`, `*.patch`, `*.md` under `.runtime`.
- **AC Coverage**: AC9

### Task E: Frontmatter-only state hash
- **Target Files**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Description**: `stateIdentityHash` at performUpdate, validateSnapshot, rebuildIndex.
- **AC Coverage**: AC10, AC11

### Task F: finish --commit
- **Target Files**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`, `.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md`
- **Description**: Repeatable `--commit <sha>` into `state.commits`.
- **AC Coverage**: AC12, AC13

### Task G: Pre-advance 6 policy
- **Target Files**: (verify only; no extra relax)
- **Description**: Missing alias still fails; skipped/observed aliases pass at score ≥ 9.
- **AC Coverage**: AC7, AC8, AC15

### Task H: Orch one-liner
- **Target Files**: `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`
- **Description**: Record `skipReason: baseline-dirty` when format fails outside `files_touched`.
- **AC Coverage**: AC6 call site

### Task I: Integrity + package tests
- **Target Files**: `bin/skill-integrity.json`
- **Description**: `npm run generate-integrity && npm run verify-integrity && npm run test`
- **AC Coverage**: all
