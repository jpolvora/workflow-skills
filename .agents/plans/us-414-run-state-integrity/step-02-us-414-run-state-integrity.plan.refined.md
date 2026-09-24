---
step: 2
slug: us-414-run-state-integrity
workflowId: us-414-run-state-integrity-20260924T170500Z
status: completed
startedAt: "2026-09-24T17:05:00Z"
endedAt: "2026-09-24T17:20:00Z"
acRefs: []
---
# Implementation plan — us-414-run-state-integrity

Run-state and telemetry integrity: fail-closed preset resolution, ship writeback,
Step 9 round artifacts, truthful skip semantics.

Spec of record: `.agents/specs/0127-us-414-run-state-integrity.spec.md`
Plan copy: `.agents/plans/us-414-run-state-integrity/step-00-us-414-run-state-integrity.spec.md`
Classification: standard pipeline, complexity complex, `runInterview: true`,
`execMode: sequential` (`defaults.enableDag: false`; Step 3 finishes skipped/dag-disabled).

Group order: Group 1 (`us-415-416-script-ux-golden-path`, PR #421, merged to
develop) ships first; this plan builds on current HEAD (`b73182af`) and reuses the
Group 1 boundary/diagnostic conventions (named boundary labels, phantom-path
fail-closed, golden-path copy-paste commands). It does not revert shipped code.

## 0. Intent vs accident (spec Notes requirement)

`git log -p -S` on each touched path before editing; record per finding below.

| Symbol | History | Verdict |
|--------|---------|---------|
| `unknown-models-preset` in `workflow_state.cjs` | introduced in `be5360d0` (preset override + persistence); warning-only by design, fallback documented in `setup.md` §2 as "graceful fallback" | accidental gap: warning preserves a degraded run; AC1 makes it fail-closed |
| `shipStatus` handling (`applyCloseAndShipStatus`) | close-step writer only; no `prNumber`/`prUrl` fields anywhere; STEP-DISPATCH tells orch to "update shipStatus" with no sanctioned command | accidental gap: instruction without a writer |
| `round-` artifacts (`ws-fix-pr`/`ws-goal-fix-pr` text) | `ws-fix-pr` writes round files per batch; `ws-goal-fix-pr` clean-immediate exit writes nothing | accidental gap: third exit branch has no record |
| `skipReason` (`STEP-DISPATCH`, `step_coordinator`, `write_sequential_dag`) | `SKIP_REASONS` set never contained bare `dag`; generic arg parser passes `--reason` through on dispatch/bypass unchecked | accidental gap: stale token reachable via unchecked paths |
| `generic:Task` (`resolveStepAgentType`) | names the dispatch tool when named subagents are off; host session counts are a different domain | boundary effect, not a code defect: document the mapping (AC6) |

## 1. AC → file map (DoR bounded scope)

