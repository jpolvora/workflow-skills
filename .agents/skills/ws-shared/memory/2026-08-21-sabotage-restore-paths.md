### [2026-08-21] Sabotage restore proof vs whole-tree HEAD
- **Layer**: `Infrastructure`
- **Module**: `ws-testing / run_sabotage.py`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/ws-testing/scripts/run_sabotage.py, test/test-hermes-spec-to-pr-enhancements.js`
- **Scenario / Context**: Proving sabotage restore with `git diff` vs HEAD on the whole working tree false-aborts when other tracked files are already dirty (typical Step 5 uncommitted product files). Invert tests that only run `false` / `exit /b 1` never bite production logic.
- **DO NOT**: Treat whole-tree `git diff` vs HEAD as restore success, or use a no-op invert command as the only invert proof.
- **INSTEAD DO**: Snapshot sabotaged `--paths` bytes, restore from that snapshot, and prove invert with a content-aware failing test. Fail closed on apply/restore errors without appending patch text into source files.
