---
us: us-412-413-liveness-checkpoints
reportDate: "2026-09-24T06:23:22Z"
score: 10
sourcePlans:
  - .agents/plans/us-412-413-liveness-checkpoints/step-02-us-412-413-liveness-checkpoints.plan.refined.md
  - .agents/plans/us-412-413-liveness-checkpoints/step-01-us-412-413-liveness-checkpoints.plan.md
evalSource: .agents/plans/us-412-413-liveness-checkpoints/step-02-us-412-413-liveness-checkpoints.plan.refined.md
step: 5
slug: us-412-413-liveness-checkpoints
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
status: completed
startedAt: "2026-09-24T04:31:48Z"
endedAt: "2026-09-24T06:42:19.964Z"
acRefs: []
---
# Step 5 — Check-implementation report — `us-412-413-liveness-checkpoints`

**Score: 10/10** (ledger-derived; `ac_ledger.cjs score --boundary step5` → `score: 10`, `earnedUnits: 190/190`, `knownDefect: false`, `missingEvidence: false`, `errors: []`, `invariantViolations: []`).

Baseline `4fcc0f99`; evaluated working tree at HEAD + Step-4 product diff (16 tracked modified files + 2 new test suites). Product files were not edited by this step; evidence was linked to `ac-ledger.json` only.

## Executive Summary

Both defect classes are implemented and verified against the refined plan and the 19 ACs:

- **#413 orchestration:** `update_state.cjs` now exposes `checkpoint` (AC1/AC2) and `pause-turn` (AC3/AC4/AC9), schemas accept both records (AC6/AC7), the terminating `finish` clears only the finished step's markers (AC5), and `ws-spec-to-pr/SKILL.md` + `PROTOCOLS.md` + `setup.md` + `gates.md` document the turn-boundary contract (AC8). Pause markers are written only on a real turn end; `dispatch` never touches them.
- **#412 monitor:** discovery now ranks correlated-path roots first and reserves a per-root slice of the 200-file budget (AC10/AC11), scan filter + stored window + `resolveTranscriptSource` consume one sanitized window (AC12), `scan-capped` fires only when no candidate was read in a capped scan (AC13), `worker-session-stall` fires for an idle available session on an active workflow (AC14) and is suppressed by a pause marker with `worker-session-paused` instead (AC15), and `--watch --until-terminal` is mutually exclusive with `--iterations` with pre-scan usage errors (AC16). Docs (AC17), tests (AC18), and human docs (AC19) are in place.

All 128 local suite entries pass (`npm run test` exit 0), the stack invariant scan reports 0 violations, and `test-harness-clean.js` reports 0 findings with the integrity manifest matching the tree. Two Suggestion-level observations are recorded (intra-root enumeration stop; release version bump/site rebuild deferred to Step 8) — neither is an AC defect. The observer's window-3 F5 concern was adversarially checked and is **not** a defect.

## Verification runs (real exit codes)

| Command | Exit | Observed |
|---|---|---|
| `npm run test` (verification.backendTest) | **0** | `run-tests: all 128 entries passed (mode=local)`; hub config byte-identity verified; install gate passed after the pre-Step-5 integrity regen |
| `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --files <4 touched JS> --json` | **0** | `totalViolations: 0`, `criticalCount: 0`, `warningCount: 0` (stack `typescript-node`) |
| `node test/test-liveness-checkpoints.js` | **0** | T1–T9, D1–D2 pass |
| `node test/test-ws-monitor-liveness.js` | **0** | M1–M9 pass |
| `node test/test-ws-monitor-us356.js` | **0** | binding compatibility anchor still green |
| `node test/test-update-state-yaml.js` | **0** | all state-writer YAML/contract checks pass |
| `node test/test-workflow-state-contract.js` | **0** | pass |
| `node test/test-runtime-portability.js` | **0** | portability/agent-agnostic contract green |
| `node test/test-harness-clean.js` | **0** | `Harness OK (upstream clean) — 0 findings`; integrity manifest OK (v0.4.65) |

## Result by Feature (AC matrix)

