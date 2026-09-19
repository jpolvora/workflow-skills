---
superseded: true
supersededBy: step-02-step-baton-multi-agent-runs.plan.refined.md
slug: step-baton-multi-agent-runs
title: Step-Level Baton Handoffs for Multi-CLI Workflow Runs
status: completed
step: 1
workflowId: step-baton-multi-agent-runs-20260918T232508Z
startedAt: "2026-09-18T23:25:08Z"
endedAt: "2026-09-18T23:32:04.077Z"
acRefs: []
---
## 0. Summary & Business Rules

Add step-level baton handoffs so one `ws-spec-to-pr` run can execute different
steps in different CLI processes on the same machine and repository, while the
workflow state file stays the single source of truth.

Three pieces (all greenfield; no behavior archaeology applies):

1. **Run config** — `defaults.stepRunners` (step number to runner id) plus a
   `defaults.runners` table (runner id to `{command, timeoutSeconds, env}`) in
   the project hub config. Runner ids are opaque neutral strings.
2. **Baton record** — `baton {holder, step, claimedAt, leaseUntil, revision}` on
   workflow state with an atomic claim/release protocol layered on the existing
   dual-write path (`syncStateDualWrite` in
   `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`).
3. **Deterministic coordinator** — a plain-Node run loop (no LLM) that claims
   the baton for `currentStep`, spawns the mapped worker CLI one-shot with
   sparse context pointers, awaits exit, verifies advancement, and repeats.

### Business rules

- BR1: One logical baton per run, scoped by `workflowId` plus branch. Only the
  baton holder for `currentStep` may act.
- BR2: Only the coordinator polls state (default 30s, range 5–300s). Workers
  spawn one-shot per turn and never idle or poll.
- BR3: All Transition Gates and `user-gate` prompts surface at the coordinator
  (pause-and-prompt, or index 0 in `autoMode`). Workers run non-interactive; a
  gate-shaped worker output is a protocol violation, never an advance.
- BR4: Run config is validated fail-fast before Step 0 dispatch: unknown step
  key, unknown runner id, or empty command aborts with a named error and never
  starts a partial run.
- BR5: Steps without a runner mapping keep current single-host dispatch
  (Tier 1/2/3 plus `stepModels`) unchanged.
- BR6: Default `leaseUntil` is spawn time plus 3x runner `timeoutSeconds`; after
  `maxAttempts` (default 2) consecutive expiries/failures on one step the
  workflow moves to `blocked` and the coordinator stops.
- BR7: Harness neutrality — no host product name is ever a schema key, required
  value, or contract term. Product CLIs appear only as local example values.

### Security mitigations (summary; verification in §6)

- Worker commands spawn via argv array (`shell: false`); template tokens are
  never interpolated into an `exec` string.
- `{prompt}` substitutes to a coordinator-written dispatch-prompt file path
  (existing `{us-dir}/.runtime/step-{N}-dispatch-prompt.md` convention), so
  prompts never pass through shell quoting.
- Per-runner `env` is an explicit allowlist merged over `process.env`.
- No new network channel, listener, or multi-tenant surface; the state file is
  the sole turn signal. No auth plane to gate (spec assumption, confirmed).

## 1. Definition of Ready & Scope

### Resolved assumptions (all confirmed in spec)

| Assumption | Chosen default |
|------------|----------------|
| Coordinator process model | One long-lived Node process per `workflowId` |
| Turn signal channel | Workflow state file only |
| Poll interval | 30s default, configurable 5–300s |
| Lease default | 3x runner `timeoutSeconds` |
| Max attempts per step | 2 consecutive expiries/failures, then `blocked` |
| spec-memo mirror | Optional write-through when integration is enabled, else zero vault calls |
| Auth boundaries | N/A — local same-user command spawn, no network service |

Plan-level decisions made explicit for interview (see §8): config key names
for poll interval / max attempts (`defaults.stepBaton.*` proposed),
gate-shaped-output detection heuristic, coordinator invocation UX (script +
SKILL pointer, no new skill id), monitor snapshot field names,
`{prompt}`-as-path substitution.

### Measurable Acceptance Criteria

- AC1: Hub config accepts `defaults.stepRunners` + `defaults.runners`
  `{command, timeoutSeconds, env}`; template supports `{prompt}`, `{cwd}`,
  `{slug}`, `{step}` with Tier 2 vocabulary.
