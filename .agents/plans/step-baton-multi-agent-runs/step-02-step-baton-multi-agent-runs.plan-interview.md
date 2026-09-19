---
slug: step-baton-multi-agent-runs
title: Step-Level Baton Handoffs for Multi-CLI Workflow Runs
step: 2
workflowId: step-baton-multi-agent-runs-20260918T232508Z
status: completed
startedAt: "2026-09-18T23:25:08Z"
endedAt: "2026-09-18T23:36:46.849Z"
acRefs: []
---
# Plan Interview — Step-Level Baton Handoffs for Multi-CLI Workflow Runs

Verdict: **advance**. 2 blocking gaps found, both closed in autoMode
(model-inferred / project evidence, no user-gate). 12 non-blocking gaps
closed via project-context sweep or defaults. All 17 ACs and NS1–NS7 stay
mapped; resolutions are folded into `step-02-*.plan.refined.md`.

## Audit coverage

- Scanned plan sections 0–8 against `step-00-*.spec.md` (17 ACs, 7 negative
  scenarios, 6 DoR rows).
- Section 6 mandate: PASS. All touched framework boundaries carry explicit
  invariant checks (auth N/A with grep verification, async/claim ordering,
  DTO validation, injection/argv, lifecycle cleanup, config invariants,
  harness neutrality). Failing-test baseline: PASS — every AC maps to named
  red cases (NS1–NS7) in §5 before implementation.
- Spec DoR audit: bounded scope ✓, atomic ACs ✓, failure modes → AC5–AC8 /
  AC11–AC14 ✓, telemetry field set ✓, zero open blockers after this
  interview ✓, harness neutrality (§6.7 + P9 search) ✓.
- Scenario probes: concurrency → B1 (registered); soft-deletion N/A (no user
  data stores — file state only); list sizing N/A (bounded 0–9 / 0–5 step
  sets); rate limits N/A (no network surface).
- Memory: local `MEMORY.md` Medium+ traps verified against plan §1 fold;
  vault search returned no hits (same as plan-time). `force_interview`
  honored — full Resolve ran, no soft-skip.

## Interview registry