| AC | Status | Evidence (file:line) | Tests (observed, exit 0) |
|----|--------|----------------------|--------------------------|
| AC1 | Implemented | `workflow_state.cjs:1180-1217` (`parseCheckpointProgress`, fail-closed JSON + `--progress-file`), `:1823-1842` (checkpoint branch), `:2224-2233` (allowlist/help) | T1, T8 |
| AC2 | Implemented | `workflow_state.cjs:1823-1842` (record + `checkpoint` event via `commonEvent` + revision bump) | T1 |
| AC3 | Implemented | `workflow_state.cjs:1222-1234` (`parsePauseTurnRecord`), `:1843-1858` (`turnPause = {step, reason, at, nextAction}`) | T2 |
| AC4 | Implemented | `workflow_state.cjs:1843-1858` (`turn_paused` event; revision +1) | T2 |
| AC5 | Implemented | `workflow_state.cjs:1656-1668` (non-internal `finish` deletes the step checkpoint + a `turnPause` naming that step, pre-render; internal substep finishes keep them) | T3 |
| AC6 | Implemented | `telemetry.schema.json:9` (enum + `checkpoint`/`turn_paused`), `:66-76` (`nextAction`, `progress` with `additionalProperties: false`) | T4 |
| AC7 | Implemented | `workflow-state.schema.json:166-181` (declared properties), `workflow_state.cjs:2052-2097` (code-level record validation, G10), `:2123-2124` (wired into `validateSnapshot`) | T5 |
| AC8 | Implemented | `ws-spec-to-pr/SKILL.md:54-57` (autoMode ≠ chaining host turns; checkpoint + pause before a turn ends), `PROTOCOLS.md:259-271` (§ Turn-boundary pause & mid-step checkpoints) | D1 |
| AC9 | Implemented | `workflow_state.cjs:1220-1234` (explicit `--next-action` wins → derive `Resume step N (substep; N remaining)` from `stepCheckpoints[N]` → error), `:1843-1858` | T2 |
| AC10 | Implemented | `monitor_snapshot.cjs:1174-1194` (per-root reservation `max(1, floor(remaining/remainingRoots))`, correlated-first ordering, honest `capped`) | M1 |
| AC11 | Implemented | `monitor_snapshot.cjs:1029-1100` (root ranking: correlated → explicit → config → workspace → host), `:1139-1194` (slice budget; correlated entries first) | M1, M9 |
| AC12 | Implemented | `monitor_snapshot.cjs:1204-1229` (sanitize → filter → store the same window), `:1361-1379` (resolve matches `file + '\n' + tail`) | M2 |
| AC13 | Implemented | `monitor_snapshot.cjs:1365-1370` (`scan-capped` only when zero candidates in a capped scan; vocabulary unchanged) | M2, M3 |
| AC14 | Implemented | `monitor_snapshot.cjs:1562-1585` (stall branch: `available` + active + idle > 600000 ms → warning) | M4 |
| AC15 | Implemented | `monitor_snapshot.cjs:1343-1351` (`normalizeTurnPause`), `:1511` (record field), `:1564-1573` (`worker-session-paused` info replaces the stall) | M5 |
| AC16 | Implemented | `monitor_snapshot.cjs:316` (boolean token), `:1732-1768` (pre-scan usage guards; `--until-terminal` exits when `activeCount === 0`) | M6, M7 |
| AC17 | Implemented | `ws-monitor/SKILL.md:70,116-117,155`, `observer-instructions.md:36-49` (pause vs stall + shared correlation window) | M8 |
| AC18 | Implemented | `test-suites.json:29-31,178-180,408-410` (registered local+remote / harnessEfficiency), `test/test-liveness-checkpoints.js`, `test/test-ws-monitor-liveness.js`; `npm run test` exit 0 | suite sentinels |
| AC19 | Implemented | `README.md:34-35`, `FEATURES.md:56,204,226` | D2 |

### Negative & failing scenarios (NS1–NS6)

