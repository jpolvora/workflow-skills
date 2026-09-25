# Window 3 — execution observation report

- Workflow: `us-412-413-liveness-checkpoints-20260924T043148Z` (standard `ws-spec-to-pr`, autoMode, step 4 Implementation)
- Window: 2026-09-24T05:29:18Z -> 06:05Z (~35.8 min wall clock); 10 polls (~3-4.5 min cadence)
- Observer posture: read-only; writes only under `observer/` (this report, `window-3.log`, 10 `monitor-w3-*.json` snapshots). `observer.cjs watch` wrote its own `observer.log`/`observer-report.md` pair per invocation (by design, overwritten each run).
- **Outcome: STEP 4 DID NOT FINISH INSIDE THE WINDOW.** Product edits landed in a burst (05:35Z-05:52Z), then no product-file changes across the last 4 consecutive polls while state revision and telemetry stayed frozen and step 4 stayed `active` (35.4 min at close). No `finish` telemetry for step 4.
- Stop reason: suspected-stall criteria met (state revision + telemetry unchanged AND no new product-file changes across polls 7-10 while step 4 shows active), with the ~40 min bound ~4 min away.

## 1. State trajectory

| Poll | At (UTC) | revision | currentStep | stepStatus | status | telemetry lines | product writes since prior poll |
|------|----------|----------|-------------|------------|--------|-----------------|---------------------------------|
| 1 | 05:30:16 | 9 | 4 | 0:c,1:c,2:c,3:skip,4:active | active | 9 | none (baseline) |
| 2 | 05:35:11 | 9 | 4 | same | active | 9 | workflow_state.cjs |
| 3 | 05:39:22 | 9 | 4 | same | active | 9 | monitor_snapshot.cjs, telemetry.schema.json, workflow-state.schema.json, workflow_state.cjs; new test/test-liveness-checkpoints.js |
| 4 | 05:43:43 | 9 | 4 | same | active | 9 | docs wave (README, FEATURES, ws-spec-to-pr SKILL+PROTOCOLS, ws-monitor SKILL, gates, setup, observer-instructions); new test/test-ws-monitor-liveness.js |
| 5 | 05:47:10 | 9 | 4 | same | active | 9 | test/test-suites.json |
| 6 | 05:50:17 | 9 | 4 | same | active | 9 | .ws/MEMORY.md + new .ws/memory/2026-09-24-monitor-liveness-test-authoring.md |
| 7 | 05:53:45 | 9 | 4 | same | active | 9 | none |
| 8 | 05:57:25 | 9 | 4 | same | active | 9 | none |
| 9 | 06:00:49 | 9 | 4 | same | active | 9 | none |
| 10 (final) | 06:04:04 | 9 | 4 | same | active | 9 | none |

Unchanged throughout: `revision: 9`, `nextAction: "Finish step 4"`, `shipStatus: pending`, `stepCheckpoints: null`, `turnPause: null`, `agentTranscripts: null` (monitor `stateAgentTranscripts` empty). Step 4 active 35.4 min at close (dispatch 05:28:37Z). Prior step durations for context: step 1 finished at 24.5 min, step 2 at 28.2 min.

## 2. Telemetry events observed (9 total, 0 new during window)

| # | type | step | at |
|---|------|------|----|
| 1 | dispatch | 0 | 04:32:47Z |
| 2 | finish | 0 | 04:33:18Z |
| 3 | observer-dispatch | - | 04:34:09Z |
| 4 | dispatch | 1 | 04:34:53Z |
| 5 | finish | 1 | 04:59:21Z |
| 6 | dispatch | 2 | 04:59:42Z |
| 7 | finish | 2 | 05:27:52Z |
| 8 | finish | 3 | 05:28:11Z (skipReason dag-disabled) |
| 9 | dispatch | 4 | 05:28:37Z (generic:Task) |

No `checkpoint` / `turn_paused` events. Expected: the running orchestrator session predates the ops this run is implementing; the feature is being introduced, not exercised, by this run.

## 3. Monitor transcript fields per poll

| Poll | Snapshot file | filesScanned | capped | elapsedMs | roots | bytesRead | hostStoreReads | transcriptSource |
|------|---------------|--------------|--------|-----------|-------|-----------|----------------|------------------|
| 1 | monitor-w3-013016.json | 0 | true | 157 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 2 | monitor-w3-013511.json | 0 | true | 159 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 3 | monitor-w3-013922.json | 0 | true | 1850 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 4 | monitor-w3-014343.json | 0 | true | 173 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 5 | monitor-w3-014710.json | 0 | true | 176 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 6 | monitor-w3-015017.json | 0 | true | 179 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 7 | monitor-w3-015345.json | 0 | true | 184 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 8 | monitor-w3-015725.json | 0 | true | 211 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 9 | monitor-w3-020049.json | 0 | true | 180 | 61 | 0 | 0 | transcript-unavailable / scan-capped |
| 10 | monitor-w3-020404.json | 0 | true | 179 | 61 | 0 | 0 | transcript-unavailable / scan-capped |

