# Window 4 - execution observation report

- Workflow: `us-412-413-liveness-checkpoints-20260924T043148Z` (standard `ws-spec-to-pr`, autoMode, step 5 Check-implementation / verification)
- Window: 2026-09-24T06:09Z (task start) -> 06:39:14Z (final poll) = ~30 min wall clock; 9 polls at ~2-4.5 min cadence
- Observer posture: read-only; writes only under `observer/` (this report, `window-4.log`, 9 `monitor-w4-*.json` snapshots, `w4-git-status.txt` compare baseline). `observer.cjs watch` wrote its own `observer.log`/`observer-report.md` pair per invocation (by design, overwritten each run).
- **Outcome: STEP 5 WORK PRODUCTS COMPLETED IN-WINDOW, BUT STEP 5 NEVER RECORDED `finish`.** The verification report artifact and a 10/10 ledger score landed at 06:23:22-06:26:58Z, yet state revision/telemetry stayed frozen (rev 11, 11 events, last = `dispatch`/5 @06:08:15Z) through the 06:39:14Z close. `stepStatus[5] = active`, `nextAction = "Finish step 5"` at close. Stop reason: ~30 min bound reached (not a finish, not the report-completed state check).
- Note: `test/.ws/config.json` appeared as ` M` in git status from poll 3 onward; content is **byte-identical to HEAD** (porcelain v2 shows the same blob hash for HEAD/index/worktree; `git diff --quiet` exit 0). Stat-only dirtiness from the test sandbox (W4-F4), not product drift.

## 1. State trajectory

| Poll | At (UTC) | revision | stepStatus (5) | status | telemetry lines | report artifact | ac-ledger mtime | git paths (new) |
|------|----------|----------|----------------|--------|-----------------|-----------------|-----------------|-----------------|
| 1 | 06:11:05 | 11 | active | active | 11 | absent | 04:32:58Z | 22 (baseline) |
| 2 | 06:15:10 | 11 | active | active | 11 | absent | - | 22 (0) |
| 3 | 06:18:57 | 11 | active | active | 11 | absent | - | 23 (+1: ` M test/.ws/config.json`) |
| 4 | 06:23:33 | 11 | active | active | 11 | absent | - | 23 (0) |
| 5 | 06:27:08 | 11 | active | active | 11 | **present** | 06:23:22Z / 06:26:58Z | 24 (+1: `?? .ws/memory/2026-09-24-ac-ledger-l-prefix-evidence.md`) |
| 6 | 06:29:23 | 11 | active | active | 11 | present | 06:26:58Z | 24 (0) |
| 7 | 06:32:33 | 11 | active | active | 11 | present (mtime 06:24:36Z) | 06:26:58Z | 24 (0) |
| 8 | 06:35:59 | 11 | active | active | 11 | present | - | 24 (0) |
| 9 (final) | 06:39:14 | 11 | active | active | 11 | present | 06:26:58Z | 24 (0) |

Unchanged throughout: `revision: 11`, state/telemetry file mtime 06:08:15Z, `nextAction: "Finish step 5"`, `shipStatus: pending`, `turnPause: null`, `stepCheckpoints: null`, `agentTranscripts: null`. Step 5 active 31.0 min at close (dispatch 06:08:15Z).

## 2. Telemetry events observed (11 total, 0 new during window)

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
| 9 | dispatch | 4 | 05:28:37Z |
| 10 | finish | 4 | 06:07:18Z |
| 11 | dispatch | 5 | 06:08:15Z (generic:Task) |

**No `checkpoint` / `turn_paused` events.** Expected: the running orchestrator session predates the ops this run implements; the feature is being introduced, not exercised, by this run (step-5 report §Gaps item 4 and line 104 acknowledge the same).

## 3. Monitor transcript fields per poll

| Poll | Snapshot file | filesScanned | capped | elapsedMs | roots | bytesRead | hostStoreReads | transcriptSource | findings |
|------|---------------|--------------|--------|-----------|-------|-----------|----------------|------------------|----------|
| 1 | monitor-w4-021105.json | 0 | true | 187 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 2 | monitor-w4-021510.json | 0 | true | 180 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 3 | monitor-w4-021857.json | 0 | true | 188 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 4 | monitor-w4-022333.json | 0 | true | 178 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 5 | monitor-w4-022708.json | 0 | true | 177 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 6 | monitor-w4-022923.json | 0 | true | 181 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 7 | monitor-w4-023233.json | 0 | true | 183 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 8 | monitor-w4-023559.json | 0 | true | 183 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |
| 9 | monitor-w4-023914.json | 0 | true | 177 | 61 | 0 | 0 | transcript-unavailable / scan-capped | 18 x info |

