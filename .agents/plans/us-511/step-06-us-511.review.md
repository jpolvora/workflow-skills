---
step: 6
slug: us-511
workflowId: us-511-20261013T040003Z
status: completed
verdict: pass
base: main
reviewedCommit: dbd9a655397fe390e86ef2fc78454813e229c29b
startedAt: "2026-10-13T04:20:00.000Z"
endedAt: "2026-10-13T04:20:00.000Z"
acRefs: []
---
# Code Review — us-511

**Scope:** `git diff 62549385..HEAD` (baseline `62549385` → product commit `dbd9a655`)
**Plan of record:** `step-02-us-511.plan.refined.md`
**Reviewer model:** session current (reviewer role) · **Jury:** off
**Local dry-run:** `preview.localReviewCommand` is empty → skipped (`preview.dryRunCommand`
requires network + API key; not run per `defaults` posture).

## Diff reviewed

| File | Δ |
|------|---|
| `.agents/skills/ws-spec-provider-github/scripts/fetch_threads.cjs` | +36/−? token fallback + message |
| `.agents/skills/ws-spec-provider-github/INTENTS.md` | `validate-auth` chain |
| `.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md` | token chain |
| `.agents/skills/ws-fix-pr/README.md` | auth cell |
| `test/test-fetch-threads-token-fallback.js` | new (336 lines) |
| `test/test-suites.json` | +2 registrations |
| `test/COVERAGE.md` | coverage note |
| `bin/skill-integrity.json` | regenerated digests |

## Phase 1 — correctness & scope

- **Precedence preserved (AC1/AC2):** env chain unchanged and evaluated first; the
  subprocess is unreachable when any variable is truthy. `resolveToken()` now returns
  `{ token, source }`; the only caller is `main()`. No other call site exists
  (`grep resolveToken` → definition + `main()`).
- **Fail-closed ordering (AC5/AC6):** resolution remains after remote parsing and before
  the GraphQL request (`:137` precedes `:169`). Failure exits 1 with the message naming the
  three variables **and** `gh auth login`.
- **Secret handling (AC8):** token travels only into `Authorization: Bearer`; the CLI note
  carries a source *name* only. `execSync` captures stdout and discards stderr
  (`stdio: ['pipe','pipe','ignore']`).
- **Frozen surface (AC13/AC14):** zero-thread branch and `--json` keys untouched.
- **Shim integrity (AC9/AC10):** `ws-fix-pr/scripts/fetch_threads.cjs` is byte-identical
  (not in the diff); it still re-execs the canonical path with inherited stdio.
- **Surgical diff:** no unrelated edits; no new dependency; no `.py`; Node 22 CJS only.

## Phase 2 — adversarial pass (fable-style)

| Attack | Result |
|--------|--------|
| Precedence inversion (CLI consulted first) | Not present — `if (envToken) return …` precedes the `try`. |
| Empty-string token treated as valid | `if (token)` guards the trimmed CLI value; empty falls through to `null`. |
| CLI stderr forwarded (leaks auth diagnostics) | `stdio[2]='ignore'`; test asserts stub stderr absent. |
| Credential persisted/logged | No writes; sentinel scan over the temp repo yields zero hits. |
| Failure path degrades to exit 0 empty list | `process.exit(1)` before the request; test asserts zero-thread text absent and no `fetch` call. |
| Regression in shared-runtime resolution | `test-skills-runtime-resolution.js` green; `HUB_SCRIPTS_DIR` block untouched. |
| Payload drift | `test-provider-parity.js` `activeThreads` literal green; `--json` key test green. |
| Test non-hermetic (live `gh`/network) | Fixture uses temp git repo, PATH `gh` stub, `--require` fetch shim, scrubbed env. |

**Adversarial verdict:** no REFUTED/CAVEATS claim. No critical or warning findings.

## Findings

None open. Non-blocking observations (no action required):

1. The spec paraphrases the zero-thread string as `No active unresolved threads found.`; the
   shipped string is `No active unresolved review threads found.`. The test asserts the real
   string. Recorded in the Step 5 report; the string itself is out of scope.
2. NS1 "gh absent" is simulated by a stub exiting 127 (host ships a real `gh`); same failure
   bucket as the spec groups.
3. AC12's diagnostic is emitted only when the CLI fallback supplies the token (the AC's own
   condition); env-sourced runs stay quiet.

## Verdict

**PASS.** No review fix required; no product files changed in Step 6, so no second product
commit. Proceed to Step 6b fresh verify.
