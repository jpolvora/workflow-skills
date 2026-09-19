# Context — Step-Level Baton Handoffs for Multi-CLI Workflow Runs

Companion to `0094-step-baton-multi-agent-runs.spec.md`. Records the product options considered during brainstorming and why the spec chose the coordinator-owned loop.

## Feature Boundary

The spec covers one question: how does a `ws-spec-to-pr` run execute different steps in different CLIs on the same machine and repository while keeping the state file as the single source of truth. Inside the boundary: run config (step to runner map), baton claim protocol on state, deterministic coordinator loop, worker one-shot contract, gates at the coordinator, telemetry. Outside the boundary: anything requiring a network broker, cross-machine scheduling, live runner-to-runner messaging, or automatic CLI provisioning. The `spec-memo` vault is an optional human-readable mirror, never the turn signal.

## Implementation Decisions

### Decision 1: who waits — peer polling vs coordinator-owned loop

- Option A — peer polling (original proposal): every assigned CLI runs its own loop and polls the state file every 30–60s for its turn.
  - Rejected as the primary design. LLM sessions must not idle-poll: each waiting agent burns tokens, wall time, and attention budget while doing nothing, and wake-up latency plus flaky long-lived sessions make turn timing unreliable. N independent pollers also duplicate claim logic and multiply race windows.
- Option B — coordinator-owned loop (chosen): one deterministic Node process watches state and spawns each worker CLI one-shot only when its turn arrives.
  - Chosen. Exactly one claim authority, one gate surface, zero LLM idle burn. Workers stay simple: read pointers, do the step, call `finish`, exit. Matches the existing Tier 2 one-shot spawn vocabulary extended with a durable driver.
- Option C — event-driven watcher per agent (`fs.watch` triggering CLI spawn on state change).
  - Viable alternative, deferred. Same N-process complexity as Option A with better latency. Revisit if coordinator polling proves too coarse; the claim protocol already supports multiple claimants, so this stays a compatible upgrade.

### Decision 2: turn signal — state file vs vault baton vs new channel

- State file (chosen): `currentStep` plus the `baton` record is the sole turn signal. It is good enough for same-machine same-repo runs because all parties share the filesystem, writes are already atomic dual-write, and the revision check serializes claims. No new channel to secure, back up, or teach.
- Vault baton (`spec-memo` handoff as the signal): rejected as the signal, kept as an optional mirror. The vault baton is owner-scoped async next-session delivery for human session switching; a workflow run needs a `workflowId`-scoped synchronous turn lock. Making the vault required would also add a hard external dependency to a portable harness.
- New side-channel (lock files, sockets, queue): rejected. More moving parts with no benefit at single-machine scale.

### Decision 3: isolation scope — owner vs workflow run

- `spec-memo` scopes batons by owner and branch to stop teammates stealing each other's tactical context. A workflow run instead scopes its baton by `workflowId` (plus branch): one run has exactly one logical baton no matter who started it, and concurrent runs on different branches never share state files. Teammate isolation falls out of per-run state paths rather than an ownership check.

### Decision 4: gates in multi-CLI mode

- All gates surface at the coordinator (pause-and-prompt, or index 0 in `autoMode`). Workers run non-interactive. Rationale: gates need one human decision point with full run context; scattering prompts across worker CLIs would fork decisions and break the audit trail in gate history.

## Deferred Ideas

- Per-agent `fs.watch` spawn without a coordinator process (Option C above) for lower-latency turns.
- Distributed queue or broker for multi-machine runs, with the claim protocol promoted to a lease service.
- Automatic detection and provisioning of installed CLIs (`host-capabilities.json` extended with runner advertisements).
- A run-config template gallery (for example review-heavy vs implementation-heavy runner splits) shipped under `templates/`.
- Live progress fan-out (dashboard or notifications) beyond `telemetry.jsonl` and `ws-monitor` polling.
- Lite-first runner presets; the schema supports lite step keys from day one but no preset ships in this spec.
