### [2026-09-19] Harness-owned lock dirs under .runtime need a RUNTIME_NAMES entry

- **Layer:** infrastructure
- **Module:** ws-shared / step_baton + workflow_state validator
- **Severity:** Medium
- **PathPattern:** .agents/skills/ws-shared/runtime/scripts/step_baton.cjs;.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs
- **Scenario / Context:** `withBatonLock` mkdirs `{us-dir}/.runtime/baton.lock` for the claim/release critical section, but `RUNTIME_NAMES` had no `baton.lock` pattern, so `validateSnapshot` (run on every `performUpdate` op and in the coordinator pre-advance gate) threw `unknown .runtime residue: baton.lock` whenever a second coordinator held the lock while the first run's worker validated. Single-coordinator runs never trip it (lock released before spawn), so the gap hid until contention. This is the inverse of the fixture-residue trap: here the unknown name is harness-owned and must be allowlisted, not moved.
- **DO NOT:** Place a harness-owned lock, socket, or transient dir under `{us-dir}/.runtime/` without adding its stem to `RUNTIME_NAMES` — the fail-closed validator will abort healthy contending turns.
- **INSTEAD DO:** Add `/^<stem>$/` to `RUNTIME_NAMES` next to the other coordinator transients (`sentinel.pid`, `revision`, `blocked-reason`) in the same change that introduces the `.runtime` writer; cover it with a held-shape positive case (dir + inner file present → validate AND finish exit 0).
