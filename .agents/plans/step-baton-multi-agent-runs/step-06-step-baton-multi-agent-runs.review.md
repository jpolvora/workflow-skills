---
step: 6
slug: step-baton-multi-agent-runs
workflowId: step-baton-multi-agent-runs-20260918T232508Z
status: completed
verdict: clean-with-suggestions
base: main
productCommit: 40af4ad4
acRefs: []
startedAt: "2026-09-18T23:25:08Z"
endedAt: "2026-09-19T00:22:31.521Z"
---
# Code Review — step-baton-multi-agent-runs (Step 6)

Verdict: **clean** — 0 Critical, 0 Warning, 2 Suggestions (non-blocking, no fix pass required to Advance).

## Scope

Pinned snapshot: product commit `40af4ad4` (30 files), reviewed via `git show 40af4ad4`.

Scope note: the literal range `git diff main...HEAD` contains unrelated prior merged work
(us-344 / us-347 delivery and fix batches, harness cleanups — 207 files). Per the surgical-diff
contract those out-of-scope files were excluded; every file below belongs to this workflow:

- `.agents/skills/ws-shared/runtime/scripts/step_baton.cjs` (new, 444 lines)
- `.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs` (new, 768 lines)
- `.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs` (+5: `finish` baton-release hook)
- `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs` (+10: baton + mappedRunner fields)
- Schemas: `config.schema.json`, `workflow-state.schema.json`, `telemetry.schema.json` (additive)
- Docs (ADD-only): `host-dispatch.md`, `gates.md`, `ws-spec-to-pr/SKILL.md`, `config.json.example`, PS1 editor
- Tests: 6 new `test/test-step-baton-*.js` suites + 10 fixtures; `package.json` chain; integrity regen

Working-tree preflight: `git status` shows no uncommitted workflow product files
(only plan/spec/memory run artifacts). Snapshot is stable.

## Phase 1–2: Triage + adversarial investigation

Twelve candidate hypotheses were raised and dropped for lack of a complete
4-part proof (no executable failure scenario or no untrusted boundary):

- `mirrorSpecMemo` `shell: true` on win32 — `cli` and `repoRoot` are operator-controlled
  local config/flags, not an untrusted boundary; the operator already has code execution.
- Stale-lock TOCTOU in `withBatonLock` — losers serialize on atomic `mkdir`; pid-liveness +
  mtime gate fails closed to `BATON_REVISION_CONFLICT`, never to a double claim.
- Expiry check not clearing the lease before claim — the claim overwrites atomically under
  the lockdir; re-claim verified by test.
- `releaseBaton` revision bump on free-holder finishes — monotonic claim nonce, harmless.
- Gate re-prompt on every retry turn — intended per BR3 (gates surface at coordinator).
- `killChild` SIGKILL no-wait / `timer.unref` / `promptInteractive` listener shape — no orphan
  or hang path reachable (non-TTY defaults before prompting; NS3 test asserts reaping).
- `validateRunConfig` redundant key parsing — behavior correct, covered by AC2/AC4 tests.
- Example config shipping a `stepRunners` entry — inert until the coordinator is explicitly
  invoked; matches the approved plan (P1).
- `computeBackoffMs` without jitter — single legitimate coordinator; capped retries surface
  the named conflict.
- Double `loadStateDisk` for the claim baseline — fail-closed either way (see CR-002).

Retained findings (hygiene only, no defect proof):

### CR-001 [Suggestion] open .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs:38-38

Unused constant `CLOSE_STEP` added by this commit; terminal detection uses
`TERMINAL_STATUSES` and `verifyAdvancement` uses `MAX_STEP`. Dead code, no behavior impact.

Score: 2/10. Sibling occurrences: none (single definition, zero references).

```suggestion
Remove the unused CLOSE_STEP constant, or use it where close-step semantics apply.
```

### CR-002 [Suggestion] open .agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs:491-492

The claim baseline reads disk twice (`beforeClaimRevision`, `beforeClaimStep`); a single
`loadStateDisk` call could supply both. Any interleave fails closed to
`STATE_CHANGED_UNDERFOOT`, so this is readability-only.

Score: 2/10. Sibling occurrences: repeated `loadStateDisk` calls elsewhere in the loop are
intentional re-reads after worker exit; not the same pattern.

