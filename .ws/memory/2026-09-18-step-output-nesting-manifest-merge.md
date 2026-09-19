### [2026-09-18] Transcribed step-output must nest files under files_touched

- **Layer:** infrastructure
- **Module:** ws-spec-to-pr / orch manifest merge
- **Severity:** Medium
- **PathPattern:** .agents/plans/*/.runtime/step-*-output.json
- **Scenario / Context:** When the orchestrator transcribes a child files_touched list into `.runtime/step-N-output.json` for a manifest merge, a top-level `{created, modified, deleted}` shape is silently ignored (merge reads `output.files_touched`), so `finish` falls back to stamped plan artifacts and the next G2-code skips with `empty-stage` despite real product files on disk.
- **DO NOT:** Write transcribed step output as a bare `{created, modified, deleted}` object — the merge will not see it and G2 will stage nothing.
- **INSTEAD DO:** Always wrap as `{status, files_touched: {created, modified, deleted}, notes, next_step_ready}`; after re-finish, assert `workflowManifest` counts match the transcribed set before running G2.
