### [2026-09-18] subagent dispatch turn-continuation after verbose preview
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr orch dispatch`
- **Severity**: `Medium`
- **PathPattern**: `.agents/plans/*`
- **Scenario / Context**: A Step 6 review subagent printed the VerboseMode `Starting step N` preview, then ended its turn with an in_progress JSON block and zero tool calls, producing no report. The orch detected the missing artifact on disk, re-dispatched with an explicit turn rule, and the retry completed. Root cause: the prompt ordered preview-before-tools but never forbade ending the turn after the preview, and the OUTPUT FORMAT example looked like a valid final message.
- **DO NOT**: Dispatch a subagent with a verbose-preview instruction plus an output-format example and no turn-continuation rule; do not accept a step result whose summary is only the preview text — verify the artifact exists on disk before finish.
- **INSTEAD DO**: Add a structural turn rule to every dispatch: the child's FIRST response must contain BOTH the preview text AND at least 2 tool calls (a response with no tool calls ends the turn = failure); require the final message to start with DONE plus completed/failed step-output JSON; verify the artifact exists on disk before finish; re-dispatch once when a child ends with no tool calls (observed 2/6 dispatches even with a same-turn rule).