Findings each poll: 18 x `info/vault-unreconciled-workflow` (stale vault records, unrelated). No `worker-session-stall`, no `stale-state`, no `worker-session-paused` (state carries no turnPause). `observer.cjs watch` each poll: `findings: 1, critical: 0` (`info/transcript-absent`).

## 4. Product-progress evidence (git status / diff --stat, read-only)

Timeline of product writes (first-seen poll): workflow_state.cjs @05:35Z (+187 lines); monitor_snapshot.cjs + telemetry.schema.json + workflow-state.schema.json @05:39Z (+182 / +13 / +16; workflow_state.cjs then +195); docs wave @05:43Z (ws-spec-to-pr SKILL.md +6, PROTOCOLS.md +18, ws-monitor SKILL.md +16, observer-instructions.md +20, gates.md 2, setup.md 2, README.md +3, FEATURES.md +6); test/test-suites.json +9 @05:47Z; .ws/MEMORY.md +9 + memory note @05:50Z; no changes 05:52Z-06:04Z.

Final: 21 changed paths = 16 tracked modified + 5 untracked. Tracked diffstat: 482 insertions / 79 deletions. Product files (non-workflow-artifact): 14 modified (`ws-monitor/SKILL.md`, `ws-monitor/scripts/monitor_snapshot.cjs`, `ws-shared/runtime/{gates.md, observer-instructions.md, setup.md, telemetry.schema.json, workflow-state.schema.json, scripts/workflow_state.cjs}`, `ws-spec-to-pr/{SKILL.md, PROTOCOLS.md}`, `README.md`, `FEATURES.md`, `test/test-suites.json`, `.ws/MEMORY.md`) + 3 untracked (`test/test-liveness-checkpoints.js` 20,287 B, `test/test-ws-monitor-liveness.js` 15,652 B, `.ws/memory/2026-09-24-monitor-liveness-test-authoring.md`).

Read-only checks (no test execution, no writes): `node --check` exit 0 for monitor_snapshot.cjs, workflow_state.cjs, test-liveness-checkpoints.js, test-ws-monitor-liveness.js; both JSON schemas parse. Live usage checks of the edited monitor: `--watch --until-terminal --iterations 2` -> `ERROR: --until-terminal and --iterations are mutually exclusive`, exit 1; `--until-terminal` without `--watch` -> `ERROR: --until-terminal requires --watch`, exit 1 (both before any scan; NS4 behavior confirmed live).

## 5. What landed (code/doc presence mapped to the run's ACs; not a verification)

- AC1-AC5/AC9: `workflow_state.cjs` operations list includes `checkpoint` / `pause-turn`; `parseCheckpointProgress`, `parsePauseTurnRecord`; terminating `finish` clears `stepCheckpoints[step]` and `turnPause` for that step; validators `stepCheckpointErrors` / `turnPauseErrors`.
- AC6: `telemetry.schema.json` enum extended with `checkpoint`, `turn_paused`; `progress` object (`completedUnits`, `remainingUnits`, optional `substep`); `nextAction`.
- AC7: `workflow-state.schema.json` declares `stepCheckpoints` and `turnPause` (required `step`/`reason`/`at`/`nextAction`, `additionalProperties: false`).
- AC10-AC13: `resolveCandidateTranscriptRoots` ranks correlated-path roots first; `scanTranscriptRoots` reserves a per-root slice of the file budget and orders correlated candidates first within a root; sanitize-before-correlate now uses ONE window (stored tail is the full sanitized window, previously an 8 KB slice) and `resolveTranscriptSource` matches the same window.
- AC14/AC15: `normalizeTurnPause` exposes the marker on the workflow record; a present `turnPause` emits `info/worker-session-paused` and suppresses `worker-session-stall` (stall branch is now `else if`).
- AC16: `--until-terminal` parsed and looped in `main`; mutually exclusive with `--iterations`.
- AC8/AC17: `ws-spec-to-pr/SKILL.md` + `PROTOCOLS.md` and `ws-monitor/SKILL.md` + `observer-instructions.md` document the pause-vs-stall contract and the shared correlation window.
- AC18: `test/test-suites.json` registers `test/test-liveness-checkpoints.js` (2 suites) and `test/test-ws-monitor-liveness.js` (monitor suite).
- AC19: `README.md` and `FEATURES.md` updated.

## 6. Findings

### F1 — Discovery starvation persists live, now under the edited monitor (severity: high; #412 class; defect candidate)
Evidence: all 10 snapshots `filesScanned: 0`, `capped: true`, `roots.length: 61`, `bytesRead: 0`, `hostStoreReads: 0`; `transcriptSource = transcript-unavailable / scan-capped`. Polls 3-10 ran the step-4-edited `monitor_snapshot.cjs` (correlated-first ranking + per-root slice + shared window) and still reported `filesScanned: 0`. Inference (labeled): either (a) no correlated session exists in this host store, or (b) the per-root slice still misses the correlated file (name-sorted slice of `max(1, floor(remaining/roots))` candidates per root), or (c) the edited script was still being iterated. Live effectiveness of AC10/AC11 cannot be confirmed or refuted from outside.

