---
step: 6
slug: us-414-run-state-integrity
workflowId: us-414-run-state-integrity-20260924T170500Z
status: completed
startedAt: "2026-09-24T17:35:00Z"
rounds: 1
residual: none
endedAt: "2026-09-24T21:33:05.201Z"
acRefs: []
---
# Code review — us-414-run-state-integrity

Scope: G2 commit `50455501` only (10 files, +405/-30). Base for review:
`git show 50455501` (committed diff vs parent), not `main...HEAD`.
Verification aliases cited from observed runs: `npm run test` exit 0 (131/131
local entries, pre-review tree); targeted suites green (preset, provenance,
state-contract, script-ux, terminal-close, update-yaml, coordinator, liveness,
enable-dag, run-state-integrity).

## Findings (round 1)

1. **[Fixed] finishFingerprint omits prNumber/prUrl (AC3).** A repeat
   `finish --step 9 --ship-status merged` changing only PR fields would match
   the prior fingerprint and be replay-restored, silently dropping the update.
   Fix: `workflow_state.cjs:L135-L137` includes `prNumber`/`prUrl` in the
   fingerprint. Pin: `AC3: pr-only update not swallowed by replay`
   (`test-run-state-integrity.js`, green). Ledger: `ev-ac3-revfix`.
2. **[Advisory, accepted] Dispatch gate throws for pre-fix states carrying an
   unknown `state.modelsPreset`.** Intended fail-closed behavior per AC1 (a
   degraded run stops loudly instead of continuing silently). No change.
3. **[Advisory, accepted] `resolveRecordedModelDetails` mutates
   `options.model`.** Contained: dispatch overwrites `options.model` from
   `state.currentModel` right after; the resolver is not exported. No change.
4. **[Checked] `check_fixpr_rounds.cjs` path safety.** `--pr` flows only into a
   filename prefix over `readdir` results; traversal input matches nothing and
   fails closed. No change.
5. **[Checked] Contract change to `test-models-preset-and-per-step.js`.**
   Spec-mandated (AC1 replaces warning-only fallback); surfaced as an explicit
   decision in the PR description. Combined with the new suite, unknown presets
   are pinned at CLI and resolver levels. No further change.

## Verdict

One fix applied (finding 1); no residual threads from this review. Re-review of
the fix: syntax check exit 0, `test-run-state-integrity.js` exit 0 (includes
the new replay pin), fingerprint diff limited to two added lines.
`Learning: N/A (reviewer found one real defect, fixed and pinned; no new
project knowledge beyond the recorded trap candidates at close)`.
