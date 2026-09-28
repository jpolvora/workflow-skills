---
id: 446
slug: us-446
title: "ws-ship-pr/scripts/verify.cjs: skip empty verification aliases instead of executing them"
source: github
specDate: 2026-09-27
issueState: open
issueUrl: "https://github.com/jpolvora/workflow-skills/issues/446"
labels:
  - bug
step: 0
workflowId: us-446
status: completed
startedAt: "2026-09-27T20:22:09.227Z"
endedAt: "2026-09-27T20:22:09.227Z"
acRefs: []
---
# Specification - ws-ship-pr/scripts/verify.cjs: skip empty verification aliases instead of executing them

## Description

`ws-ship-pr/scripts/verify.cjs` is the project-agnostic verification gate run during the ship phase. It reads `.ws/config.json` `verification.*` aliases (`backendBuild`, `backendTest`, `frontendBuild`, `frontendTest`) and executes each through `sh()`, which calls `spawnSync(cmd, { shell: true })`. The current implementation executes every resolved alias unconditionally, including values that are empty or whitespace-only (for example `"backendBuild": ""`). Passing an empty command to `spawnSync` with `shell: true` yields `status === null`; `sh()` then coerces that null to `1` via `r.status ?? 1`, so the gate aborts on an alias that was intentionally left unset. The intended behavior is that an empty alias means "not configured" and is skipped with a visible note, while any non-empty alias keeps today's fail-closed semantics.

