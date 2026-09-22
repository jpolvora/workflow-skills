---
slug: us-389
step: 2
workflowId: us-389-20260922T080709Z
status: completed
startedAt: "2026-09-22T08:26:00Z"
endedAt: "2026-09-22T08:32:00Z"
acRefs: []
---
# Refined Implementation Plan — us-389

## 1. Goal

The local suite is side-effect free for the repository's own hub config:
`npm run test` leaves `.ws/config.json` byte-identical and creates no
`.ws/config.json.bak`. The editor is structurally unable to persist in diagnostic
mode, and every test editor invocation targets an isolated temp copy.

## 2. Confirmed mechanism

- `test/test-powershell-config-editor.js` invokes the editor with `cwd: REPO_ROOT`
  and, in three places, no `-ConfigPath` (Test 4 `-CheckOnly`, Test 6 bat
  `-CheckOnly`, Test 7 `-FunctionsOnly`).
- `Edit-WorkflowSkillsConfig.ps1` resolves `<root>/.ws/config.json` when
  `-ConfigPath` is absent and `Save-ConfigurationFile` writes `<ActiveConfigPath>.bak`
  before rewriting.
- The save path is the single writer; guarding it plus fixing call sites closes
  the defect class.

## 3. Task list

| Task | File | Change | ACs |
|------|------|--------|-----|
| T01 | `test/test-powershell-config-editor.js` | Every editor invocation passes an explicit `-ConfigPath` to a temp copy of `config.json.example` (Test 4, Test 6 bat, Test 7 snippet) | AC1 |
| T02 | `test/test-powershell-config-editor.js` | Add a deliberately `-ConfigPath`-less `-CheckOnly` probe: assert the hub config hash is unchanged and no `.ws/config.json.bak` appears | AC2 |
| T03 | `test/test-powershell-config-editor.js` | Snapshot the hub config SHA-256 at file start; re-assert byte-identity at the end (regression assertion) | AC6 |
| T04 | `test/test-powershell-config-editor.js` | Remove any backup created during the sandbox tests in the `finally` path so both pass and failure leave no residue | AC4 |
| T05 | `test/run-tests.cjs` | Snapshot hub config hashes + `.bak` presence before the suite; assert byte-identity after all entries pass | AC3, AC6 |
| T06 | `.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1` | Introduce `$script:DiagnosticMode`; make `Save-ConfigurationFile` a warned no-op in diagnostic mode; document explicit-path-for-tests vs interactive fallback | AC2, AC5 |

## 4. Verification tests

| Test | Assertion | ACs |
|------|-----------|-----|
| V1 | All editor invocations carry `-ConfigPath`; no test resolves `.ws/config.json` | AC1, NS1 |
| V2 | `-CheckOnly` without `-ConfigPath` mutates nothing and writes no `.bak` | AC2, NS2 |
| V3 | After the suite, `.ws/config.json` bytes are unchanged and no `.bak` exists | AC3, NS3 |
| V4 | Sandbox backup removed on both success and thrown-failure paths | AC4, NS4 |
| V5 | No-`-ConfigPath` resolution of the project hub config remains the interactive default | AC5, NS5 |
| V6 | Regression assertion fails if the hub config bytes actually change | AC6, NS6 |
| V7 | `npm run test`, `test-harness-clean.js`, and `ws-check-harness` exit clean | AC7, NS7 |

## 5. Exact editor delta

1. After the `param(...)` block, add:
   `$script:DiagnosticMode = [bool]($CheckOnly -or $NonInteractive)`.
2. At the top of `Save-ConfigurationFile`, after the `ActiveConfigPath` null
   check, add a diagnostic short-circuit: `if ($script:DiagnosticMode) { Write-Warning ...; return }`.
3. Extend the `.PARAMETER ConfigPath` help to state the interactive fallback and
   that automated callers must pass an explicit path.
   Keep the script pure ASCII.

## 6. Stack & Security Invariants Verification Plan

| Boundary | Check |
|----------|-------|
| Node-only runtime | No `.py` added |
| PowerShell ASCII purity | Editor test Test 2 |
| GUI schema sync | `node test/test-powershell-config-editor.js` (no schema/example change) |
| Harness portability | No host product names; temp dirs via `os.tmpdir()` |
| Integrity | `npm run generate-integrity` + `npm run verify-integrity` |
| Docs/site | `build-site:bump` (version) + rebuild site; no user-facing CLI change |

## 7. Risks

| Risk | Mitigation |
|------|-----------|
| Bat test breaks arg forwarding | Assert exit 0 with forwarded `-ConfigPath` |
| Suite test count changes break the runner | Register no new suite entry; the assertion lands in `run-tests.cjs` |
| Dirty working tree confuses byte-compare | Compare file content only, never `git status` |