- AC2: Unknown step key, unknown runner id, or empty command fails fast with a
  named error before Step 0 dispatch; no partial run starts.
- AC3: Unmapped steps fall back to current single-host dispatch; any subset
  (including one step) may be mapped.
- AC4: Runner map keys validated against the owning `workflowType` step set
  (0–9 standard, 0–5 lite); out-of-set key fails fast with a named error.
- AC5: State carries `baton {holder, step, claimedAt, leaseUntil, revision}`;
  claim wins only when presented revision equals stored revision and no live
  lease exists; write goes through the atomic dual-write path.
- AC6: `finish` writes the step handoff, clears the holder, and advances
  `currentStep` in one atomic update; next claim allowed only for the new
  `currentStep`.
- AC7: Lease past `leaseUntil` with no `finish` becomes re-claimable; expiry
  logged with old holder, step, attempt count; after `maxAttempts` the workflow
  moves to `blocked` and the coordinator stops.
- AC8: Concurrent claims serialize on the revision check; loser gets a named
  conflict error and retries with backoff; no step body executes twice for the
  same attempt.
- AC9: Deterministic coordinator script owns the run loop for one
  `workflowId`: read config/state, claim, spawn, await, verify, repeat to
  terminal status.
- AC10: Coordinator is the only polling party (configured interval); workers
  are one-shot, never idling or polling.
- AC11: Gates surface at the coordinator (pause-and-prompt or autoMode index 0);
  worker gate output is a recorded protocol violation with no advance.
- AC12: Coordinator verifies post-exit that `currentStep` advanced and expected
  step artifacts exist; clean exit without advancement is a failed attempt
  under the AC7 retry policy.
- AC13: Worker spawn receives the Tier 2 sparse-pointer payload plus a baton
  envelope `{step, holder, leaseUntil, attempt}`; worker must call `finish`
  before exit.
- AC14: Non-zero exit, timeout past `timeoutSeconds`, or missing `finish`
  leaves the step unadvanced; failure telemetry recorded and AC7 retry applied.
- AC15: Every claim, release, expiry, spawn, exit appends to run
  `telemetry.jsonl` as `baton_claimed`, `baton_released`,
  `baton_lease_expired`, `runner_spawned`, `runner_exited` with step, holder,
  attempt, exit code fields.
- AC16: Holder, lease, and mapped runner per step derive from the state file
  alone (no side channels); `ws-monitor` snapshots include holder and lease
  with the read-only contract unchanged.
- AC17: With spec-memo integration enabled, the coordinator mirrors each
  released step handoff summary into the vault handoff payload shape; disabled
  behaves identically with zero vault calls.

### Out of scope (from spec)

Live runner-to-runner messaging; multi-machine/queued orchestration; automatic
CLI install/auth; idling LLM poll loops; lite renumbering or Step 8/9 gate
menu changes.

### Memory folded (local MEMORY.md Medium+; vault search returned no hits)

- user-gate ≤3 options per question (High) → coordinator gates chunked per
  gates.md rule 8 (P5).
- New carve-outs need same-batch regression assertions (Medium) → AC3 fallback,
  autoMode gate, spec-memo on/off branches each get additive assertions (P9).
- Contract restructures need a quoting-file sweep (Medium) → grep sweep for
  state-shape / telemetry / template-token quoters in the same batch (P9).
- Stale expectations after intentional default change (High) → base-vs-head
  classification; update old tests to the new contract in-batch (P9).
- Dispatch prose must mirror posture carve-outs (Medium) → coordinator docs
  mirror lite-inline + Tier 1–3 ladder; never replace phrase-locked bullets (P5).
- Keep `state.handoffs` mention in pipeline prose (Medium) → coordinator docs
  keep the terse handoff pointer.
- TTY-only interactive paths untestable from agent shells (High) →
  pause-and-prompt inputs extracted to pure helpers with unit tests; non-TTY
  behavior defined (P5).
- Integrity regenerated last before commit (High) → §7 checklist order.
- CATALOG 24 KB normalized budget (Medium) → no CATALOG change planned; any
  docs touch measures bytes first.
- Token contracts state effective resolution; extend doc map + checker mirror
  together (Medium) → new `{step}` token documented in host-dispatch.md plus
  any executable template-token assertion in the same batch (P1).

`ws-fable-domain`: `fable.enabled` + `autoDetectDomain` are true but no domain
signals match this Node harness feature (no IaC/K8s/Docker/DB/data scripts),
so domain adapters are skipped.

