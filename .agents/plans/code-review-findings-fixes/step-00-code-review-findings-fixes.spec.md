---
id: null
slug: code-review-findings-fixes
title: Harness & Skills Hardening from Code Review of Recent PRs
source: local
specDate: 2026-09-20
step: 0
workflowId: code-review-findings-fixes
status: completed
startedAt: "2026-09-20T22:50:00.291Z"
endedAt: "2026-09-20T22:50:00.291Z"
acRefs: []
---
# Specification — Harness & Skills Hardening from Code Review of Recent PRs

## Description

Address architectural findings, code duplication, and robustness improvements identified during the comprehensive code review of the last 10 pull requests merged into main (#364 through #375).

Key architectural focus areas:
1. Deduplicate standalone skill script runtime bootstrapping by introducing a shared resolver helper in `ws-shared/runtime/scripts/bootstrap_runtime.cjs`, replacing repeated candidate-probing IIFE blocks across standalone scripts.
2. Standardize platform-portable user home directory resolution across all harness checks (`require('os').homedir()`).
3. Harden `ws-monitor` transcript tail-reading against multi-byte UTF-8 split boundaries in binary SQLite files.
4. Enforce automated audit rules against legacy `.ws/runtime` references to prevent regression of the clean hub separation established in PR #371.

## Acceptance Criteria

- AC1: Provide a centralized runtime bootstrap helper in `ws-shared/runtime/scripts/bootstrap_runtime.cjs` that exports `resolveHubScriptsDir()` with candidate resolution precedence (explicit `WORKFLOW_SKILLS_SHARED_DIR` -> local `.agents/skills` -> global skills root -> packaged fallback).
- AC2: Refactor skill scripts under `.agents/skills/*/scripts/*.cjs` to consume the centralized bootstrap helper while preserving fallback execution when invoked standalone outside repo root.
- AC3: Update `check_hub_separation.cjs` to resolve global skills root via `require('os').homedir()` instead of raw `process.env.HOME || process.env.USERPROFILE`.
- AC4: Enhance `readBoundedTailText` in `monitor_snapshot.cjs` with `StringDecoder` decoding to prevent replacement character corruption from boundary-split multi-byte UTF-8 sequences.
- AC5: Add an automated check in `check_unique_runtime.cjs` or `check_hub_separation.cjs` that fails closed if any tracked skill script or documentation directs writing runtime code to `.ws/runtime`.
- AC6: Verify all existing test suites (`npm test`) and harness audits (`node test/test-harness-clean.js`) pass with 0 findings.

## Original Issue Context

Local synthesis from code review of merged PRs #364, #366, #367, #368, #370, #371, #372, #373, #374, #375.

### Prior Work Sweep

- Prior PR #370: Migrated all scripts to CommonJS `.cjs`, porting standalone execution models.
- Prior PR #367: Updated individual scripts with local-first candidate resolution IIFEs.
- Prior PR #371 & #374: Separated consumer `.ws` hub from upstream authoring hub.
- Prior PR #364: Added host transcript adapters with bounded SQLite file descriptor reading.

### Design Intent

The 25-line IIFE was copied across 47+ scripts during PR #367 as an immediate mechanism to ensure each script could self-locate `resolve_consumer_root.cjs`. Centralizing this into a lightweight bootstrap helper eliminates widespread duplication while preserving standalone execution resilience.

## Notes

- All changes must adhere to the pure Node 22 CommonJS standard (`.cjs`).
- Must not introduce any Python or shell script dependencies.
- Changes to `ws-shared/runtime` must be reflected in `bin/skill-integrity.json`.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Rewriting `monitor_snapshot.cjs` to use native SQLite bindings | Adding native binary dependencies like `better-sqlite3` breaks zero-dependency Node portability. |
| Automatic migration of external consumer projects | Consumer migration is handled via `bin/cli.js update` and `ws-configure-project`. |

## Assumptions & Open Questions

| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Bootstrap helper fallback | Inline minimal fallback probe | Ensures standalone scripts can still locate `bootstrap_runtime.cjs` when run directly via node | y |
| Encoding handling in tail reader | `string_decoder.StringDecoder` | Standard Node library module with zero external dependencies that correctly buffers incomplete multi-byte sequences | y |
| All other implicit dimensions | N/A because this is an internal harness and skill scripts refactoring with no public API or database changes | Refactoring existing Node 22 CommonJS scripts and audits | y |

## Definition of Ready (DoR)

| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Target files limited to runtime scripts, monitor snapshot, and harness checks | Code inspection and `git diff --stat` |
| Zero External Dependencies | Node 22 standard library only (no new npm dependencies) | `package.json` inspection |
| Stack Invariants | Maintain Node CommonJS conventions and portable path tokens | Run `node test/test-unique-runtime.js` and `node test/test-runtime-portability.js` |
| Harness Cleanliness | Zero harness lint or integrity failures | Run `node test/test-harness-clean.js` |

## Validation & Observation Notes

### Telemetry & Observable Signals

- `node test/test-unique-runtime.js` exits 0.
- `node test/test-hub-separation.js` exits 0.
- `node test/test-ws-monitor-us356.js` exits 0.
- `node test/test-harness-clean.js` reports 0 findings.

### Negative & Failing Test Scenarios

- A script invoking the bootstrap helper with invalid or unresolvable paths fails closed with an informative error rather than a silent undefined crash.
- Tail-reading a buffer with a severed UTF-8 sequence does not produce corrupt unprintable tokens or cause regex matching exceptions.
