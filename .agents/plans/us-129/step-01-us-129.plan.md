# Implementation Plan — US 129: Sync ws-shared/skill-dependencies.json with bin: register ws-multi-spec for consumer update

## User Review Required

> [!NOTE]
> Synchronizing `.agents/skills/ws-shared/skill-dependencies.json` with `bin/skill-dependencies.json` ensures that consumer updates preserve `ws-multi-spec` registration in managed hub trees.

## Open Questions

None. The scope is well-defined by GitHub issue #129.

## Proposed Changes

### Workflows Manifest & Dependency Definitions

#### [MODIFY] [.agents/skills/ws-shared/skill-dependencies.json](file:///l:/source/workflow-skills/.agents/skills/ws-shared/skill-dependencies.json)
- Add `"ws-multi-spec"` to `packages.workflows.skills` array (matching `bin/skill-dependencies.json`).
- Add `"ws-multi-spec": ["spec-to-pr", "spec-to-pr-lite", "caveman", "gabarito", "karpathy-guidelines"]` to `dependencies` object.

### Workflow & Harness Auditing

#### [MODIFY] [.agents/skills/check-workflows/scripts/check_workflows.py](file:///l:/source/workflow-skills/.agents/skills/check-workflows/scripts/check_workflows.py)
- Add assertion in `_load_dependencies` / dependency verification to compare `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json` when both exist, flagging any drift between `bin` and `shared` package skill lists and dependencies as a `CRITICAL` or `WARNING` issue.

### Test Suite

#### [MODIFY] [test/test-install.js](file:///l:/source/workflow-skills/test/test-install.js)
- Add assertion checking that `ws-multi-spec` is present in both `bin/skill-dependencies.json` and `.agents/skills/ws-shared/skill-dependencies.json`.
- Assert that `packages.workflows.skills` in both dependency manifests match.

## Verification Plan

### Automated Tests
- `python .agents/skills/check-workflows/scripts/check_workflows.py`
- `npm run test`
- `npm run generate-integrity`
- `npm run verify-integrity`

### Manual Verification
- Confirm git status is clean except expected checksum/integrity file updates.