## 2. Technical Design & Architecture

Stack: Node 22 skill package (`node-skills-package`). No frontend, no database,
no migrations. Layers touched: `skills-sot` (`.agents/skills`) and `tests`
(`test/`). `installer-cli` (`bin/`) untouched. Config invariants:
`commitPlanFilesOnlyAtStep8: true`, `skipQualityGates: false`.

### New files

| File | Role | ACs |
|------|------|-----|
| `.agents/skills/ws-shared/runtime/scripts/step_baton.cjs` | Pure baton helpers: `validateRunConfig`, `claimBaton`, `releaseBaton`, `expiryState`, named-error constructors. Operates on a state object; callers persist via `syncStateDualWrite`. Required by `workflow_state.cjs` and the coordinator. | AC1, AC2, AC4–AC8 |
| `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` | Deterministic run loop CLI (`--state`, `--config`, `--repo-root`): fail-fast validate, gate handling, claim → write prompt file → spawn worker (argv, timeout kill) → verify advancement + artifacts → telemetry → retry/expiry policy → repeat to terminal status. Exit codes: 0 terminal success, 2 blocked/failed, 3 config error, 4 changed-underfoot. | AC7, AC9–AC15, AC17 |
| `test/test-step-baton-claim.js` | Claim/release/conflict unit + dual-write integration tests. | AC5, AC6, AC8 |
| `test/test-step-baton-config.js` | Schema + fail-fast validation tests. | AC1–AC4 |
| `test/test-step-coordinator.js` | Loop tests with stub worker fixtures (exit codes, timeout, no-finish, gate output, external advancement). | AC7, AC9, AC10, AC12–AC14 |
| `test/test-step-baton-telemetry.js` | New event types + required fields in `telemetry.jsonl`. | AC15 |
| `test/test-step-baton-monitor.js` | Snapshot baton fields; read-only contract preserved. | AC16 |
| `test/test-step-baton-specmemo.js` | Mirror on/off; zero vault calls when disabled. | AC17 |
| `test/fixtures/step-baton/` | Stub worker scripts (ok, nonzero, hang, no-finish, gate-emit) + minimal state/config fixtures. | AC9–AC14 |

### Edited files

| File | Change | ACs |
|------|--------|-----|
| `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` | `finish` releases the baton atomically with handoff write + `currentStep` advance via `step_baton.releaseBaton` (AC6). Missing `baton` treated as unclaimed revision 0 (back-compat for existing runs). Small hook only; protocol lives in `step_baton.cjs`. | AC5, AC6 |
| `.agents/skills/ws-shared/runtime/workflow-state.schema.json` | Optional `baton {holder, step, claimedAt, leaseUntil, revision}` record. | AC5 |
| `.agents/skills/ws-shared/runtime/telemetry.schema.json` | Extend `type` enum with the five baton/runner events; add optional `holder`, `attempt`, `exitCode`, `cause` fields. Additive only. | AC15 |
| `.agents/skills/ws-shared/runtime/config.schema.json` | `defaults.stepRunners` (map step→runner id), `defaults.runners` (id→`{command, timeoutSeconds, env}`), `defaults.stepBaton {pollIntervalSeconds 5–300 default 30, maxAttempts default 2}`. | AC1, AC2, AC4, AC7, AC10 |
| `.agents/skills/ws-shared/templates/config.json.example` | Neutral example run config (opaque ids, local example commands only). | AC1 |
| `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | GUI bindings for the new keys (upstream config-schema rule). | AC1 |
| `.agents/skills/ws-shared/runtime/host-dispatch.md` | Coordinator-as-driver section; worker spawn vocabulary; new `{step}` token alongside `{prompt}`/`{cwd}`/`{slug}`; tier-ladder + lite-inline carve-outs mirrored. | AC1, AC9, AC10, AC13 |
| `.agents/skills/ws-shared/runtime/gates.md` | Coordinator gate surfacing note (pause-and-prompt / autoMode index 0, ≤3 options). Minimal pointer; no menu restructure. | AC11 |
| `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` | Snapshot gains baton holder/step/lease + mapped runner; reader only, no writes. | AC16 |
| `.agents/skills/ws-spec-to-pr/SKILL.md` | Short multi-CLI baton-runs pointer (script + host-dispatch). No new skill id, no CATALOG change. | AC9 |

### Data shapes

```text
baton:        {holder: string|null, step: int, claimedAt: iso|null,
               leaseUntil: iso|null, revision: int}
