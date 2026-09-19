### [2026-08-27] Handoff artifactPaths repo-relative normalization

- **Layer**: `harness`
- **Module**: `ws-shared / workflow_state`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-shared/scripts/workflow_state.cjs`
- **Scenario / Context**: `writeHandoffFile` copied `files_touched` directly into `artifactPaths` without normalizing to repo-relative paths, causing schema validation failures when subagents reported absolute file paths.
- **DO NOT**: Pass raw absolute paths into `artifactPaths` in `handoff/step-NN.json`.
- **INSTEAD DO**: Normalize `artifactPaths` with `toRepoRelative(repoRoot, item, { allowOutside: true })` inside `normalizeHandoffPaths` before schema validation and disk serialization.
