---
slug: us-412-413-liveness-checkpoints
title: "Unattended autoMode runs: mid-step checkpoints, turn-boundary pause state, and monitor stall detection"
status: completed
step: 2
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
startedAt: "2026-09-24T04:31:48Z"
endedAt: "2026-09-24T05:06:06Z"
sourcePlan: .agents/plans/us-412-413-liveness-checkpoints/step-01-us-412-413-liveness-checkpoints.plan.md
sourcePlanSha256: 46c11fc890272de9a0aae8f76c1caa2cf1211f320abe001da1bd61dedf244e59
sourceInterview: .agents/plans/us-412-413-liveness-checkpoints/step-02-us-412-413-liveness-checkpoints.plan-interview.md
acRefs: []
---
# Refined implementation plan (Step 2) — `us-412-413-liveness-checkpoints`

Authoritative for Steps 3–7. Supersedes [`step-01-us-412-413-liveness-checkpoints.plan.md`](step-01-us-412-413-liveness-checkpoints.plan.md) where they differ; every delta is backed by the Step-2 interview registry (Q1–Q9, G1–G16). Self-contained: it maps all AC1–AC19, keeps the Section 6 invariants verification, the harness release obligations, the defect-class sibling sweeps, and the agent-agnostic constraint.

## 0. Summary & Business Rules

Make a standard `ws-spec-to-pr` run viable **unattended** with `defaults.autoMode` + `defaults.fullMode`: a run either progresses to a terminal state or parks with an explicit, resumable turn-boundary pause marker that observers can distinguish from a stall. Two defect classes are fixed in one release:

