---
superseded: true
supersededBy: step-02-us-412-413-liveness-checkpoints.plan.refined.md
slug: us-412-413-liveness-checkpoints
title: "Unattended autoMode runs: mid-step checkpoints, turn-boundary pause state, and monitor stall detection"
status: completed
step: 1
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
startedAt: "2026-09-24T04:31:48Z"
endedAt: "2026-09-24T04:59:21.590Z"
acRefs: []
---
## 0. Summary & Business Rules

Make a standard `ws-spec-to-pr` run viable **unattended** with `defaults.autoMode` + `defaults.fullMode`: a run either progresses to a terminal state or parks with an explicit, resumable turn-boundary pause marker that observers can distinguish from a stall. Two defect classes are fixed in one release:

- **Orchestration (#413):** `autoMode` removes gate halts but does not chain host turns. A step too large for one host turn (observed ~9-node DAG Step 4) can end the turn mid-step with unchanged `revision`, `stepStatus[4]: active`, no `finish` telemetry, and no resumable marker. Contract: mid-step checkpoints (unit marker + in-progress sub-step) and an explicit turn-boundary pause marker, both persisted in the existing state file and telemetry stream.
- **Monitor (#412):** `ws-monitor` transcript discovery starves its per-tick budget on unrelated roots before reading the correlated session (`filesScanned: 0`, `capped: true`), and scan vs. resolve use different correlation windows (256 KB scan tail vs. 8 KB resolve tail), so `worker-session-stall` cannot fire for a scanned session. Contract: correlated session always read within the tick, one shared correlation window, honest `scan-capped`, stall suppression under an explicit pause, and a bounded `--watch --until-terminal` mode.

### Business Rules

| # | Rule |
|---|------|
| BR1 | `checkpoint`, `pause-turn`, `dispatch`, `finish`, `bypass` are the only sanctioned state writers; every progress write bumps `revision` by exactly one and appends exactly one telemetry event. |
| BR2 | Checkpoints/pauses are **additive** sub-step records: they never change `completedSteps`, `currentStep`, or `stepStatus` semantics; whole-step gates stay authoritative. |
| BR3 | `finish` for step N clears `turnPause` when it names step N and deletes `checkpoints["N"]` before the state is rendered/written (AC5). |
| BR4 | Observer posture is read-only; discovery stays opt-in; a paused workflow reports the pause instead of a stall (`worker-session-stall` suppressed). |
| BR5 | Portable contract only: no host product names in skill bodies, scripts, or tests; correlation keys remain generic (`slug`, `workflowId`); adapter specifics stay confined to the existing adapter reference data. |
| BR6 | Schemas are the validation boundary: every new event type/field validates (`telemetry.schema.json` has `additionalProperties: false`), and `validateSnapshot` fails closed on malformed checkpoint/pause records. |
| BR7 | Pause lifetime: cleared by the terminating `finish` for that step; no TTL, no side-channel file, no second state artifact (spec § Design Intent "Rejected alternative"). |

### Security Mitigations

Local state/telemetry files only; no new network, auth, secret, or data-lifecycle surface. Monitor stays read-only against host stores (bounded tails, opt-in discovery). Telemetry keeps existing redaction/sanitization paths; `--progress`/`--reason` inputs are length-bounded like existing fields.

## 1. Definition of Ready & Scope

### Resolved Assumptions (from spec § Assumptions & Open Questions)

| Topic | Resolved default |
|-------|------------------|
| Checkpoint storage | `state.checkpoints` object keyed by step number; record holds unit ids + remaining count |
| Pause marker | `state.turnPause = { step, reason, at, nextAction }` |
| Pause lifetime | Cleared by `finish` for that step; no TTL |
| Shared correlation window | Scan and resolve both consume the scan's bounded read window (`maxBytesPerFile`, 256 KB) |
| Budget strategy | Per-root reservation + correlated-root/correlated-entry prioritization |
| `--until-terminal` | Requires `--watch`; mutually exclusive with `--iterations`; exits when the selected workflow is non-active |
| Input validation/auth/rate-limit/lifecycle | N/A (local fields + read-only CLI flag) |

### Acceptance Criteria Coverage Summary

All 19 ACs are in scope. Mapping is exhaustive in §5; §3 carries the work item for each.

| Scope | ACs | Primary files |
|-------|-----|---------------|
| Orchestrator checkpoint/pause operations | AC1–AC7, AC9 | `workflow_state.cjs`, `telemetry.schema.json`, `workflow-state.schema.json` |
| Orchestrator docs / pause-aware resume | AC8, AC9 | `ws-spec-to-pr/SKILL.md`, `PROTOCOLS.md`, `ws-shared/runtime/setup.md`, `gates.md` (consistency line) |
| Monitor discovery/correlation | AC10–AC13 | `ws-monitor/scripts/monitor_snapshot.cjs` |
| Monitor stall/pause/watch | AC14–AC16 | `monitor_snapshot.cjs` |
| Monitor docs | AC17 | `ws-monitor/SKILL.md`, `ws-shared/runtime/observer-instructions.md` |
| Regression tests | AC18 | `test/test-liveness-checkpoints.js`, `test/test-ws-monitor-liveness.js`, `test/test-suites.json` |
| Human docs + harness release | AC19 + repo obligations | `README.md`, `FEATURES.md`, `package.json`, `bin/skill-dependencies.json`, site rebuild, integrity |

### Out of Scope (from spec)

Preset-name validation hardening; new transcript host adapters; `step_coordinator`/baton checkpoint parity; config schema keys or GUI bindings; auto-merge policy changes; `ws-spec-to-pr-lite` orchestration changes (shared `update_state` gains the operations; lite flow and docs stay as-is).

### Definition of Ready (DoR)

| Readiness Item | Requirement | Verification |
|----------------|-------------|--------------|
| Bounded scope | Every touched file named in §3; no consumer hub data edits | Plan maps each AC to a file |
| Atomic criteria | Spec `validate_spec.cjs --mode=authoring` exits 0 (done at Step 0) | Step 0 evidence |
| Failure modes | NS1–NS6 enumerate red-before/green-after tests | §5 negative rows; Step 7 executes them |
| Observation telemetry | `checkpoint` / `turn_paused` events and monitor fields named | §2.2 + T1/T2/T4 |
| No open blockers | Both issues reproduced with code citations; no open PR owns them | Prior Work Sweep in spec |

## 2. Technical Design & Architecture

Layers touched (config.json `stack.backend.layers`): **skills-sot** (`.agents/skills/**`), **tests** (`test/**`), plus human docs (`README.md`, `FEATURES.md`) and generated site (`docs/index.html`). Installer-cli (`bin/`, excluding `skill-dependencies.json` `packageVersion`) has no code change. No database, no frontend, no i18n.

### 2.1 State machine extension (`ws-shared/runtime/scripts/workflow_state.cjs`)

Current model: `runUpdateCli` accepts `dispatch | finish | finish-batch | bypass`; `performUpdate` is the single state writer (revision bump at workflow_state.cjs:1460, dual-write at :1808, plans index at :1791, self-validation at :1819).

Add a **progress writer** path (new functions, e.g. `performCheckpoint`, `performPauseTurn`, shared `writeProgressState` helper) that:

1. Parses via the existing `parseArgs`; validates `--step` in `0..maxStep` (reuse the existing range error message shape) and validates op-specific flags before any mutation (NS5: non-zero exit, state bytes unchanged).
2. Loads persisted state (`loadPersistedState`), bumps `state.revision` by one.
3. Mutates only additive fields:
   - `checkpoint`: `state.checkpoints[String(step)] = { step, substep, completedUnits: string[], remainingUnits: int >= 0, updatedAt: ISO }` (repeated calls replace the record).
   - `pause-turn`: `state.turnPause = { step, reason, at: ISO, nextAction }`.
4. Appends exactly one telemetry event via `commonEvent(state, pipeline, step, type, timestamp, options, context)` (required base fields) plus:
   - `checkpoint`: `{ type: 'checkpoint', substep, progress: { completedUnits, remainingUnits } }` (AC2 fields: step, substep, progress, timestamp).
   - `turn_paused`: `{ type: 'turn_paused', reason, nextAction }` (AC4).
5. Writes through the existing single path: `canonicalStateJson` → `syncStateDualWrite` → `refreshPlansIndexForState(context, state, { pipeline, maxStep, stateFile })` → `validateSnapshot` (AC7). This honors the MEMORY trap "every programmatic state writer must refresh the plans index row".
6. Never touches `stepStatus`, `completedSteps`, `currentStep`, handoffs, artifacts, batons, or G2 semantics.

CLI surface (via `update_state.cjs` wrapper, which already forwards argv to `runUpdateCli`):

```text
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs checkpoint <state> --step N --progress '<json>'
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs pause-turn <state> --step N --reason "<text>" [--next-action "<text>"]
```

- `--progress` accepts a JSON object `{ "substep": string, "completedUnits": string[], "remainingUnits": int }`; malformed JSON / wrong types / negative counts → usage error, state unchanged (see §8 Q1).
- `pause-turn` `nextAction`: explicit `--next-action` wins; otherwise derived from `state.checkpoints[N]` as `Resume step N (<substep>; <remainingUnits> remaining)`; when neither exists → error instructing `--next-action` (AC9 fail-closed; §8 Q2).
- `runUpdateCli` allowlist + usage help text updated to include both operations.
- `finish` path: before rendering, delete `state.checkpoints[String(step)]` and `state.turnPause` when `Number(state.turnPause.step) === step` (AC5; §8 Q3). Do not clear a pause marker belonging to another step.

`update_state.cjs` / `validate_state.cjs` wrappers (`ws-spec-to-pr/scripts/`): thin argv forwarders — **no edit expected**; AC1/AC7 are exercised through the wrapper CLI so the entry point is the wrapper.

### 2.2 Schemas (`ws-shared/runtime/`)

- `telemetry.schema.json`: extend the `type` enum with `checkpoint`, `turn_paused`; add `progress` (object, `additionalProperties: false`, required `completedUnits` array of strings + `remainingUnits` integer ≥ 0, optional `substep` string) and `nextAction` (string, minLength 1). Existing `substep`, `reason`, `step`, `timestamp` are reused. Keep `additionalProperties: false` satisfied for both new events.
- `workflow-state.schema.json`: add explicit `checkpoints` (object whose values require `step` int 0..9, `substep` string, `completedUnits` string array, `remainingUnits` int ≥ 0, `updatedAt` date-time) and `turnPause` (`additionalProperties: false`, required `step`, `reason`, `at`, `nextAction`; `at` date-time) properties. Records are optional; empty maps should be omitted.
- `validateSnapshot` (`workflow_state.cjs`): add fail-closed structural checks for `checkpoints` (only valid step keys, record shape/types, ISO `updatedAt`) and `turnPause` (shape/types/ISO `at`, step in range) so `validate_state.cjs` exits non-zero on malformed records (AC7 + NS6).

### 2.3 Monitor discovery & stall (`ws-monitor/scripts/monitor_snapshot.cjs`)

Current defects (code citations): file collection fills a single global list across all roots before any read (`scanTranscriptRoots`, monitor_snapshot.cjs:1132–1159), so 61 earlier roots exhaust the 200-file cap; scan filters on the full read window but stores `tail: text.slice(-8000)` (:1189) while `resolveTranscriptSource` re-matches only `item.file + '\n' + item.tail` (:1308–1311).

1. **Budget (AC10, AC11):** 
   - Rank candidate roots correlation-first in `scanTranscriptRoots` (path-level `correlationMatches(root/file, key)` for `filter.workflowId`/`filter.slug`), stable otherwise.
   - Per-root reservation in the collect phase: while iterating roots, cap each root's contribution at `max(1, floor(remainingBudget / remainingRoots))` so no root can starve the rest; correlated roots visited first also get the largest slice.
   - Within a root, order entries correlation-first (path segments containing the workflow key), then directory walk order, so the correlated `session.jsonl` is collected inside its root's slice.
2. **Shared window (AC12, AC13):** store one bounded correlation window per scanned file — the same bytes the scan filter matched (the `readBoundedTailText` result, ≤ `maxBytesPerFile`). Redefine the stored `tail` to that window (`scannedFiles.push({ file, mtimeMs, tail: rawText })`), so `resolveTranscriptSource` keeps its current text-matching code and now matches on exactly the window the scan used (spec assumption: reuse the bounded tail). Keep dropping `tail` from report output before serialization (existing `for (const scanned of transcript.files) delete scanned.tail;`) so payloads stay bounded (≤ `maxTotalBytes` = 4 MB read budget bounds the retained windows). `scan-capped` stays: returned only when no candidate matched and the scan stopped early; a scanned match always resolves `available`.
3. **Stall + pause (AC14, AC15):** in the per-workflow transcript loop (monitor_snapshot.cjs:1495–1522), surface `turnPause: state.turnPause || null` on the workflow record; when a pause marker exists, skip the `worker-session-stall` warning and add an `info` finding `worker-session-paused` ("workflow paused at a turn boundary; awaiting continuation", evidence = state path). Else keep the existing stall rule (`available` + active + idle > `stallWindowMs`).
4. **`--until-terminal` (AC16):** add `untilTerminal` to `parseArgs` boolean tokens; in `main()`: `--until-terminal` requires `--watch`, is mutually exclusive with `--iterations` (NS4: error before any `snapshot()` call), and the loop exits when no scoped workflow is active (`activeCount === 0` / all `status` not in `active|blocked|in_progress`). Plain `--watch` keeps its `--iterations` requirement. Help text and markdown report updated.

### 2.4 Orchestrator docs & pause-aware resume (AC8, AC9)

- `ws-spec-to-pr/SKILL.md`: state that `autoMode` removes gate halts but **does not chain host turns**; add the mid-step contract: before ending a turn with a step incomplete, run `checkpoint` (unit marker + remaining count) and `pause-turn` (reason + `nextAction`) via `update_state.cjs`; resume continues the named unit. Extend the Pause/Resume row (SKILL.md:57) to consume `state.turnPause`/`state.checkpoints`.
- `ws-spec-to-pr/PROTOCOLS.md`: extend § Automatic Mode and § Checkpoints with a "Turn-boundary pause & mid-step checkpoints" subsection: operations, field shapes, `finish` clearing, resume rule, pause-vs-stall semantics.
- `ws-shared/runtime/setup.md` § Resume: when `state.turnPause` is present, resume at `turnPause.nextAction` / `state.checkpoints[turnPause.step]` instead of treating the unchanged `revision` as a stall; the terminating `finish` clears the markers.
- `ws-shared/runtime/gates.md`: one-line nuance at the `autoMode` exception (gates.md:52) so "proceeds continuously across step boundaries" is scoped to a host turn that can run them, otherwise checkpoint + pause (consistency only; no behavior change). §8 Q8.
- Portable prose: describe behavior generically; no host product names.

### 2.5 Tests (AC18) and docs (AC17, AC19)

New suites `test/test-liveness-checkpoints.js` (state ops/schemas) and `test/test-ws-monitor-liveness.js` (discovery/stall/watch), registered in `test/test-suites.json` (`local` + `remote` for the state suite; `harnessEfficiency` for the monitor suite). README/FEATURES updates describe operations, pause semantics, and `--until-terminal`.

### Invariant Checks (config.json.invariants)

`commitPlanFilesOnlyAtStep8: true` (plan artifacts staged only at Step 8), `skipQualityGates: false` (pre-advance gates run). EF/tenancy keys false → N/A.

## 3. Step-by-Step Plan

Ordered by dependency; each item names files, work, and engineering checks.

### Step 3.1 — State model: checkpoint + pause operations (AC1, AC2, AC3, AC4, AC9)

- **Files:** `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (primary); `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs` (verify only, no edit expected).
- **Work:** add `performCheckpoint` / `performPauseTurn` (shared `writeProgressState`), extend `runUpdateCli` allowlist + usage help, implement `--progress` JSON parsing/validation, `nextAction` resolution (§2.1), telemetry events via `commonEvent`, revision bump, `syncStateDualWrite`, `refreshPlansIndexForState`, `validateSnapshot`.
- **Checks:** `node --check .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`; CLI smoke through the wrapper; tests T1, T2, T6.

### Step 3.2 — `finish` clears checkpoint/pause (AC5)

- **Files:** `workflow_state.cjs`.
- **Work:** in the `finish` branch, delete `checkpoints[String(step)]` and a `turnPause` naming that step **before** `canonicalStateJson`/render; keep idempotent-finish fingerprint behavior unchanged.
- **Checks:** test T3; regression `test/test-update-state-yaml.js`, `test/test-workflow-state-contract.js`.

### Step 3.3 — Schemas + snapshot validation (AC6, AC7, NS6)

- **Files:** `.agents/skills/ws-shared/runtime/telemetry.schema.json`, `.agents/skills/ws-shared/runtime/workflow-state.schema.json`, `workflow_state.cjs` (`validateSnapshot`).
- **Work:** enum + field additions; state properties; fail-closed record checks.
- **Checks:** tests T4, T5, T7; existing schema consumers (`test/test-dispatch-provenance.js`, `test/test-worker-turn-guard.js`, `test/test-observer-us365.js`, `test/test-step-baton-telemetry.js`, `test/test-models-preset-and-per-step.js`, `test/test-git-ownership-contract.js`) stay green.

### Step 3.4 — Monitor discovery budget (AC10, AC11, NS1)

- **Files:** `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
- **Work:** correlate-first root ranking, per-root reservation (`max(1, floor(remainingBudget / remainingRoots))`), correlation-first entry ordering within a root; no change to the read-only posture or root discovery sources.
- **Checks:** test M1 (61 unrelated roots / >200 unrelated files precede the target); existing `test/test-ws-monitor-us356.js` green.

### Step 3.5 — Shared correlation window + honest `scan-capped` (AC12, AC13, NS2)

- **Files:** `monitor_snapshot.cjs` (`scanTranscriptRoots` stored `tail`; `resolveTranscriptSource` unchanged matching code; report cleanup).
- **Work:** store the bounded read window as the single correlation window; verify reason vocabulary unchanged (`discovery-disabled`, `no-matching-session`, `scan-capped`).
- **Checks:** tests M2, M3; defect-class sibling sweep: `rg "slice\\(-8000\\)|8000" .agents/skills/ws-monitor/scripts/` must show no remaining 8 KB correlation slice; grep `resolveTranscriptSource` fixtures in `test/` for stale 8 KB assumption.

### Step 3.6 — Stall suppression + `--until-terminal` (AC14, AC15, AC16, NS3, NS4)

- **Files:** `monitor_snapshot.cjs` (snapshot stall loop, `parseArgs`, `main`, help).
- **Work:** `turnPause` on the workflow record; `worker-session-paused` info finding replaces the stall warning; `untilTerminal` parsing/validation/loop exit.
- **Checks:** tests M4, M5, M6, M7; existing `test-ws-monitor-us356.js` stall assertions still pass (idle session without pause still stalls).

### Step 3.7 — Orchestrator + monitor docs (AC8, AC9, AC17)

- **Files:** `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-shared/runtime/setup.md`, `.agents/skills/ws-shared/runtime/gates.md` (consistency line), `.agents/skills/ws-monitor/SKILL.md`, `.agents/skills/ws-shared/runtime/observer-instructions.md`.
- **Work:** §2.4 content; monitor SKILL signal map + invocation; observer taxonomy adds the pause finding and names the shared correlation window.
- **Checks:** test M8 (doc assertions); `test/test-observer-us365.js` (shared-source references) green; `test/test-shell-quoting-audit.js` green for any added command recipe.

### Step 3.8 — Regression suites + registration (AC18)

- **Files:** `test/test-liveness-checkpoints.js` (new), `test/test-ws-monitor-liveness.js` (new), `test/test-suites.json`.
- **Work:** implement T1–T7 and M1–M8; register (`local`+`remote` state suite; `harnessEfficiency` monitor suite).
- **Checks:** `npm run test` exits 0.

### Step 3.9 — Human docs + harness release obligations (AC19 + repo obligations)

- **Files:** `README.md`, `FEATURES.md`, `package.json`, `bin/skill-dependencies.json`, generated `docs/index.html`; evaluate root `AGENTS.md` / `.ws/AGENTS.md` for enumerated operation lists (update only if drift appears).
- **Work:**
  1. README + FEATURES describe `checkpoint`/`pause-turn`, pause semantics, and `--until-terminal` (FEATURES: pipeline table row 1.1/1.6 + utility/monitor row + version line).
  2. **Version bump once per release PR:** `npm run build-site:bump` (package.json + site footer), then set `bin/skill-dependencies.json` `packageVersion` to the same version; must be strictly above the merge-base version (currently 0.4.65).
  3. Site rebuild (`node bin/build-site.js` when not already run by the bump).
  4. `npm run generate-integrity` + `npm run verify-integrity` **after the last product edit** (clean tree; no untracked files under `.agents/skills/`) — MEMORY trap "regenerate integrity from a clean tree only".
  5. **GUI editor sync: N/A** — no `config.json` key/values change (config.schema.json / config.json.example untouched).
- **Checks:** `test/test-doc-sync.js`, `test/test-skill-frontmatter.js`, `node test/test-harness-clean.js` (0 findings), `ws-check-harness` Phases 0–5c.

### Defect-class sibling sweep (mandatory for regression ACs)

- Window class: `rg "slice\\(-8000\\)|8000" .agents/skills/ws-monitor/scripts/` → zero remaining correlation-window mismatches.
- Discovery-budget class: inspect `resolveCandidateTranscriptRoots` + `expandMuseSessionDirs` caps (`walkCap`, `limit`) for the same starvation shape; confirm per-root reservation is the only unbounded-collection path.
- State-writer class: grep `syncStateDualWrite(` call sites; confirm every writer (including the new progress writer) calls `refreshPlansIndexForState` (MEMORY trap).

### Sabotage verification (Step 7, mutation unset)

Mutation config is empty (`verification.mutationTest: ""`, `defaults.skipMutationTesting: true`), so Step 7 runs `node {skillsRoot}/ws-testing/scripts/run_sabotage.cjs` against the new regression assertions (M1/M2/M5 are the primary inversion targets) with the non-empty alias `npm run test`: invert the fixed code, expect a non-zero suite, and byte-identical restoration on the declared paths.

## 4. Permissions, Tenancy & i18n

N/A for this package: no RBAC, no tenant data, no user-facing strings/i18n. File-write surface stays limited to local workflow artifacts; the monitor remains read-only.

## 5. Test Coverage

New suites (names used verbatim by the implement step):

| Test ID | Suite | Case (method) | AC / NS | Assertion |
|---------|-------|---------------|---------|-----------|
| T1 | `test/test-liveness-checkpoints.js` | `checkpoint persists sub-progress, telemetry, and revision` | AC1, AC2 | Wrapper CLI exits 0; `checkpoints["4"]` has `substep`, `completedUnits`, `remainingUnits`, `updatedAt`; `revision` +1; `telemetry.jsonl` last line `type: checkpoint` with `step`, `substep`, `progress`, valid `timestamp`; plans index row `stateSha256` refreshed |
| T2 | same | `pause-turn persists marker, nextAction, telemetry, and revision` | AC3, AC4, AC9 | `turnPause` = `{step, reason, at ISO, nextAction}`; `type: turn_paused` event; revision +1; explicit `--next-action` recorded; derived `nextAction` from checkpoint when omitted |
| T3 | same | `finish clears pause marker and step checkpoint` | AC5 | After `finish --step 4`: no `turnPause`, no `checkpoints["4"]`; unrelated step records preserved |
| T4 | same | `telemetry schema accepts checkpoint and turn_paused` | AC6 | Schema enum contains both; emitted events satisfy required fields + new `progress`/`nextAction` shapes |
| T5 | same | `state schema + validate_state accept checkpoint/pause fields` | AC7 | `workflow-state.schema.json` declares `checkpoints`/`turnPause`; `validate_state.cjs <state> --pre-advance 5` exits 0 |
| T6 | same | `out-of-range or malformed input leaves state unchanged` | NS5 | `checkpoint`/`pause-turn` with `--step 99` (and malformed `--progress`) — non-zero exit, byte-identical state before/after |
| T7 | same | `validate_state rejects malformed checkpoint record` | NS6 | Wrong-typed record → `validate_state.cjs` non-zero |
| M1 | `test/test-ws-monitor-liveness.js` | `unrelated-root flood still reads the correlated session` | AC10, AC11, NS1 | Fixture: 61 unrelated roots (>200 files) precede the target session root; `filesScanned >= 1`, correlated workflow `transcriptSource.status: available`, honest `capped` |
| M2 | same | `workflow id between 8KB and 256KB resolves available` | AC12, NS2 | Key placed outside the last 8 KB but inside the scan window; unit (`resolveTranscriptSource`) and e2e both `available` |
| M3 | same | `scan-capped only when the matching file was not read` | AC13 | No match + capped → `scan-capped`; match read → `available`; vocabulary unchanged |
| M4 | same | `worker-session-stall fires for idle available session on active workflow` | AC14 | Idle session beyond 600000 ms on active workflow → warning finding present |
| M5 | same | `pause marker suppresses stall and reports pause` | AC15, NS3 | `state.turnPause` present → no `worker-session-stall`; `worker-session-paused` info finding present |
| M6 | same | `--until-terminal usage errors` | AC16, NS4 | `--watch --until-terminal --iterations 2` → non-zero, message, no snapshot output; `--until-terminal` without `--watch` → non-zero |
| M7 | same | `--watch --until-terminal exits on terminal workflow` | AC16 | Terminal fixture + `--interval 1` exits 0 promptly |
| M8 | same | `docs cover pause vs stall and shared correlation window` | AC17 | `ws-monitor/SKILL.md` + `observer-instructions.md` contain the pause/stall distinction and the single-window statement |
| D1 | `test/test-liveness-checkpoints.js` | `orchestrator docs state autoMode does not chain host turns` | AC8 | `SKILL.md` + `PROTOCOLS.md` contain the pause/resume contract wording |
| D2 | same | `README + FEATURES describe operations, pause semantics, --until-terminal` | AC19 | Both files mention `checkpoint`, `pause-turn`/pause, `--until-terminal` |

Existing suites that must stay green: `test-update-state-yaml.js`, `test-workflow-state-contract.js`, `test-ws-monitor*.js` (us356/us385/us388/us395), `test-observer-us365.js`, `test-state-observability.js`, `test-telemetry-observability.js`, `test-doc-sync.js`, `test-harness-clean.js`.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/` has no pack for `node-skills-package` (no framework app); the harness-specific invariant pack below is the governing boundary set. Touched framework boundaries:

| Boundary | Touched? | Verification |
|----------|----------|--------------|
| **State-writer integrity (authorization-equivalent gate)** | Yes — new writers | Every new mutation path: revision +1 exactly once, `canonicalStateJson` → `syncStateDualWrite` (md+json agree) → `refreshPlansIndexForState` (row sha/updatedAt refreshed) → `validateSnapshot` exit 0. Verified by T1/T2/T5 + `npm run test` |
| **Schema / input validation (DTO boundary)** | Yes — telemetry + state schemas, CLI parsing | `additionalProperties: false` telemetry schema accepts declared fields only (T4); malformed `--progress`/`--step`/checkpoint records fail closed with state unchanged (T6/T7/NS5/NS6) |
| **Concurrency / async safety** | No — synchronous Node scripts, single-writer CLI | No new async primitives; atomic writes preserved (`atomicWrite` temp+rename). Watch loop bounds are explicit (`--iterations` xor `--until-terminal`), cancel-safe |
| **Observer read-only / lifecycle cleanup** | Yes — monitor | No writes outside the observer's own report path; discovery stays opt-in; scanned windows dropped from output before serialization; test fixtures sandbox host stores via `monitor.hostHome` (M1–M7 must not touch real host stores) |
| **Portability / agent-agnostic contract** | Yes — docs + scripts + tests | No host product names in new skill prose/scripts/tests; correlation keys generic; adapter specifics remain in existing adapter reference data; `ws-check-harness` + `test-runtime-portability.js` green |
| **Consumer-data isolation** | Yes — no consumer hub edits | Product diff excludes `.ws/config.json`, `STACK.md`, memory, changelog; `commitPlanFilesOnlyAtStep8` respected |

Security checks: no secrets added; telemetry payloads remain redacted (existing `redactSecrets`/sanitizers); no network calls added; `--until-terminal` cannot loop unbounded without an explicit flag and exits on terminal state.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected: skills-sot + tests + docs only; no installer-cli code change.
- [ ] No consumer hub data in the product diff (`.ws/` config/memory/changelog untouched).
- [ ] No `config.json` schema/key changes → **GUI editor sync N/A** (`node test/test-powershell-config-editor.js` still green).
- [ ] **Version bumped once** for this release PR: `npm run build-site:bump` (package.json + site footer) and `bin/skill-dependencies.json` `packageVersion` matched; strictly above merge-base.
- [ ] **Integrity regenerated after the last product edit**: `npm run generate-integrity` + `npm run verify-integrity` on a clean tree.
- [ ] Site rebuilt (`docs/index.html`) with the updated skill docs.
- [ ] README + FEATURES synced; root `AGENTS.md` / `.ws/AGENTS.md` checked for enumerated op lists.
- [ ] Tests: `npm run test` exits 0 with both new suites registered in `test/test-suites.json`.
- [ ] `node test/test-harness-clean.js` 0 findings; `ws-check-harness` Phases 0–5c clean.
- [ ] Sabotage verification recorded at Step 7 for M1/M2/M5 regression assertions.
- [ ] Agent-agnostic sweep: no host product names in changed skill bodies/scripts/tests; no `.py` added.
- [ ] PR body carries `Closes #413` and `Closes #412`; plan artifacts staged only at Step 8.

## 8. Open Questions

Recorded design choices (recommended default first; interview may confirm or override — do not choose silently during implementation):

| # | Question | Recommended default |
|---|----------|---------------------|
| Q1 | `--progress` grammar: structured JSON vs compact shorthand | JSON object `{substep, completedUnits, remainingUnits}`, fail-closed parse; compact shorthand rejected |
| Q2 | `pause-turn` `nextAction` source | Explicit `--next-action` wins; derive from `state.checkpoints[N]` when absent; error when neither exists (AC9) |
| Q3 | Pause cleared by `finish` of a different step | Clear only when `turnPause.step` equals the finished step; leave other-step pauses intact |
| Q4 | `--until-terminal` without `--slug`/`--workflow-id` | Exit when the scoped report has no active workflow (`activeCount === 0`); with a selector, that is the selected workflow |
| Q5 | Pause finding code/severity | `worker-session-paused` (info) replacing the suppressed `worker-session-stall`; exposes `turnPause` on the workflow record |
| Q6 | Per-root budget shape / `capped` semantics | Dynamic reservation `max(1, floor(remaining/remainingRoots))` + correlation-first ordering; only global per-tick stops/truncation set `capped`; correlated root is always visited |
| Q7 | State shape when no checkpoint/pause exists | Omit `checkpoints`/`turnPause` entirely; schema properties optional |
| Q8 | `gates.md` one-line `autoMode`/turn-boundary nuance | Include it (consistency line; no behavior change) — out of the strict AC8 file list, flagged for interview |
| Q9 | `update_state.cjs` wrapper edit | No edit expected (forwards argv); if interview demands an explicit op list in the wrapper, keep the diff minimal and wrapper-local |
