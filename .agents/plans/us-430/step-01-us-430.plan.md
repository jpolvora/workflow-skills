---
slug: us-430
title: "Score 10 on first verify: run format and full test aliases in implement, and do not cap on baseline-dirty"
status: completed
step: 1
workflowId: us-430-20260926T123545Z
startedAt: "2026-09-26T12:52:55.451Z"
endedAt: "2026-09-26T12:52:55.451Z"
acRefs: []
---
## 0. Summary & Business Rules

A standard `ws-spec-to-pr` Step 5 verification score is falsely capped at 8 when `ac_ledger.cjs` flags `knownDefect` from a non-zero verification alias whose failures originate entirely outside workflow `files_touched`. Additionally, `ws-implement-tasks` Build mode does not currently mandate running all aliases scored by Step 5 (`backendFormat`, `backendBuild`, `backendTest`, `frontendTest`), allowing filtered runs or baseline formatting drifts to surface late as product defects.

This implementation establishes four deterministic contracts:
1. **Implement validate in `ws-implement-tasks`**: Run every configured `verification` alias that Step 5 scores before handoff. Filtered test runs are auxiliary evidence and cannot replace full test suites. On format failures, format only touched files; if failures persist outside `files_touched`, record them without failing the step.
2. **Verify link in `ws-plan-verify`**: Non-zero format or build aliases require enumerating failing paths. When none intersect `files_touched`, link `skipReason: baseline-dirty` with the real exit code so `knownDefect` is not triggered.
3. **Fail-closed ledger evaluation in `ac_ledger.cjs`**: An alias exit code !== 0 sets `knownDefect` only if it lacks `skipReason` and either has at least one failing path in `files_touched` or marks an explicit `productFailure`. Bare non-zero exit codes with no failing path in `files_touched` do not trigger `knownDefect`.
4. **Interview rewrite in `ws-plan-interview`**: When plan interview closes a decision overriding an acceptance criterion, update the spec sentence in both the spec of record and `step-00-*.spec.md` before Step 5 reads it, preventing false `ImplementedDifferently` deductions.

## 1. Definition of Ready & Scope

All scope boundaries, assumptions, and negative scenarios from `.agents/specs/0133-us-430.spec.md` are accepted and mapped.

| AC | Requirement | Implementation Target |
|----|-------------|-----------------------|
| AC1 | Build-mode validate runs each configured scoring alias (`backendFormat`, `backendBuild`, `backendTest`, `frontendTest`) before handoff. Filtered test runs do not satisfy full aliases. | `.agents/skills/ws-implement-tasks/SKILL.md` |
| AC2 | On `backendFormat` failure, format only created/modified paths and re-run. Residual external failures are recorded in step output and do not fail implement. | `.agents/skills/ws-implement-tasks/SKILL.md` |
| AC3 | Full test alias exiting 0 clears ledger `knownDefect`, even if an earlier filtered run failed in untouched setup files. | `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, `.agents/skills/ws-implement-tasks/SKILL.md` |
| AC4 | `ws-plan-verify` does not link non-zero format/build alias as defect until failing paths are listed. Untouched paths link `skipReason: baseline-dirty` and keep `knownDefect: false`. | `.agents/skills/ws-plan-verify/SKILL.md` |
| AC5 | `ac_ledger.cjs` sets `knownDefect` from alias only when no `skipReason` and >=1 failing path inside `files_touched`, or explicit `productFailure`. Bare non-zero exit does not set `knownDefect`. | `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, `.agents/skills/ws-shared/runtime/ac-ledger.schema.json` |
| AC6 | Plan interview updates contradictory acceptance sentences in spec of record and `step-00-*.spec.md` before Step 5 runs to avoid `ImplementedDifferently`. | `.agents/skills/ws-plan-interview/SKILL.md` |
| AC7 | First Step 5 pass scores 10 when format failures are external to `files_touched` and all configured test aliases pass. | `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`, `test/test-ac-ledger.js` |

Out of scope: changing `defaults.minVerifyScore`, auto-reformatting foreign repository code, or introducing Python script helpers.

## 2. Technical Design & Architecture

