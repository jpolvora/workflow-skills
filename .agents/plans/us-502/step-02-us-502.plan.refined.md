---
slug: us-502
title: "Batch worker wedge: dispatched fix/review worker runs with zero output until interrupted"
status: completed
step: 2
workflowId: us-502-20261011T211005Z
refinedFrom: step-01-us-502.plan.md
interview: step-02-us-502.plan-interview.md
interviewRound: 1
spec: step-00-us-502.spec.md
startedAt: "2026-10-11T21:10:05.639Z"
endedAt: "2026-10-11T21:35:00.833Z"
acRefs: []
---
# Implementation plan (refined) - us-502 (step 2)

Spec of record: [`step-00-us-502.spec.md`](step-00-us-502.spec.md) (13 ACs, 10 negative scenarios, `source: github`, issue #502).
Plan of record for Steps 3-8: this file. Draft [`step-01-us-502.plan.md`](step-01-us-502.plan.md) is superseded; audit registry in [`step-02-us-502.plan-interview.md`](step-02-us-502.plan-interview.md).
Workflow: `us-502-20261011T211005Z` - standard pipeline, `enableDag: true`, `autoMode` on (no user gates), baseline `7553b93c7073f1128c40609d4356f4e3d11d76c4`.
Stack: `node-skills-package` (Node 22 skill package / agent harness) - layers `skills-sot` (`.agents/skills`), `installer-cli` (`bin`), `tests` (`test`).
Interview round 1 changed two behaviors (marker freshness, progress attribution) and corrected three factual claims plus one verification-id collision; every AC mapping, task id, backticked path, and V-id from the draft is preserved (V1-V19 unchanged, V20-V22 added). §9 records the resolutions.

## 0. Summary & Business Rules

**Objective.** Give the parent a deterministic, read-only answer to "is this dispatched batch worker still alive?" so a zero-output worker is distinguishable from a slow one without burning rounds, and give the worker one cheap, state-write-free obligation that makes that answer possible.

**Business rules (target behavior).**

| Rule | Statement |
|------|-----------|
| BR1 | A dispatched batch worker writes one run-runtime liveness marker as its first action: `{us-dir}/.runtime/worker-started-{step}-{batch}.md`. |
| BR2 | The marker is a file under the run runtime directory, so it performs no `update_state` write and cannot move the state `revision`. |
| BR3 | One deterministic Node evaluator maps (dispatch baseline, marker, durable progress, window) to exactly one verdict: `no-baseline` / `alive` / `pending` / `wedged`, exit 0 for the first three and exit 2 for `wedged`, exit 1 for usage errors. |
| BR4 | Only `wedged` authorizes takeover; a batch that is not proven wedged never gets a second worker. |
| BR5 | Durable progress outranks marker absence; the evaluator fails open on an unknown baseline (`no-baseline`), never wedge on it. |
| BR6 | The effective window is `defaults.workerLivenessWindowSec`, integer, default 600 when absent or invalid. |
| BR7 | Sanctioned no-output takeover is cancel-then-redispatch, or inline re-execution on the parent when re-dispatch is unavailable, recorded in the round artifact with measured ages. |
| BR8 | Inline, lite, and Tier 3 isolated postures carry no batch worker and are exempt from the marker obligation. |
| BR9 | A status ping is never a progress probe; when a ping happens anyway, its outcome is recorded as watchdog evidence. |
| BR10 | A marker counts only for the dispatch it belongs to: its mtime must be at or after the resolved baseline `dispatchedAt` (minus the 1 s tolerance). A marker older than the baseline is stale evidence and never resolves `alive` on its own (interview G03). |
| BR11 | `wedged` presumes a frozen run: the window has elapsed and state, telemetry, and `.runtime` show no advance past the baseline. Ambient activity from another actor can only delay a wedge verdict, never authorize a takeover (interview G02). |

**Security mitigations.** The evaluator is read-only (never writes state or `.runtime`), resolves `--us-dir` with containment (no traversal escape), and prints only step/batch/timestamp/owner plus measured ages - no secrets, no machine-absolute paths. The marker name stays inside the `RUNTIME_NAMES` allowlist so the fail-closed residue validator never aborts a healthy run.

**What already exists (do not rebuild).** `worker_turn_guard.cjs` classifies an *ended* turn (`worker_zero_tool_calls` / `worker_missing_artifact`, exit 2) and is phrase-locked by `test/test-worker-turn-guard.js`; it is not touched. Dispatch telemetry already records `dispatchedAt` (`telemetry.schema.json:31`, appended per dispatch by `update_state.cjs dispatch`) and the event carries `step` and `substep` (`workflow_state.cjs:907-925`, `:1758`). `ws-monitor` already owns the observer-side stall classes and is out of scope.

## 1. Definition of Ready & Scope

**Resolved assumptions carried from the spec** (its Assumptions table, all `Confirmed: n`, so the plan pins them explicitly and §8 lists the interview rulings):

1. Marker mechanism = run-runtime file, not a telemetry event (protects trace-derived revision accounting, AC3).
2. Window default = 600 s, matching `ws-monitor --stall-window` (`ws-monitor/SKILL.md:64`).
3. Progress outranks absence (AC6).
4. Takeover when re-dispatch is unavailable = inline on the parent, recorded in the round artifact.
5. Marker absence before the window elapses = `pending`, never `wedged`.
6. Rate limits / auth / TTL / external failure / concurrency: N/A (local file-and-timestamp path, one worker per batch by contract).

**In scope (product paths).**

| # | Path | Change |
|---|------|--------|
| F1 | `.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs` | NEW deterministic evaluator |
| F2 | `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs` | NEW exported resolver `resolveWorkerLivenessWindowSec` |
| F3 | `.agents/skills/ws-shared/runtime/config.schema.json` | `defaults.workerLivenessWindowSec` |
| F4 | `.agents/skills/ws-shared/templates/config.json.example` | key + `_comment_` seed |
| F5 | `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | GUI row (`-Type 'int'`, 1-3600, default 600) |
| F6 | `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md` | canonical marker + watchdog section (AC13) |
| F7 | `.agents/skills/ws-goal-fix-pr/SKILL.md` | § Loop liveness watchdog wiring |
| F8 | `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` | short pointer clause (byte-budget constrained) |
| F9 | `test/test-worker-liveness-check.js` | NEW suite (evaluator + resolver + contract pins) |
| F10 | `test/test-suites.json` | register F9 in `harnessEfficiency` beside `test-worker-turn-guard.js` (`:353` array, `:559` peer entry) |
| F11 | `test/test-workflow-state-contract.js` | additive `.runtime` residue assertions for the marker name (NS5), residue block `:304-321` |
| F12 | `FEATURES.md`, `README.md`, `AGENTS.md` (root), `.ws/AGENTS.md`, `docs/index.html` + `bin/build-site.js` card | harness docs sweep |
| F13 | `test/test-powershell-config-editor.js` | additive `coreDefaults` entry so the DoR's named config gate covers the new key (interview G10) |
| F14 | `bin/skill-integrity.json` | regenerated manifest (harness-mandated) |
| F15 | `package.json`, `bin/skill-dependencies.json` (`packageVersion`), `.agents/skills/ws-shared/version.json`, site footer | version bump, ship-owned (harness-mandated, exactly once per PR) |

F13-F15 are harness-mandated, not scope creep: root `AGENTS.md` requires the config-schema/GUI synchronization gate, integrity regeneration for hashed skill content, and one version bump per shipped PR. The DoR "Bounded scope" check therefore reads `git diff --stat` against F1-F15, not F1-F12.

**Out of scope (spec Out of Scope, restated as plan boundaries).** No hard kill / automatic timeout; no mid-batch ping as a probe; no new telemetry event type or field (`telemetry.schema.json` stays `additionalProperties: false`); no change to `worker_turn_guard.cjs` verdicts or exit codes; no marker obligation for inline / lite / Tier 3; no `ws-monitor` finding or transcript-adapter change; no `RUNTIME_NAMES` change (the marker name already matches `/\.(md)$/`); no new `state` field; no `ws-code-review` edit; no new `.ws/config.json` key; no `{plansDir}` paths in any git add.

**DoR verification (from the spec) and how this plan satisfies it.**

| DoR item | Plan satisfaction |
|----------|-------------------|
| Bounded scope | §1 file table F1-F15 (F13-F15 harness-mandated); `git diff --stat` must list only those paths |
| Atomic criteria | §5 maps every AC to one observable assertion (V-id) |
| Failure modes enumerated | §5 NS1-NS11 rows |
| Observation telemetry | §2.2 verdict record contract; DoR command `node .agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs --us-dir <fixture> --step 9 --batch r1 --json` |
| Existing anchors preserved | §5 frozen-anchor table; F9 pins canonical text instead of editing frozen assertions |
| Config surfaces synced | T01 + `node test/test-powershell-config-editor.js` (F13 makes the new key part of Test 8's core set) + V9 read-together assertion |
| Posture carve-outs mirrored | T03/T04 + `V13:posture-exemption` |
| Zero open blockers | Step 0 handoff: sweep `status: ok`, zero PRs/commits for #502 |
| Stack invariant - synchronous resource safety | §6 rows 1-3 (`node --check`, sync-only, no handles) |
| Security / hygiene invariant | §6 rows 4-5 (containment, marker payload) |

## 2. Technical Design & Architecture

### 2.1 Liveness marker (worker side, AC1-AC3)

Path: `{us-dir}/.runtime/worker-started-{step}-{batch}.md`.
`{batch}` is the round number for round batches (`r1`, `r2`, ...) and the node id for DAG nodes, matching the dispatch vocabulary at `STEP-DISPATCH.md:144`. The `.md` extension is deliberate: `RUNTIME_NAMES` (`workflow_state.cjs:50-66`) tolerates `/\.(cjs|patch|md)$/` and is exported (`:2666`), and `validateRuntime` (`:2185-2189`, surfaced at `:2350-2351`) rejects everything else fail-closed, so no allowlist edit is needed.

Payload (YAML frontmatter, lenient `key: value` parse; mirrors the state/`round-N.md` convention):

```markdown
---
step: 9
batch: r1
dispatchedAt: 2026-10-11T21:14:39Z
owner: ws-goal-fix-pr
---
```

`step`, `batch`, and `dispatchedAt` must be non-empty for the marker to count (AC2); `owner` is informational identity for the parent (DoR security invariant). The write is a plain file write in the worker's own scope - never `update_state` - which is what keeps `revision` unchanged (AC3). The obligation is per dispatch: the batch worker writes the marker for **its own** dispatch, so the marker's mtime lands at or after the baseline (BR10).

### 2.2 Evaluator (parent side, AC4-AC7, AC11)

`worker_liveness_check.cjs` is a sibling of `worker_turn_guard.cjs` and reuses its resolution pattern (`worker_turn_guard.cjs:20-48`): resolve the managed runtime through `WORKFLOW_SKILLS_SHARED_DIR` -> cwd `.agents/skills/ws-shared` -> packaged -> global, `require` `resolve_consumer_root.cjs` from there, and load config via `resolveConsumerContext({ repoRoot, scriptFile: __filename })`. Synchronous, `fs`/`path` only, zero new dependencies, no timers, no handles, no writes.

CLI: `node worker_liveness_check.cjs --us-dir <dir> --step <N> --batch <id> [--json] [--repo-root <dir>] [--help]`.

Inputs and precedence (this order is the contract):

| Order | Condition | Verdict | Exit |
|-------|-----------|---------|------|
| 1 | No parseable `dispatch` event for the step in `telemetry.jsonl` | `no-baseline` | 0 |
| 2 | **Fresh** marker present for `{step}-{batch}`: mtime >= baseline `dispatchedAt` - 1 s | `alive` | 0 |
| 3 | Durable progress recorded after the baseline `dispatchedAt` | `alive` | 0 |
| 4 | `now - dispatchedAt < windowSec` | `pending` | 0 |
| 5 | Otherwise (window elapsed, no fresh marker, no progress) | `wedged` | 2 |
| - | Usage error (missing/invalid flag, unreadable `--us-dir`, traversal escape) | error record | 1 |

Order 2 before 4 is required by NS10 (a marker that lands after the window but before the parent acts must report `alive`); order 1 before everything is required by NS3/AC7 (fail open on an unknown baseline). Order 3 before 4 keeps AC6 true inside the window. A marker whose mtime predates the baseline (minus tolerance) does not satisfy order 2: it is reported as stale evidence and, when the window has elapsed and nothing else advanced, the verdict is `wedged` (BR10, NS11). §9 records the AC4 reading that makes order 4 the no-evidence case.

Durable progress (any one is enough, all reported as evidence pointers): a parseable telemetry record with `timestamp` strictly after the baseline `dispatchedAt` (malformed lines skipped, NS7); or a state-file mtime strictly after `dispatchedAt`; or a `.runtime/*` file (excluding the evaluated marker and the `step-{N}-dispatch-prompt.md` / `-manifest.json` audit pair) with mtime strictly after `dispatchedAt`. A 1 s tolerance absorbs filesystem timestamp granularity; the tolerance is asserted by NS2 (revision advance after dispatch) and by the NS10 counter-case. Because telemetry records carry only `step` and `substep` (`telemetry.schema.json:14,68`) and the event schema forbids extra fields (`:87`), this channel is parent-observable run activity rather than batch-authored progress: `wedged` therefore presumes a frozen run (BR11), and ambient sibling activity can only delay a wedge verdict, never authorize a takeover.

Baseline selection: the latest parseable `dispatch` record whose `step` equals `--step` (`substep` recorded when present; for Step 9 the stream carries `dispatch --step 9 --substep fixPrPlan` / `fixPrExec`, `STEP-DISPATCH.md:144`); `dispatchedAt` falls back to the record `timestamp`. The baseline is step-scoped - `--batch` names the marker, not the telemetry record - so a newer same-step dispatch re-baselines the check and the verdict record prints the resolved baseline plus the marker path so the correlation is auditable (interview G14). Malformed lines are skipped without aborting (NS7).

Verdict record (one JSON object on stdout, `--json` keeps it machine-only):

```json
{
  "schemaVersion": 1,
  "verdict": "pending|alive|wedged|no-baseline",
  "step": 9, "batch": "r1",
  "dispatchedAt": "2026-10-11T21:14:39Z",
  "ageSec": 421, "windowSec": 600,
  "markerPath": ".agents/plans/us-502/.runtime/worker-started-9-r1.md",
  "markerPresent": false,
  "markerFresh": false,
  "progressEvidence": ["telemetry:finish@2026-10-11T21:19:02Z"],
  "reason": "window not elapsed; no marker and no durable progress yet",
  "exitCode": 0
}
```

Exports `VERDICTS`, `evaluateLiveness`, and `selectDispatchBaseline` for unit tests (mirroring `worker_turn_guard.cjs`'s exports at `:180-185`).

### 2.3 Window resolution (AC11)

`resolve_consumer_root.cjs` already hosts the peer resolvers `resolveMinVerifyScore` (`:153-157`) and `resolveRequirePreShipDocSync` (`:162-165`), each with a dedicated test. Add `resolveWorkerLivenessWindowSec(config)`: integer `>= 1` from `config.defaults.workerLivenessWindowSec`, else `600` for absent, `0`, negative, non-integer (`9.5`), string (`"600"`), `null`, and boolean - the same `typeof number` + `Number.isInteger` + bounds shape as its peers. Export it next to the peers (`module.exports` at `:600`, `:627`). The evaluator is the only consumer in this change; the contract prose and schema description state the effective resolution.

### 2.4 Config surfaces (must move together)

| Surface | Anchor | Change |
|---------|--------|--------|
| `config.schema.json` | `defaults` block at `:114` | `"workerLivenessWindowSec": { "type": "integer", "minimum": 1, "default": 600, "description": "... Omitted or invalid values resolve to 600 at runtime." }` (mirrors `minVerifyScore` at `:134-139`) |
| `config.json.example` | `:144-147` (`requirePreShipDocSync` / `verboseMode`) | `"workerLivenessWindowSec": 600` + `_comment_workerLivenessWindowSec` stating the 600 fallback (convention at `:136-137`) |
| `Edit-WorkflowSkillsConfig.ps1` | `:1311` (`requirePreShipDocSync`) / `:1319` (`minVerifyScore`) | `Add-ConfigFieldRow -ParentPanel $page -YOffset $y -Section 'defaults' -Key 'workerLivenessWindowSec' -LabelText 'Worker Liveness Window (seconds, default 600)' -Type 'int' -MinVal 1 -MaxVal 3600 -DefaultVal 600` |
| `test/test-powershell-config-editor.js` | `coreDefaults` at `:472-475` | add `'workerLivenessWindowSec'` so Test 8 (`:434-477`) asserts the GUI binding |

**Gating reality (interview G10).** Test 8 verifies full schema parity for `plans` / `reviews` / `preview` but only a hardcoded six-key `defaults` subset, and Test 9 / Test 9b (`:479-546`, `:548-616`) only validate rows that already exist. A new `defaults` key is therefore **not** gated by the existing suite: the F13 line plus `V9:config-surface-parity` (schema + example + GUI read together, one assertion per surface) are the actual gates, and the DoR's `node test/test-powershell-config-editor.js` check becomes meaningful only with F13. `-Type 'int'` is the only control that keeps `typeof value === 'number'` on save.

### 2.5 Contract prose (AC1, AC2, AC8-AC10, AC12, AC13)

One new canonical section in `WORKER-TURN-RULES.md` (3052 B; the file already declares itself the single source of truth that builders quote, `:3-6`) holding all three obligations together, placed after `## Parent contract` and before `## Continuation contract`:

1. **Worker marker obligation** - path, name, non-empty `step`/`batch`/`dispatchedAt`, "write it within the effective worker liveness window after dispatch **for this dispatch**" (a marker older than the baseline is stale), "never via `update_state`".
2. **Parent watchdog contract** - the evaluator command, the four verdicts with exit codes, "only `wedged` authorizes takeover", "never dispatch a second worker for a batch that is not proven wedged", "record a ping outcome as watchdog evidence instead of silence", and that the dispatch baseline is correlated per step while `{batch}` names the marker.
3. **Sanctioned no-output takeover branches** - cancel-then-redispatch, or inline re-execution on the parent when re-dispatch is unavailable, both recorded in the round artifact with measured ages.
4. **Posture exemption in the same section** - inline (`ws-goal-fix-pr/SKILL.md:152-155`, the `ws-goal-fix-pr.useSubAgents` absent/`false` default "Inline legacy loop" under `## Fix-loop execution mode` at `:144`; full path in the F7 row), lite Step 5, and the Tier 3 isolated fallback carry no batch worker and no marker obligation.

`ws-goal-fix-pr/SKILL.md` § Loop liveness watchdog (`:65-80`) gains a wedge-verdict bullet set: run the evaluator read-only, act on `wedged` without waiting for further rounds, use the two takeover branches, record measured ages in `{reviewsDir}/PR-<N>-round-*.md` (naming convention at `:105`). Its phrase-locked content must survive byte-for-byte: heading `## Loop liveness watchdog`, `round-log freshness`, `session-log mtime`, `resume-takeover`, `do not ping a fix worker mid-batch` (asserted at `test/test-goal-fix-pr-orchestrator-dispatch.js:283-292`). Add bullets; never replace a locked sentence.

`STEP-DISPATCH.md` gets one short pointer clause in the Step 9 dispatch item (`:144`) - a pointer only, never a divergent copy - because the internal retry substeps (`:33`) and the Step 9 table are the dispatch owners the spec names.

### 2.6 Byte-budget reality (measured, LF-normalized, `test/test-context-budget.js:44-50`)

| File | Now | Budget | Headroom |
|------|-----|--------|----------|
| `STEP-DISPATCH.md` | 23779 | 24064 | **285 B** |
| combined `ws-spec-to-pr/SKILL.md` + `STEP-DISPATCH.md` + `PROTOCOLS.md` + lite `SKILL.md` | 66691 | 67072 | **381 B** |
| `PROTOCOLS.md` | 20991 | 20992 | **1 B - do not touch** |
| `ws-spec-to-pr-lite/SKILL.md` | 10240 | 10240 | **0 B - do not touch** |
| `ws-shared/runtime/AGENTS.md` | 13996 | 14000 | **4 B - do not touch** |
| `ws-spec-to-pr/SKILL.md` | 11681 | 11776 | 95 B - not touched by this change |
| `.ws/AGENTS.md` | 2156 | 18000 | ample |
| `WORKER-TURN-RULES.md` (3052), `ws-goal-fix-pr/SKILL.md` (21525) | - | none | unbudgeted |

Consequences: all new normative prose goes to `WORKER-TURN-RULES.md` and `ws-goal-fix-pr/SKILL.md`; the `STEP-DISPATCH.md` clause is capped at 180 B, which leaves 105 B on that file's budget and 201 B on the combined budget (measured this step; `node test/test-context-budget.js` exit 0). The existing pointer `Full text: WORKER-TURN-RULES.md` (`PROTOCOLS.md:280`, inside `### Base Prompt Prefix` at `:265`) is why no `PROTOCOLS.md` edit is needed (workers already reach the canonical file). If the clause cannot fit, record an explicit follow-up instead of trimming phrase-locked prose.

## 3. Step-by-Step Plan

Ordered by dependency; T01 and T03 are independent and may run in parallel (Step 3 DAG input).

### T01 - Config surface + resolver (F2, F3, F4, F5, F13)

ACs: AC11. Verifications: V8:window-resolver, V9:config-surface-parity, V21:config-editor-parity.
Actions: add `resolveWorkerLivenessWindowSec` to `.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs` beside the peers and export it; add the key to `.agents/skills/ws-shared/runtime/config.schema.json`; seed `.agents/skills/ws-shared/templates/config.json.example` with the key + comment; add the GUI row in `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` using the full `-ParentPanel $page -YOffset $y` shape; add `'workerLivenessWindowSec'` to `coreDefaults` in `test/test-powershell-config-editor.js` (`:472-475`). Keep the schema description phrasing pattern of `minVerifyScore` ("Omitted or invalid values resolve to 600 at runtime").
Engineering checks: `node --check` on the resolver; `node test/test-powershell-config-editor.js` (now covers the key); JSON parse of schema + example; resolver assertions in `test/test-worker-liveness-check.js`.
Done when: schema, example, and GUI agree on key name, integer type, and 600 default; Test 8's core set includes the key and is green; V9 asserts each surface.

### T02 - Evaluator (F1)

ACs: AC2, AC3, AC4, AC5, AC6, AC7, AC11 (via resolver), plus the DoR security invariant. Verifications: V1:marker-shape, V2:no-revision-bump, V3:residue-allowlist, V4:pending-in-window, V5:wedged-exit-2, V6:progress-outranks-absence, V7:no-baseline-exit-0, V10:malformed-telemetry, V11:marker-after-window, V16:payload-hygiene, V20:stale-marker.
Actions: implement `.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs` per §2.2 (verdict order 1-5, marker freshness gate, evidence record with `markerPresent`/`markerFresh`, exit codes, containment on `--us-dir`, read-only).
Engineering checks: `node --check`; **capture the red run first** - `node test/test-worker-liveness-check.js` fails while `worker_liveness_check.cjs` does not exist (module-not-found), then passes after F1 lands; the DoR command against a hand-made fixture for each of the four verdicts plus the stale-marker case; assert no file is created under `.runtime` by an evaluation.
Done when: all four verdicts, the stale-marker case, and their exit codes reproduce on fixtures; the red run is recorded for the Step 5 report; evaluation leaves state bytes and `.runtime` contents unchanged.

### T03 - Canonical contract section (F6)

ACs: AC1, AC2, AC3, AC8, AC9, AC10, AC12, AC13. Verifications: V12:contract-canonical-section, V13:posture-exemption.
Actions: add the section described in §2.5 to `.agents/skills/ws-spec-to-pr/WORKER-TURN-RULES.md`, placed after `## Parent contract` and before `## Continuation contract`, with the four obligation groups in one section (AC13); state the per-dispatch marker obligation (BR10) and the step-scoped baseline / `{batch}`-names-the-marker correlation (G14) in that same section.
Engineering checks: contract assertions in `test/test-worker-liveness-check.js`; `node test/test-worker-turn-guard.js` (frozen anchors still green); grep that the exemption sentence names inline, lite, and Tier 3 in the same section.
Done when: one section states the marker obligation, the watchdog contract, the takeover branches, the correlation rule, and the exemption.

### T04 - Watchdog wiring (F7)

ACs: AC8, AC9, AC10, AC12. Verifications: V12:contract-canonical-section, V13:posture-exemption, V15:frozen-anchors.
Actions: extend `.agents/skills/ws-goal-fix-pr/SKILL.md` § Loop liveness watchdog with the evaluator command, the `wedged`-only takeover rule, the two branches, the measured-ages record, and the no-second-worker rule; keep every locked phrase; mirror the inline/lite/Tier 3 exemption already present at `:121`, `:122`, `:128`.
Engineering checks: `node test/test-goal-fix-pr-orchestrator-dispatch.js`; new assertions in `test/test-worker-liveness-check.js`; `node test/test-context-budget.js`.
Done when: the watchdog section names the verdict, the branches, and the exemption without changing any existing sentence.

### T05 - Dispatch pointer (F8)

ACs: AC13. Verifications: V12:contract-canonical-section, V22:context-budget.
Actions: add the <=180 B pointer clause to the Step 9 dispatch item in `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md`, naming the marker obligation + evaluator and pointing at the canonical section (no copied text).
Engineering checks: `node test/test-context-budget.js` (STEP-DISPATCH <= 24064 and combined <= 67072); `node test/test-worker-turn-guard.js`.
Done when: the pointer exists and both budgets pass with the measured delta reported (measured headroom before the edit: 285 B / 381 B).

### T06 - Tests + registration (F9, F10, F11)

ACs: all (regression harness). Verifications: V1-V16, V20, V21, V22 as mapped in §5.
Actions: write `test/test-worker-liveness-check.js` with the assertion messages pinned in §5 (including the stale-marker case, NS11); register it in `test/test-suites.json` `harnessEfficiency` (`:353`) next to `test-worker-turn-guard.js` (`:559`); add the two additive residue assertions to `test/test-workflow-state-contract.js` § runtime-residue block (`:304-321`).
Engineering checks: `node test/test-worker-liveness-check.js`; `node test/test-workflow-state-contract.js`; `node test/run-tests.cjs --list` shows the new entry; `npm run test`.
Done when: the new suite is green **after** its recorded red run, the two touched suites stay green, and the frozen anchor suites are untouched.

### T07 - Docs sweep + integrity + version (F12, F14, F15)

ACs: AC13 (capability surface). Verifications: V17:docs-sync, V18:harness-clean, V19:integrity.
Actions: `FEATURES.md` (§1 pipeline row or §2 quality-gates row + §10 `defaults` row listing `workerLivenessWindowSec`); `README.md` feature-table row; root `AGENTS.md` bullet in § Workflows (dispatch/watchdog area); `.ws/AGENTS.md` hub sentence; a `bin/build-site.js` `role-matrix-card` for the liveness verdict + `npm run build-site` (no version bump in this step); then `npm run build-site:bump` once (ship step owns the single bump) and `npm run generate-integrity` + `npm run verify-integrity` as the last edits before commit (regenerating `bin/skill-integrity.json`, F14).
Engineering checks: `node test/test-doc-sync.js`; `node test/test-harness-clean.js`; `npm run verify-integrity`; grep all five doc surfaces for the new capability.
Done when: all five surfaces mention the capability and integrity verifies.

### T08 - Verification pass

ACs: NS8 plus the whole set. Verifications: V14:residue-negative, V15:frozen-anchors, V20:stale-marker, V22:context-budget, V17-V19, sabotage S1/S2.
Actions: run the full configured alias `npm run test`, plus `node test/test-worker-turn-guard.js`, `node test/test-goal-fix-pr-orchestrator-dispatch.js`, `node test/test-ws-monitor-liveness.js`, `node test/test-liveness-checkpoints.js`, `node test/test-powershell-config-editor.js`, `node test/test-context-budget.js`, `node test/test-harness-clean.js`, `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node`, and `git diff --stat` scope review against F1-F15.
Done when: every command's exit code is recorded, and the diff lists only F1-F15.

**Defect-class sibling sweep (repo-wide, mandatory for this bugfix class).**
1. Sweep every parent-side freshness/liveness claim that assumes a first marker exists: `grep -rn "freshness\|no matching .*finish\|wedge\|liveness" .agents/skills/ws-*/SKILL.md .agents/skills/ws-spec-to-pr/*.md`. Each hit is either wired to the new evaluator or recorded as explicitly out of scope (`ws-monitor` observer side).
2. Sweep every `.runtime` writer for allowlist compliance (MEMORY `[2026-09-19] Harness-owned lock dirs under .runtime need a RUNTIME_NAMES entry`): confirm the new marker is covered by `/\.(md)$/` and that no other new name is introduced.
3. Sweep every `.runtime` reader that measures freshness against a named artifact: a stale same-name marker must never be read as current-batch evidence (BR10); confirm no other reader keys off an unqualified marker name.
4. Sweep the config-surface trio for any other key that exists in schema but not in example/GUI (Test 8 only checks a core subset, `:472-475`): compare `Add-ConfigFieldRow` rows in `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` against the schema `defaults` keys, and record any pre-existing gap as a note, not as scope.
5. Sweep the three posture exemptions (lite inline, inline legacy fix loop, Tier 1-3 ladder) so the new rule mirrors them (MEMORY `[2026-09-18] Dispatch-contract prose must mirror posture carve-outs`).

**Sabotage verification.** `verification.mutationTest` is empty, so use `run_sabotage.cjs`:
- S1: invert patch that deletes the marker branch from `.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs`; `node .agents/skills/ws-testing/scripts/run_sabotage.cjs --test "node test/test-worker-liveness-check.js" --paths .agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs --invert-patch <patch>`; expect non-zero (V1/V11 fail), then restore.
- S2: invert patch that forces the progress probe false; expect non-zero (V6 fails), then restore. A third probe may invert the marker-freshness comparison to prove V20 (expect non-zero).
Both runs are recorded with exit codes in the Step 5 report; a sabotage run that stays green is a finding, not a pass.

## 4. Permissions, Tenancy & i18n

N/A for this stack (no RBAC surface, no tenancy field, no i18n framework; `config.json.stack.frontend.framework: none`). The closest analogues are handled elsewhere in this plan: path containment for `--us-dir` and the marker path (§6), and payload hygiene (no secrets, no absolute machine paths) in the marker and verdict record. All prose is en-us.

## 5. Test Coverage

**Verification ids.** V1-V16 live in the new suite and its two additive blocks; V17-V19 are the docs/harness/integrity gates; V20 (stale marker), V21 (config-editor parity), and V22 (context budget) are added by the interview to remove the draft's duplicate V5/V6 meanings. Each id is referenced from its owning task section (§3) so `plan_index.cjs` can map AC -> task -> file -> verification.

**Frozen anchors (must pass byte-unchanged; no edit in this change).**

| Suite | What it locks | Verification |
|-------|---------------|--------------|
| `test/test-worker-turn-guard.js` | `worker_zero_tool_calls` / `worker_missing_artifact`, canonical turn-rule sentences, telemetry enum | V15:frozen-anchors |
| `test/test-goal-fix-pr-orchestrator-dispatch.js` | `## Loop liveness watchdog`, freshness/mtime signals, resume-takeover, no-ping rule | V15:frozen-anchors |
| `test/test-ws-monitor-liveness.js` | observer-side liveness expectations | V15:frozen-anchors |
| `test/test-liveness-checkpoints.js` | checkpoint/pause contract and schema | V15:frozen-anchors |

**New suite `test/test-worker-liveness-check.js`** (assertion messages are the ledger-linkable test names).

| AC / NS | Plan task | Verification | Test case (literal assertion message) |
|---------|-----------|--------------|----------------------------------------|
| AC1 | T03 | V12:contract-canonical-section | `AC1 canonical section states the marker write obligation within the window for this dispatch` |
| AC2 | T02, T06 | V1:marker-shape | `AC2 marker fixture resolves alive with markerPresent true`; `AC2 marker with empty batch field is not a valid marker` |
| AC3 | T02, T06 | V2:no-revision-bump, V3:residue-allowlist | `AC3 marker write leaves state revision unchanged`; `AC3 marker name is tolerated by RUNTIME_NAMES` |
| AC4 / NS4 | T02, T06 | V4:pending-in-window | `AC4 no marker within the window resolves pending`; `NS4 in-window evaluation exits 0 with pending` |
| AC5 / NS1 | T02, T06 | V5:wedged-exit-2 | `AC5 elapsed window with no marker and no progress resolves wedged`; `NS1 wedged verdict exits 2` |
| AC5 / NS11 | T02, T06, T08 | V20:stale-marker | `AC5 stale marker predating the baseline does not resolve alive`; `NS11 elapsed window with a stale marker and no progress resolves wedged` |
| AC6 / NS2 | T02, T06 | V6:progress-outranks-absence | `AC6 durable progress after baseline resolves alive`; `NS2 marker-absent revision advance resolves alive` |
| AC7 / NS3 | T02, T06 | V7:no-baseline-exit-0 | `AC7 missing dispatch event resolves no-baseline`; `NS3 no-baseline exits 0 and never wedges` |
| AC8 | T03, T04 | V12:contract-canonical-section | `AC8 canonical section records takeover branch with measured ages` |
| AC9 | T03, T04 | V12:contract-canonical-section | `AC9 canonical section forbids a second worker for a batch not proven wedged` |
| AC10 | T03 | V12:contract-canonical-section | `AC10 canonical section records a ping outcome as watchdog evidence` |
| AC11 / NS6 | T01, T06 | V8:window-resolver, V9:config-surface-parity | `AC11 resolver falls back to 600 for 0, negative, string, and non-integer`; `AC11 schema, example, and GUI carry workerLivenessWindowSec default 600`; `NS6 invalid window value does not wedge immediately` |
| AC12 / NS9 | T03, T04 | V13:posture-exemption | `AC12 canonical section exempts inline, lite, and Tier 3 postures`; `NS9 exemption sits in the same section as the obligation` |
| AC13 | T03, T05 | V12:contract-canonical-section | `AC13 canonical section states marker obligation, watchdog contract, and takeover branches`; `AC13 dispatch builders point at the canonical section without a divergent copy` |
| NS5 | T06, T08 | V3:residue-allowlist, V14:residue-negative | `NS5 marker-shaped .md file is tolerated by .runtime residue validation`; `NS5 non-md marker sibling fails validate with unknown .runtime residue` |
| NS7 | T02, T06 | V10:malformed-telemetry | `NS7 malformed telemetry line is skipped and the baseline still resolves` |
| NS8 | T08 | V15:frozen-anchors | frozen anchor suites run unchanged |
| NS10 | T02, T06 | V11:marker-after-window | `NS10 marker written after the window resolves alive` |
| G02 (frozen run) | T02, T06 | V6:progress-outranks-absence | `G02 ambient sibling telemetry after the baseline resolves alive and never wedged` |
| DoR security | T02, T06 | V16:payload-hygiene | `security marker payload carries no absolute machine path or secret` |
| DoR config gate | T01, T07 | V21:config-editor-parity, V19:integrity | `node test/test-powershell-config-editor.js` (core set now includes the key); `npm run verify-integrity` |
| DoR budgets | T05, T07 | V22:context-budget, V18:harness-clean | `node test/test-context-budget.js`; `node test/test-harness-clean.js` |
| Docs sweep | T07 | V17:docs-sync | `node test/test-doc-sync.js` + five-surface grep |

**Fixtures.** Every evaluator case builds a throwaway run directory under `test/.tmp-liveness-<pid>/` with a minimal `{workflow-id}.state.json`, a `telemetry.jsonl` carrying the dispatch baseline at a controlled past `timestamp`, and (where needed) a marker whose mtime is set with `fs.utimesSync` - never by sleeping and never with a `--now` override (interview G04). Fixture scratch stays outside any real `{us-dir}/.runtime` (MEMORY `[2026-09-18] Test fixtures must not write unknown files under us-dir .runtime`); the only in-place `.runtime` writes are the NS5 additions inside `test-workflow-state-contract.js`'s existing throwaway consumer root.

**Commands.** `npm run test` (configured `verification.backendTest`), `node test/test-worker-liveness-check.js`, `node test/test-workflow-state-contract.js`, `node test/test-powershell-config-editor.js`, `node test/test-context-budget.js`, `node test/test-doc-sync.js`, `node test/test-harness-clean.js`, `npm run verify-integrity`, plus S1/S2 sabotage runs.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `.agents/skills/ws-shared/runtime/stacks/typescript-node.md` (closest pack for `node-skills-package`); project invariants from `.ws/config.json` § `invariants` and `.ws/STACK.md`.

Touched framework boundaries and their verification:

| Boundary (pack rule) | Applies to | Verification |
|----------------------|------------|--------------|
| **Async & concurrency safety - zero floating promises / sync-only runtime** (pack §2) | F1 evaluator, F2 resolver | `node --check` on both files; the evaluator uses only `fs.readFileSync`/`statSync`/`readdirSync`, no `async`, no timers, no `Promise`; grep `.agents/skills/ws-spec-to-pr/scripts/worker_liveness_check.cjs` for `async|await|Promise|setTimeout` and require zero hits |
| **Resource leak & stream lifecycle** (pack §5) | F1 | No stream, socket, watcher, or child process opened; `V2:no-revision-bump` also asserts `.runtime` contents and state bytes are identical before/after evaluation (read-only proof) |
| **Boundary input validation** (pack §3) | F1 CLI flags, F2 config value | `--step` must parse as a non-negative integer, `--batch`/`--us-dir` non-empty, unknown flags fail loudly (`worker_turn_guard.cjs` precedent at `:106-126`); config value validated by the resolver (`V8:window-resolver`, NS6); malformed telemetry lines skipped (`V10:malformed-telemetry`, NS7) |
| **Injection & path traversal prevention** (pack §4) | F1 `--us-dir`, marker path, `.runtime` listing | Resolve `--us-dir` and require containment of the resolved `.runtime` target under it (deepest-existing-ancestor resolution, fail closed on a dangling leaf - MEMORY `[2026-09-21] Write containment must resolve the full target path`); a fixture asserts a traversal `--us-dir` exits 1 and no file is created |
| **No state mutation / trace-derived revision accounting** (MEMORY `[2026-09-19] Post-exit tripwires must derive their allowance from the turn's own op trace`) | AC3 | `V2:no-revision-bump`: record `revision` + state file hash, write the marker, re-read; assert both unchanged and `validate_state.cjs` exit 0 |
| **Fail-closed residue allowlist** (MEMORY `[2026-09-24]`/`[2026-10-10]`) | AC2, NS5 | `V3:residue-allowlist` (`RUNTIME_NAMES` export assertion) + `V14:residue-negative` (additive `validate`/`finish` residue cases in `test/test-workflow-state-contract.js`) |
| **Marker freshness vs. persisted `.runtime` residue** (MEMORY `[2026-09-18] Test fixtures must not write unknown files under us-dir .runtime`) | AC1, AC5, BR10 | `V20:stale-marker` on a fixture whose `.runtime` already holds a same-name marker from a superseded batch (mtime before the baseline); the frozen-run boundary in BR11 is pinned by `G02` ambient-activity case |
| **Config schema/GUI synchronization** (root hub § Config schema & GUI synchronization) | F3, F4, F5, F13 | `V21:config-editor-parity` (`node test/test-powershell-config-editor.js` with the key in `coreDefaults`) + `V9:config-surface-parity` (schema + example + GUI read together) |
| **Canonical single-source contract + locked phrasing** (MEMORY `[2026-09-19] Canonical single-source contract files need the new wording plus a same-batch test pin`, `[2026-09-18] Dispatch-contract prose must mirror posture carve-outs`) | F6, F7, F8 | `V12:contract-canonical-section` and `V13:posture-exemption` read the canonical file directly; `V15:frozen-anchors` keeps the frozen suites green; `V22:context-budget` asserts the byte budgets |
| **Fail-open on unknown baseline** (MEMORY `[2026-10-10] A host-declared subagent failure can hide a live, progressing session`) | AC6, AC7, AC9 | `V6:progress-outranks-absence`, `V7:no-baseline-exit-0`, `V8:window-resolver`; the evaluator never returns `wedged` without an elapsed window *and* a baseline *and* the absence of both a fresh marker and durable progress |

No authorization, DTO, migration, tenancy, or i18n boundary is touched by this change.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected: skills-sot edits under `.agents/skills/**`, tests under `test/**`, no `bin/**` behavior change beyond the site card and the regenerated integrity manifest.
- [ ] No state writer added; marker and evaluator perform zero `update_state` writes (AC3 proven).
- [ ] Domain/no-database: no migrations, entities, or mappings (N/A row recorded).
- [ ] Authorization checks: N/A (no endpoint or policy surface).
- [ ] Stack & security invariants verified: sync-only, containment, validation, read-only proof, marker freshness (§6 rows).
- [ ] i18n keys: N/A (no frontend/i18n surface).
- [ ] Test cases cover all 13 ACs and all 11 negative scenarios (§5 tables); red run captured before the implementation; new suite registered in `test/test-suites.json`.
- [ ] Frozen anchor suites byte-unchanged and green.
- [ ] Byte budgets green (`test/test-context-budget.js`), `PROTOCOLS.md`, lite `SKILL.md`, and `ws-shared/runtime/AGENTS.md` untouched.
- [ ] Config trio in sync and covered by the gate: `node test/test-powershell-config-editor.js` green with `workerLivenessWindowSec` in `coreDefaults` (F13).
- [ ] Docs sweep complete on all five surfaces; site rebuilt with an explicit card.
- [ ] `npm run generate-integrity` + `npm run verify-integrity` as the last step before commit; `node test/test-harness-clean.js` reports 0 findings.
- [ ] Version bumped exactly once for the PR (`npm run build-site:bump`), strictly above the merge-base (F15).
- [ ] Sabotage runs S1/S2 (and the optional freshness probe) executed with recorded exit codes.
- [ ] No `{plansDir}/` path staged before Step 8 G2-delivery.

## 8. Open Questions - resolved by the interview

| # | Question / decision | Resolution | Source |
|---|---------------------|------------|--------|
| Q1 | AC4 (`window not elapsed -> pending`) vs AC6 (`progress -> alive`) can both hold. | Precedence `no-baseline` -> `alive` (fresh marker or durable progress) -> `pending` -> `wedged`; AC4 is scored as the no-evidence case. Both literal probes pass; no AC sentence is overridden, so no spec/step-00 sync is required (§9). | project (NS2/NS4/NS10 + spec Assumptions row) |
| Q2 | What counts as "durable progress"? | Three channels strictly after the baseline `dispatchedAt` (telemetry record timestamp, state-file mtime, other `.runtime` mtime), 1 s tolerance, all echoed as `progressEvidence`; `wedged` presumes a frozen run (BR11). | project |
| Q3 | Is a `--now <iso>` test override needed? | No: fixtures use controlled past timestamps and `fs.utimesSync`; the CLI keeps the spec's flag set. | assumed-default |
| Q4 | Does `STEP-DISPATCH.md` need the pointer given the headroom? | Yes, one <=180 B pointer clause in the Step 9 dispatch item; measured headroom 285 B / 381 B leaves 105 B / 201 B. If it cannot fit, record a follow-up instead of trimming locked prose. | project (measured) |
| Q5 | Does AC8's "round artifact" require a `ws-code-review` change? | No edit to `.agents/skills/ws-code-review/SKILL.md`: `write_review_round.cjs --input <draft>` persists `step-06-{slug}.review.r{n}.md` from a parent-authored draft, and fix-pr batches record in `{reviewsDir}/PR-<N>-round-*.md` (F7). | project |
| Q6 | Should `PROTOCOLS.md` carry the marker obligation? | No: `:280` already points at the canonical file; the file has 1 B headroom. | project |
| Q7 | Is the default inline fix loop covered by AC12? | Yes: the exemption sentence names inline explicitly alongside lite Step 5 and Tier 3 (`:121`, `:122`, `:128`). | project |
| Q8 | Does the new key belong in `.ws/config.json`? | No: absent resolves to 600 by contract; adopting it in the dogfood hub is a separate consumer-owned edit. | project |

## 9. Interview resolutions carried into this plan

1. **AC4 reading (G01).** AC4 governs the verdict while the window has not elapsed **and no other evidence exists**. `step-00-us-502.spec.md:35` defines `alive` as "marker present **or** durable progress", `:143` scopes `pending` to marker absence at the first poll, NS4 (`:177`) pins the in-window/no-evidence probe, and NS10 (`:183`) pins marker-after-window. Scored assertions: in-window/no-marker/no-progress => `pending`, exit 0 (AC4); progress after the baseline => `alive`, exit 0 (AC6). No AC sentence is overridden, so the spec of record and `step-00` stay unchanged; if Step 5 scores AC4 `ImplementedDifferently`, this paragraph plus NS4/NS10 evidence is the resolution.
2. **Marker freshness (G03, BR10).** Verdict order 2 requires mtime >= baseline - 1 s; a stale same-name marker from a superseded batch is evidence only, and with the window elapsed the verdict is `wedged`. New NS11 + `V20:stale-marker`; the canonical section states "for this dispatch".
3. **Progress attribution (G02, BR11).** Telemetry records carry `step`/`substep` only (`telemetry.schema.json:14,68`, `additionalProperties: false`), so the progress channel is parent-observable run activity; `wedged` presumes a frozen run and ambient activity can only delay a verdict. Pinned by the `G02` test case.
4. **Baseline correlation (G14).** The baseline is the latest `dispatch` record for `--step`; `--batch` names the marker. The verdict record prints both, and the canonical section states the rule.
5. **Config gate correction (G10, G11, F13).** Test 8 gates only a hardcoded `defaults` core set; this plan adds `'workerLivenessWindowSec'` to it and corrects the T01 GUI row to the real `Add-ConfigFieldRow -ParentPanel $page -YOffset $y` shape.
6. **V-id hygiene (G16).** The draft used `V5` and `V6` for two meanings each; this plan keeps the §5 canonical names (`V5:wedged-exit-2`, `V6:progress-outranks-absence`) and adds `V21:config-editor-parity` / `V22:context-budget` for the second meanings, so AC -> task -> verification mapping is unambiguous.
7. **Verification order (G13).** T02/T06 require the captured red run (the new suite fails before F1 exists) before the green run.
8. **Scope honesty (G15).** F13-F15 are harness-mandated surfaces (config gate, regenerated integrity manifest, single version bump) and are listed so the DoR bounded-scope check reads the real diff.