```suggestion
Read once: `const baseline = loadStateDisk(jsonPath, mdPath).state;` and derive both values.
```

## Sibling sweep

Searched the full diff and sibling modules for each defect class:

- `exec(`/`execSync`/`shell: true` in new code: zero hits (win32 `taskkill` uses argv
  `spawnSync`; the one `shell:` expression is the win32-only spec-memo spawn, config-driven).
- Network surface (`listen(`, `createServer`, `http`, `fetch(`): zero hits — file-state turn
  signal only, per plan §6.1.
- Floating promises: `spawnWorker` awaited, `promptInteractive` awaited, `killChild` in the
  timeout path chained with `.catch()` (explicit handling per stack rule 2); `mirrorSpecMemo`
  is sync. Zero unhandled-promise paths.
- Harness neutrality over added lines: zero host-product contract terms. The single grep hit
  is the neutrality test's own denylist asserting absence (`test-step-baton-config.js`).

## MEMORY sweep

Compiled `.agents/skills/ws-shared/MEMORY.md` swept against the diff; no violations:

- user-gate ≤3 options (High): coordinator gates chunk via `chunkGateOptions(_, 3)`; shipped
  gate has 2 options; pure-helper tests cover auto/TTY/non-TTY.
- Token effective resolution (Medium): `{prompt}`-as-path stated in host-dispatch.md §7 and
  asserted by test.
- Fixture `.runtime` residue (Medium): receipts go outside the us-dir via `--receipt`; the
  coordinator writes only the allowlisted dispatch-prompt `.md` under `.runtime/`.
- Carve-out regression assertions (Medium): AC3 fallback, autoMode gate, spec-memo on/off all
  asserted in the same batch.
- Whole-file ownership sweep (Medium): docs edits are ADD-only; tier ladder and lite-inline
  carve-outs mirrored, `state.handoffs` pointer kept.
- Eval bulk regen (High): no eval files touched. Integrity (High): `bin/skill-integrity.json`
  regenerated in the product commit. CATALOG untouched.

## Stack Invariant Compliance

- Command: `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs --stack typescript-node --files <4 product files>`
- Result: exit 0 — `Scanned 4 file(s). Found 0 issue(s) (0 Critical, 0 Warning).`
- Note: bare `--files` basenames scan 0 files; full repo-relative paths are required.
- Rule pack `.agents/skills/ws-shared/runtime/stacks/typescript-node.md`: no `any`/ts-ignore
  (plain JS, precise runtime checks), zero floating promises, schema + `validateRunConfig`
  boundaries, argv-only spawn (`shell: false`), lockdir/child/timer cleanup in `finally`.
- `config.json.invariants`: `commitPlanFilesOnlyAtStep8: true` honored (no `{plansDir}` paths
  in the product commit); `skipQualityGates: false` honored.

## Local Reviewer Dry-Run

Not executed: `config.json.verification.localReviewCommand` and
`config.json.preview.localReviewCommand` are both empty, so no runner resolves per the skill
contract. The `preview.dryRunCommand` mirror (`npm run review:dry`) requires network plus
`OPENCODE_API_KEY` at run time; no key is present in this environment. No reviewer-reported
issues to ingest.

## Tests observed (this session, HEAD)

All six baton suites re-run and green, exit 0:

- `test-step-baton-config.js` (AC1–AC4, NS4), `test-step-baton-claim.js` (AC5, AC6, AC8; NS1, NS7)
- `test-step-coordinator.js` (AC7, AC9–AC14; NS2, NS3, NS5, NS6)
- `test-step-baton-telemetry.js` (AC15), `test-step-baton-monitor.js` (AC16),
  `test-step-baton-specmemo.js` (AC17)

Suites are effective, not vacuous: real coordinator subprocess runs, real `finish` round-trips,
timeout kill + no-stale-lock assertions, hash-tree read-only proof for the monitor, vault-call
counting via stub CLI, schema validation of every emitted telemetry line, and event-order
assertions.

## Apply fixes?

Suggestions only — optional one fix pass at orchestrator discretion; **Advance** (Step 7).
No Critical/Warning to clear, no re-review rounds needed.
