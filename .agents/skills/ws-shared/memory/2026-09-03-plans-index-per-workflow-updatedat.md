### [2026-09-03] Plans index updatedAt is per-workflow
- **Layer**: `harness`
- **Module**: `workflow_state / plans index`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`, `.agents/plans/index.json`
- **Scenario / Context**: `{plansDir}/index.json` is rewritten on `update_state` and on `validate_state.cjs rebuild-index`. Agents often run rebuild-index during bootstrap when the resume list looks incomplete.
- **DO NOT**: Stamp every `workflows[]` row `updatedAt` with `nowIso()` / catalog `generatedAt` during rebuild or a single-workflow update. That makes idle completed runs look freshly touched.
- **INSTEAD DO**: `updatePlansIndex` upserts only the current `workflowId` row with the operation timestamp. `rebuildIndex` sets each row `updatedAt` from that workflow's own activity (`endedAt`, frontmatter `updatedAt`, latest dispatch timestamps, `startedAt`, `createdAt`) and keeps catalog `generatedAt` as rebuild time.