| NS | Covered by (observed, exit 0) | Behavior |
|----|------------------------------|----------|
| NS1 | M1 | 61 unrelated roots (>240 files) precede the target session; `filesScanned >= 1`, correlated workflow `available` |
| NS2 | M2 | workflow key between 8 KB and 256 KB: unit + e2e both `available` (asserted key absent from the trailing 8 KB) |
| NS3 | M5 | pause marker: no `worker-session-stall`; `worker-session-paused` info; stall resumes after the marker is cleared |
| NS4 | M6 | `--until-terminal` + `--iterations` → non-zero, "mutually exclusive", no snapshot output; without `--watch` → non-zero |
| NS5 | T6 | 9 malformed/out-of-range cases: non-zero exit, state byte-identical (sha256), no telemetry written |
| NS6 | T7 | 4 malformed checkpoint/pause records: `validate_state.cjs` non-zero |

## Additional Features / contract checks

- **Pause-marker write discipline (BR7/G9):** `turnPause` is written at exactly one site (`workflow_state.cjs:1846`, `pause-turn`) and cleared only by a non-internal `finish` naming that step (`:1666-1667`). `dispatch` leaves both records untouched and a repeated `finish` is idempotent (T9). No speculative writes exist.
- **`--until-terminal` guard:** both usage errors are raised before any `snapshot()` call (`monitor_snapshot.cjs:1732-1740`); M6 asserts no `"workflows"` output. Observer window-3 §4 independently reproduced both live (`exit 1`).
- **Agent-agnostic constraint (BR5):** no host product names added to skill prose/scripts; new tests use the existing `muse` adapter fixture pattern already present in `test-ws-monitor-us356.js`. `test-runtime-portability.js` exit 0; `test-harness-clean.js` 0 findings; no `.py` added.
- **Privacy of retained windows (G8):** sanitize runs before correlation; the stored tail is the sanitized bounded window; `delete scanned.tail` still runs before serialization (`monitor_snapshot.cjs:1588`).
- **State-writer integrity:** progress operations do not call `syncAcCountsFromLedger` and never touch `stepStatus`/`completedSteps`/`currentStep`; T1 asserts the plans-index row `stateSha256` refresh; T5 asserts md frontmatter round-trip (G11).

## Adversarial checks

### Observer window-3 F5 (AC13) — adjudicated: NOT a defect

Question: does the edited `scanTranscriptRoots` set `capped` when a root exceeds its slice even though the matching file was read, so `resolveTranscriptSource` can report `scan-capped` where `no-matching-session` is truer?

- `capped` is set on per-root slice truncation (`monitor_snapshot.cjs:1191`) regardless of whether the matching file was read — first clause true.
- The consequence clause is false: `resolveTranscriptSource` evaluates candidates first (`:1361-1379`); a read+matched file yields `candidates.length >= 1` → `available`. Independently reproduced: capped flood + matching file read → `capped=true, filesScanned=1, resolve=available`; M3's e2e asserts the same (`capped: true` with the scanned workflow `available`).
- When `capped=true` and zero candidates matched, the scan did stop before exhausting candidates, so it cannot prove absence; `scan-capped` is the honest reason and is asserted as intended by M3 (`zero candidates in a capped scan report scan-capped`) and plan G6. Vocabulary unchanged: `discovery-disabled` / `no-matching-session` / `scan-capped`.

### Intra-root enumeration stop (new observation, Suggestion `intra-root-enumeration-stop` on AC11)

`listTranscriptCandidates` (`monitor_snapshot.cjs:1139-1159`) stops enumeration at `slice + 1` name-sorted candidates; the correlation-first ordering (`:1186-1192`) can only reorder what was enumerated. Reproduced adversarially: a 301-file root whose path-correlated file sorts last → enumerated=false, `filesScanned=0`; with 61 flood roots plus that target root → `filesScanned=0` (target sorts last) vs `filesScanned=1` (target sorts first). This partially defeats refined-plan §2.3 bullet 3 ("order entries correlation-first ... collected inside its root's slice"). AC10/AC11 as written are root-centric and their binding fixtures (M1/M9) pass; reachability is a single/merged root with more than its slice of candidates where the target sorts late. Minimal correction: prioritize correlation during enumeration (pass the keys into `listTranscriptCandidates`, or collect correlated-path entries in a bounded pre-pass) while keeping the slice+1 truncation detection.