- **Orchestration (#413):** `autoMode` removes gate halts but does not chain host turns. A step too large for one host turn (observed ~9-node DAG Step 4) can end the turn mid-step with unchanged `revision`, `stepStatus[4]: active`, no `finish` telemetry, and no resumable marker. Contract: mid-step checkpoints (unit marker + in-progress sub-step) and an explicit turn-boundary pause marker, both persisted in the existing state file and telemetry stream.
- **Monitor (#412):** `ws-monitor` transcript discovery starves its per-tick budget on unrelated roots before reading the correlated session (`filesScanned: 0`, `capped: true`), and scan vs. resolve use different correlation windows (256 KB scan tail vs. 8 KB resolve tail), so `worker-session-stall` cannot fire for a scanned session. Contract: correlated session always read within the tick, one shared correlation window, honest `scan-capped`, stall suppression under an explicit pause, and a bounded `--watch --until-terminal` mode.

### Business Rules

| # | Rule |
|---|------|
| BR1 | `checkpoint`, `pause-turn`, `dispatch`, `finish`, `finish-batch`, `bypass` are the only sanctioned state writers; every progress write (`checkpoint`, `pause-turn`) bumps `revision` by exactly one and appends exactly one telemetry event. |
| BR2 | Checkpoints/pauses are **additive** sub-step records: they never change `completedSteps`, `currentStep`, or `stepStatus` semantics; whole-step gates stay authoritative. |
| BR3 | `finish` for step N clears `state.turnPause` when `Number(state.turnPause.step) === N` and deletes `state.stepCheckpoints[String(N)]` before the state is rendered/written (AC5); a pause/checkpoint belonging to another step is untouched. |
| BR4 | Observer posture is read-only; discovery stays opt-in; a paused workflow reports the pause instead of a stall (`worker-session-stall` suppressed while the workflow is active). |
| BR5 | Portable contract only: no host product names in skill bodies, scripts, or tests; correlation keys remain generic (`slug`, `workflowId`); adapter specifics stay confined to the existing adapter reference data. |
| BR6 | Schemas are the validation boundary: every new event type/field validates (`telemetry.schema.json` has `additionalProperties: false`); `validateSnapshot` fails closed on malformed checkpoint/pause records. |
| BR7 | Pause lifetime: cleared by the terminating `finish` for that step; no TTL, no side-channel file, no second state artifact (spec § Design Intent "Rejected alternative"). The marker is written **only** when a turn actually ends mid-step — never speculatively (a speculative marker would permanently suppress stall detection). |
| BR8 | **Naming (Step-2 G1):** the mid-step map is `state.stepCheckpoints` — `state.checkpoints` already denotes the git-tag mirror array in `PROTOCOLS.md` and legacy state files. No migration shim for legacy `checkpoints[]`; it is left untouched. |

### Security Mitigations

Local state/telemetry files only; no new network, auth, secret, or data-lifecycle surface. Monitor stays read-only against host stores (bounded tails, opt-in discovery); the shared correlation window is the **sanitized** window (secrets and host-private paths collapsed before it is stored or matched). Telemetry keeps existing redaction/sanitization paths; `--progress`/`--progress-file`/`--reason`/`--next-action` inputs are length-bounded like existing fields.

## 1. Definition of Ready & Scope

### Resolved Assumptions (Step-2 resolutions applied)

| Topic | Resolved default | Source |
|-------|------------------|--------|
| Checkpoint storage | `state.stepCheckpoints` object keyed by step number; record holds unit ids + remaining count + `substep` + `updatedAt` | G1 (rename; spec assumption superseded) |
| Pause marker | `state.turnPause = { step, reason, at, nextAction }` | Q2/Q3/Q5 |
| Pause lifetime | Cleared by `finish` for that step; no TTL; written only on a real turn end | BR7 (Q5/G9) |
| Shared correlation window | Sanitize once, then scan filter, stored `tail`, and resolve all consume the same bounded window (`maxBytesPerFile`, 256 KB) | G8 (AC12) |
| Budget strategy | Root ranking (correlated-path → explicit → config → workspace → host) + per-root reservation `max(1, floor(remaining/remainingRoots))`; per-root slice truncation sets `capped` | Q6, G6, G7 |
| `--until-terminal` | Requires `--watch`; mutually exclusive with `--iterations`; exits when the selected workflow (or, without a selector, every scoped workflow) leaves `active\|blocked\|in_progress` | Q4, G5, G13 |
| `--progress` input | Inline JSON primary + `--progress-file <path>` equivalent (mutually exclusive), both fail-closed | Q1, G2 |
| Input validation/auth/rate-limit/lifecycle | N/A (local fields + read-only CLI flag) | spec |

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
| Bounded scope | Every touched file named in §3; no consumer hub data edits | This plan maps each AC to a file |
| Atomic criteria | Spec `validate_spec.cjs --mode=authoring` exits 0 (done at Step 0) | Step 0 evidence |
| Failure modes | NS1–NS6 enumerate red-before/green-after tests | §5 negative rows; Step 7 executes them |
| Observation telemetry | `checkpoint` / `turn_paused` events and monitor fields named | §2.2 + T1/T2/T4 |
| No open blockers | Both issues reproduced with code citations; no open PR owns them; Step-2 interview `blocking_open: 0` | Prior Work Sweep; interview registry |

## 2. Technical Design & Architecture

Layers touched (config.json `stack.backend.layers`): **skills-sot** (`.agents/skills/**`), **tests** (`test/**`), plus human docs (`README.md`, `FEATURES.md`) and generated site (`docs/index.html`). Installer-cli (`bin/`, excluding `skill-dependencies.json` `packageVersion`) has no code change. No database, no frontend, no i18n.

### 2.1 State machine extension (`ws-shared/runtime/scripts/workflow_state.cjs`)

Current model: `runUpdateCli` accepts `dispatch | finish | finish-batch | bypass` (allowlist at `workflow_state.cjs:2049`; `performUpdate` guard at `:1441`); `performUpdate` is the single state writer (revision bump `:1460`, dual-write `:1808`, plans index `:1791`, self-validation `:1819`).

Add a **progress writer** path (new functions, e.g. `performCheckpoint`, `performPauseTurn`, shared `writeProgressState` helper) that:

1. Parses via the existing `parseArgs` (`:771`); validates `--step` in `0..maxStep` (reuse the `:1450` range error shape) and op-specific flags **before any mutation** (NS5: non-zero exit, state bytes unchanged).
2. Loads persisted state (`loadPersistedState` `:141`), bumps `state.revision` by one.
3. Mutates only additive fields:
   - `checkpoint`: `state.stepCheckpoints[String(step)] = { step, substep, completedUnits: string[], remainingUnits: int >= 0, updatedAt: ISO }` (repeated calls replace the record).
   - `pause-turn`: `state.turnPause = { step, reason, at: ISO, nextAction }`.
4. Appends exactly one telemetry event via `commonEvent` (`:893`; required base fields) plus:
   - `checkpoint`: `{ type: 'checkpoint', substep, progress: { completedUnits, remainingUnits } }` (AC2 fields: step, substep, progress, timestamp).
   - `turn_paused`: `{ type: 'turn_paused', reason, nextAction }` (AC4).
5. Writes through the existing single path: `canonicalStateJson` → `syncStateDualWrite` (`:581`) → `refreshPlansIndexForState` (`:1139`; honors the MEMORY trap "every programmatic state writer must refresh the plans index row") → `validateSnapshot` (`:1921`, AC7). Mirrors the `:1808-1819` sequence.
6. Never touches `stepStatus`, `completedSteps`, `currentStep`, handoffs, artifacts, batons, or G2 semantics. `dispatch` never writes or clears `turnPause`/`stepCheckpoints` (G9).

CLI surface (via `update_state.cjs`, which forwards argv to `runUpdateCli`; wrapper stays unedited — Q9):

```text
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs checkpoint <state> --step N --progress '<json>'
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs checkpoint <state> --step N --progress-file <path>
node {skillsRoot}/ws-spec-to-pr/scripts/update_state.cjs pause-turn <state> --step N --reason "<text>" [--next-action "<text>"]
```

- `--progress` accepts a JSON object `{ "substep": string, "completedUnits": string[], "remainingUnits": int }`; malformed JSON / wrong types / negative counts → usage error, state unchanged. `--progress-file` reads the same JSON from a UTF-8 file (resolved against `context.repoRoot`), mutually exclusive with `--progress`; it exists so documented recipes stay shell-portable (`CROSS-PLATFORM.md` § PowerShell rules forbids inline JSON on the command line — G2).
- `pause-turn` `nextAction`: explicit `--next-action` wins; otherwise derived from `state.stepCheckpoints[N]` as `Resume step N (<substep>; <remainingUnits> remaining)`; when neither exists → error instructing `--next-action` (AC9 fail-closed; Q2). Docs show `--next-action "Finish step N"` for the no-checkpoint case.
- `runUpdateCli` allowlist (`:2049`) + usage help (`:2043-2046`) updated to include both operations.
- `finish` path (`:1562+`): after the pre-mutation fingerprint capture (`:1454`) and before rendering, delete `state.stepCheckpoints[String(step)]` (and the emptied map) and `state.turnPause` when `Number(state.turnPause.step) === step` (AC5; Q3). Do not clear a pause marker belonging to another step. `finish-batch` inherits the behavior per finished step.
- Idempotent finish stays intact: `finishFingerprint` is computed before mutation (G4), so clearing markers cannot perturb a repeated `finish`.

`update_state.cjs` / `validate_state.cjs` wrappers (`ws-spec-to-pr/scripts/`): thin argv forwarders — **no edit expected**; AC1/AC7 are exercised through the wrapper CLI so the entry point is the wrapper.

### 2.2 Schemas (`ws-shared/runtime/`)

- `telemetry.schema.json`: extend the `type` enum (`:9`) with `checkpoint`, `turn_paused`; add `progress` (object, `additionalProperties: false`, required `completedUnits` array of strings + `remainingUnits` integer ≥ 0, optional `substep` string) and `nextAction` (string, minLength 1). Existing `substep`, `reason`, `step`, `timestamp` are reused. Keep the root `additionalProperties: false` (`:73`) satisfied for both new events.
- `workflow-state.schema.json`: add explicit `stepCheckpoints` (object) and `turnPause` (`additionalProperties: false`, required `step`, `reason`, `at`, `nextAction`; `at` date-time) properties. Records are optional; empty maps are omitted (Q7). The root already has `additionalProperties: true` (`:173`), so legacy fields are unaffected.
- **Validator limitation (G10):** `validate_json_schema.cjs` `validateNode` supports `properties`/`required`/`additionalProperties:false`/`items`/`enum`/`oneOf` but **not `patternProperties`/`$ref`**; a step-keyed map cannot be validated by the schema file alone. Record-shape enforcement therefore lives in `validateSnapshot` (`workflow_state.cjs:1921`): fail-closed structural checks for `stepCheckpoints` (only valid step keys `0..maxStep`, record shape/types, ISO `updatedAt`, `remainingUnits` int ≥ 0, `completedUnits` string array) and `turnPause` (shape/types/ISO `at`, step in range, non-empty `reason`/`nextAction`) so `validate_state.cjs` exits non-zero on malformed records (AC7 + NS6).

### 2.3 Monitor discovery & stall (`ws-monitor/scripts/monitor_snapshot.cjs`)

Current defects (code citations): file collection fills a single global list across all roots before any read (`scanTranscriptRoots` `:1132-1159`), so earlier roots exhaust the 200-file cap; scan filters on the full read window but stores `tail: text.slice(-8000)` (`:1189`) while `resolveTranscriptSource` re-matches only `item.file + '\n' + item.tail` (`:1308-1311`). Step-1 dogfood confirmed both live (`observer/window-1-report.md` F1/F2/F5).

1. **Budget (AC10, AC11; Q6/G6/G7):**
   - **Root ranking:** order candidate roots (1) correlated-path roots (`correlationMatches(root, key)`), (2) explicit `--transcript-root` roots, (3) config `monitor.transcriptRoots`, (4) workspace candidates, (5) host adapter roots; stable otherwise. `resolveCandidateTranscriptRoots` (`:1031-1100`) already emits explicit roots before workspace/host — keep that and add the correlation-first head.
   - **Per-root reservation in the collect phase:** while iterating ranked roots, cap each root's contribution at `max(1, floor(remainingBudget / remainingRoots))` so no root can starve the rest; correlated/explicit roots visited first also get the largest slice.
   - **Within a root:** order entries correlation-first (path segments containing the workflow key), then directory walk order, so the correlated `session.jsonl` is collected inside its root's slice.
   - **`capped` semantics (G6):** `capped = true` when (a) the global `maxFilesPerTick` cap is reached during collection, (b) the read loop hits `maxMsPerTick`/`maxTotalBytes`, **or (c) any root's candidate slice was truncated** (candidates left uncollected). This keeps `scan-capped` honest (AC13) and preserves the existing `test/test-ws-monitor-us356.js` capped block (~lines 478–500: 210-file root ⇒ `capped === true`, zero-candidate workflow ⇒ `scan-capped`, scanned session ⇒ `available`).
2. **Shared window (AC12, AC13; G8):** sanitize first, then run the correlation filter on the **sanitized** text, then store that same sanitized window (`scannedFiles.push({ file, mtimeMs, tail: text })`, ≤ `maxBytesPerFile`). `resolveTranscriptSource` keeps its current text-matching code and now matches on exactly the window the scan used — filter, store, and resolve consume one window by construction. Keep dropping `tail` from report output before serialization (existing `for (const scanned of transcript.files) delete scanned.tail;` `:1524`) so payloads stay bounded (≤ `maxTotalBytes` = 4 MB read budget bounds the retained windows). `scan-capped` stays: returned only when no candidate matched and the scan stopped early; a scanned match always resolves `available`.
3. **Stall + pause (AC14, AC15; Q5/G9):** in the per-workflow transcript loop (`:1495-1522`), surface `turnPause: state.turnPause || null` on the workflow record; when a pause marker exists, skip the `worker-session-stall` warning and add an `info` finding `worker-session-paused` ("workflow paused at a turn boundary; awaiting continuation", evidence = state path). Else keep the existing stall rule (`available` + `active` (`active|blocked|in_progress`) + idle > `stallWindowMs` 600000 ms).
4. **`--until-terminal` (AC16; Q4/G5/G13):** add `untilTerminal` to `parseArgs` boolean tokens (`:290-320`); in `main()` (`:1660`): `--until-terminal` requires `--watch`, is mutually exclusive with `--iterations` (NS4: error **before any `snapshot()` call**), and the loop exits when the scoped report has no workflow in `active|blocked|in_progress` (`activeCount === 0`, or the selected workflow with `--slug`/`--workflow-id`). Plain `--watch` keeps its `--iterations` requirement. Help text and markdown report updated.

### 2.4 Orchestrator docs & pause-aware resume (AC8, AC9; G3/G9/G14)

- `ws-spec-to-pr/SKILL.md`: state that `autoMode` removes gate halts but **does not chain host turns**; add the mid-step contract: before ending a turn with a step incomplete, run `checkpoint` (unit marker + remaining count) and `pause-turn` (reason + `nextAction`) via `update_state.cjs`; write the pause marker **only** on a real turn-boundary pause, never speculatively; resume continues the named unit. Extend the Pause/Resume row (`SKILL.md:57`) to consume `state.turnPause`/`state.stepCheckpoints`, and qualify `state.turnPause.nextAction` vs the whole-run `state.nextAction` (G3).
- `ws-spec-to-pr/PROTOCOLS.md`: extend § Automatic Mode and add a "Turn-boundary pause & mid-step checkpoints" subsection distinct from the existing git-tag § Checkpoints: operations, field shapes (`stepCheckpoints`, `turnPause`), `--progress`/`--progress-file` recipes (file form for shell hosts), `finish` clearing, resume rule, pause-vs-stall semantics. Update the state-shape example (`PROTOCOLS.md:281`) to include `stepCheckpoints`/`turnPause` without conflating them with the `checkpoints[]` git-tag mirror.
- `ws-shared/runtime/setup.md` § Resume: when `state.turnPause` is present, resume at `turnPause.nextAction` / `state.stepCheckpoints[turnPause.step]` instead of treating the unchanged `revision` as a stall; the terminating `finish` clears the markers.
- `ws-shared/runtime/gates.md`: one-line nuance at the `autoMode` exception (`gates.md:52`) so "proceeds continuously across step boundaries" is scoped to a host turn that can run them, otherwise checkpoint + pause (consistency only; no behavior change). Q8.
- Portable prose: describe behavior generically; no host product names.

### 2.5 Tests (AC18) and docs (AC17, AC19)

New suites `test/test-liveness-checkpoints.js` (state ops/schemas) and `test/test-ws-monitor-liveness.js` (discovery/stall/watch), registered in `test/test-suites.json` (`local` + `remote` for the state suite; `harnessEfficiency` for the monitor suite, matching the existing monitor suites' placement). README/FEATURES updates describe operations, pause semantics, and `--until-terminal`.

**Existing test files:** no edits expected. `test/test-ws-monitor-us356.js` is the binding compatibility anchor (stall `:286`, `scan-capped` `:401`, capped/`load-probe` `:478-500`) — the G6 `capped` rule exists so it stays green; if it fails, fix the implementation, not the test. `test/test-update-state-yaml.js`, `test/test-workflow-state-contract.js`, `test/test-observer-us365.js` (`:168` `scan-capped` unit), `test/test-state-observability.js`, `test/test-telemetry-observability.js` stay green unchanged. Modified files: `test/test-suites.json` (registration only). New files: the two suites above.

### Invariant Checks (config.json.invariants)

`commitPlanFilesOnlyAtStep8: true` (plan artifacts staged only at Step 8), `skipQualityGates: false` (pre-advance gates run). EF/tenancy keys false → N/A.

## 3. Step-by-Step Plan

Ordered by dependency; each item names files, work, and engineering checks.

### Step 3.1 — State model: checkpoint + pause operations (AC1, AC2, AC3, AC4, AC9)

- **Files:** `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (primary); `.agents/skills/ws-spec-to-pr/scripts/update_state.cjs` (verify only, no edit).
- **Work:** add `performCheckpoint` / `performPauseTurn` (shared `writeProgressState`), extend `runUpdateCli` allowlist + usage help, implement `--progress` JSON parsing/validation and `--progress-file` (mutually exclusive, fail-closed), `nextAction` resolution (§2.1), telemetry events via `commonEvent`, revision bump, `syncStateDualWrite`, `refreshPlansIndexForState`, `validateSnapshot`; persist `state.stepCheckpoints`/`state.turnPause` (BR8 naming).
- **Checks:** `node --check .agents/skills/ws-shared/runtime/scripts/workflow_state.cjs`; CLI smoke through the wrapper (argv arrays, no shell); tests T1, T2, T6, T8.

### Step 3.2 — `finish` clears checkpoint/pause (AC5)

- **Files:** `workflow_state.cjs`.
- **Work:** in the `finish` branch, delete `stepCheckpoints[String(step)]` (and the emptied map) and a `turnPause` naming that step **before** `canonicalStateJson`/render; keep idempotent-finish fingerprint behavior unchanged (fingerprint captured at `:1454`, pre-mutation).
- **Checks:** tests T3, T9; regression `test/test-update-state-yaml.js`, `test/test-workflow-state-contract.js`.

### Step 3.3 — Schemas + snapshot validation (AC6, AC7, NS6)

- **Files:** `.agents/skills/ws-shared/runtime/telemetry.schema.json`, `.agents/skills/ws-shared/runtime/workflow-state.schema.json`, `workflow_state.cjs` (`validateSnapshot`).
- **Work:** enum + field additions; shallow state properties; fail-closed record checks in code (G10); md frontmatter round-trip verified (G11).
- **Checks:** tests T4, T5, T7; existing schema consumers (`test/test-dispatch-provenance.js`, `test/test-worker-turn-guard.js`, `test/test-observer-us365.js`, `test/test-step-baton-telemetry.js`, `test/test-models-preset-and-per-step.js`, `test/test-git-ownership-contract.js`) stay green.

### Step 3.4 — Monitor discovery budget (AC10, AC11, NS1)

- **Files:** `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
- **Work:** correlated-path/explicit root ranking, per-root reservation (`max(1, floor(remainingBudget / remainingRoots))`), correlation-first entry ordering within a root, `capped` includes per-root slice truncation (G6); no change to the read-only posture or root discovery sources.
- **Checks:** test M1 (61 unrelated roots / >200 unrelated files precede the target), M9 (truncated root ⇒ `capped` true while the correlated session resolves `available`); existing `test/test-ws-monitor-us356.js` green.

### Step 3.5 — Shared correlation window + honest `scan-capped` (AC12, AC13, NS2)

- **Files:** `monitor_snapshot.cjs` (`scanTranscriptRoots` sanitize→filter→store order; `resolveTranscriptSource` unchanged matching code; report cleanup).
- **Work:** one sanitized window for filter, stored `tail`, and resolve (G8); verify reason vocabulary unchanged (`discovery-disabled`, `no-matching-session`, `scan-capped`).
- **Checks:** tests M2, M3; defect-class sibling sweep: `rg "slice\(-8000\)|8000" .agents/skills/ws-monitor/scripts/` must show no remaining 8 KB correlation slice; grep `resolveTranscriptSource` fixtures in `test/` for stale 8 KB assumption.

### Step 3.6 — Stall suppression + `--until-terminal` (AC14, AC15, AC16, NS3, NS4)

- **Files:** `monitor_snapshot.cjs` (snapshot stall loop, `parseArgs`, `main`, help).
- **Work:** `turnPause` on the workflow record; `worker-session-paused` info finding replaces the stall warning; `untilTerminal` parsing/validation (before any snapshot) and loop exit on non-active (`active|blocked|in_progress`).
- **Checks:** tests M4, M5, M6, M7; existing `test-ws-monitor-us356.js` stall assertions still pass (idle session without pause still stalls).

### Step 3.7 — Orchestrator + monitor docs (AC8, AC9, AC17)

- **Files:** `.agents/skills/ws-spec-to-pr/SKILL.md`, `.agents/skills/ws-spec-to-pr/PROTOCOLS.md`, `.agents/skills/ws-shared/runtime/setup.md`, `.agents/skills/ws-shared/runtime/gates.md` (consistency line), `.agents/skills/ws-monitor/SKILL.md`, `.agents/skills/ws-shared/runtime/observer-instructions.md`.
- **Work:** §2.4 content; monitor SKILL signal map + invocation; observer taxonomy adds the pause finding and names the shared correlation window; PROTOCOLS git-tag § Checkpoints vs mid-step contract disambiguated (G14).
- **Checks:** test M8 (doc assertions); `test/test-observer-us365.js` (shared-source references) green; `test/test-shell-quoting-audit.js` green for any added command recipe (file-based `--progress-file` recipes are quoting-clean).

### Step 3.8 — Regression suites + registration (AC18)

- **Files:** `test/test-liveness-checkpoints.js` (new), `test/test-ws-monitor-liveness.js` (new), `test/test-suites.json`.
- **Work:** implement T1–T9 and M1–M9; register (`local`+`remote` state suite; `harnessEfficiency` monitor suite); monitor fixtures scoped by `--workflow-id`/`--slug` with `monitor.hostHome` isolation (G12).
- **Checks:** `npm run test` exits 0.

### Step 3.9 — Human docs + harness release obligations (AC19 + repo obligations)

- **Files:** `README.md`, `FEATURES.md`, `package.json`, `bin/skill-dependencies.json`, generated `docs/index.html`; evaluate root `AGENTS.md` / `.ws/AGENTS.md` for enumerated operation lists (update only if drift appears; root AGENTS.md snapshot does not enumerate `update_state` ops → no edit expected).
- **Work:**
  1. README + FEATURES describe `checkpoint`/`pause-turn`, pause semantics, and `--until-terminal` (FEATURES: pipeline table rows + utility/monitor row + version line).
  2. **Version bump once per release PR:** `npm run build-site:bump` (package.json + site footer), then set `bin/skill-dependencies.json` `packageVersion` to the same version; must be strictly above the merge-base version (currently 0.4.65).
  3. Site rebuild (`node bin/build-site.js` when not already run by the bump).
  4. `npm run generate-integrity` + `npm run verify-integrity` **after the last product edit** (clean tree; no untracked files under `.agents/skills/`) — MEMORY trap "regenerate integrity from a clean tree only"; re-run after any review-fix edit.
  5. **GUI editor sync: N/A** — no `config.json` key/values change (`config.schema.json` / `config.json.example` untouched).
- **Checks:** `test/test-doc-sync.js`, `test/test-skill-frontmatter.js`, `node test/test-harness-clean.js` (0 findings), `ws-check-harness` Phases 0–5c.

### Defect-class sibling sweep (mandatory for regression ACs)

- Window class: `rg "slice\(-8000\)|8000" .agents/skills/ws-monitor/scripts/` → zero remaining correlation-window mismatches.
- Discovery-budget class: inspect `resolveCandidateTranscriptRoots` (`:1031-1100`) and `expandMuseSessionDirs` (`:97-122`, `walkCap`/`limit`) for the same starvation shape; confirm per-root reservation is the only path that bounds per-tick **file reads** (adapter caps bound root enumeration only) and that explicit roots rank before host roots.
- State-writer class: grep `syncStateDualWrite(` call sites; confirm every writer (including the new progress writer) calls `refreshPlansIndexForState` (MEMORY trap).
- Naming class (G1): grep for new writes to `checkpoints`; confirm only `stepCheckpoints` is written and legacy `checkpoints[]` is never touched.

### Sabotage verification (Step 7, mutation unset)

Mutation config is empty (`verification.mutationTest: ""`, `defaults.skipMutationTesting: true`), so Step 7 runs `node {skillsRoot}/ws-testing/scripts/run_sabotage.cjs` against the new regression assertions (M1/M2/M5 and T2/T3 are the primary inversion targets) with the non-empty alias `npm run test`: invert the fixed code, expect a non-zero suite, and byte-identical restoration on the declared paths.

## 4. Permissions, Tenancy & i18n

N/A for this package: no RBAC, no tenant data, no user-facing strings/i18n. File-write surface stays limited to local workflow artifacts; the monitor remains read-only.

## 5. Test Coverage

New suites (names used verbatim by the implement step):

| Test ID | Suite | Case (method) | AC / NS | Assertion |
|---------|-------|---------------|---------|-----------|
| T1 | `test/test-liveness-checkpoints.js` | `checkpoint persists sub-progress, telemetry, and revision` | AC1, AC2 | Wrapper CLI exits 0; `stepCheckpoints["4"]` has `substep`, `completedUnits`, `remainingUnits`, `updatedAt`; `revision` +1; `telemetry.jsonl` last line `type: checkpoint` with `step`, `substep`, `progress`, valid `timestamp`; plans index row `stateSha256` refreshed |
| T2 | same | `pause-turn persists marker, nextAction, telemetry, and revision` | AC3, AC4, AC9 | `turnPause` = `{step, reason, at ISO, nextAction}`; `type: turn_paused` event; revision +1; explicit `--next-action` recorded; derived `nextAction` from checkpoint when omitted |
| T3 | same | `finish clears pause marker and step checkpoint` | AC5 | After `finish --step 4`: no `turnPause`, no `stepCheckpoints["4"]`; unrelated step records preserved; emptied map omitted |
| T4 | same | `telemetry schema accepts checkpoint and turn_paused` | AC6 | Schema enum contains both; emitted events satisfy required fields + new `progress`/`nextAction` shapes |
| T5 | same | `state schema + validate_state accept checkpoint/pause fields` | AC7 | `workflow-state.schema.json` declares `stepCheckpoints`/`turnPause`; `validate_state.cjs <state> --pre-advance 5` exits 0; `.state.md` frontmatter parses and core keys agree (G11) |
| T6 | same | `out-of-range or malformed input leaves state unchanged` | NS5 | `checkpoint`/`pause-turn` with `--step 99` (and malformed `--progress`) — non-zero exit, byte-identical state before/after |
| T7 | same | `validate_state rejects malformed checkpoint record` | NS6 | Wrong-typed `stepCheckpoints` record → `validate_state.cjs` non-zero (code-level check; schema is shallow) |
| T8 | same | `--progress-file parity and fail-closed` | AC1, G2 | Same record as inline `--progress`; missing/invalid file and `--progress` + `--progress-file` together → non-zero, state unchanged |
| T9 | same | `dispatch leaves markers untouched; repeat finish is idempotent` | G4, G9 | `dispatch` after `pause-turn` keeps `turnPause`/`stepCheckpoints`; a second identical `finish` exits 0 without resurrecting markers |
| M1 | `test/test-ws-monitor-liveness.js` | `unrelated-root flood still reads the correlated session` | AC10, AC11, NS1 | Fixture: 61 unrelated roots (>200 files) precede the target session root; `filesScanned >= 1`, correlated workflow `transcriptSource.status: available`, honest `capped` |
| M2 | same | `workflow id between 8KB and 256KB resolves available` | AC12, NS2 | Key placed outside the last 8 KB but inside the scan window; unit (`resolveTranscriptSource`) and e2e both `available` |
| M3 | same | `scan-capped only when the matching file was not read` | AC13 | No match + capped → `scan-capped`; match read → `available`; vocabulary unchanged |
| M4 | same | `worker-session-stall fires for idle available session on active workflow` | AC14 | Idle session beyond 600000 ms on active workflow → warning finding present |
| M5 | same | `pause marker suppresses stall and reports pause` | AC15, NS3 | `state.turnPause` present → no `worker-session-stall`; `worker-session-paused` info finding present; after `finish` clears it, stall detection resumes |
| M6 | same | `--until-terminal usage errors` | AC16, NS4 | `--watch --until-terminal --iterations 2` → non-zero, message, no snapshot output; `--until-terminal` without `--watch` → non-zero |
| M7 | same | `--watch --until-terminal exits on terminal workflow` | AC16 | Terminal fixture + `--interval 1` exits 0 promptly; a `blocked` fixture does **not** exit (G5) |
| M8 | same | `docs cover pause vs stall and shared correlation window` | AC17 | `ws-monitor/SKILL.md` + `observer-instructions.md` contain the pause/stall distinction and the single-window statement |
| M9 | same | `per-root slice truncation reports capped honestly` | AC10, AC11, G6 | A root with more candidates than its slice sets `capped` while the correlated session still resolves `available` (us356-compatible semantics) |
| D1 | `test/test-liveness-checkpoints.js` | `orchestrator docs state autoMode does not chain host turns` | AC8 | `SKILL.md` + `PROTOCOLS.md` contain the pause/resume contract wording |
| D2 | same | `README + FEATURES describe operations, pause semantics, --until-terminal` | AC19 | Both files mention `checkpoint`, `pause-turn`/pause, `--until-terminal` |

Existing suites that must stay green: `test-update-state-yaml.js`, `test-workflow-state-contract.js`, `test-ws-monitor*.js` (us356/us385/us388/us395), `test-observer-us365.js`, `test-state-observability.js`, `test-telemetry-observability.js`, `test-doc-sync.js`, `test-harness-clean.js`.

## 6. Stack & Security Invariants Verification Plan

Stack rule pack: `{skillsRoot}/ws-shared/runtime/stacks/` has no pack for `node-skills-package` (no framework app); the harness-specific invariant pack below is the governing boundary set. Touched framework boundaries:

| Boundary | Touched? | Verification |
|----------|----------|--------------|
| **State-writer integrity (authorization-equivalent gate)** | Yes — new writers | Every new mutation path: revision +1 exactly once, `canonicalStateJson` → `syncStateDualWrite` (md+json agree) → `refreshPlansIndexForState` (row sha/updatedAt refreshed) → `validateSnapshot` exit 0. Verified by T1/T2/T5/T9 + `npm run test` |
| **Schema / input validation (DTO boundary)** | Yes — telemetry + state schemas, CLI parsing | `additionalProperties: false` telemetry schema accepts declared fields only (T4); shallow state schema + code-level record checks; malformed `--progress`/`--progress-file`/`--step`/checkpoint records fail closed with state unchanged (T6/T7/T8/NS5/NS6) |
| **Concurrency / async safety** | No — synchronous Node scripts, single-writer CLI | No new async primitives; atomic writes preserved (`atomicWrite` temp+rename). Watch loop bounds are explicit (`--iterations` xor `--until-terminal`), cancel-safe |
| **Observer read-only / lifecycle cleanup** | Yes — monitor | No writes outside the observer's own report path; discovery stays opt-in; the stored correlation window is sanitized and dropped from output before serialization; test fixtures sandbox host stores via `monitor.hostHome` (M1–M9 must not touch real host stores) |
| **Privacy of retained windows (G8)** | Yes — monitor | Filter, stored `tail`, and resolve consume the sanitized window only; `sanitizeTranscriptText` secret/home-path collapse runs before any retention; `delete scanned.tail` remains |
| **Portability / agent-agnostic contract** | Yes — docs + scripts + tests | No host product names in new skill prose/scripts/tests; correlation keys generic; adapter specifics remain in existing adapter reference data; recipes shell-portable (`--progress-file`); `ws-check-harness` + `test-runtime-portability.js` green |
| **Consumer-data isolation** | Yes — no consumer hub edits | Product diff excludes `.ws/config.json`, `STACK.md`, memory, changelog; `commitPlanFilesOnlyAtStep8` respected |

Security checks: no secrets added; telemetry payloads remain redacted (existing `redactSecrets`/sanitizers); no network calls added; `--until-terminal` cannot loop unbounded without an explicit flag and exits on terminal state.

## 7. Pre-PR Checklist

- [ ] Layer boundaries respected: skills-sot + tests + docs only; no installer-cli code change.
- [ ] No consumer hub data in the product diff (`.ws/` config/memory/changelog untouched).
- [ ] No `config.json` schema/key changes → **GUI editor sync N/A** (`node test/test-powershell-config-editor.js` still green).
- [ ] **Version bumped once** for this release PR: `npm run build-site:bump` (package.json + site footer) and `bin/skill-dependencies.json` `packageVersion` matched; strictly above merge-base (0.4.65).
- [ ] **Integrity regenerated after the last product edit**: `npm run generate-integrity` + `npm run verify-integrity` on a clean tree; re-run after any review-fix edit (MEMORY: post-Step-5 edits invalidate integrity + ledger boundary).
- [ ] Site rebuilt (`docs/index.html`) with the updated skill docs.
- [ ] README + FEATURES synced; root `AGENTS.md` / `.ws/AGENTS.md` checked for enumerated op lists.
- [ ] Tests: `npm run test` exits 0 with both new suites registered in `test/test-suites.json` (`local`+`remote` / `harnessEfficiency`).
- [ ] `node test/test-harness-clean.js` 0 findings; `ws-check-harness` Phases 0–5c clean.
- [ ] Sabotage verification recorded at Step 7 for M1/M2/M5 (and T2/T3) regression assertions.
- [ ] Agent-agnostic sweep: no host product names in changed skill bodies/scripts/tests; no `.py` added.
- [ ] PR body carries `Closes #413` and `Closes #412`; plan artifacts staged only at Step 8.

## 8. Resolved Design Choices (from Step 2)

Full registry with evidence: [`step-02-us-412-413-liveness-checkpoints.plan-interview.md`](step-02-us-412-413-liveness-checkpoints.plan-interview.md) § Interview registry + § Gap registry. Summary of decisions binding Steps 3–7:

| # | Decision |
|---|----------|
| Q1 | `--progress` JSON grammar, fail-closed; plus `--progress-file` equivalent for shell portability (G2) |
| Q2 | `nextAction`: explicit wins → derive from `stepCheckpoints[N]` → error (AC9) |
| Q3 | `finish` clears only the pause/checkpoint naming the finished step |
| Q4 | `--until-terminal` exits when the scoped set has no `active\|blocked\|in_progress` workflow |
| Q5 | `worker-session-paused` (info) replaces the suppressed stall; `turnPause` exposed on the record |
| Q6 | Reservation budget + correlation-first ordering; `capped` includes per-root slice truncation (G6) |
| Q7 | Omit empty `stepCheckpoints`/`turnPause`; optional schema properties |
| Q8 | `gates.md` autoMode/turn-boundary consistency line included |
| Q9 | `update_state.cjs` wrapper unedited; allowlist/help updated in `workflow_state.cjs` |
| G1 | New map named `state.stepCheckpoints` (no collision with legacy `checkpoints[]`) |
| G2 | `--progress-file` added; docs use it; tests use argv arrays |
| G7 | Root ranking: correlated-path → explicit → config → workspace → host |
| G8 | One sanitized window shared by filter, stored tail, and resolve |
| G9 | Pause marker written only on a real turn end; `dispatch` never touches markers |
| G10 | Schema declarations shallow; record shapes enforced in `validateSnapshot` |
| G11 | md frontmatter round-trip asserted after checkpoint/pause |
| G12 | Monitor fixtures scoped by workflow id and `monitor.hostHome`-isolated |
| G15 | Release ordering: bump once, integrity after last edit, ledger re-link after edits |
| G16 | Sibling sweeps include `expandMuseSessionDirs` + root ordering |
