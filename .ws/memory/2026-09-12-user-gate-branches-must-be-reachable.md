### [2026-09-12] Documented user-gate branches must be reachable

- **Layer**: `harness`
- **Module**: `ws-wiki/from-code gate flow`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-wiki/*.md`
- **Scenario / Context**: Agentic code review scored 6/10 on PR 323. `FROM-CODE.md` documented `mode: overwrite`, but the start gate offered only "Start merge reconstruction" or "Cancel", so the step 3 condition "operator did not pick merge" was unsatisfiable and the overwrite mode was dead. `test/test-wiki.js` only asserts option strings, so the suite stayed green.
- **DO NOT**: Document a later gate or condition that an earlier gate's option set makes unreachable; do not rely on string-presence tests to prove a branch is reachable.
- **INSTEAD DO**: For every documented mode/branch, expose an option in the deciding gate that selects it (then use a separate confirm gate for destructive actions), and sweep sibling companions (`INIT.md`, `PHASE-*`) for the same unreachable-gate class before resolving.
