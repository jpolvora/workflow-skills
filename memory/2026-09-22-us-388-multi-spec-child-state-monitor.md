### [2026-09-22] ws-monitor multi-spec expectation blindness and PowerShell node -e quoting

- **Layer**: `application`
- **Module**: `ws-monitor-multi-spec-expectations`
- **Severity**: `High`
- **PathPattern**: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs, .agents/skills/ws-spec-multi/PROTOCOL.md, .agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs`
- **Scenario / Context**: us-388. The `workflowType: ws-spec-multi` branch of `monitor_snapshot.cjs` returned `expectedArtifacts: []` while the single-workflow path computed a real list, so an advanced queue item with no child state produced no finding — a structurally silent blind spot. Separately, on a Windows PowerShell host, `node -e "<script with embedded double quotes>"` was mangled by the shell and failed with `SyntaxError: Invalid regular expression flags` / `Expression expected`.
- **DO NOT**: leave the multi-spec branch returning an empty expectation list, and do not add a parallel detector when `expectedArtifacts()` already models the expectation; do not pass inline `node -e` scripts that contain double-quoted string literals through PowerShell.
- **INSTEAD DO**: derive multi-spec expectations from the batch queue rows (`expectedChildArtifacts`) and surface absence as `missing-child-state` (distinct from `stale-parent-row`, which needs a child that already closed); for non-trivial inline Node, write a temp `.cjs` under the temp dir and run `node <file>` instead of `node -e`.