stepRunners:  {"<step>": "<runnerId>"}            # step validated per workflowType
runners:      {"<runnerId>": {command: string, timeoutSeconds: int>0,
               env: {k: v}}}
batonEnvelope:{step, holder, leaseUntil, attempt}  # appended to Tier 2 payload
telemetry:    {type: baton_claimed|baton_released|baton_lease_expired|
               runner_spawned|runner_exited, step, holder, attempt,
               exitCode?, cause?}  # same telemetry.jsonl stream
```

### Named errors (proposed; interview confirms names)

`BATON_REVISION_CONFLICT`, `BATON_LEASE_HELD`, `BATON_WRONG_STEP`,
`RUNNER_UNKNOWN_ID`, `RUNNER_STEP_OUT_OF_RANGE`, `RUNNER_EMPTY_COMMAND`,
`RUNNER_TIMEOUT`, `WORKER_NO_FINISH`, `WORKER_GATE_VIOLATION`,
`WORKER_NONZERO_EXIT`, `STATE_CHANGED_UNDERFOOT`, `RUN_MAX_ATTEMPTS_EXCEEDED`.

### Claim protocol (AC5, AC8)

Single coordinator per `workflowId` is the only legitimate claimant, so races
arise only from a rogue second coordinator or out-of-band edits. Claim is
load → validate (revision equals stored, step equals `currentStep`, no live
lease) → `syncStateDualWrite` with `revision + 1` → **re-read and verify our
revision won**. A loser (revision mismatch on re-read) receives
`BATON_REVISION_CONFLICT`, backs off, retries, and never spawns the step body
for that attempt. An unexpected revision jump with no matching local write is
`STATE_CHANGED_UNDERFOOT` and stops the run (NS6).

### Worker payload (AC13)

Coordinator writes the dispatch prompt via the existing
`build_dispatch_context.cjs` output convention
(`{us-dir}/.runtime/step-{N}-dispatch-prompt.md`), then substitutes:
`{prompt}` → prompt file path, `{cwd}` → repo root, `{slug}`, `{step}` →
step number. New `{step}` token is the only vocabulary addition over Tier 2
(`{prompt}`, `{cwd}`, `{slug}` per host-dispatch.md § Tier 2).

### Back-compat

- No `stepRunners` → byte-identical behavior (AC3); coordinator refuses to
  start with a named error when the map is empty (nothing to drive).
- Missing `baton` on old states → unclaimed revision 0.
- Telemetry readers must tolerate unknown `type` values; existing required
  fields unchanged.

## 3. Step-by-Step Plan

| # | Action | ACs | Files | Engineering checks |
|---|--------|-----|-------|--------------------|
| P1 | Config schema + fail-fast validation: add `defaults.stepRunners` / `defaults.runners` / `defaults.stepBaton` to `config.schema.json`; implement `validateRunConfig` in `step_baton.cjs` (unknown step key, unknown runner id, empty command, step-set range per `workflowType`, poll 5–300, timeout > 0); seed `config.json.example`; sync PS1 GUI editor; document `{step}` in host-dispatch.md + any executable template-token assertion in the same batch. | AC1, AC2, AC4 | `step_baton.cjs` (new), `config.schema.json`, `config.json.example`, `Edit-WorkflowSkillsConfig.ps1`, `host-dispatch.md` | `node test/test-step-baton-config.js`; `node test/test-powershell-config-editor.js`; NS4 covered |
| P2 | Baton protocol + `finish` integration: `claimBaton` / `releaseBaton` with revision check + write-then-reread conflict detection; hook `releaseBaton` into `workflow_state.cjs finish` so handoff write + holder clear + `currentStep` advance land in one `syncStateDualWrite`; extend `workflow-state.schema.json`; backoff helper for losers. | AC5, AC6, AC8 | `step_baton.cjs`, `workflow_state.cjs`, `workflow-state.schema.json` | `node test/test-step-baton-claim.js`; NS1, NS7 covered |
| P3 | Expiry + retry policy: `expiryState` (expired lease → re-claimable, log old holder/step/attempt); consecutive-failure counter per step; `maxAttempts` default 2 → `status: blocked` + stop. Counter resets on any successful advance. | AC7 | `step_baton.cjs`, `step_coordinator.cjs` | `node test/test-step-coordinator.js` (expiry cases) |
| P4 | Coordinator run loop: arg parsing + config/state load; claim → prompt-file write → argv spawn with `timeoutSeconds` kill (SIGTERM→SIGKILL; win32-safe per CROSS-PLATFORM.md) → await exit → verify `currentStep` advanced + expected step artifacts on disk → next iteration to terminal status; external-advancement detection on the poll interval with log line. | AC9, AC10, AC12, AC13, AC14 | `step_coordinator.cjs` (new), fixtures | `node test/test-step-coordinator.js`; NS2, NS3, NS6 covered; no floating promises (await every spawn/timer) |
| P5 | Gates at coordinator: pause-and-prompt via pure prompt helpers (unit-tested; TTY + non-TTY defined), autoMode index 0; worker stdout scan for gate-shaped output → `WORKER_GATE_VIOLATION`, no advance; docs in gates.md + host-dispatch.md mirror lite-inline + tier carve-outs, ≤3 options, keep `state.handoffs` pointer. | AC11 | `step_coordinator.cjs`, `gates.md`, `host-dispatch.md` | `node test/test-step-coordinator.js` (gate cases); NS5 covered |
| P6 | Telemetry: emit the five events with required fields through the existing `telemetry.jsonl` append path; extend `telemetry.schema.json` enum + optional fields. | AC15 | `step_coordinator.cjs`, `telemetry.schema.json` | `node test/test-step-baton-telemetry.js`; schema validation of emitted lines |
| P7 | Monitor snapshot: baton holder/step/lease + mapped runner derived from state alone; read-only preserved (assert no writes in test). | AC16 | `monitor_snapshot.cjs` | `node test/test-step-baton-monitor.js` |
| P8 | spec-memo mirror: on release, when `enableSpecMemoIntegration` is true, mirror handoff summary into vault handoff payload shape (`nextSteps` from next-step pointers) via the `ws-memo` runtime path; when false, zero vault calls (assert via stubbed CLI/MCP). | AC17 | `step_coordinator.cjs` | `node test/test-step-baton-specmemo.js` |
| P9 | Fallback lock + sweeps + docs: assert unmapped steps keep Tier 1/2/3 + `stepModels` dispatch untouched (AC3 carve-out assertions); grep sweep for state-shape / telemetry-type / template-token / gate-menu quoters with zero residual hits; SKILL.md pointer; harness-neutrality text search; `npm run generate-integrity && npm run verify-integrity` last, then full `npm run test`. | AC3 + all | SKILL.md pointer, tests | Full `npm run test` green; base-vs-head classification for any red pre-existing test; CATALOG untouched |

Dependency order: P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8 → P9. P6/P7 can
parallelize with P5 once P4 lands; P9 is always last.

## 4. Permissions, Tenancy & i18n

- **Permissions / RBAC:** N/A. The coordinator spawns local commands as the
  invoking user in one repo; there is no network service, no privilege
  boundary, and no multi-user surface (spec assumption, confirmed). Worker
  `env` is an explicit per-runner allowlist, never a credential store.
- **Tenancy / isolation:** Isolation scope is `workflowId` plus branch (§2
  shapes). Concurrent runs never share a state file, so teammate isolation
  falls out of per-run state paths. A second coordinator on the same run is
  handled by the revision-conflict path (AC8), not by an ownership check.
- **i18n:** No new user-facing strings beyond coordinator CLI logs, which
  follow the harness en-us convention. No locale keys, no date/number
  formatting for display (`leaseUntil` is ISO-8601 machine data).

## 5. Test Coverage

Every AC maps to at least one named case. Negative scenarios NS1–NS7 map to
the same suites.

| AC | Test file | Cases |
|----|-----------|-------|
| AC1 | `test-step-baton-config.js` | accepts full run config; `{prompt}/{cwd}/{slug}/{step}` substitution produces expected argv; example config validates |
| AC2 | `test-step-baton-config.js` | unknown step key → `RUNNER_STEP_OUT_OF_RANGE`-family named error; unknown runner id → `RUNNER_UNKNOWN_ID`; empty command → `RUNNER_EMPTY_COMMAND`; no dispatch attempted (NS4) |
| AC3 | `test-step-baton-config.js` + existing dispatch tests | single-step map leaves other steps on Tier 1/2/3 + `stepModels`; empty map → coordinator refuses, orch dispatch byte-identical |
| AC4 | `test-step-baton-config.js` | standard accepts 0–9, rejects 10; lite accepts 0–5, rejects 6; wrong-workflowType key fails fast |
| AC5 | `test-step-baton-claim.js` | claim wins on equal revision + free lease; held lease → `BATON_LEASE_HELD`; write lands in both `.state.json` and `.state.md` via dual-write |
| AC6 | `test-step-baton-claim.js` | `finish` writes handoff + clears holder + advances `currentStep` atomically; next claim only for new `currentStep`; exactly-once release (double finish rejected) |
| AC7 | `test-step-coordinator.js` | expired lease re-claimable with expiry log (holder/step/attempt); 2nd consecutive expiry → `blocked` + stop; counter resets on advance |
| AC8 | `test-step-baton-claim.js` | two claimants same revision → exactly one wins, loser gets `BATON_REVISION_CONFLICT` (NS1); loser backoff then retry; no step body spawned for losing attempt |
| AC9 | `test-step-coordinator.js` | full loop on stub worker: claim → spawn → finish → advance → next step → terminal exit 0 |
| AC10 | `test-step-coordinator.js` | poll interval honored (configurable, default 30, rejects outside 5–300); external advancement detected on tick with log line; worker fixture asserts one-shot (no second spawn, no sleep loop) |
| AC11 | `test-step-coordinator.js` | autoMode applies index 0 with no prompt; pause-and-prompt helpers pure + unit-tested (TTY and non-TTY); gate-shaped worker output → `WORKER_GATE_VIOLATION`, step unadvanced (NS5); gate prompts chunked ≤3 options |
| AC12 | `test-step-coordinator.js` | exit 0 without `finish` → failed attempt, no advance (NS2); exit 0 without expected artifact → failed attempt; revision jump mid-run → `STATE_CHANGED_UNDERFOOT` stop (NS6) |
| AC13 | `test-step-coordinator.js` | spawned worker receives spec path + plan index + ledger + prior handoff + `{step, holder, leaseUntil, attempt}` envelope; prompt delivered as file path |
| AC14 | `test-step-coordinator.js` | nonzero exit → unadvanced + failure telemetry + retry; timeout → kill + `RUNNER_TIMEOUT` + `runner_exited` cause (NS3); missing `finish` → same retry path |
| AC15 | `test-step-baton-telemetry.js` | all five event types emitted with step/holder/attempt/exit-code fields; lines validate against extended `telemetry.schema.json` |
| AC16 | `test-step-baton-monitor.js` | snapshot includes holder/step/lease + mapped runner from state alone; snapshot run writes zero files (read-only); no side-channel files created during a full coordinator turn |
| AC17 | `test-step-baton-specmemo.js` | integration on → vault payload mirrors handoff with `nextSteps`; integration off → identical run behavior with zero vault calls (stubbed CLI/MCP counting) |

NS7 (claim for non-current step rejected on free lease) is covered in
`test-step-baton-claim.js`. Verification commands: per-file
`node test/test-step-baton-*.js` during implementation, then full
`npm run test` (§7) plus
`node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`.

## 6. Stack & Security Invariants Verification Plan

Rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md`
(no `any`, zero floating promises, boundary validation, no exec-concat /
path traversal, resource cleanup in `finally`). Touched framework boundaries:

