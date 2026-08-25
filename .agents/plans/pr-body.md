## Summary
- Drop `ws-patterns` and session leases / git.lock from shipped skills, orch, config, installer, and tests so workflows stay lighter; keep `ws-self-learning` MEMORY.
- Freeze Python state helpers to Node (`update_state` / `validate_state` exec wrappers) and add HTTP retry / UTF-8 resilience helpers.
- Drop the root `AGENTS.md` byte cap while keeping consumer hub context budgets; package **0.3.38**.

## Test plan
- [x] `bash .agents/skills/ws-ship-pr/scripts/verify.sh` (VERIFY_OK)
- [x] `npm run verify-integrity` (v0.3.38)
- [x] `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` (PASS)
- [x] Phase 5a: duplicates / shell-quoting / measure_harness
- [x] `node test/test-context-budget.js`