Findings each poll: 18 x `info/vault-unreconciled-workflow` (stale vault records, unrelated). No `worker-session-stall`, no `worker-session-paused` (no turnPause marker), no `stale-state`. `observer.cjs watch` each poll: `findings: 1, critical: 0` (`info/transcript-absent`). All snapshots 15,388 B, monitor exit 0, valid JSON.

## 4. What happened inside the window (progress evidence)

- 06:15:52-06:15:56Z: `test/.ws` hub fixture rewritten (`.gitignore`, `autoload.md`, `config.json`, `config.json.bak`, `installed-skills.json`, `skill-integrity-local.json`) and `test/package-lock.json` touched. Writer correlates with step-5 test execution: `test/test-install.js` uses `test/.ws` as its sandbox hub (line 700) and expects `config.json.bak` on update (line 818). This is the only in-window proof that tests were running (state/telemetry give none).
- 06:23:22Z: `ac-ledger.json` updated (evidence linking; revision 34). Step-5 report frontmatter `reportDate: 2026-09-24T06:23:22Z`.
- 06:24:36Z: `step-05-us-412-413-liveness-checkpoints.plan.report.md` mtime (final write).
- 06:26:58Z: ledger `scoreState` computed: `boundary: step5`, `score: 10`, `earnedUnits: 190/190`, `knownDefect: false`, `missingEvidence: false`, `errors: []`, `invariantViolations: []`; all 19 ACs `Implemented` with evidence; 6/6 NS linked.
- 06:26-06:27Z: `.ws/memory/2026-09-24-ac-ledger-l-prefix-evidence.md` written (step-5 self-learning; consumer-owned).
- 06:27:08Z -> 06:39:14Z: no state, telemetry, artifact, or worktree changes (4+ consecutive quiet polls).

Step-5 report summary (read-only; not an observer verification): `npm run test` exit 0 (all 128 entries pass), `test-harness-clean.js` 0 findings, stack invariant scan 0 violations; two Suggestion-level items left open (`intra-root-enumeration-stop` AC11; `release-bump-deferred` AC19); observer window-3 F5 adjudicated NOT a defect (see report §Adversarial checks).

## 5. Findings

### W4-F1 - #413 recurrence: step work completed while state/telemetry stayed frozen (severity: high; recurrence evidence)
Evidence: report artifact (06:24:36Z), ledger score 10/10 (06:26:58Z), and memory note all landed while `revision: 11`, 11 telemetry lines, and state mtime (06:08:15Z) never moved; `stepStatus[5] = active`, `nextAction = "Finish step 5"` at close. No `finish`/5 telemetry, no `checkpoint`, no `turn_paused`. Inference (labeled): the orchestrator had not yet issued `update_state finish` for step 5; from outside, "worker done, orchestrator composing" is indistinguishable from "turn ended mid-step". Expected for this run (orchestrator predates the ops), but it reproduces the exact blind spot #413 targets, now with an in-window completion timestamp (>=12 min of frozen state after ledger score).

### W4-F2 - #412 live: discovery still `filesScanned: 0` / `capped: true`; explained as session absence, not starvation (severity: info; resolves window-3 F1)
Evidence: all 9 polls `filesScanned: 0`, `capped: true`, `roots.length: 61`, `bytesRead: 0`, `hostStoreReads: 0`, `transcriptSource = transcript-unavailable / scan-capped`, including under the step-4-edited monitor. Step-5 report §Adversarial checks (line 97-99): a read-only unbounded-enumeration probe of the same 61 roots found **zero** files whose path or retained window contains this workflow's id/slug. Inference (labeled, corroborated by the report): absence of a correlated session in the candidate roots, so `scan-capped` is the honest vocabulary there; AC10-AC13 effectiveness is fixture-proven (M1-M3/M9), not live-proven. Consequence: live `worker-session-stall` remains untriggerable in this environment (stall gate requires an `available` source); this is not evidence against the new pause/stall logic.

### W4-F3 - NEW code-level edge: intra-root enumeration stop (severity: medium; defect candidate; #412 class)
Evidence: step-5 report §Adversarial checks lines 93-95 and §Gaps item 1: `listTranscriptCandidates` (`monitor_snapshot.cjs:1139-1159`) stops enumeration at `slice + 1` name-sorted candidates, so a path-correlated file that sorts late inside a single/merged root is never collected even though correlated-first ordering (`:1186-1192`) could have ranked it. Reproduced adversarially: 301-file root, target sorts last -> `filesScanned: 0`; with 61 flood roots -> `0` (target last) vs `1` (target first). AC10/AC11 as written are root-centric and their binding fixtures (M1/M9) pass; this is a reachability edge. Recorded as open Suggestion `intra-root-enumeration-stop` (AC11). Worth folding into #412 (or a small follow-up issue).

