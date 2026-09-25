# Window 1 — execution observation report

- Workflow: `us-412-413-liveness-checkpoints-20260924T043148Z` (standard `ws-spec-to-pr`, autoMode)
- Window: 2026-09-24T04:35:40Z → 04:57:37Z (≈22 min); polls 1–7 (~2.5–3 min cadence) + final stop snapshot
- Observer posture: read-only; writes only under `observer/` (this report, `window-1.log`, `monitor-*.json`). `observer.cjs watch` wrote its own `observer.log`/`observer-report.md` pair.
- **Outcome: SUSPECTED STALL** — state revision and telemetry frozen across 7 consecutive polls while `stepStatus["1"] = active`; step 1 never finished inside the window. Step-1 plan artifact exists on disk (written 04:40:45Z) but the state never advanced.

## 1. State trajectory

| Poll | At (UTC) | revision | currentStep | stepStatus | status | shipStatus | telemetry events |
|------|----------|----------|-------------|------------|--------|------------|------------------|
| 1 | 04:36:17 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 2 | 04:40:05 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 3 | 04:43:17 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 4 | 04:46:14 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 5 | 04:49:15 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 6 | 04:52:31 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| 7 | 04:55:57 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |
| stop | 04:57:01 | 4 | 1 | 0:completed, 1:active | active | pending | 4 |

Unchanged fields throughout: `revision: 4`, `nextAction: "Finish step 1"`, `agentTranscripts: null`, `observer.dispatchCount: 1`.

## 2. Telemetry events observed (4 total, all by 04:34:53Z)

| # | type | step | at |
|---|------|------|----|
| 1 | dispatch | 0 | 04:32:47Z |
| 2 | finish | 0 | 04:33:18Z |
| 3 | observer-dispatch | – | 04:34:09Z |
| 4 | dispatch | 1 | 04:34:53Z (generic:Task) |

No `finish` for step 1. No `checkpoint` / `turn_paused` events (not implemented yet — this run is dogfooding their introduction).

## 3. Monitor transcript fields per poll

| Poll | Snapshot file | filesScanned | capped | elapsedMs | roots | transcriptSource |
|------|---------------|--------------|--------|-----------|-------|------------------|
| 1 | monitor-043617.json | 0 | true | 2017 | 61 | transcript-unavailable / scan-capped |
| 2 | monitor-044005.json | 0 | true | 2011 | 61 | transcript-unavailable / scan-capped |
| 3 | monitor-044317.json | 0 | true | 907 | 61 | transcript-unavailable / scan-capped |
| 4 | monitor-044614.json | 0 | true | 154 | 61 | transcript-unavailable / scan-capped |
| 5 | monitor-044915.json | 0 | true | 153 | 61 | transcript-unavailable / scan-capped |
| 6 | monitor-045231.json | 0 | true | 155 | 61 | transcript-unavailable / scan-capped |
| 7 | monitor-045557.json | 0 | true | 159 | 61 | transcript-unavailable / scan-capped |
| stop | monitor-045701.json | 0 | true | 159 | 61 | transcript-unavailable / scan-capped |

`bytesRead: 0`, `hostStoreReads: 0` in every snapshot. Findings each poll: 18 × `info/vault-unreconciled-workflow` (stale vault records, unrelated to this run). No `worker-session-stall`, no `stale-state` finding in any snapshot.

`observer.cjs watch` each poll: 1 finding, 0 critical — `info/transcript-absent` (`agent transcripts not recorded`). No `stale-state` warning.

## 4. Progress signal vs. observability

- Step 1 dispatched 04:34:53Z; plan artifact `step-01-...plan.md` appeared 04:40:45Z (31,662 bytes, frontmatter `status: "plan to be refined"`).
- After 04:40:45Z, plan mtime and size never changed; state revision and telemetry never moved.
- At stop: ~16.3 min since last artifact activity, ~22.5 min since step-1 dispatch — with zero state/telemetry progress signal.

## 5. Findings

### F1 — Discovery starvation reproduces live (severity: high; defect candidate, #412 class)
Evidence: every snapshot `filesScanned: 0`, `capped: true`, `roots.length: 61`, `bytesRead: 0`; `transcriptSource = {status: transcript-unavailable, reason: scan-capped}`. Mechanism in `monitor_snapshot.cjs`: candidate collection is depth-first over roots and stops at `TRANSCRIPT_LIMITS.maxFilesPerTick = 200` (line 63; `visit()` lines 1141–1155), then the read loop stops at `maxMsPerTick = 2000` / `maxTotalBytes = 4 MB` (line 1163). `filesScanned` counts only files passing the correlation filter (line 1181). With ≥200 unrelated candidates traversed before the correlated session, the session is never read; polls 1–2 hit the 2000 ms time cap (`elapsedMs` 2017/2011), polls 3–8 completed fast (≤907 ms) yet still `capped: true`, i.e. the 200-file collection cap was reached. This is the pre-fix `filesScanned: 0` + `capped: true` signature of the dogfooded issue (spec NS1/AC10/AC11).
Inference: correlated session lies beyond the per-tick candidate budget; the monitor cannot see it at all.

