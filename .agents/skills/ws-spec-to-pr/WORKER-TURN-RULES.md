# Worker-turn rules (canonical dispatch contract)

Single source of truth for the worker-turn rule text shared by standard
`dispatch-agent` prompts, step-baton coordinator prompts, and inline-isolated
execution. Dispatch builders quote the key sentences below and point here;
they never maintain a divergent copy.

## Scope

These rules bind dispatched workers only: standard `dispatch-agent` prompts, step-baton coordinator workers, and inline-isolated step execution. They do not bind the orchestrator host session.

In `autoMode` the orchestrator runs unattended in one host session through Steps 0→9 (close, `ws-ship-pr`, `ws-goal-fix-pr`) and does not stop between steps because a worker turn ended. A worker completion is not an orchestrator turn boundary.

Worker obligations stay in force: the first worker response includes the verbose preview and at least two tool calls; a zero-tool-call worker turn is failed delivery; the parent does not inject a message into a running worker turn and polls workflow state read-only.

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

## Worker liveness contract (batch workers)

### Worker marker obligation

- A dispatched batch worker writes a liveness marker under the run runtime
  directory as `worker-started-{step}-{batch}.md`, where `{step}` is the
  dispatched step and `{batch}` is the round id or DAG node id of that
  dispatch.
- The marker carries non-empty `step`, `batch`, and `dispatchedAt` fields. A
  marker missing any of them never counts as evidence.
- Write the marker within the effective worker liveness window after
  dispatch, for this dispatch. A marker counts as evidence only for the
  dispatch whose baseline it is at or after: the runtime directory survives
  resumes, so a stale same-name marker from a superseded dispatch is never
  read as current.
- The marker is a plain runtime file written directly by the worker, never
  through a workflow-state write. It adds no state mutation and must not bump
  the workflow state revision.

### Parent watchdog contract

- The parent evaluates liveness read-only with
  `node worker_liveness_check.cjs --us-dir <us-dir> --step <N> --batch <id>`,
  which resolves one verdict in this order: `no-baseline` (no dispatch record
  for the step, never a wedge), `alive` (a fresh marker or durable progress
  after the baseline), `pending` (window not elapsed yet), then `wedged`
  (window elapsed with neither a fresh marker nor durable progress).
- Durable progress outranks marker absence: while the run advances after the
  baseline, a missing marker is never proof that the worker died.
- No dispatch record means `no-baseline`, and the parent never reads that as a
  wedge: the check fails open, so an in-flight run resumed from older state is
  not reported wedged.
- Only a `wedged` verdict authorizes takeover. Never dispatch a second worker
  for a batch that is not proven wedged.
- A ping is never a progress signal. When one is sent anyway, record its
  outcome as watchdog evidence instead of leaving silence.

### Sanctioned no-output takeover branches

- When a batch is proven wedged and no output exists, take one of two
  branches: cancel-then-redispatch, or re-execute the batch inline on the
  parent when re-dispatch is unavailable.
- Record the branch taken with measured ages (dispatch baseline, marker age,
  elapsed window) in the round artifact.
- The dispatch baseline is correlated per step while `{batch}` names the
  marker, and the telemetry stream carries no batch or round field: a
  step-scoped baseline can only delay a wedge verdict, never authorize a
  takeover. A wedge verdict therefore presumes a frozen run.

### Posture exemption

- The marker obligation binds dispatched batch workers only. The exemption
  covers lite and inline runs, the Inline legacy loop, and Tier 3
  inline-isolated execution: no batch worker is dispatched, so there is no
  marker obligation and no watchdog takeover branch.

## Continuation contract

- A continuation worker recovering an interrupted turn reuses the intact
  worktree partial progress instead of rebuilding context from scratch:
  read `git status` first, keep uncommitted fixes and test results, then
  verify, commit, resolve, push, and report from that progress.
