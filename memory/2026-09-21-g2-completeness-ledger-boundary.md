### [2026-09-21] G2-Code Completeness and Ledger scoreState Boundary

- **Layer**: Tests / Workflow harness
- **Module**: ws-spec-to-pr (commit_g2_code, update_state, ac_ledger)
- **Severity**: Medium
- **PathPattern**: `.agents/plans/*/`, `.agents/skills/ws-spec-to-pr/scripts/*`
- **Scenario / Context**: Standard run where a scoreAndRefine worker edited product files without calling `update_state finish` (the re-verify step does the finish). The Step 5 G2 commit then staged only manifest-recorded files, silently leaving the refine round's files uncommitted, and pre-advance 6 failed on the leftover dirt. Separately, an orch `ac_ledger link` without `--boundary` persisted scoreState at `pre-step6`, which failed pre-advance 7 (`step5` boundary expected), and `verify --persist-score` is not wired so it silently did not persist.
- **DO NOT**: assume a G2-code commit captured the whole worktree, or assume any ledger mutation leaves scoreState valid for the next gate.
- **INSTEAD DO**: after every G2-code commit, diff `git status` against the state manifest `files_touched`; merge leftovers via `update_state finish --step N --created/--modified` and commit the remainder before advancing. After any `ac_ledger link`, persist scoreState at the exact boundary the next pre-advance expects (`link --boundary step5 --plan-index …` when the next gate is Step 7; default `pre-step6` only fits Step 6). Verify with `validate_state --pre-advance N` before dispatching.
