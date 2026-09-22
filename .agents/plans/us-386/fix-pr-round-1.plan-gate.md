# Fix-PR round 1 gate — PR #394 (Step 9)

Date: 2026-09-22. Active threads at entry: 1 (score 6, WARNING, `test/test-proof-of-work.js:2`).

## Thread 1 — no executable coverage of the transition (score 6, fix-code)

Reviewer claim: surface-string asserts never exercise disabled / manual opt-in / automatic / autoMode / missing collector / missing browser / token resolution / non-commit behavior; a regression could gut the gate while tests pass. VERDICT: valid gap, fix.

### Plan (gate-only, no product edits in this section)

1. Add pure decision helper `.agents/skills/ws-shared/runtime/scripts/resolve_proof_of_work.cjs` implementing the gates.md/resolution contract: explicit-true switches, autoMode-no-block, gate-decision input, collector/browser fail-closed skips, `{projectRoot}`/`{slug}` folder resolution. Reads one config file; writes nothing; stdout JSON; exit 0 on decision, 2 on usage error.
2. Reference the helper from gates.md (one line — executable contract pointer).
3. Extend `test/test-proof-of-work.js` with an 11-case spawn matrix (temp configs under `os.tmpdir()`): disabled (omitted + false), manual start/skip, automatic normal, automatic autoMode, autoMode auto-skip, collector-missing, no-browser-capability, custom token folder, no-files-written.
4. Verify: new test green, config-editor green, invariant scan clean, full `npm run test` green, integrity regen + verify.
5. Commit `fix(#386): executable proof-of-work transition coverage [review-round-1]`, push, post fix reply on thread 4068623497, resolve via `resolveReviewThread`, re-check CI + threads.

Out of scope for this round: packaging a collector skill, PR comments, evidence auto-commit (spec out-of-scope).
