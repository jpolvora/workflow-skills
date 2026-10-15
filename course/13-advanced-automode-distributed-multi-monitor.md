# Chapter 13 — Advanced: autoMode, Multi-Spec, Distributed, Monitor

## Video metadata

- **YouTube title:** Advanced: autoMode, Multi-Spec, Distributed, Monitor | Workflow Skills #13
- **Thumbnail text:** HANDS OFF
- **Description (first lines):** Unattended step chaining, a classified batch queue, steps executed by different CLIs through a state-file baton, and read-only live observation. Power, with seatbelts.

## Learning objectives

After this video, the viewer can:

1. Run `autoMode` safely and name its stop conditions.
2. Drive a `ws-spec-multi` batch queue with per-spec classification.
3. Explain the distributed baton (claim, lease, release) and when to opt in.
4. Watch any live run with `ws-monitor` without touching its state.

## Before you record

1. Demo queue: three specs (one lite-worthy, one standard-worthy, one already-implemented).
2. A long-running demo run you can monitor; transcript following needs a session id.
3. `gates.md` autoMode stop list and the distributed coordinator config on screen.

---

## Narration script

[ON SCREEN: you. Energy up. This is the power chapter.]

Welcome back. From Spec to Delivery.

Everything so far had a human at the gates. Today we carefully remove the human from the loop — at the checkpoints, never from the responsibility. Four advanced modes: unattended runs, batch queues, distributed steps, and the observer that watches them all. Power, with seatbelts. I will show you each seatbelt by name.

**One: `autoMode`.** [ON SCREEN: config flag, then a run advancing by itself.] Turn it on, and the orchestrator removes gate halts, voluntary turn limits, and yields at internal checkpoints. Steps zero through nine chain in one session: close hands off to ship, ship hands off to the fix-PR loop, until terminal delivery and convergence, or a named blocker. A green step is progress to record, never a reason to stop and chat. Index-zero choices auto-select; classifications auto-accept.

The seatbelts. [PAUSE] There is an explicit stop list in the gates contract: hard validation failures, exhausted refinement rounds, residual critical findings. autoMode never waives planning for standard or complex work. And when the host itself forces a turn to end mid-step, because hosts do that, the orchestrator checkpoints sub-progress and records a turn-boundary pause with the exact next action. The next session resumes that action instead of mistaking silence for a stall. Unattended never means unaccountable. Every auto-advance is in telemetry and state.

My honest guidance: earn autoMode. Run five supervised deliveries first. Then enable it for the lite-shaped work you trust, and keep standard, high-blast-radius runs gated until your verify bar and review loop have a track record. The tool lets you remove yourself. Judgment decides when.

**Two: batches,** `ws-spec-multi`. [DEMO: the queue gate, three specs.] One invocation, a queue of specs, executed strictly one at a time. A blank invocation scans and lists only pending or unfinished specs: shipped and already-merged work stays off the gate. Each item is classified, dispatched to lite or standard automatically, and the queue does not advance until the current item reaches a terminal state. Base branch syncs between items. State lives per run, in `{plansDir}/{runId}/`, with legacy flat state files still resumable, because portfolios outlive folder conventions.

Three batch seatbelts, quickly. [ON SCREEN: numbered list.] Per-child artifact verification: a child that claims completion without its state, plan, and result files fails closed; the parent records outcomes through a verifier, not through hope. The foreign-commit guard: on a shared branch, each dispatch records the branch tips, and an unexpected advance by someone else pauses the queue, names the new commits, and offers resume, skip, or abort. A convergence merge that would include a different head than the one reviewed is refused. And queue rows are keyed by spec identity, so the same spec can never be processed twice concurrently by accident.

**Three: distributed steps,** `ws-spec-to-pr-distributed`. [ON SCREEN: baton fields.] Explicit opt-in only. It never auto-selects, and the standard orchestrator ignores its config entirely. The idea: different steps run in different CLI processes on the same machine. One spec's planning happens in one tool, implementation in another, each where it is strongest.

The mechanism is deliberately boring: a baton inside the state file. Holder, step, claim time, lease expiry, revision. A deterministic coordinator script, plain Node, no model involved, claims the step with a revision check, spawns a one-shot worker with sparse pointers plus the baton envelope, waits for exit, and verifies advancement and artifacts before releasing. Expired leases become reclaimable with the attempt logged; after the configured max attempts, default two, the workflow blocks for a human. Gates surface at the coordinator. Workers never prompt. Same machine, same repo, no network queue, no magic. Boring is a compliment for coordination code.

