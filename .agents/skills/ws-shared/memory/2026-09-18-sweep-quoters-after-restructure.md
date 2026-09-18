### [2026-09-18] Restructured contracts need a quoting-file sweep
- **Layer**: `application`
- **Module**: `ws-shared/runtime/gates.md`
- **Severity**: `Medium`
- **PathPattern**: `.agents/skills/**/*.md`
- **Scenario / Context**: A gate contract was restructured (example: Step 8 five-option menu chunked into primary + overflow), but dispatch tables, protocol docs, and FAQ entries quoting the old shape were left stale — each stale copy re-introduces the exact stall the restructure fixed.
- **DO NOT**: Restructure a contract file without sweeping its quoters, and do not trust the reviewer's file list as complete — run your own grep for the retired phrasing.
- **INSTEAD DO**: After any contract restructure, grep the skills tree for the retired tokens (old menu text, option numbers, combined-menu phrasing) and reconcile every quoter (dispatch tables, protocols, FAQ) in the same batch; assert zero residual hits before committing.
