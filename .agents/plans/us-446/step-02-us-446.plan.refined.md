---
slug: us-446
title: Skip unconfigured verification aliases in ws-ship-pr
status: completed
workflowId: us-446-20260928T021400Z
step: 2
startedAt: "2026-09-28T02:14:00Z"
endedAt: "2026-09-28T02:21:51.002Z"
acRefs: []
---
## 0. Summary & Business Rules

Treat empty and whitespace-only `verification.backendBuild`, `backendTest`, `frontendBuild`, and `frontendTest` values as unconfigured. Print `==> <alias> (skipped: not configured)` for each skipped alias, continue the gate, and preserve current behavior for non-empty commands. Keep base detection, frontend-touched detection, integrity lookup, and exit-code semantics outside the change.

## 1. Definition of Ready & Scope

The source specification is self-contained and the project context confirms that empty verification aliases are intentional. The change is limited to `.agents/skills/ws-ship-pr/scripts/verify.cjs`, the new regression test, and test-suite registration. Release metadata and integrity projections are evaluated only in the mandatory Step 8 ship gate.

## 2. Technical Design & Architecture

Add a small helper used by `readVerificationConfig` that trims string values and returns `null` for empty results. Keep fallback commands non-empty when the config file is absent.

Backend execution logs the existing command and calls `sh()` only for a configured value. Otherwise it prints the exact alias skip note. In the frontend-touched branch, preserve best-effort `execSync` behavior for configured `frontendTest`, skip it when unconfigured, and preserve fail-closed `sh()` behavior for configured `frontendBuild`, skipping it when unconfigured. Do not change the frontend-touched predicate or integrity block.

The regression test loads the script after stubbing `child_process.spawnSync` and `execSync`, supplies an all-empty verification config, makes the frontend-touched probe return a `web/` path, captures stdout, and fails if either runner receives an empty or whitespace-only shell command. It restores process state in `finally`.

## 3. Step-by-Step Plan

1. Confirm the historical port introduced unconditional alias execution with `git log -p -S`, then add the red regression test against the current script.
2. Normalize configured aliases and add backend/frontend guards in `verify.cjs`. Do not alter branch detection, frontend heuristics, integrity handling, or configured non-zero exits.
3. Register the regression test in `test/test-suites.json`, run the targeted test, and run `npm run test`.
4. Perform a repo-wide sibling sweep for unconditional execution of the same four aliases, run the stack invariant scan, and record any exemptions.
5. Link observed AC and negative-scenario evidence, derive the Step 5 score through `ac_ledger.cjs`, review the committed diff, test again, and complete the release/ship gates.

Defect-class sibling sweep target: `ws-ship-pr/scripts/verify.cjs` alias reads and any other verification gate that executes configured aliases. Only this script is in scope for the specified behavior.

## 4. Permissions, Tenancy & i18n

Not applicable to this Node verification gate.

## 5. Test Coverage

- AC1, AC2, AC4, AC5, and AC6: `test/test-ship-verify-empty-aliases.js` forces frontend detection, invokes `main()` with all aliases empty/whitespace-only, asserts four skip notes plus `VERIFY_OK`, and throws if `spawnSync` or `execSync` receives an empty shell command.
- AC3: retain the existing non-empty command path and add a failing-command child-process test if needed after the red regression is observed; the implementation must keep `sh()` returning `1` for a non-zero or null status.
- NS1: empty aliases are rejected by the runner stubs.
- NS2: a non-empty failing command remains fail-closed and is verified by a direct child-process fixture or the existing command-path coverage.
- NS3: a whitespace-only `backendTest` value is normalized to the same skip path.

## 6. Stack & Security Invariants Verification Plan

This is synchronous CommonJS code. No async or floating-promise boundary is introduced. Config values are treated as strings, trimmed, and skipped when empty; non-empty values retain the existing configured shell contract. No filesystem path or command concatenation is added beyond the unchanged integrity command. The test restores monkey patches, cwd, and environment in `finally` and removes temporary files.

Run:

- `node --check .agents/skills/ws-ship-pr/scripts/verify.cjs`
- `node --check test/test-ship-verify-empty-aliases.js`
- `node .agents/skills/ws-shared/runtime/scripts/scan_stack_invariants.cjs`
- `npm run test`
- `npm run verify-integrity`

## 7. Pre-PR Checklist

- [ ] Regression is red before the implementation guard and green afterward.
- [ ] All six ACs and all negative scenarios have observed evidence.
- [ ] No same-class sibling is left unexplained.
- [ ] Product staging is limited to `verify.cjs`, the regression test, and test-suite registration.
- [ ] Version projections, integrity, harness, and configured verification are green before ship.
- [ ] Existing parent/us-448 changes and `.ws/CHANGELOG.md` remain unstaged.

## 8. Open Questions

None. Auto-mode interview resolution is confirmed.
