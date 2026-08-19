---
slug: us-220
testDate: 2026-08-19
status: passed
totalTests: 28
failedTests: 0
skippedTests: 0
---

# Testing Report — us-220

## Summary
Execution of automated test suites validating `ws-pre-daily` and repository-wide integrity.

## Test Results

### 1. Skill-Specific Tests (`test/test-ws-pre-daily.js`)
- `ws-pre-daily/SKILL.md` presence and metadata validation: **PASSED**
- `ws-pre-daily/references/OUTPUT.md` presence: **PASSED**
- `ws-pre-daily/scripts/collect_window.py` presence and executable check: **PASSED**
- Frontmatter schema (`name`, `version: 0.3.24`, `invocation_names`, tokens): **PASSED**
- Dependency registration in `bin/skill-dependencies.json`: **PASSED**
- Error handling on non-git directories (`ok: false`, `not-a-git-repo`): **PASSED**
- Git fixture collection (main vs feature branches, `onBase` calculation): **PASSED**
- Plan state parsing (`*.state.md` extraction): **PASSED**
- Changelog parsing: **PASSED**
- Missing path gap diagnostics: **PASSED**

### 2. Full Test Suite (`npm run test`)
- `test-install.js --local`: **PASSED**
- `test-quality-gates.js`: **PASSED**
- `test-update-state-yaml.js`: **PASSED**
- `test-resume-gate.js`: **PASSED**
- `test-memory-formatting.js`: **PASSED**
- `test-autoload-configure.js`: **PASSED**
- `test-delivery-commit-artifacts.js`: **PASSED**
- `test-ws-doctor.js`: **PASSED**
- `test-ws-audit.js`: **PASSED**
- `test-infer-human-timing.js`: **PASSED**
- `test-feature-branch-gate.js`: **PASSED**
- `test-testing-executor-model.js`: **PASSED**
- `test-enable-dag.js`: **PASSED**
- `test-skill-frontmatter.js`: **PASSED**
- `test-hybrid-consumer-root.js`: **PASSED**
- `test-pattern-consult.js`: **PASSED**
- `test-ws-pre-daily.js`: **PASSED**

### 3. Integrity Verification (`npm run verify-integrity`)
- `bin/skill-integrity.json`: **PASSED** (matches tree, 45 skills)

**Overall Status: PASSED (0 failures)**