**Four: the observer,** `ws-monitor`. [DEMO: a watch ticking on the long run.] Read-only. It snapshots state, telemetry, expected artifacts, and, only when you configure transcript roots, the agent transcripts. It classifies drift: missing child state in batches, a plan folder with artifacts but no state file (a run that lost its machine state is reported, not hidden), step-completion contract violations, and stalls. The live profile watches until terminal, follows your session transcript, and runs a stall stopwatch that defers to the workflow's own clocks: if state or telemetry advanced recently, a quiet transcript is a pause, not a hang, and the warning downgrades itself. When a run wedges for real, the monitor proposes an enriched, anonymized defect issue through your provider's create-issue intent. It proposes. You file. Observers report; they never edit the run they watch.

[PAUSE]

Two smaller power tools ride along. **Per-run model presets:** `preset=<name>` on the invocation overrides the configured preset for that run only, warns and falls back on unknown names, and persists in state so resume keeps it. And the **subagent dispatch command**, `workflow-skills dispatch`, which runs one validated task outside any pipeline through your configured host runner, with structured results. Pipelines are the product, but a good harness also lends you its parts.

[ON SCREEN: back to you.]

Advanced modes multiply whatever discipline you already have. Gates first, automation second; that ordering is the entire safety story. Last teaching chapter next: keeping the harness itself honest, benchmarks, retrospectives, and writing your own skill.

## Usage examples

```text
Run this unattended: Run ws-spec-to-pr for spec csv-export   (with "defaults": { "autoMode": true })
Batch the backlog: ws-spec-multi
Distributed run: ws-spec-to-pr-distributed for spec csv-export   (explicit opt-in only)
```

```bash
# Live observation (read-only)
# ask for: ws-monitor --watch --interval 60 --until-terminal --follow-transcript --session-id <id>
npx --yes github:jpolvora/workflow-skills dispatch --subagent <name> --task "<directive>" --json
```

Distributed keys (config, owned by the distributed workflow only):

```jsonc
"defaults": {
  "stepRunners": { "4": "impl-cli" },
  "runners": { "impl-cli": { "command": "<template with {prompt} {cwd} {slug} {step}>" } },
  "stepBaton": { "pollIntervalSeconds": 30, "maxAttempts": 2 }   // poll 5–300, default 30
}
```

## Features in this chapter (enumerated)

1. Unattended `autoMode`: chains Steps 0–9 through ship and fix-PR in one session; mid-step `checkpoint` + `pause-turn` resume via `state.turnPause.nextAction`; explicit stop conditions fail closed.
2. Batch delivery (`ws-spec-multi`): per-spec classification (lite vs standard), terminal-gated queue advance, per-run state dirs with legacy resume, verified child outcomes.
3. Shared-head safety: foreign-commit guard (baseline tips, pause on unexpected advance, convergence tip check) and spec-identity queue keys.
4. Distributed steps (`ws-spec-to-pr-distributed`): state-file baton (holder/step/lease/revision), deterministic `step_coordinator.cjs`, one-shot workers, gates at the coordinator.
5. Live observation (`ws-monitor`): read-only snapshots, state-less run detection, stall stopwatch deferring to state/telemetry clocks, sanitized defect-issue proposals.
6. Power utilities: per-run `preset=<name>` model override persisted in state; `workflow-skills dispatch --subagent` for one-off validated tasks.
7. Worker liveness verdicts on long dispatches (`alive` / `pending` / `wedged`); only a proven wedge authorizes parent takeover.

## Common mistakes

1. Enabling `autoMode` before the verify bar and review loop have a supervised track record. Automate discipline, not hope.
2. Letting two writers share a head without the foreign-commit guard's pause discipline. Unexpected advances are information, not noise.
3. Treating the monitor as a fixer. It is read-only by contract; repair happens in the workflow or by a human decision.

## Recap (say this)

"Gates first, automation second. The observer reports; it never touches. Next: harness health."

## Practice

Run one lite spec under `autoMode` while watching `ws-monitor` in a second terminal. Note every auto-advance in telemetry, then deliberately let a turn end mid-step and resume from the recorded next action.

## Next video

Chapter 14 — Keep the Harness Honest + Write Your Own Skill.
