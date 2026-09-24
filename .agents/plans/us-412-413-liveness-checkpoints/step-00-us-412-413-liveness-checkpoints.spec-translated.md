## Unattended autoMode runbook — checkpoints, pause state, monitor stall

> Source: `step-00-us-412-413-liveness-checkpoints.spec.md` · Consulted: agent spec, issue snapshots (412/413), tracker issues (gh), `.ws/MEMORY.md`, `.ws/CHANGELOG.md`, `README.md`, hub rules (`AGENTS.md`, `.ws/AGENTS.md`), site docs (`docs/index.html`), spec-memo vault (0 matches) · Not found: none

### Implementation
1. Add a **checkpoint** operation to `update_state.cjs` that accepts `--step` and `--progress` and stores the step's completed unit ids and remaining unit count in `{workflow-id}.state.json`; each call appends a **checkpoint** telemetry event and increments **revision**. (AC1, AC2)
2. Add a **pause-turn** operation that accepts `--step` and `--reason` and stores a turn-boundary **pause marker** (`step`, `reason`, ISO `at`, `nextAction`) in state; each call appends a **turn_paused** telemetry event and increments **revision**. (AC3, AC4, AC9)
3. On **finish**, clear the pause marker and the checkpoint record for the finished step before rendering the state. (AC5)
4. Extend **telemetry.schema.json** and **workflow-state.schema.json** to accept the new event types and fields; keep `validate_state.cjs` green on a state that carries them. (AC6, AC7)
5. Document the turn-boundary pause/resume contract in `ws-spec-to-pr/SKILL.md` and `PROTOCOLS.md`: autoMode removes gate halts but does not chain host turns. (AC8)
6. In `monitor_snapshot.cjs`, reserve a per-root scan budget (or read the correlated root first) so unrelated roots cannot exhaust the per-tick file/time budget before the target session. (AC10, AC11)
7. Use one shared correlation window for the scan filter and `resolveTranscriptSource`; report **scan-capped** only when the scan stopped before reading the matching file. (AC12, AC13)
8. Emit **worker-session-stall** when the correlated session is **available** and idle beyond **stallWindowMs** (600000 ms) while the workflow is active; suppress it when state carries a turn-boundary **pause marker** and report the pause instead. (AC14, AC15)
9. Add **--until-terminal** to `monitor_snapshot.cjs --watch` (alternative to `--iterations`) so the watch exits when the selected workflow leaves **active** status. (AC16)
10. Document the pause-versus-stall distinction and the shared correlation window in `ws-monitor/SKILL.md` and `observer-instructions.md`. (AC17)
11. Add regression tests for the discovery budget, shared-window correlation, pause suppression, and the checkpoint/pause operations; register them in `test/test-suites.json` so **npm run test** is green. (AC18)
12. Sync `README.md` and `FEATURES.md` with the new operations, pause semantics, and the **--until-terminal** flag. (AC19)

### UI Test
1. Run `node .agents/skills/ws-monitor/scripts/monitor_snapshot.cjs --slug us-412-413-liveness-checkpoints --discover-host-transcripts --json` in a session store with many unrelated roots; verify `transcript.filesScanned >= 1` and an honest `capped` flag. (AC10, AC11)
2. Correlate a session whose workflow id appears only between the 8 KB and 256 KB tail; verify `transcriptSource.status` is **available**, not `scan-capped`. (AC12, AC13)
3. Leave an active run idle past the stall window with an available correlated session; verify the **worker-session-stall** finding appears. (AC14)
4. Add a turn-boundary pause marker to that run's state and re-run the monitor; verify no **worker-session-stall** and a reported pause. (AC15)
5. Run `--watch --until-terminal` on an active run; verify it exits when the workflow reaches a non-active status, and that combining it with `--iterations` fails with a usage error. (AC16)
6. On a scratch workflow, run **checkpoint** and **pause-turn**; verify `state.json` shows the progress/marker and `revision` advanced, and `telemetry.jsonl` gained **checkpoint** / **turn_paused** lines. (AC1, AC2, AC3, AC4, AC9)
7. Run **finish** for that step; verify the pause marker and checkpoint record are gone. (AC5)
8. Run `validate_state.cjs` on the state carrying the new fields (exit 0) and on a malformed checkpoint record (non-zero exit). (AC6, AC7)
9. Read `ws-spec-to-pr/SKILL.md`, `PROTOCOLS.md`, `ws-monitor/SKILL.md`, `observer-instructions.md`, `README.md`, and `FEATURES.md`; verify the pause contract, shared window, and flag are documented. (AC8, AC17, AC19)
10. Run `npm run test`; verify the new suites run and the suite exits 0. (AC18)

### Out of scope
- Preset-name validation hardening beyond the existing graceful fallback.
- New transcript host adapters.
- step_coordinator / baton checkpoint parity.
- Config schema keys or GUI bindings.
- Auto-merge policy changes.
- ws-spec-to-pr-lite orchestration changes.

### Open questions
- Should the lite pipeline adopt the same pause/checkpoint operations (the shared script exposes them, but lite docs stay as-is)?
- Should `--until-terminal` also treat **blocked** as terminal? Chosen default: yes (exit on any non-active status).