### Live dogfood `filesScanned: 0` (window-3 F1) — explained, not this edge

A read-only probe of the same 61 candidate roots with unbounded enumeration (bounded 256 KB tails, the monitor's own scope) found **zero** files whose path or retained window contains this workflow's id/slug. The live `filesScanned: 0, capped: true, scan-capped` is therefore absence of a correlated session in the candidate roots — and `scan-capped` is the correct vocabulary there (a capped scan cannot assert `no-matching-session`) — not the intra-root slice edge above.

### Other observer findings

- window-1 F5 / window-2 F6 (8 KB vs 256 KB scan/resolve mismatch) — fixed by the single sanitized window; covered by M2.
- window-1/2/3 F3 (frozen revision + active step) — the blind spot this feature addresses; expected that this run's own orchestrator (predating the ops) shows no `checkpoint`/`turn_paused` events. T1–T5/T9 + M5 verify the mechanism.
- window-3 F7 (no regressions from Step-4 edits) — corroborated: `npm run test` 128/128, harness-clean 0 findings.

## Stack Invariant Compliance

`scan_stack_invariants.cjs` (stack `typescript-node`) over the touched JS/scripts: 0 violations. Plan §6 boundaries:

| Boundary | Verdict |
|---|---|
| State-writer integrity | Verified: T1/T2/T5/T9 + `npm run test`; revision +1 exactly once; dual-write + plans-index refresh + `validateSnapshot` |
| Schema / input validation (DTO) | Verified: T4 (telemetry `additionalProperties: false`), T6/T7/T8/NS5/NS6 fail closed with byte-identical state |
| Concurrency / async safety | No new async primitives; watch loop bounds explicit (`--iterations` xor `--until-terminal`) |
| Observer read-only / lifecycle | No writes outside the observer report path; discovery opt-in; fixtures sandboxed via `monitor.hostHome` |
| Privacy of retained windows | Sanitize-before-correlate; single sanitized window stored; tails dropped before serialization |
| Portability / agent-agnostic | `test-runtime-portability.js` + `test-harness-clean.js` green; no host product names added |
| Consumer-data isolation | Product diff excludes `.ws/config.json`, `STACK.md`; `.ws/MEMORY.md` + memory note are consumer-owned (Step-4 self-learning) |

## Gaps and Next Steps

1. **Suggestion `intra-root-enumeration-stop` (AC11, open):** make within-root enumeration correlation-aware so a path-correlated candidate beyond the `slice + 1` stop is still collected inside its root's slice. Not a blocking AC defect; candidate follow-up for Step 6/8 triage or a later release.
2. **Suggestion `release-bump-deferred` (AC19, open):** release obligation (plan §3.9 item 2) not yet applied — `package.json` (line 3), `bin/skill-dependencies.json` `packageVersion`, and the site footer remain `0.4.65`, equal to the merge-base. Before push/PR (Step 8 pre-ship board row 1): `npm run build-site:bump` once, align `packageVersion`, rebuild `docs/index.html`, then `npm run generate-integrity` + `npm run verify-integrity` after the last product edit.
3. **Step 7 sabotage:** run `run_sabotage.cjs` against M1/M2/M5 (and T2/T3) regression assertions per plan §Sabotage verification (mutation config empty; `defaults.skipMutationTesting: true`).
4. **Live effectiveness caveat:** the dogfood environment had no matching session for this workflow, so AC10–AC13 effectiveness is proven by fixtures (M1–M3/M9) and unit-level checks, not by the live run; re-observe with `ws-monitor` on a run whose correlated session exists in a host store.

## Ledger linkage

- 19/19 ACs linked `Implemented` with file:line evidence, observed tests, and plan-index sections (`.runtime/plan.index.json`, 32 sections).
- 6/6 negative scenarios linked with observed exit-0 tests.
- Alias `backendTest` = `npm run test`, exitCode 0.
- 2 Suggestion findings (open, non-capping): `intra-root-enumeration-stop` (AC11), `release-bump-deferred` (AC19).
- Derived score: **10/10** at boundary `step5` (`earnedUnits 190/190`, `knownDefect false`, `missingEvidence false`, `errors []`).