### F2 — Stall detection is structurally unreachable while transcripts are unavailable (severity: high; defect candidate, #412 class)
Evidence: `monitor_snapshot.cjs` line 1510 requires `source.status === 'available' && isActive && source.sessionMtime` before the `worker-session-stall` gate (10 min `stallWindowMs`, line 66). With `scan-capped`, `source.status` is `transcript-unavailable`, so no stall can ever fire — confirmed: no `worker-session-stall` finding in any of the 8 snapshots despite the workflow being frozen ~16 min. `state.agentTranscripts` is `null`, so the state-recorded fallback (`resolveStateTranscriptSource`, lines 1269–1298) contributes nothing either.
Inference: liveness detection is disabled by construction in this environment (discovery starved + no recorded marker), not merely quiet.

### F3 — State/telemetry frozen with an active step (severity: high; defect candidate, #413 class)
Evidence: `revision: 4` and 4 telemetry events across 7 polls (~19.7 min poll span; step active ~22.5 min). No `checkpoint`/`turn_paused` events (expected pre-fix). The plan artifact on disk is the only evidence work happened; neither state nor monitor surfaces it as progress.
Inference: an operator (or the orchestrator) cannot distinguish "subagent still generating" from "turn ended mid-step without a finish"; this is precisely the blind spot this run is implementing checkpoints/pause markers for. Whether the step-1 subagent is still running or the turn ended cannot be determined from harness artifacts alone.

### F4 — No state-recorded transcript marker (severity: medium; dogfood-relevant)
Evidence: `agentTranscripts: null` in state; `observer.cjs watch` emits `info/transcript-absent`. The primary transcript source is the state-recorded marker (lines 1500–1507); without it the monitor depends solely on discovery, which is starved (F1). Recording the subagent session path at dispatch would restore correlation independent of the discovery budget.

### F5 — Latent scan/resolve correlation-window mismatch (severity: medium; code-level, #412 class; NOT triggered in this run)
Evidence: scan filtering matches on the full bounded tail (up to 256 KB, `maxBytesPerFile`, lines 1169–1178), while `resolveTranscriptSource` correlates on `item.file + tail` where `tail = text.slice(-8000)` (8 KB, line 1189 vs 1308–1311). A workflow key present only between the 8 KB and 256 KB tail would yield `filesScanned ≥ 1` but `candidates.length === 0`, producing `scan-capped`/`no-matching-session` after a successful scan (spec NS2/AC12). Not observable here because `filesScanned` was already 0.

### F6 — Info only
- 18 × `vault-unreconciled-workflow` info findings each poll (stale vault records; unrelated to this workflow).
- `observer.cjs watch` overwrites `observer.log`/`observer-report.md` per invocation (by design; prior findings are not retained). Snapshots under `observer/monitor-*.json` and `window-1.log` preserve the timeline.

## 6. Defect candidates worth a GitHub issue

| Finding | File as issue? | Why |
|---------|----------------|-----|
| F1 discovery starvation | Yes (recurrence evidence for #412) | Live reproduction: `filesScanned: 0`, `capped: true`, 61 roots, 200-file cap |
| F2 stall gate unreachable | Yes (fold into #412) | `worker-session-stall` cannot fire under `scan-capped`; liveness blind |
| F3 frozen state + active step | Yes (recurrence evidence for #413) | rev 4 frozen across 7 polls; no finish, no checkpoint/pause signal |
| F4 missing transcript marker | Yes (small, #412-adjacent) | State-recorded fallback absent; discovery is the only path |
| F5 correlation-window mismatch | Yes (fold into #412) | Code-level latent; matches NS2; not triggered live |
| F6 vault info / overwrite | No | Expected behavior / unrelated hygiene |

## 7. Caveats

- Read-only observation; no product, state, telemetry, config, commit, or PR writes. Writes limited to `observer/` (report, log, snapshots); `observer.cjs watch` wrote its own log/report pair.
- "Suspected stall" is derived from state/telemetry/artifact evidence. Transcript-level confirmation is impossible here because discovery is starved (F1/F2) — the absence of evidence is itself the finding.
- Sanitized: counts and repo-relative paths only; no host paths, no transcript content, no secrets.