1. **Authorization & endpoint protection — N/A with verification.** No
   network listener, no HTTP surface, no privilege boundary: the coordinator
   spawns local commands as the invoking user. Verify: grep the new scripts
   for `listen(`, `createServer`, `fetch(`, `http` imports → zero hits;
   worker `env` allowlist never reads secret files.
2. **Concurrency & async safety.** Claim-before-spawn ordering (spawn only
   after a won claim); write-then-reread conflict detection so no step body
   executes twice for one attempt (AC8); loser backoff with capped retries;
   coordinator awaits every spawn and timer (zero floating promises per
   stack rule 2); timeout path kills then awaits exit before recording
   `runner_exited`. Verify: NS1/NS6 tests, promise-lint by review +
   invariant scan, timeout kill test on linux + win32-safe kill path.
3. **Input validation & DTO boundary.** `validateRunConfig` against the
   extended schema before any dispatch (AC2/AC4 fail-fast); poll range
   5–300, `timeoutSeconds` positive int, non-empty command, step keys per
   `workflowType`; baton envelope fields type-checked on receipt; worker
   stdout scanned for gate-shaped output per the §8 heuristic. Verify:
   `test-step-baton-config.js` + schema-validation tests + NS4/NS5.
4. **Injection & path traversal (stack rule 4, Critical).** Template
   substitution builds an argv array for `spawn(cmd, args, {shell: false})`;
   `{prompt}` is a coordinator-written file path, never inline text through
   a shell; `{cwd}`/`{slug}`/`{step}` are coordinator-controlled values, but
   runner `command` comes from config — tokenize with a quote-aware splitter
   and never `exec(string)`. Verify: grep new code for `exec(`, `execSync`,
   `shell: true` → zero hits; substitution tests with spaces/quotes in paths.
