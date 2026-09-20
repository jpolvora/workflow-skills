---
superseded: true
supersededBy: step-02-code-review-findings-fixes.plan.refined.md
slug: code-review-findings-fixes
title: Harness & Skills Hardening from Code Review of Recent PRs
status: completed
step: 1
workflowId: code-review-findings-fixes
startedAt: "2026-09-20T22:53:16.238Z"
endedAt: "2026-09-20T22:53:16.238Z"
acRefs: []
---
## 0. Summary & Business Rules
This implementation plan addresses code review findings from the last 10 merged PRs (#364 through #375):
1. Centralizing runtime script bootstrapping: replace the identical 25-line candidate-probing IIFE duplicated across 47+ skill scripts with a lightweight, standalone-safe helper `ws-shared/runtime/scripts/bootstrap_runtime.cjs`.
2. Standardizing platform-portable user home directory resolution using `require('os').homedir()` across harness checks.
3. Hardening SQLite binary chunk reading in `monitor_snapshot.cjs` against multi-byte UTF-8 character boundary cuts.
4. Enforcing an automated audit check ensuring `.ws/runtime` is banned and never targeted.
5. Verifying complete harness cleanliness and test passing.

## 1. Definition of Ready & Scope
- **In-Scope**:
  - `ws-shared/runtime/scripts/bootstrap_runtime.cjs` (new centralized bootstrap module).
  - Standalone script refactoring across `.agents/skills/*/scripts/*.cjs` to consume the bootstrap helper while maintaining graceful fallback.
  - Portable home directory resolution in `.agents/skills/ws-check-harness/scripts/check_hub_separation.cjs`.
  - UTF-8 string decoding safety in `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`.
  - Negative audit check in `check_unique_runtime.cjs` against `.ws/runtime`.
  - Unit tests verifying bootstrap resolution, decoder safety, and audit enforcement.
- **Out of Scope**:
  - Introducing any native binary dependencies (e.g. `better-sqlite3`).
  - Rewriting existing skill business logic unrelated to bootstrapping or audit checks.

## 2. Technical Design & Architecture
- **Centralized Bootstrap Helper (`bootstrap_runtime.cjs`)**:
  Exports `resolveHubScriptsDir()` with candidate resolution:
  1. `process.env.WORKFLOW_SKILLS_SHARED_DIR` (explicit override).
  2. Repo-local `.agents/skills/ws-shared/runtime/scripts`.
  3. Global skills root (`WORKFLOW_SKILLS_GLOBAL_DIR` or `os.homedir()/.agents/skills/ws-shared/runtime/scripts`).
  4. Packaged directory fallback (`../../ws-shared/runtime/scripts`).
  Also exports `resolveConsumerRoot` and `resolveHubSource` shortcuts.
- **Consumer Script Pattern**:
  ```javascript
  const HUB_SCRIPTS_DIR = (() => {
    try {
      return require('../../ws-shared/runtime/scripts/bootstrap_runtime.cjs').resolveHubScriptsDir(__dirname);
    } catch {
      // Fallback probe for relocated or global execution
    }
  })();
  ```
- **Boundary-Safe UTF-8 Slicing (`monitor_snapshot.cjs`)**:
  Use `new (require('string_decoder').StringDecoder)('utf8')` to decode chunks read from SQLite file descriptors, ensuring partial multi-byte sequences at chunk cutoffs are preserved or handled cleanly without throwing or corrupting text search.
- **Auditing Invariant Enforcement (`check_unique_runtime.cjs`)**:
  Inspect tracked skill scripts and documentation for banned `.ws/runtime` references, failing closed if any new file violates hub separation.

## 3. Step-by-Step Plan

### Task 1: Create Centralized Bootstrap Helper (AC1)
- **Target File**: `.agents/skills/ws-shared/runtime/scripts/bootstrap_runtime.cjs`
- Implement `resolveHubScriptsDir(callerDir)` and export it via `module.exports`.
- Support explicit env override, repo-local tree, global tree, and packaged fallback.
- Fail closed with informative error when no candidate contains `resolve_consumer_root.cjs`.

### Task 2: Standardize Portable Home Directory Resolution (AC3)
- **Target File**: `.agents/skills/ws-check-harness/scripts/check_hub_separation.cjs`
- Replace `process.env.HOME || process.env.USERPROFILE || ''` with `require('os').homedir()`.

### Task 3: Bounded & Safe UTF-8 Transcript Chunk Decoding (AC4)
- **Target File**: `.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs`
- In `readBoundedTailText`, utilize `StringDecoder` to decode binary chunk buffers into UTF-8 text safely.
- Add defensive handling for boundary-sliced tokens and logging of unreadable sidecars.

### Task 4: Enforce `.ws/runtime` Ban in Auditing Checks (AC5)
- **Target File**: `.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs`
- Add an audit pass asserting that no active skill scripts or runtime documentation instruct writing code to `.ws/runtime`.

### Task 5: Refactor Standalone Skill Scripts to Use Bootstrap Helper (AC2)
- Refactor skill scripts to require `bootstrap_runtime.cjs`, replacing the repetitive 25-line IIFE blocks while keeping standalone resilience.

### Task 6: Unit Testing & Verification (AC6)
- **Target File**: `test/test-bootstrap-runtime.js`
- Test candidate resolution order, invalid path fail-closed behavior (NS1), and UTF-8 chunk boundary resilience (NS2).
- Re-run full test suite (`npm test`) and harness cleanliness check (`node test/test-harness-clean.js`).

## 4. Permissions, Tenancy & i18n
- **Permissions**: None required (local file read/write within workspace).
- **Tenancy**: N/A (single-workspace CLI harness).
- **i18n**: English (en-us) only for all log messages, comments, and reports per AGENTS.md.

## 5. Test Coverage
- **AC1 (Centralized Bootstrap Helper)**: Tested by `test/test-bootstrap-runtime.js` (`testResolveHubScriptsDirOrder`, `testPackagedFallback`).
- **AC2 (Script Refactoring)**: Tested by `npm test` across all 54 skill test suites ensuring zero breakage of standalone script execution.
- **AC3 (Portable Home Directory Resolution)**: Tested by `test/test-hub-separation.js` verifying clean resolution across OS platforms.
- **AC4 (Safe UTF-8 Chunk Decoding)**: Tested by `test/test-ws-monitor-us356.js` and dedicated unit test in `test-bootstrap-runtime.js` (`testSeveredUtf8ChunkDecoding`).
- **AC5 (Enforce `.ws/runtime` Ban)**: Tested by `test/test-unique-runtime.js` and `test/test-harness-clean.js`.
- **AC6 (Full Harness Verification)**: Verified via `npm test` and `node test/test-harness-clean.js` returning 0 findings.

## 6. Stack & Security Invariants Verification Plan
- **Framework Boundaries**:
  - Runtime: Node 22 CommonJS (`.cjs`). Zero Python or shell dependencies.
  - Path Containment: All file writes must remain strictly within workspace root or user home `.agents/skills`.
  - Error Handling: Fail closed with non-zero exit codes when resolution fails; never emit unhandled rejections.
  - Immutability of Consumer Hub: `.ws` remains reserved for consumer-owned configuration and state; runtime code resides strictly in `{skillsRoot}/ws-shared/runtime`.

## 7. Pre-PR Checklist
- [x] Layer boundaries respected (`ws-shared`, `ws-check-harness`, `ws-monitor`).
- [x] Node 22 CommonJS strictly maintained.
- [x] Stack & security invariants verified.
- [x] Test cases cover all ACs (AC1–AC6).
- [x] Integrity manifest regenerated if runtime files change.

## 8. Open Questions
- None. All requirements and design choices are bounded and aligned with existing harness conventions.
