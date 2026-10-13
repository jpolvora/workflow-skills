# Fresh-Worker Verification — us-510 (Step 6b)

**Method:** every acceptance criterion re-derived from the spec, then one fault
injection per critical AC on a **scratch worktree** at the product commit
(`f7284f01`). Evidence-or-zero: a claim counts only when an observed command
proves it. The shared worktree was never mutated by the injection runs.

## Re-derivation of the AC verdicts

Each AC was re-read from `step-00-us-510.spec.md` and matched to the observable in
`test/test-state-bootstrap-init.js` / `test/test-state-bootstrap.js`. No AC is
credited from prose alone; every row cites a runnable assertion. Result: 21/21
criteria carry an observable assertion (`node test/test-state-bootstrap-init.js`
exits 0; `node test/test-state-bootstrap.js` exits 0).

## Fault injection (scratch worktree, one fault per round)

| Round | AC under test | Injected fault | Outcome |
|-------|---------------|----------------|---------|
| F1 | AC8 (idempotent replay) | Disabled the existing-pair branch so the bootstrap rewrites instead of replaying | **DETECTED** — `AC8 replay reported idempotent` failed |
| F2 | AC12 (partial pair) | Removed the `mdExists !== jsonExists` guard | **DETECTED** — `AC12 lone markdown refused` failed |
| F3 | AC13 (baseline shape) | Removed the `^[0-9a-fA-F]{7,40}$` baseline check | **DETECTED** — `AC2/AC13 non-hex baseline rejected` failed |
| F4 | AC16 (no residue) | Removed the failed-write rollback loop | **DETECTED** — `AC16 no partial pair member (json)` failed |

Restore check: after restoring the runtime, the module is **GREEN** in the same
worktree, and `git worktree remove` left the shared worktree at `f7284f01` [develop].

## Zero-finding verdict

- No AC is credited by a passing test that survives its own fault (all four
  injections flipped a green assertion to red, proving the tests have teeth).
- No fault injection altered the shared worktree or any sibling path.
- No defect surfaced, so no fix loop was required (round 0 of max 3).

**Verdict:** no defect found; the AC set is verified with injected-fault evidence.
