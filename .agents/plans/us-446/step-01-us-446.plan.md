---
superseded: true
supersededBy: step-02-us-446.plan.refined.md
superseded: true
supersededBy: step-02-us-446.plan.refined.md
slug: us-446
title: Skip unconfigured verification aliases in ws-ship-pr
status: completed
step: 1
workflowId: us-446-20260928T021400Z
startedAt: "2026-09-28T02:14:00Z"
endedAt: "2026-09-28T02:21:45.035Z"
acRefs: []
---
## 0. Summary & Business Rules

`ws-ship-pr/scripts/verify.cjs` must treat an empty or whitespace-only configured verification command as not configured. It must print a stable skip note and continue checking the remaining configured commands. Non-empty commands retain the current fail-closed behavior, frontend detection remains unchanged, and the integrity check remains unchanged.

The implementation is limited to command normalization and guards in `verify.cjs`, plus regression coverage. The fallback commands used when `.ws/config.json` is absent remain non-empty and continue to run.

## 1. Definition of Ready & Scope

### In scope

- Normalize `backendBuild`, `backendTest`, `frontendBuild`, and `frontendTest` values in `readVerificationConfig`.
- Print `==> <alias> (skipped: not configured)` and avoid command execution for empty or whitespace-only values.
- Preserve backend fail-closed exits for non-empty commands.
- Apply the same guard to the frontend test and build paths, including the frontend-touched branch.
- Add an automated test that exercises all empty aliases, frontend-touched behavior, and confirms no empty child-process command is invoked.
- Register the regression test in `test/test-suites.json`.

### Out of scope

- Base branch detection and frontend-touched heuristics.
- Integrity script lookup or execution.
- New verification aliases or configuration keys.
- Changes to the configured command shell semantics for non-empty commands.

## 2. Technical Design & Architecture

The existing Node CommonJS script remains the single implementation surface. A small normalization helper will trim string configuration values and return `null` for empty results. The fallback branch will continue supplying its existing non-empty defaults.

Backend aliases will use a required-check guard that logs the skip note and otherwise calls the existing `sh()` function. The frontend test will only call its existing best-effort `execSync` path when configured; the frontend build will only call `sh()` when configured. The frontend touched decision and integrity block will not be modified.

The regression test will load `verify.cjs` in a temporary fixture, stub `child_process.spawnSync` and `execSync` before loading the module, feed an all-empty verification object, force the frontend-touched path, and assert:

- all four skip notes and `VERIFY_OK` are printed;
- no empty or whitespace-only shell command reaches either process runner;
- no configured command is required for successful verification.

## 3. Step-by-Step Plan

1. Inspect the current `verify.cjs` implementation and prior history for the affected symbols using `git log -p -S`, then write the regression test against the unmodified behavior and observe the red failure.
2. Add the minimal alias normalization and guards in `.agents/skills/ws-ship-pr/scripts/verify.cjs`; keep `detectBase`, `frontendTouched`, integrity handling, and non-empty exit behavior unchanged.
3. Add `test/test-ship-verify-empty-aliases.js` and register it in `test/test-suites.json`; run the targeted regression and configured `npm run test`.
4. Run the Node stack invariant scan, inspect the scoped diff, and update the acceptance ledger with observed AC and negative-scenario evidence.
5. Complete the workflow review/testing/ship gates. The release PR must also satisfy the upstream patch-version, integrity, and documentation/harness gates if they report changes outside this defect.

Defect-class sibling sweep: search all verification alias execution sites for unconditional empty-command handling and document any out-of-scope occurrences. Do not alter unrelated consumers unless the same `verify.cjs` defect is present.

## 4. Permissions, Tenancy & i18n

Not applicable. This is an upstream Node CLI verification script with no user, tenant, authorization, or localized UI boundary.

## 5. Test Coverage

| Acceptance criterion | Test/evidence |
|---|---|
| AC1 | `test/test-ship-verify-empty-aliases.js` stubs both process runners and asserts no empty command is executed. |
| AC2 | The same test asserts all four stable skip-note strings in stdout. |
| AC3 | Existing `test/test-ship-verify-line-endings.js` continues to execute non-empty `node --version` aliases and asserts exit 0; the implementation preserves non-zero `sh()` exit handling. |
| AC4 | Empty-alias fixture asserts exit-equivalent successful `main()` completion and `VERIFY_OK`. |
| AC5 | The fixture forces `frontendTouched()` true and asserts both frontend aliases are skipped without calling either runner. |
| AC6 | The process-runner stubs throw on empty/whitespace shell commands, making the test fail if an empty command is spawned. |

Negative & failing scenarios:

- Empty and whitespace-only aliases must not reach `spawnSync` or `execSync`.
- A non-empty failing command must still cause the backend verification gate to exit non-zero; retain the existing `sh()` fail-closed branch and cover it with the targeted test or direct script fixture if the first regression test does not cover it.

## 6. Stack & Security Invariants Verification Plan

Touched framework boundaries:

- Authorization and endpoint protection: not applicable.
- Async and concurrency safety: `verify.cjs` is synchronous; preserve the existing synchronous process-runner contract and introduce no floating promises.
- Input validation and injection defenses: trim only string config values, skip empty values, and pass non-empty commands through the existing configured shell contract without adding concatenated user input.
- Subscription and lifecycle cleanup: not applicable; temporary test fixtures must be removed in `finally`.
- Resource/process lifecycle: test stubs must restore patched child-process methods and process cwd/env in `finally`.

Run `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs` against the touched script and test. Run `node --check` on the CommonJS script/test, then the configured full test suite and integrity check.

## 7. Pre-PR Checklist

- [ ] Only the scoped verification script and regression test files are changed for the feature.
- [ ] Empty and whitespace-only backend/frontend aliases print skip notes and do not execute.
- [ ] Non-empty command failures remain fail-closed.
- [ ] Targeted regression and `npm run test` pass.
- [ ] Stack invariant scan and integrity check pass.
- [ ] Acceptance ledger has observed AC and negative-scenario links.
- [ ] Product and configured delivery artifacts are staged by path only; unrelated parent/us-448 changes remain unstaged.
- [ ] Upstream version/integrity and required ship documentation gates are evaluated before PR creation.

## 8. Open Questions

None. The spec fixes the skip-note text, whitespace handling, frontend parity, and out-of-scope boundaries.