### F2 — Stall detection structurally unreachable while discovery is starved (severity: high; #412 class; defect candidate)
Evidence: the stall gate requires `source.status === 'available' && isActive && source.sessionMtime` (`monitor_snapshot.cjs` current lines ~1562-1585). Every poll resolved `transcript-unavailable`, so no `worker-session-stall` could fire despite step 4 active 35.4 min (well beyond `stallWindowMs` 600000). `state.agentTranscripts` is null/empty, so the state-recorded fallback contributes nothing. The new `turnPause` branch adds suppression, not liveness, when discovery fails.

### F3 — State/telemetry frozen with an active step (severity: high; #413 class; defect candidate)
Evidence: `revision: 9` and 9 telemetry lines from poll 1 through poll 10 (~34 min), step 4 active since 05:28:37Z, no `finish`. `stepCheckpoints: null`, `turnPause: null`; zero `checkpoint`/`turn_paused` events. Expected for this run (the live orchestrator predates the ops), but it reproduces exactly the blind spot the run targets: an operator cannot distinguish "still generating" from "turn ended mid-step without a finish".

### F4 — No state-recorded transcript marker (severity: medium; #412-adjacent)
Evidence: no `agentTranscripts` key in the state; monitor `stateAgentTranscripts` empty; `observer.cjs watch` emits `info/transcript-absent` each poll. Recording the subagent session path at dispatch remains the only discovery-independent correlation path.

### F5 — `scan-capped` reason semantics edge after the fix (severity: medium; code-level NEW observation; AC13)
Evidence: in the edited `scanTranscriptRoots`, `capped` is also set when any root's candidate list exceeds its reserved slice (`if (ordered.length > slice) capped = true;`), independent of whether the correlated file was read; `resolveTranscriptSource` then returns `scan-capped` whenever there are zero candidates and `capped` is true (current lines ~1365-1369). Inference: in an environment with no matching session but truncated unrelated roots, the reason reads `scan-capped` rather than `no-matching-session`, which is a weaker signal than AC13's wording ("scan-capped only when the scan stopped before reading the matching file"). The registered tests may cover the intended cases; flagged for review, not asserted as a confirmed defect.

### F6 — Transient `elapsedMs` spike (severity: info)
Evidence: poll 3 `elapsedMs: 1850` vs 157-211 in all other polls, same `filesScanned: 0`. Inference: I/O contention during the heavy concurrent product-write burst or a transient mid-edit script version; not reproduced, monitor exit 0 and valid JSON each poll.

### F7 — No regression observed from step 4 edits (severity: info)
Evidence: `node --check` exit 0 on all four edited/new JS files; both edited JSON schemas parse; edited monitor runs (exit 0, valid JSON, stable fields) and enforces NS4 usage errors pre-scan. Test suites were NOT executed (observer read-only scope; test runs write temp/state).

### F8/F9 — Info only
- `.ws/MEMORY.md` + `.ws/memory/2026-09-24-monitor-liveness-test-authoring.md` written by the step-4 subagent (self-learning; consumer-owned, expected).
- 18 x `info/vault-unreconciled-workflow` per poll (unchanged, unrelated hygiene).

## 7. Defect candidates worth a GitHub issue

| Finding | File as issue? | Why |
|---------|----------------|-----|
| F1 discovery starvation | Yes (recurrence evidence for #412) | `filesScanned: 0` + `capped: true` all 10 polls, including 8 polls under the edited monitor |
| F2 stall unreachable | Yes (fold into #412) | Stall gate cannot fire while `transcriptSource` is unavailable; 35.4 min active with no warning |
| F3 frozen state + active step | Yes (recurrence evidence for #413) | rev 9 / 9 events frozen across 10 polls; no finish, no checkpoint/pause signal |
| F4 missing transcript marker | Yes (small, #412-adjacent) | State-recorded fallback absent; discovery remains the only path |
| F5 scan-capped semantics edge | Suggest review, fold into #412 | Code-level; AC13 wording vs new `capped` trigger breadth |
| F6 elapsedMs spike | No | Transient, not reproduced |
| F7 no regressions | No | Positive observation; test execution deferred to step 5/7 |
| F8/F9 | No | Expected behavior / unrelated |

## 8. Caveats

- Read-only observation; no product, state, telemetry, config, commit, or PR writes. Writes limited to `observer/` (this report, `window-3.log`, 10 snapshots); `observer.cjs watch` wrote its own log/report pair per invocation.
- Window closed by the suspected-stall criteria, not by a finish: step 4 may complete immediately after this report. "Suspected stall" is derived from state/telemetry/artifact evidence; transcript-level confirmation is impossible here because discovery is starved (F1/F2).
- Polls 3-10 exercised the step-4-edited monitor script from the working tree, so its behavior is not a stable pre/post baseline; the poll-3 timing spike is noted (F6).
- Evidence and inference are labeled per finding. Sanitized: counts and repo-relative paths only; no host paths, no transcript content, no secrets.

## 9. Post-window addendum

- 2026-09-24T06:06:35Z: step 4 still active (38.0 min since dispatch), revision 9, telemetry 9 lines, no inish. Report remains accurate: step 4 did not finish inside the observation window.
