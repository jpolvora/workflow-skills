# Worker-turn rules (canonical dispatch contract)

Single source of truth for the worker-turn rule text shared by standard
`dispatch-agent` prompts, step-baton coordinator prompts, and inline-isolated
execution. Dispatch builders quote the key sentences below and point here;
they never maintain a divergent copy.

## Turn rule

- The worker's FIRST response must contain BOTH the verbose preview AND at least 2 tool calls.
- After printing the verbose preview, then immediately continue with tool calls in the same response; never end the turn after the preview.
- A response with zero tool calls ends the turn as failed delivery.
- The verbose preview alone is never the turn's work: printing
  `Starting step N` and then yielding without tool calls is a failed turn,
  no matter how long the preview text is.
- The OUTPUT FORMAT example is a shape reference, not a valid final message
  on its own: a final message with no tool calls and no written artifacts
  behind it is failed delivery.
- The final message must start with DONE plus the completed/failed
  step-output envelope, and required step artifacts must exist on disk
  before finish. A turn that ends with required artifacts unwritten resolves
  as failed, never completed.
- A zero-tool-call or missing-artifact turn emits an explicit non-success
  signal (failed step-output envelope and/or the `worker_zero_tool_calls` /
  `worker_missing_artifact` telemetry event) so the parent fails fast
  without waiting on artifact timeouts.

## Parent contract

- Never ping a running worker turn mid-batch. A status message injected into
  a long turn can become the turn's terminal output and kill work that was
  otherwise progressing.
- The sanctioned progress signal is a read-only poll of the workflow state
  file (revision, `currentStep`, step handoffs): it injects no message and
  cannot terminate the probed turn.
- On a zero-tool-call turn, re-dispatch once with this rule attached; the
  retry recovers instead of the parent waiting out a full timeout.

## Continuation contract

- A continuation worker recovering an interrupted turn reuses the intact
  worktree partial progress instead of rebuilding context from scratch:
  read `git status` first, keep uncommitted fixes and test results, then
  verify, commit, resolve, push, and report from that progress.