| id | class | section | gap | recommendation | status | resolution | resolutionSource | evidence |
|----|-------|---------|-----|----------------|--------|------------|------------------|----------|
| B1 | blocking | §2 Claim protocol | Write-then-reread without mutual exclusion cannot guarantee AC8 "no step body executes twice": two coordinators can interleave write → reread → spawn and both observe their own write | Guard load → validate → write with an atomic lockdir (`{us-dir}/.runtime/baton.lock` via `mkdir`, stale-lock expiry on pid-liveness + mtime); holder stays the mapped runner id; lock-busy → backoff then revision check (win or `BATON_REVISION_CONFLICT`); reread-verify kept as defense-in-depth | closed | Lockdir added to `step_baton.cjs` as `withBatonLock`; spec baton shape unchanged | model-inferred | `workflow_state.cjs` `atomicWrite` (tmp+rename) makes single writes atomic but not read-modify-write sequences — no in-repo lock helper exists |
| B2 | blocking | §2/§5 AC6 | Plan says "double finish rejected" but `finish` is idempotent-replay capable: same-fingerprint repeats restore prior state and succeed | Release is idempotent: if the step handoff is already written and `currentStep` already advanced past the step, `finish` returns success as a no-op. "Exactly once" = one holder-clear + one advance, enforced by the handoff-presence guard | closed | §5 AC6 case updated to idempotent-success; P2 carries the handoff-presence guard | project | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:1630-1637` (isIdempotentFinish restore + success) |
| N1 | non-blocking | §2 Worker payload / OQ6 | `{prompt}` as file path deviates from Tier 2 inline-text substitution (`{cli} run --prompt "{prompt}"`) | Confirm file path (matches the existing `.runtime/step-{N}-dispatch-prompt.md` convention written via `build_dispatch_context.cjs --output`); `host-dispatch.md` must document the effective resolution explicitly per the token-contract trap | closed | OQ6 confirmed as prompt-file path + doc requirement | project | `.agents/skills/ws-shared/runtime/host-dispatch.md:64-68`; `.agents/skills/ws-spec-to-pr/scripts/build_dispatch_context.cjs:234`; this run's `.runtime/step-{0,1,2}-dispatch-prompt.md` |
| N2 | non-blocking | P6 / AC15 | `telemetry.schema.json` has 14 required fields and `additionalProperties: false` — bare `{step, holder, attempt, exitCode}` events would fail validation | Coordinator constructs full-envelope events from run context (workflowId, pipeline, packageVersion, model, zero counters) with the new `type` enum values + optional `holder`/`attempt`/`exitCode`/`cause` | closed | P6 + §5 AC15 updated to full-envelope construction | project | `.agents/skills/ws-shared/runtime/telemetry.schema.json:6-9,68` |
| N3 | non-blocking | P4 / AC12 | "Expected step artifacts exist on disk" needs a per-step table; steps 4 and 9 have no artifact files | Reuse `finishArtifactNames` (`workflow_state.cjs`); steps with an empty mapping verify via handoff-presence + `currentStep` advance only | closed | P4 + §5 AC12 updated with the table rule | project | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs:471-488` |
| N4 | non-blocking | P5 / OQ2 | Gate-shaped-output heuristic left as "exact token list fixed in implementation" | Fix the narrow token list now: `user-gate` marker, `Transition Gate(s)` headings, `Orchestrator session model:` banner, `More options…`; locked by the NS5 test | closed | OQ2 resolved with fixed token list | model-inferred | `gates.md` gate vocabulary (markers above); narrow match avoids false positives on prose |
| N5 | non-blocking | P1 / OQ1 | Config key names for poll interval + max attempts (spec names values, not keys) | Confirm `defaults.stepBaton.pollIntervalSeconds` (5–300, default 30) + `defaults.stepBaton.maxAttempts` (default 2); no collision in schema | closed | OQ1 confirmed | project | `config.schema.json` grep: no `stepBaton`/`stepRunners` keys; `stepModels` only; camelCase `defaults` convention |
| N6 | non-blocking | P7 / OQ4 | Monitor snapshot field names for baton data | Confirm `baton: {holder, step, leaseUntil, revision}` + `mappedRunner` per active step; additive to the per-workflow object, no key collision | closed | OQ4 confirmed | project | `monitor_snapshot.cjs` `snapshot()` per-workflow object; zero `baton`/`holder` hits today |
| N7 | non-blocking | P4 / §6.5 | Plan cites a "win32 `taskkill` path per `CROSS-PLATFORM.md`" — that file contains no process-kill guidance (dangling citation) | Implement kill in the coordinator: `child.kill()` (SIGTERM) → escalate SIGKILL; win32 fallback `taskkill /pid /T /F`; hang-fixture test on linux + review for the win32 branch | closed | P4 + §6.5 citation replaced with concrete kill recipe | model-inferred | `CROSS-PLATFORM.md` full read: UTF-8 / quoting / managed-scripts / session-posture only |
| N8 | non-blocking | P8 / AC17 | "Via the `ws-memo` runtime path" is unexecutable as written — a plain-Node coordinator has no MCP session | Coordinator spawns `{specMemo.cli}` append/upsert with the handoff summary + `nextSteps`; never hardcode `memo`; zero-spawn assertion when disabled | closed | P8 + §5 AC17 updated to CLI-spawn mechanism | project | `ws-spec-memo/references/INTEGRATION.md` § Config switches (`specMemo.cli`) + Lifecycle translation (task-done → append event) |
| N9 | non-blocking | OQ7 | Empty `stepRunners` map with coordinator invoked | Confirm named config error (nothing to drive); AC3 fallback applies when the coordinator is not used, so no contradiction | closed | OQ7 confirmed | model-inferred | Spec AC3 covers unmapped steps under orch dispatch, not coordinator invocation |
| N10 | non-blocking | OQ8 | Named-error code strings | Confirm `BATON_*` / `RUNNER_*` / `WORKER_*` / `STATE_CHANGED_UNDERFOOT` / `RUN_MAX_ATTEMPTS_EXCEEDED` family; each thrown error carries `err.code` + human message; greenfield (no existing code convention to mirror) | closed | OQ8 confirmed with `err.code` rule | model-inferred | `workflow_state.cjs` throws plain-Error messages; no UPPER_SNAKE code convention exists |
| N11 | non-blocking | OQ3 | Coordinator invocation UX | Confirm script-only (`node …/step_coordinator.cjs`) + `SKILL.md` pointer; no new skill id, no CATALOG/dependency-graph churn | closed | OQ3 confirmed | project | CATALOG 24 KB budget trap + no-new-skill-id keeps `bin/skill-dependencies.json` untouched |
| N12 | non-blocking | OQ5 | New telemetry fields vs strict readers | Confirm optional `holder`/`attempt`/`exitCode`/`cause`, required set unchanged; schema enum extend ships in the same batch (P6), so strict readers stay green | closed | OQ5 confirmed | project | `telemetry.schema.json` enum + `additionalProperties: false`; P6 ordering |
| N13 | non-blocking | P9 docs | `SKILL.md` / `host-dispatch.md` / `gates.md` edits risk replacing test phrase-locked bullets or missing restated tier-ladder prose | Docs edits ADD bullets only, never replace phrase-locked ones; whole-file sweep for restated ownership (tier ladder also lives in `tools.md`) with zero residual hits | closed | P9 updated with ADD-only + whole-file sweep rule | project | MEMORY traps: dispatch-prose mirror, pipeline-dedup locked substrings, whole-file sweep |