### Stack & Components
- **Language / Runtime**: Node 22 (CommonJS `.cjs` and ESM test modules).
- **Core Ledger Scorer**: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`
- **Ledger Schema**: `.agents/skills/ws-shared/runtime/ac-ledger.schema.json`
- **Skill Contracts**:
  - `.agents/skills/ws-implement-tasks/SKILL.md`
  - `.agents/skills/ws-plan-verify/SKILL.md`
  - `.agents/skills/ws-plan-interview/SKILL.md`
- **Automated Tests**: `test/test-ac-ledger.js`

### Ledger Data Model (`ac-ledger.schema.json` & `ac_ledger.cjs`)
`aliasResults.items` schema is expanded to support:
- `failingPaths`: optional array of strings listing relative paths that failed during the alias run.
- `productFailure`: optional boolean explicitly marking a failure within product code.

In `scoreLedger(ledger, boundary, context)`:
1. Determine `files_touched`: Gather all file paths from `ledger.acceptanceCriteria[*].files[*].path`. If state or manifest is accessible or `ledger.filesTouched` is supplied, include those paths.
2. For each alias in `ledger.aliasResults`:
   - If `isSkipped(item)` (e.g. `skipReason: "baseline-dirty"`), it never triggers `knownDefect`.
   - If `item.exitCode === 0`, it never triggers `knownDefect`.
   - If `item.exitCode !== 0`:
     - If `item.productFailure === true`, flag `knownDefect = true`.
     - Else if `item.failingPaths` is an array and at least one path is inside `files_touched`, flag `knownDefect = true`.
     - Otherwise (bare exit code !== 0 without `productFailure` or without failing paths inside `files_touched`), do **not** flag `knownDefect`.

## 3. Step-by-Step Plan

### Task T01: Schema & Parsing for Alias Results (AC5)
- Update `.agents/skills/ws-shared/runtime/ac-ledger.schema.json`: add `failingPaths` (`type: array, items: { type: string }`) and `productFailure` (`type: boolean`) to `aliasResults.items.properties`.
- Update `parseObject` / normalization in `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs` to retain `failingPaths` and `productFailure`.
- Files: `.agents/skills/ws-shared/runtime/ac-ledger.schema.json`, `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`.

### Task T02: Fail-Closed Touched-Path Scorer in `ac_ledger.cjs` (AC3, AC5, AC7)
- In `scoreLedger`:
  - Collect `touchedPaths` from `ledger.acceptanceCriteria` linked files and any declared touched files.
  - Evaluate non-zero non-skipped aliases against `touchedPaths`: require either `productFailure === true` or at least one entry in `failingPaths` that intersects `touchedPaths`.
  - Ensure bare non-zero exit codes with empty or non-intersecting failing paths do not set `knownDefect`.
- Files: `.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs`.

### Task T03: Implement Validate Contract in `ws-implement-tasks` (AC1, AC2, AC3)
- In `.agents/skills/ws-implement-tasks/SKILL.md` (Build mode step 7 Validate):
  - Instruct running every configured scoring alias (`backendFormat`, `backendBuild`, `backendTest`, `frontendTest`) before handoff.
  - State that filtered test invocations do not satisfy full test alias requirements.
  - Detail `backendFormat` handling: on failure, format only created/modified paths and re-run. Residual external failures must be noted in `step-output` rather than causing step failure.
- Files: `.agents/skills/ws-implement-tasks/SKILL.md`.

### Task T04: Verification Linking Contract in `ws-plan-verify` (AC4, AC7)
- In `.agents/skills/ws-plan-verify/SKILL.md` (step 3 Score):
  - Clarify that non-zero format or build aliases require inspecting failing paths.
  - If failing paths are strictly outside workflow `files_touched`, link `skipReason: baseline-dirty` and real `exitCode`.
  - Remove obsolete prose stating that non-zero real exits unconditionally set `knownDefect`.
- Files: `.agents/skills/ws-plan-verify/SKILL.md`.

### Task T05: Interview Spec Sentence Rewrite in `ws-plan-interview` (AC6)
- In `.agents/skills/ws-plan-interview/SKILL.md` (Outputs / Step 4):
  - Document that when a closed decision overrides or contradicts an acceptance criterion, the interview step updates that sentence in the spec of record (`{specsDir}/*.spec.md`) and in `{us-dir}/step-00-*.spec.md` before Step 5 evaluates it.
- Files: `.agents/skills/ws-plan-interview/SKILL.md`.

### Task T06: Unit & Integration Tests in `test/test-ac-ledger.js` (AC1-AC7, NS1-NS5)
- Add comprehensive test fixtures in `test/test-ac-ledger.js`:
  - `V1:format-baseline-dirty-cleared`: `backendFormat` exit 2 with `skipReason: baseline-dirty` and foreign failing path -> `knownDefect: false`, score 10.
  - `V2:format-touched-defect`: `backendFormat` exit 2 with no `skipReason` and failing path in `files_touched` -> `knownDefect: true`, score capped <= 8.
  - `V3:format-bare-exit-not-defect`: `backendFormat` exit 2, no `skipReason`, failing path outside `files_touched` -> `knownDefect: false`.
  - `V4:product-failure-flag`: non-zero exit with `productFailure: true` -> `knownDefect: true`.
  - `V5:schema-validation`: ledger with `failingPaths` and `productFailure` validates against `ac-ledger.schema.json`.
- Files: `test/test-ac-ledger.js`.

### Task T07: Defect-Class Sibling Sweep & Integrity Verification
- Sweep other verification scripts or docs in `.agents/skills/` for stale references to `baseline-dirty` or unconditional `knownDefect`.
- Run full test suite `npm run test` and `npm run verify-integrity`.

## 4. Permissions, Tenancy & i18n

No RBAC, multi-tenant database queries, or user-facing localized strings are modified. All file reads and writes remain within the repository tree.

## 5. Test Coverage

| Test Case | Description | Maps to |
|-----------|-------------|---------|
| `V1:implement-scoring-aliases` | Verify `ws-implement-tasks/SKILL.md` specifies all scoring aliases (`backendFormat`, `backendBuild`, `backendTest`, `frontendTest`). | AC1 |
| `V2:format-surgical-repair` | Verify `ws-implement-tasks/SKILL.md` specifies formatting only created/modified paths on format failure. | AC2 |
| `V3:full-test-pass-clears-defect` | Verify full test alias exit 0 does not inherit earlier filtered failure. | AC3, NS3 |
| `V4:verify-baseline-dirty-link` | Verify `ws-plan-verify/SKILL.md` requires path enumeration before defect linking and `skipReason: baseline-dirty` when external. | AC4 |
| `V5:ac-ledger-fail-closed-touched` | `ac_ledger.cjs` tests for failing paths inside vs outside `files_touched`, bare exits, and `productFailure`. | AC5, NS1, NS2 |
| `V6:interview-spec-rewrite` | Verify `ws-plan-interview/SKILL.md` requires rewriting overridden AC sentences in spec copies. | AC6, NS4 |
| `V7:first-verify-score-ten` | End-to-end score derivation yields 10 when external format drift exists and all test aliases pass. | AC7 |
| `V8:node-only-runtime` | Verify no `.py` scripts were introduced. | NS5 |

## 6. Stack & Security Invariants Verification Plan

- **Node 22 Runtime Only**: All helpers in `.agents/skills/**/scripts/` and `bin/` must be Node CommonJS/JavaScript; no `.py` or Python dependencies.
- **Fail-Closed Scoring**: Unknown properties, corrupt JSON, or invalid boundary labels fail closed.
- **Path Sanitization**: All file paths referenced in `failingPaths` and `files_touched` are normalized to repo-relative paths with POSIX separators to prevent traversal or casing mismatches.
- **Atomic File Operations**: All ledger mutations in `ac_ledger.cjs` use atomic temporary file write and rename (`writeJson`).

## 7. Pre-PR Checklist

- [ ] `ws-implement-tasks/SKILL.md` documents validate for all configured scoring aliases and surgical format repair.
- [ ] `ws-plan-verify/SKILL.md` documents path check for format/build failures and `skipReason: baseline-dirty`.
- [ ] `ws-plan-interview/SKILL.md` documents rewriting overridden AC sentences in spec files.
- [ ] `ac_ledger.cjs` implements fail-closed `knownDefect` checking against `files_touched`.
- [ ] `ac-ledger.schema.json` includes `failingPaths` and `productFailure`.
- [ ] `test/test-ac-ledger.js` contains test fixtures for all ACs and negative scenarios.
- [ ] `npm run test` passes completely.
- [ ] `node .agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs score` reaches 10 under clean test aliases with external format drift.

## 8. Open Questions

None. All technical decisions are fully resolved by the specification.
