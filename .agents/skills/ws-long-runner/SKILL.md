---
name: ws-long-runner
version: 0.0.83
description: >-
  Sequential multi-spec batch delivery orchestrator. Executes a queue of specs sequentially using spec-to-pr workers.
  Invoke: /ws-long-runner | @[ws-long-runner].
  Entry: state file | list of specs | blank (scan default specsDir).
---

## Audience & load

| Audience | Doc |
|----------|-----|
| **Master Orchestrator (this file)** | Loop FSM + tool bindings + asserts |
| **Protocol & State** | [`PROTOCOL.md`](PROTOCOL.md) · [`STATE.md`](STATE.md) |
| **Examples & Evals** | [`EXAMPLES.md`](EXAMPLES.md) · [`evals/evals.json`](evals/evals.json) |

**Always-on load:** this file + [`PROTOCOL.md`](PROTOCOL.md). **On demand:** [`STATE.md`](STATE.md) · [`EXAMPLES.md`](EXAMPLES.md) · [`../spec-to-pr/SKILL.md`](../spec-to-pr/SKILL.md) · [`../shared/tools.md`](../shared/tools.md). Language: **en-us** only.

## Native tool contract

Canonical aliases: [`../shared/tools.md`](../shared/tools.md). Params: `{sharedDir}/config.json`. Never narrate undone work. Master orchestrator never edits code directly — dispatches `spec-to-pr` workers via `dispatch-agent`.

| Intent | Alias | Rule |
|--------|-------|------|
| Worker dispatch | `dispatch-agent` | `generalPurpose` or subagent; `description: "ws-long-runner worker — {slug}"`; sequential execution |
| User gate | `user-gate` / `user-gate-auto` | Selection gate for blank scan; failure pause gate (Resume, Skip, Abort) |
| SCM / state probe | `Shell` | SCM query & file probes; parse worker `step-output` |
| State persistence | `write-to-file` | Update `{plansDir}/ws-long-runner/{runId}.state.md` |

# `ws-long-runner` — Orchestrator

Sequential multi-spec batch delivery orchestrator.

## Goals

1. Batch process a list or directory of specs sequentially.
2. Probe before execution to skip already-implemented specs.
3. Unified state management across specs in `{plansDir}/ws-long-runner/{runId}.state.md`.
4. Pause on worker failure with clear recovery options (Resume, Skip, Abort).

## Invariants

| Topic | Rule |
|-------|------|
| Sequential | Exactly one spec worker active at a time |
| Merge | Worker merges PR only after `ws-goal-fix-pr` converges and CI checks pass |
| Isolation | Fresh `spec-to-pr` worker context per spec; no shared scratch across specs |
| Pause on fail | No silent continue on worker failure; gate required |
| Skip done | Probe already-implemented items before dispatching |
| Dry-run | Forward `dryRun` to worker; state records simulated outcome with `[DRY-RUN]` label |

## Triggers

```
/ws-long-runner
/ws-long-runner .agents/specs/13-runner.spec.md .agents/specs/14-editor.spec.md
/ws-long-runner .agents/plans/ws-long-runner/lr-20260725T220000Z.state.md
```