5. **Subscription & lifecycle cleanup (stack rule 5).** Worker kill on
   timeout (SIGTERM → SIGKILL escalation; win32 `taskkill` path per
   `CROSS-PLATFORM.md`); poll timers and child listeners released in
   `finally`; coordinator exits (no daemon residue) on terminal/blocked/error.
   Verify: hang-fixture test asserts no orphan process; timer-handle audit
   in review.
6. **Config invariants.** `commitPlanFilesOnlyAtStep8: true` — plan artifacts
   stay uncommitted until Step 8 delivery; `skipQualityGates: false` — all
   pre-advance gates run. Verify: Step 4 pre-advance green; no `{plansDir}`
   paths in G2-code commits.
7. **Harness neutrality (DoR).** Text search over the implementing diff for
   product-coupled contract terms (host/CLIs as schema keys or required
   values) → zero hits; runner ids opaque; examples only.

## 7. Pre-PR Checklist

- [ ] Baton protocol encapsulated in `step_baton.cjs`; `workflow_state.cjs`
  diff is the minimal `finish` hook.
- [ ] No migrations (file state only); schema edits additive and back-compat
  tested (old states, empty maps, unknown telemetry types tolerated).
- [ ] Auth N/A verified (§6.1 grep); async/input/injection/cleanup boundaries
  verified per §6.2–§6.5.
