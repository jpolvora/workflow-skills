---
slug: us-439
step: 7
workflowId: us-439-20260927T170000Z
status: completed
startedAt: "2026-09-27T17:00:00Z"
endedAt: "2026-09-27T18:53:24.699Z"
acRefs: []
---
# Testing Report — us-439

## Summary

All batteries exit 0. The new skill's contract test is registered in both lists of
`test/test-suites.json` and the full suite runs 139/139 entries green. Hub byte budgets, ownership
matrix, workflow FSM, and integrity all pass.

## Results

| # | Battery | Command | Exit | Evidence |
|---|---------|---------|------|----------|
| 1 | Unit / contract (new skill) | `node test/test-ws-spec-to-issue.js` | 0 | `test-ws-spec-to-issue: ok` |
| 2 | Full suite | `npm run test` | 0 | `run-tests: all 139 entries passed (mode=local)` |
| 3 | Harness clean | `node test/test-harness-clean.js` | 0 | `Harness OK (upstream clean) — 0 findings` |
| 4 | Skill-load gate | `check_skill_load.cjs` | 0 | `check_skill_load: OK (158 skill docs)` |
| 5 | Duplicates gate | `check_duplicates.cjs` | 0 | `No duplicated normative blocks.` |
| 6 | Ownership gate | `node test/test-git-ownership-contract.js` | 0 | `git-ownership contract OK` |
| 7 | Context budget | `node test/test-context-budget.js` | 0 | `test-context-budget: ok` |
| 8 | Workflows FSM | `check_workflows.cjs` | 0 | `No broken steps, missing dependencies, or syntax errors detected.` |
| 9 | Integrity | `npm run verify-integrity` | 0 | `OK: bin\skill-integrity.json matches tree (v0.5.6)` |
| 10 | Config GUI | `node test/test-powershell-config-editor.js` | 0 | `ALL 12 POWERSHELL CONFIG EDITOR TESTS PASSED` |

## New-skill contract coverage (`test/test-ws-spec-to-issue.js`)

| Case | Assertion | AC |
|------|-----------|-----|
| §1 frontmatter | `name`, no `version:`, `disable-model-invocation: true`, both `invocation_names`, loaded banner | AC1 |
| §2 manifests | in `packages.workflows.skills` + `dependencies` map in **both** manifests; manager routes it | AC2 |
| §3 `--help` | documents `--dry-run` and `--title`, exit 0 | AC9 |
| §4 GitHub dry-run | tracker resolves to `github`, body echoed, nothing created | AC9 |
| §5 ADO dry-run | tracker resolves from `project.repoUrl` host, default type `User Story` | AC9 |
| §6 `local` STOP | non-zero exit, `No active tracker`, tree snapshot unchanged | AC3, AC8 |
| §7 leak guard | absolute path → exit 2, `absolute-windows-path` named, nothing written | AC6 |

## Negative & failing scenarios

The spec's six negative scenarios (NS1–NS6) are covered by the contract test's negative-first
assertions (local STOP with untouched tree; leak-guard rejection; dry-run creates nothing;
no git verb issued). Ledger score with observed test evidence: 10/10.

## Coverage / mutation

Mutation testing disabled by config (`defaults.skipMutationTesting: true`,
`verification.mutationTest` empty). No coverage threshold configured beyond the repo's `c8` gate,
which the full suite already exercises.

## Residual risk

- No live tracker call is exercised (no credentials in CI); the provider `create-issue` delegation
  is covered by contract reuse and the provider suites. This is by design per spec AC7/AC9.
