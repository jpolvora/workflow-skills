---
step: 8
slug: us-412-413-liveness-checkpoints
workflowId: us-412-413-liveness-checkpoints-20260924T043148Z
status: completed
workflowType: standard
acTotal: 19
acImplemented: 19
verificationScore: 10
startedAt: "2026-09-24T04:31:48Z"
endedAt: "2026-09-24T11:10:30.849Z"
acRefs: []
---
# us-412-413-liveness-checkpoints — Delivery Result

## Expected

Spec `0125-us-412-413-liveness-checkpoints` (sources: local, US-412 + US-413) — make an active workflow observable as alive, resumable, and not falsely stalled. 19 acceptance criteria:

- **Checkpoint / pause ops (AC1–AC5, AC9):** `update_state.cjs` gains `checkpoint` (sub-progress: completed unit ids, remaining count, revision +1, `checkpoint` telemetry) and `pause-turn` (step, reason, ISO timestamp, `nextAction`, `turn_paused` telemetry, revision +1); `finish` clears the pause marker and the finished step's checkpoint record.
- **Schema (AC6–AC7):** `telemetry.schema.json` accepts `checkpoint` / `turn_paused`; `workflow-state.schema.json` accepts checkpoint/pause fields; `validate_state.cjs` exits 0 on a well-formed state and non-zero on a malformed checkpoint record.
- **Agent contract docs (AC8, AC17):** `ws-spec-to-pr/SKILL.md` + `PROTOCOLS.md` document the turn-boundary pause/resume contract and that `autoMode` does not chain host turns; `ws-monitor/SKILL.md` + `observer-instructions.md` document pause-vs-stall and the shared correlation window.
- **Monitor liveness (AC10–AC16):** discovery budget / correlated-root prioritization so unrelated roots cannot starve the target session; one shared correlation window across scan filter + `resolveTranscriptSource`; honest `scan-capped` only when the matching file was not read; `worker-session-stall` when the correlated session is available and idle beyond the stall window; pause marker suppresses the stall; `--watch --until-terminal` exits on terminal status.
- **Tests / docs (AC18–AC19):** regression suites registered in `test/test-suites.json` with `npm run test` green; `README.md` + `FEATURES.md` describe the new operations, pause semantics, and `--until-terminal`.

## Done

- Implemented in commit `ad134fce` (`feat(us-412-413-liveness-checkpoints): verified implementation`), scope: `workflow_state.cjs`, `monitor_snapshot.cjs`, `telemetry.schema.json`, `workflow-state.schema.json`, `ws-spec-to-pr/SKILL.md` + `PROTOCOLS.md`, `ws-monitor/SKILL.md`, `observer-instructions.md`, `setup.md`, `gates.md`, `README.md`, `FEATURES.md`, `test-suites.json`, and new suites `test/test-liveness-checkpoints.js` (T1–T9, D1–D2) + `test/test-ws-monitor-liveness.js` (M1–M9).
- **Step 5 verify:** score **10/10** (190/190 units), 19/19 ACs Implemented, 6/6 negative scenarios observed green. Two non-blocking carry-over Suggestions recorded (`AC11 intra-root-enumeration-stop`, `AC19 release-bump-deferred`).
- **Step 6 review:** clean — **0 Critical, 0 Warning**; 2 carry-over Suggestions + 3 Info notes (IN-001/IN-002 pre-existing, out of scope; IN-003 no host coupling). Stack invariant scan exit 0.
- **Step 7 testing:** `npm run test` exit **0** (128/128 entries incl. both new liveness suites); Mutation **skipped** (`defaults.skipMutationTesting: true` + empty `verification.mutationTest`); Regression Sabotage **passed** (`test-failed-as-expected`, byte-identical restore, helper exit 0).
- NS1–NS6 bound to M1/M2/M5/M6/T6/T7 all observed green (pre-fix red / post-fix green proven in Step 6 via a baseline-archive temp tree).

## Next steps

- Step 8 pre-ship board: one patch version bump above merge-base (`npm run build-site:bump`), rebuild `docs/index.html`, regenerate + verify integrity digests, harness audit, then push + PR.
- Optional follow-up (non-blocking, out of this workflow's scope): CR-001 intra-root enumeration narrow edge (correlated file beyond a large root's enumerated window degrades to honest `scan-capped`); IN-001 `commit_g2_code.cjs` plans-index refresh; IN-002 `compactOutputs` unescaped heading regex.
- Step 9: converge PR review threads / CI; merge only when threads == 0 and required checks green.

## References

- Spec: `.agents/plans/us-412-413-liveness-checkpoints/step-00-us-412-413-liveness-checkpoints.spec.md` (of record `.agents/specs/0125-us-412-413-liveness-checkpoints.spec.md`)
- Plan: `step-02-us-412-413-liveness-checkpoints.plan.refined.md`
- Check: `step-05-us-412-413-liveness-checkpoints.plan.report.md`
- Review: `step-06-us-412-413-liveness-checkpoints.review.md`
- Testing: `step-07-us-412-413-liveness-checkpoints.testing.report.md`

## Timing

| Metric | Value |
|--------|-------|
| Total wall-clock time | 2h 38m 19s (9499s agent execution) |
| Steps executed | 7 (0–7; Step 3 skipped `dag-disabled`) |
| Total tokens | 0 (estimated: false — host reported no per-step token metadata) |
| Lines added | +1321 |
| Lines removed | -85 |
| Net LOC delta | +1236 |
| Baseline LOC | 313788 |
| Final LOC | 315024 |

### Step breakdown

| Step | Label | Model | Elapsed | Tokens (est.) | Files changed |
|------|-------|-------|---------|---------------|---------------|
| 0 | Spec | opencode-go/deepseek-v4.1-flash | 31s | 0 | 6 |
| 1 | Planning | opencode-go/deepseek-v4.1-flash | 1468s | 0 | 1 |
| 2 | Interview | opencode-go/deepseek-v4.1-flash | 1690s | 0 | 2 |
| 3 | Plan to tasks | opencode-go/deepseek-v4.1-flash | 0s | 0 | 0 (skipped) |
| 4 | Implement | opencode-go/deepseek-v4.1-flash | 2321s | 0 | 15 |
| 5 | Verify | opencode-go/deepseek-v4.1-flash | 2044s | 0 | 2 |
| 6 | Code review | opencode-go/deepseek-v4.1-flash | 1592s | 0 | 1 |
| 7 | Testing | opencode-go/deepseek-v4.1-flash | 353s | 0 | 2 |