- [ ] i18n N/A (en-us CLI logs only, no locale keys).
- [ ] Tests cover all ACs + NS1–NS7 (§5); carve-out assertions present for
  AC3 fallback, autoMode gate, spec-memo on/off.
- [ ] Quoter sweep: zero residual hits for retired state/telemetry/token/
  gate phrasing; `state.handoffs` pointer kept in touched pipeline prose.
- [ ] PS1 GUI editor synced; `node test/test-powershell-config-editor.js` green.
- [ ] Evals hand-edited only if touched (never bulk-regenerate).
- [ ] CATALOG.md untouched (or bytes measured within the 24 KB budget).
- [ ] `npm run generate-integrity && npm run verify-integrity` as the final
  step, then full `npm run test` green.

## 8. Open Questions

| # | Question | Plan default (interview to confirm) |
|---|----------|-------------------------------------|
| OQ1 | Config key names for poll interval + max attempts (spec names values, not keys) | `defaults.stepBaton.pollIntervalSeconds` (5–300, default 30) + `defaults.stepBaton.maxAttempts` (default 2) |
| OQ2 | Gate-shaped worker output detection heuristic | Match `user-gate` prompt markers + Transition Gate headings from gates.md; exact token list fixed in implementation |
| OQ3 | Coordinator invocation UX: script-only vs npm alias vs new skill id | Direct `node …/step_coordinator.cjs` + SKILL.md pointer; no new skill id, no CATALOG/dependency-graph churn |
| OQ4 | Monitor snapshot field names for baton data | `baton: {holder, step, leaseUntil, revision}` + `mappedRunner` per active step |
| OQ5 | New telemetry fields vs strict readers | Optional `holder`/`attempt`/`exitCode`/`cause`; required set unchanged; readers must tolerate unknown `type` |
| OQ6 | `{prompt}` substitution form vs AC1 Tier 2 vocabulary | Substitute the prompt *file path* (secure, matches existing prompt-file convention); templates that inlined prompt text adapt to read the file |
| OQ7 | Empty `stepRunners` map with coordinator invoked | Named config error (nothing to drive) rather than silent single-host run |
| OQ8 | Named-error code strings (§2 list) | Proposed `BATON_*` / `RUNNER_*` / `WORKER_*` / `RUN_*` codes; confirm naming family |
