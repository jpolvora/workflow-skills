---
superseded: true
supersededBy: step-02-us-389.plan.refined.md
slug: us-389
step: 1
workflowId: us-389-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:07:09Z"
endedAt: "2026-09-22T08:20:00Z"
acRefs: []
---
# Implementation Plan — us-389

## 1. Goal

Make the local test suite side-effect free with respect to the repository's own
consumer hub config. After the change, running `npm run test` must leave
`.ws/config.json` byte-identical and must not create `.ws/config.json.bak`.

## 2. Root cause

The editor resolves a default target when `-ConfigPath` is omitted
(`Edit-WorkflowSkillsConfig.ps1` falls back to `<root>/.ws/config.json`), and its
save path writes `<ActiveConfigPath>.bak` before rewriting. Any invocation that
reaches the save path without an explicit `-ConfigPath` therefore targets the live
hub config. The hardening is two-sided: test call-site hygiene (always pass an
isolated temp `-ConfigPath`) and a diagnostic-mode no-write guarantee in the editor
so a future forgotten flag still cannot mutate the repository.

## 3. Change set (files)

| File | Change | ACs |
|------|--------|-----|
| `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | Add `$script:DiagnosticMode` (`-CheckOnly` / `-NonInteractive`); `Save-ConfigurationFile` returns without writing (and warns) in diagnostic mode; document that tests must pass an explicit `-ConfigPath` while the interactive no-`-ConfigPath` fallback stays supported | AC2, AC5 |
| `test/test-powershell-config-editor.js` | Pass an explicit `-ConfigPath` (temp copy of `config.json.example`) for **every** editor invocation (T01); add a no-`-ConfigPath` `-CheckOnly` probe asserting no hub mutation and no `.bak` (T02); snapshot the hub config hash before/after the file's invocations (T03); remove any backup on the pass and failure path (T04) | AC1, AC2, AC4, AC6 |
| `test/run-tests.cjs` | Snapshot the repository hub config (`.ws/config.json`, `test/.ws/config.json`) hash and `.bak` presence before the suite; assert byte-identity after all entries run (T05) | AC3, AC6 |

Release plumbing (unchanged behavior): `npm run build-site:bump` bumps
`package.json` + `bin/skill-dependencies.json` `packageVersion` + site footer;
`npm run generate-integrity` regenerates the hashed editor digest.

No runner restructuring, no editor port, no `.gitignore` mask, no config-schema
change.

## 4. Approach

- Test hygiene: reuse the existing `mkdtempSync` + `config.json.example` pattern
  already present in the file; never rely on `cwd` for target resolution.
- Editor guard: `Save-ConfigurationFile` is the single write path. Gate it on
  `$script:DiagnosticMode` set once after param parsing, so diagnostic runs are
  provably non-persistent even if a call site forgets `-ConfigPath`.
- Regression: byte-compare the hub config, not `git status`, so the assertion is
  independent of working-tree state.

## 5. Verification plan

- `node test/test-powershell-config-editor.js` (AC1, AC2, AC4, AC6)
- `node test/run-tests.cjs` / `npm run test` (AC3, AC7)
- `node test/test-harness-clean.js` (0 findings) (AC7)
- `node .agents/skills/ws-check-harness/scripts/...` (ws-check-harness phases) (AC7)
- `npm run generate-integrity` + `npm run verify-integrity`
- `git status --short` clean for `.ws/config.json` and no `.ws/config.json.bak`

## 6. Stack & Security Invariants Verification Plan

| Boundary | Check |
|----------|-------|
| Node-only runtime | No `.py` added; only Node tests and a PowerShell script touched |
| PowerShell ASCII purity | `test-powershell-config-editor.js` Test 2 ASCII assertion stays green |
| Editor schema sync | No `config.schema.json` / `config.json.example` change → GUI bindings unchanged; `node test/test-powershell-config-editor.js` green |
| Harness portability | No host product names; path tokens only |
| Integrity | Editor body changes → `npm run generate-integrity` + `verify-integrity` in the same commit |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Adding `-ConfigPath` to the batch-launcher test breaks arg forwarding | `Edit-Config.bat` forwards `%*`; assert the run still exits 0 |
| Diagnostic guard changes interactive save behavior | Guard is scoped to `-CheckOnly` / `-NonInteractive` only; GUI save path untouched |
| Hub-config assertion reads a path that does not exist in some checkouts | Treat missing snapshot as a recorded-but-guarded baseline; assert only on existence transitions |