| AC | Rule | Files |
|----|------|-------|
| AC1 fail-closed preset | unknown `modelsPreset` fails at run start naming unknown + available; never cross-preset fallback | `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (assert + dispatch gate + `getActivePreset` hardening); `.agents/skills/ws-shared/runtime/setup.md` §2 (graceful-fallback → fail-closed); `.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md` (model-switching note) |
| AC2 resolved model ids | steps never record a preset name in a `model` field | `workflow_state.cjs` (preset-name → id resolution on dispatch + finish); telemetry/state schemas unchanged (still `string`) |
| AC3 ship writeback | `shipStatus` + `prNumber` + `prUrl` written to state; Step 9 handoff recorded | `workflow_state.cjs` (persist `prNumber`/`prUrl`; document `--ship-status/--pr-number/--pr-url` in `finish --help`); `STEP-DISPATCH.md` Steps 8–9 (sanctioned writeback commands) |
| AC4 round artifacts or reason | convergence emits `{reviewsDir}/PR-<N>-round-*.md` or records clean-immediate reason | `.agents/skills/ws-goal-fix-pr/scripts/check_fixpr_rounds.cjs` (new; conformance checker); `.agents/skills/ws-goal-fix-pr/SKILL.md` (clean-immediate marker format + checker call) |
| AC5 truthful skip | bare `dag` never recorded; reasons describe actual fate | `workflow_state.cjs` (fail-closed on bare `dag` in finish/dispatch/bypass reason paths) |
| AC6 provenance | reconcile `generic:Task` vs host 0-subagent accounting, or document mapping | `STEP-DISPATCH.md` dispatch-provenance note (+ `WORKER-TURN-RULES.md` if it owns the parent contract line) — docs only, host-owned side |
| AC7 green suites + pins | `npm run test`, `ws-check-harness` green; pins for AC1/AC3/AC4 | `test/test-run-state-integrity.js` (new); `test/test-suites.json` (register); `bin/skill-integrity.json` (regen) |

Out of scope (spec): Group 1 golden-path help text (shipped), Group 3 monitor
model (`us-412-418-monitor-accuracy`), #413 checkpoints (shipped), auto-merge policy.

## 2. Detailed changes

### 2.1 `workflow_state.cjs` — preset gate (AC1)

- New exported `assertKnownPreset(defaults, requested)`:
  `requested` trimmed non-empty, `defaults.modelPresets` is an object, key absent
  → throw `unknown modelsPreset "<name>" (available: <sorted keys>); set
  defaults.modelsPreset to a listed preset or pass preset=<name>`.
  No-op when `modelPresets` is not an object (nothing to be absent from) or
  `requested` is empty.
- Call at the top of the `dispatch` branch of `performUpdate`, before any
  mutation, with `requested = options.preset || state.modelsPreset ||
  context.config.defaults.modelsPreset`. This is run start for step 0 and
  re-validates every later dispatch (preset switches fail the same way).
- Replace the silent persist-skip (`if (known) state.modelsPreset = requested`)
  with the same assert: unknown `--preset` throws instead of being dropped.
- `getActivePreset`: when an explicit candidate/selected preset is unknown, do
  not fall through to `presets.default` (cross-preset silent fallback). Return
  null so resolution continues to phase keys/session model. The dispatch gate
  throws first for runs; this removes the silent path for direct callers.
- Keep `presetWarning` emission + telemetry schema fields (defense in depth for
  pre-fix states; existing `test-models-preset-and-per-step.js` pins stay green).

### 2.2 `workflow_state.cjs` — model recording (AC2)

- New internal `resolvePresetNameToId(defaults, name, { step, role, pipeline, sessionModel })`:
  when `name` is a key of `defaults.modelPresets`, return `resolvePhaseModel`
  for that preset; else return `name` unchanged.
- Dispatch path: after `resolveRecordedModelDetails`, pass `options.model`
  through it before `state.currentModel` assignment (covers `--model <preset>`
  misuse; normal ids pass through untouched).
- Finish path: replace `state.currentModel = String(options.model || ...)`
  with the same resolution (role = `options.substep`). Telemetry `model` fields
  then carry ids only.

### 2.3 `workflow_state.cjs` — ship fields (AC3)

- Extend `applyCloseAndShipStatus` (or the finish path feeding it) to persist
  `state.prNumber` (trimmed non-empty string) and `state.prUrl` (trimmed
  non-empty string) when `options.prNumber` / `options.prUrl` are present.
  Reachable today via the generic `--pr-number` / `--pr-url` kebab→camel parse
  (verified: `--ship-status` already persists; `--pr-number/--pr-url` are
  swallowed — this change persists them).
- `finish --help`: document `--ship-status <pending|skipped|pushed|pr-open|merged|stopped>`,
  `--pr-number <n>`, `--pr-url <url>` with one example (Group 1 AC7 help rule).
- `workflow-state.schema.json`: add optional `prNumber`, `prUrl` string fields
  beside `shipStatus` (top-level `additionalProperties: true` already tolerates
  them; declaration matches sibling optionals `modelsPreset`/`configuredModel`).

### 2.4 `STEP-DISPATCH.md` — sanctioned writeback (AC3)

- Step 8 ship phase: after `ws-ship-pr` returns PR id/URL, orch runs
  `update_state finish --step 8 --ship-status pr-open|pushed|skipped --pr-number <N> --pr-url <URL>`
  (second finish on step 8 is a revision bump carrying ship fields; fingerprint
  replay stays byte-stable per G4).
- Step 9: after merge, orch runs
  `update_state finish --step 9 --ship-status merged --pr-number <N> --pr-url <URL>`
  (the single outer finish; carries handoff 9 + ship fields together).
- Terminal stop without merge: `--ship-status stopped` on the outer finish.
- Model-switching section: unknown preset fails dispatch (no silent fallback).

### 2.5 `check_fixpr_rounds.cjs` (new, AC4)

`node {skillsRoot}/ws-goal-fix-pr/scripts/check_fixpr_rounds.cjs --reviews-dir <dir> --pr <N>`
exit 0 when `PR-<N>-round-*.md` matches ≥1 file (round artifacts present) OR a
`PR-<N>-round-0-clean-immediate.md` marker exists with a non-empty reason;
else exit 1 naming the rule (`no round artifacts and no clean-immediate reason
for PR <N> in <dir>`).
`ws-goal-fix-pr/SKILL.md` step 2 clean-immediate exit: write the marker file
(frontmatter `pr`, `round: 0`, `exitBranch: clean-immediate`, `reason`,
`activeThreads: []`, checks evidence) — no heartbeat armed. Final report links
it like any round report.

### 2.6 Skip-reason guard (AC5)

- Finish path: explicit check before the `SKIP_REASONS` membership test —
  `options.reason === 'dag'` throws
  `invalid skipReason "dag" (ambiguous: use "dag-disabled" for the sequential
  Step 3 skip; a step whose step-03 exec artifacts exist ran — finish it
  completed)`.
- Dispatch + bypass paths: same rejection when `options.reason === 'dag'`
  (generic parser passes `--reason` through unchecked today; closes the
  telemetry-event hole).

### 2.7 Provenance note (AC6)

- `STEP-DISPATCH.md` § dispatch-provenance paragraph (line ~196): `agentType:
  generic:<Tool>` records the dispatch-agent tool binding, not a host session
  id; host subagent counts live in another domain, so `0 subagents` on the host
  alongside `generic:Task` telemetry is expected on inline/Tier-3 runs, not a
  mismatch. Single home (interview: WORKER-TURN-RULES.md owns mechanics, not
  agentType semantics — no duplicate there).

### 2.8 `setup.md` §2 (AC1 doc)

- Replace "graceful fallback ... log a warning ... and fall back" with
  fail-closed: unknown invocation/configured preset aborts bootstrap with the
  `unknown modelsPreset` error (names available presets); no cross-preset
  fallback, no warning-only path.

## 3. Tests (AC7 + NEG1–NEG3)

New `test/test-run-state-integrity.js` (Node, `.cjs` requires like siblings,
temp consumer root per `test-dispatch-provenance.js` pattern; no shell quoting
traps — argv arrays only):

- NEG1/AC1: dispatch `--step 0` with `defaults.modelsPreset: no-such-preset`
  fails non-zero naming the preset + available list; state file unmutated
  (revision unchanged). Also unknown `--preset` flag fails. Known preset
  dispatches fine (no regression).
- AC1b: `resolvePhaseModel` with unknown explicit preset never returns another
  preset's model (returns phase-key/session fallback).
- AC2: `dispatch --model <preset-name>` and `finish --model <preset-name>`
  record the resolved id, never the preset name.
- NEG2/AC3: `finish --step 8 --ship-status pr-open --pr-number 1 --pr-url <url>`
  persists all three; invalid `--ship-status bogus` fails; `--pr-number`
  empty fails.
- NEG3/AC4: `check_fixpr_rounds.cjs` exits 1 on empty dir; exit 0 with a round
  file; exit 0 with a reasoned marker; exit 1 with an empty-reason marker.
- AC5: `finish --step 3 --status skipped --reason dag` fails with the
  contradiction diagnostic (with and without exec artifacts present);
  `dag-disabled` still accepted (no regression).
- Register in `test/test-suites.json` (local run list placement beside related
  state tests).

Red-before-green: run new tests before the fix to confirm the NEG cases fail
(silent fallback / swallowed flags / exit 0 on empty dir), then implement.

## 4. Verification

1. `node test/test-run-state-integrity.js` (red first, green after).
2. `npm run test` (full suite) — cite exit code.
3. `ws-check-harness` Phases 0–5c — cite outcome.
4. `npm run generate-integrity` + `npm run verify-integrity` (new script file
   changes hashes).
5. `node test/test-harness-clean.js` 0 findings.
6. `validate_state --pre-advance 4` before Step 4 dispatch (fail-closed gate).
7. Verify score ≥ `defaults.minVerifyScore` (9) at Step 5 via `ac_ledger`
   `link` + `score` before review.

## 5. Risks

- Second `finish --step 8` for ship writeback bumps revision and re-renders —
  replay-safe per G4 fingerprint, but verify no `completedSteps` duplication
  (set semantics — safe).
- `getActivePreset` hardening changes `resolvePhaseModel` for unknown presets:
  existing tests use known presets only (checked); full suite confirms.
- New `ws-goal-fix-pr/scripts/` dir: Node-only `.cjs`, no Python; integrity
  regen covers it.
- `finish --help` text changes: worker-1's help-content tests assert specific
  lines — append new flags without touching existing lines.

## 6. Stack & Security Invariants Verification Plan

Stack: Node 22 skill package; no new runtime deps; no Python; no tokens or
machine paths in errors/telemetry (preset names are config keys, safe to echo;
PR URLs are provider-returned, stored verbatim, never executed).

| # | Check | When |
|---|-------|------|
| 1 | New/edited scripts are Node-only `.cjs`; no `.py` added | Step 4 finish (gate: `ws-check-harness` critical on `.py`) |
| 2 | Error strings carry no secrets/paths: preset error lists preset keys only; ship flags stored, not executed | Step 5 verify (secrets review per senior-developer gate) |
| 3 | `prUrl` is data, never shelled out (no `exec`/`spawn` on state fields) | Code review (Step 6 scope check) |
| 4 | Temp consumer roots in tests under OS temp; no repo writes outside `{us-dir}` + `test/` + skill files | Step 4 + Step 7 |
| 5 | Integrity regen + `verify-integrity` after skill edits | Step 8 close |