### W4-F4 - `test/.ws` hub fixture churn leaves stat-only ` M` in git status (severity: low/info; test hygiene candidate)
Evidence: 06:15:52-06:15:56Z rewrites of `test/.ws/{.gitignore,autoload.md,config.json,config.json.bak,installed-skills.json,skill-integrity-local.json}`; `git status --porcelain=v2` shows `1 .M N...` with identical HEAD/index/worktree blob hashes (`9e49ff6a...`), `git diff --quiet` exit 0, HEAD blob identical; git warning "LF will be replaced by CRLF" indicates an EOL-only stat-dirty state. Writer = `test/test-install.js` sandbox (uses `test/.ws`). Inference (labeled): harmless to content, but a persistent ` M` line can confuse cleanliness gates (pre-ship board / `git status`-based checks). No issue recommended unless it trips a gate.

### W4-F5 - No state-recorded transcript marker (#412-adjacent; severity: medium; persists)
Evidence: `state.agentTranscripts` absent/null all polls; monitor `stateAgentTranscripts: null`; `observer.cjs watch` emits `info/transcript-absent` every poll. Discovery remains the only correlation path, and it resolves nothing in this environment (W4-F2).

### W4-F6 - Future-dated gate-history entries vs state file mtime (severity: info; flagged, out of target classes)
Evidence: `...state.md` mtime is 06:08:15Z (all 9 polls) yet its gate history contains `step-4-finish ... | 2026-09-24T06:10:00Z` (line 125) and `integrity-regen ... | 2026-09-24T06:12:00Z` (line 127), i.e. timestamps 1:45-3:45 later than the file's last write. Similar rounding/lag exists for earlier gates (e.g. `step-1-finish` gate 05:00:00Z vs telemetry finish 04:59:21Z). Inference (labeled): gate-history timestamps appear to be orchestrator-estimated/rounded rather than exact write times; low impact, but it can mislead timeline reconstruction. Not asserted as a defect.

### W4-F7 - No regression observed from the step-5 run itself (severity: info)
Evidence: product worktree unchanged during the window (24 paths, only the consumer-owned memory note added); monitor/watch exit 0 each poll; the ` M test/.ws/config.json` is stat-only (W4-F4). Test execution results are from the step-5 report (read-only), not independently rerun here (observer read-only scope).

## 6. Defect candidates worth a GitHub issue

| Finding | File as issue? | Why |
|---------|----------------|-----|
| W4-F3 intra-root enumeration stop | Yes (fold into #412 or small follow-up) | Real code-level reachability edge reproduced adversarially; AC11 suggestion open |
| W4-F1 frozen state with completed step work | Yes (recurrence evidence for #413) | rev 11 / 11 events frozen; report+ledger done 06:24-06:27Z; no finish/checkpoint/pause signal |
| W4-F2 live discovery absence | No new issue | Explained as environment absence (no correlated session); keep as #412 context |
| W4-F4 test/.ws stat-dirty | No (note only) | Content byte-identical; test sandbox hygiene |
| W4-F5 missing transcript marker | Fold into #412 (existing) | State fallback still absent |
| W4-F6 future-dated gate timestamps | Suggest review (low) | Timeline reconstruction only; not asserted as defect |

## 7. Liveness changes: taking effect or not?

- The new `checkpoint` / `pause-turn` ops and schemas were not exercised live: no `checkpoint`/`turn_paused` telemetry, `stepCheckpoints`/`turnPause` null all window. Expected - the orchestrator session predates the feature (step-5 report line 104 states the same). Live validation of AC1-AC5/AC9 therefore rests on fixtures T1-T5/T9.
- The edited monitor ran every poll (step-4 code): fields stable, exit 0, usage guards intact; discovery still `filesScanned: 0` because no correlated session exists (W4-F2), so AC10-AC13 live effectiveness remains unproven and unrefuted in this environment.
- Net: no evidence that the liveness changes are failing; no evidence they are effective in live dogfood either. The run's own end-state (report done, state frozen, no finish/pause marker for >=12 min) is the strongest demonstration that the operator blind spot #413 describes persists until the new ops are actually invoked by a post-fix orchestrator.

## 8. Caveats

- Read-only observation; no product, state, telemetry, config, commit, or PR writes. Writes limited to `observer/` (this report, `window-4.log`, 9 snapshots, `w4-git-status.txt`); `observer.cjs watch` wrote its own log/report pair per invocation.
- Window closed by the ~30 min bound, not by a finish: the step-5 `finish` may land immediately after this report. "Frozen" is derived from state/telemetry/artifact evidence; transcript-level confirmation is impossible here (W4-F2/W4-F5).
- Polls exercised the step-4-edited monitor script from the working tree; behavior is not a stable pre/post baseline.
- Evidence and inference are labeled per finding. Sanitized: counts and repo-relative paths only; no host paths, no transcript content, no secrets.

## 9. Post-window addendum

- 2026-09-24T06:40Z: step 5 still `active` (31.7 min since dispatch), revision 11, telemetry 11 lines, no `finish`. Report remains accurate: step 5 did not record completion inside the observation window.