## step-output (workflow mode)

```yaml
status: success
refine:
  registry:
    - {id: B1, class: blocking, section: §2 Claim protocol, gap: write-then-reread lacks mutual exclusion, status: closed, resolution: atomic lockdir withBatonLock around load-validate-write; spec baton shape unchanged, resolutionSource: model-inferred}
    - {id: B2, class: blocking, section: §2/§5 AC6, gap: double-finish-rejected vs idempotent finish, status: closed, resolution: idempotent no-op success guarded by handoff presence; exactly-once = one clear + one advance, resolutionSource: project}
    - {id: N1, class: non-blocking, section: §2/OQ6, gap: '{prompt} file-path vs Tier 2 inline text', status: closed, resolution: file path confirmed + effective-resolution doc requirement, resolutionSource: project}
    - {id: N2, class: non-blocking, section: P6/AC15, gap: bare baton events fail strict telemetry schema, status: closed, resolution: full-envelope event construction, resolutionSource: project}
    - {id: N3, class: non-blocking, section: P4/AC12, gap: no per-step expected-artifact table, status: closed, resolution: reuse finishArtifactNames; empty mapping verifies via handoff + advance, resolutionSource: project}
    - {id: N4, class: non-blocking, section: P5/OQ2, gap: gate heuristic token list open, status: closed, resolution: narrow fixed token list locked by NS5 test, resolutionSource: model-inferred}
    - {id: N5, class: non-blocking, section: P1/OQ1, gap: poll/attempts key names, status: closed, resolution: defaults.stepBaton.* confirmed, resolutionSource: project}
    - {id: N6, class: non-blocking, section: P7/OQ4, gap: monitor field names, status: closed, resolution: baton + mappedRunner confirmed, resolutionSource: project}
    - {id: N7, class: non-blocking, section: P4/§6.5, gap: dangling CROSS-PLATFORM kill citation, status: closed, resolution: concrete kill recipe in coordinator, resolutionSource: model-inferred}
    - {id: N8, class: non-blocking, section: P8/AC17, gap: vault mirror mechanism unexecutable via MCP, status: closed, resolution: spawn {specMemo.cli}; never hardcode memo, resolutionSource: project}
    - {id: N9, class: non-blocking, section: OQ7, gap: empty map + coordinator invoked, status: closed, resolution: named config error confirmed, resolutionSource: model-inferred}
    - {id: N10, class: non-blocking, section: OQ8, gap: error-code family, status: closed, resolution: BATON/RUNNER/WORKER/RUN family + err.code rule confirmed, resolutionSource: model-inferred}
    - {id: N11, class: non-blocking, section: OQ3, gap: coordinator invocation UX, status: closed, resolution: script + SKILL pointer confirmed, resolutionSource: project}
    - {id: N12, class: non-blocking, section: OQ5, gap: telemetry optional fields, status: closed, resolution: optional fields + same-batch enum extend confirmed, resolutionSource: project}
    - {id: N13, class: non-blocking, section: P9 docs, gap: phrase-locked prose risk, status: closed, resolution: ADD-only edits + whole-file sweep, resolutionSource: project}
  round: 1
  blocking_open: 0
  shared_understanding: pending
```

memory_consult: local `.agents/skills/ws-shared/MEMORY.md` + `memory/` (Medium+ traps folded, §1 fold verified, N13 rule added) and spec-memo vault search (no hits) — same evidence class, no conflicts.

Learning: N/A (interview audit only; no new reusable project knowledge beyond the registry above).
