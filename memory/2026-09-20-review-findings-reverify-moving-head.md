### [2026-09-20] Re-verify review findings when HEAD can move mid-session

- **Layer**: `DevOps`
- **Module**: `code-review`
- **Severity**: `Medium`
- **PathPattern**: `.agents/plans/**, .agents/specs/**`
- **Scenario / Context**: A read-only review of `dcc3aa10..origin/main` ran while a previously dispatched workflow (`code-review-findings-fixes`) finished its step 8 in another process. HEAD advanced from `3cbdd0b9` to `257de1e5` and then `2b9d5b89` mid-review; subagent findings captured against the earlier tree risked reporting issues that the concurrent commits had already fixed.
- **DO NOT**: trust review findings gathered at session start when the working tree or HEAD can change during the session, and do not report a finding without re-checking it against the current tree.
- **INSTEAD DO**: record the HEAD SHA at review start, re-verify every finding against the current working tree (grep/read the exact file:line) before consolidating, and state the verified SHA in the report and spec.
