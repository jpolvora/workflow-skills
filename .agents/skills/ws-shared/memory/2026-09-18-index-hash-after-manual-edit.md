### [2026-09-18] refresh the plans index hash after manual state edits
- **Layer**: `harness`
- **Module**: `ws-spec-to-pr orch / plans index`
- **Severity**: `Medium`
- **PathPattern**: `.agents/plans/index.json`
- **Scenario / Context**: Manual `state.json` edits (flag flips, commits append) changed the state sha without touching the plans index, so pre-advance 6 failed fail-closed with "plans index state hash mismatch". The mismatch was correct behavior — the orch had skipped the sync step.
- **DO NOT**: Hand-edit `state.json` and proceed to a pre-advance check without refreshing the index row; never run a full rebuild-index to fix one row (it can prune legacy rows — see companion trap).
- **INSTEAD DO**: After any manual state edit, update that workflow's `stateSha256` + `updatedAt` in `.agents/plans/index.json` surgically, then re-run the pre-advance check.