Affected surface (upstream skill of record): `.agents/skills/ws-ship-pr/scripts/verify.cjs`. A regression test under `test/` (or the skill's existing test surface) must cover the empty-alias path. The change is behavior-compatible for consumers that configure every alias non-empty.

Technical boundary: the fix is limited to resolving and guarding the alias values inside `readVerificationConfig` and `main`. It must not change base-branch detection, the frontend-touched heuristic, the integrity check, or the process exit-code contract.

## Acceptance Criteria

- AC1: `verify.cjs` skips execution of any `verification.*` alias whose resolved command is empty or whitespace-only.
- AC2: A skipped alias prints a visible note in the form `==> <alias> (skipped: not configured)` to stdout.
- AC3: A non-empty alias still executes and a non-zero exit aborts the gate with process exit code 1.
- AC4: A config where every `verification.*` alias is empty exits 0 and prints `VERIFY_OK`.
- AC5: The frontend aliases `frontendTest` and `frontendBuild` receive the same empty-alias guard as the backend aliases.
- AC6: An automated test feeds an all-empty `verification` config and asserts that no empty shell command is spawned.

## Original Issue Context

### Original Issue Body

Quoted below. The source issue rendered its acceptance bullets with a leading `- ACn:` marker; those lines are reproduced here with a `*` marker so they do not collide with the canonical acceptance-criteria list above.

```markdown
## Summary

`ws-ship-pr/scripts/verify.cjs` executes every resolved verification command unconditionally. When `config.json` `verification.*` keys are present but empty (e.g. `"backendBuild": ""`), the empty string is passed to `spawnSync(cmd, { shell: true })`, which aborts the verification leg instead of skipping the unset alias.

## Steps to reproduce

1. In a consumer project set `.ws/config.json`:

   "verification": { "backendBuild": "", "backendTest": "npm run test" }

2. Run the ship step (`ws-ship-pr`) or `node {skillsRoot}/ws-ship-pr/scripts/verify.cjs`.

## Observed

`verify.cjs` aborts on the empty `backendBuild` alias; the intended checks (`backendTest`, integrity) never run through the gate, so the ship step has to run them manually.

## Expected

Empty / whitespace-only verification aliases are skipped with a visible note; non-empty aliases still run fail-closed. The script exits 0 only when every executed check passes.

## Suggested fix

In `readVerificationConfig`, trim values and treat empty as `null`; in `main()`, guard each `sh(...)` call and print `==> <alias> (skipped: not configured)` when the command is empty. Apply the same guard to the frontend aliases.

## Acceptance criteria

* AC1: `verify.cjs` skips (does not execute) any empty or whitespace-only `verification.*` alias and logs the skip.
* AC2: Non-empty aliases still run and fail closed on a non-zero exit.
* AC3: A config with all aliases empty exits 0 with `VERIFY_OK` and prints skipped notes.
* AC4: A test fixture covers the empty-alias config and asserts no shell execution of an empty command.

## Notes

Observed during a standard Spec-to-PR ship step in a Node 22 skills-package consumer; the workflow completed with the intended checks run manually (all green). Secondary: the integrity lookup hardcodes `bin/generate-skill-integrity.js` - confirm the intended script name/path.
```

### Prior Work Sweep

- Provider sweep (`node .agents/skills/ws-spec-provider-github/scripts/sweep_prior_work.cjs --issue 446 --keywords verify.cjs verification alias ship`, exit 0): one merged PR matched the `#446` search string (PR #281, `release(0.3.62): fix native transition-gate stall`, state `MERGED`). No open PR targets this issue and no commit output was returned.
- No duplicate-risk item: there is no open pull request for tracker id 446, and the matched PR is merged and unrelated to the empty-alias defect.

### Design Intent

- `verify.cjs` was ported from the former `verify.sh` (`commit 7c2929d2`, "unique Node-22 skill script runtime") as a direct translation of the shell flow. The shell pipeline had already dropped any `-n`/test-`[ -n "$cmd" ]` guard, so the unconditional `sh()` call is an accidental gap introduced by the port, not an intentional constraint.
- `verify.cjs:12-15` (`sh`) and `verify.cjs:100-103` (`console.log` + `sh` per alias) confirm the resolved empty string reaches `spawnSync` with `shell: true`; the `r.status ?? 1` coercion turns the `null` status into a hard failure.
- Later change `ae3806d6` ("feat(code-review-round-2-fixes): verified implementation") did not introduce an alias guard either. Greenfield status: N/A because this is a modification of an existing script.

## Notes

- `readVerificationConfig` already defaults absent keys to `''` (`verify.cjs:62-65`); the fix should normalize whitespace-only values in the same helper (trim, then treat empty as `null`/absent) so all call sites share one decision.
- The fallback branch used when `.ws/config.json` is missing supplies non-empty defaults (`dotnet build`, `dotnet test`, `npm run build`, `npm test`); those must keep executing, so the guard belongs on resolved values, not on the presence of the config file.
- Secondary observation from the issue: the integrity step probes `path.join(repoRoot, 'bin', 'generate-skill-integrity.js')` and silently skips when it is absent (`verify.cjs:113-117`). That path exists in this repository; consumers that do not ship it already no-op. It is out of scope for this defect and recorded as an open question.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Changing the integrity-script path or its `existsSync` guard | Secondary observation only; the empty-alias defect is independent and the path resolves in this repo |
| Altering exit-code semantics for non-empty aliases | Current fail-closed behavior is correct and AC3 explicitly preserves it |
| Refactoring base detection, frontend-touched detection, or env-var fallbacks | Not implicated by the defect and would widen the blast radius |
| Adding new verification aliases or new config keys | No requirement; the change only guards existing keys |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Skip-note text | `==> <alias> (skipped: not configured)` | Matches the issue's suggested fix so consumers and tests can grep a stable string | y |
| Whitespace-only values | Trim, then treat as empty and skip | The issue explicitly names "empty or whitespace-only" | y |
| Frontend guard parity | Apply the same empty check to `frontendTest` and `frontendBuild` | The issue requests parity for the frontend aliases | y |
| Integrity-script path | Leave `bin/generate-skill-integrity.js` unchanged and keep the `existsSync` skip | In this repo the path exists; consumers without it already skip silently | n |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded scope | Only `verify.cjs` alias resolution/guards and one regression test change | `git diff --stat` lists only those files |
| Atomic criteria | AC1-AC6 each map to one observable behavior | Review the AC ledger against the diff |
| Failure modes | Empty-alias skip and non-empty fail-closed paths both exercised | Negative scenarios below plus `npm run test` |
| Observation telemetry | Skipped notes and `VERIFY_OK` are printable and greppable | Run `node .agents/skills/ws-ship-pr/scripts/verify.cjs` with an empty-alias fixture |
| Zero open blockers | No tracker or network dependency needed to implement | Spec is self-contained; sweep completed with no open conflicting PR |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node .agents/skills/ws-ship-pr/scripts/verify.cjs` prints `==> <alias> (skipped: not configured)` for each empty alias and `VERIFY_OK` on overall success.
- Process exit code from `verify.cjs` (0 only when every executed, non-empty check passes).
- `npm run test` (the configured `verification.backendTest` alias) exercises the added regression fixture.

### Negative & Failing Test Scenarios

- Given a config whose aliases are all empty, `sh()` is never invoked with an empty string; the test fails if an empty command reaches the spawn stub.
- Given a non-empty alias mapped to a failing command, `verify.cjs` exits 1; the test fails if the new skip guard swallows a real non-zero exit.
- Given `backendTest: "   "` (whitespace only), the alias is treated as not configured and skipped rather than executed.
