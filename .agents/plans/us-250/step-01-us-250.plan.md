---
slug: us-250
title: "Harness: remove retired ws-patterns references from hub templates/seeds"
status: active
step: 1
workflowId: us-250-20260827T143734Z
startedAt: "2026-08-27T14:37:34Z"
endedAt: "2026-08-27T15:01:30.472Z"
acRefs: []
---
## 0. Summary & Business Rules

**Objective:** Remove obsolete references to retired `ws-patterns` and associated template files and config comment keys across hub templates, doctor diagnostics, and consumer migration scripts.

**Business Rules:**
1. **Single Source of Truth for Retired Artifacts:** `.agents/skills/ws-shared/scripts/retired_artifacts.cjs` must be the authoritative registry listing all retired hub files (`backend.md.template`, `frontend.md.template`, `session-lease.schema.json`), retired config keys (`patterns`, `patternsBackend`, `patternsFrontend`, `sessionLeases`, `enableAuditing`), and retired comment keys (`_comment_patterns`, `_comment_patternsBackend`, `_comment_patternsFrontend`, `_comment_sessionLeases`, `_comment_enableAuditing`).
2. **Hygiene Across Install, Update, and Doctor:** `pruneRetiredConsumerArtifacts()` and `ws-doctor` must actively detect and remove retired templates and config keys from both project and global `ws-shared/` folders without touching user-authored content.
3. **Consumer Data Preservation:** User-authored `backend.md` and `frontend.md` notes under `ws-shared/` are consumer-owned and must not be overwritten or deleted; only obsolete `.template` files and config comments are pruned.
4. **Live File Hygiene:** Live hub files (`backend.md`, `frontend.md`) instruct agents to consult `STACK.md` / architecture docs and must contain 0 occurrences of `ws-patterns`.
5. **No Regressions:** Full test suite (`npm test`, `test-consumer-migration.js`, `test-ws-doctor.js`, `test-install.js`) and integrity checks must pass with exit code 0.

## 1. Definition of Ready & Scope

### Acceptance Criteria Coverage

| AC | Statement | Plan Section |
|---|---|---|
| AC1 | `retired_artifacts.cjs` lists `'backend.md.template'` and `'frontend.md.template'` in `RETIRED_HUB_FILES` | §3 Step 1 |
| AC2 | `retired_artifacts.cjs` lists `'patterns'` and `'_comment_patterns'` in `RETIRED_DEFAULTS_KEYS` / `RETIRED_DEFAULTS_COMMENT_KEYS` | §3 Step 1 |
| AC3 | `STALE_LIVE_REFERENCE_PATTERNS` in `retired_artifacts.cjs` includes patterns for retired keys/templates | §3 Step 1 |
| AC4 | Live `backend.md` and `frontend.md` intros reference `STACK.md` and architecture docs with 0 `ws-patterns` | §3 Step 2 |
| AC5 | Migration, doctor, and install tests verify template pruning and config key stripping | §3 Step 3 |
| AC6 | `ws-check-harness` and `npm test` pass with 0 errors or retired-id warnings | §3 Step 4 |

### In Scope
- `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`
- `.agents/skills/ws-doctor/scripts/doctor.js` (fallback object parity)
- `.agents/skills/ws-shared/backend.md` & `frontend.md`
- `test/test-consumer-migration.js`
- `test/test-ws-doctor.js`
- `test/test-install.js`

### Out of Scope
- Reintroducing `ws-patterns` or altering `STACK.md` structure.
- Deleting consumer custom files.

## 2. Architecture & Design

`retired_artifacts.cjs` is imported by:
1. `bin/consumer-migration.js` (during `npx` install and update)
2. `ws-doctor` (during `doctor.js` diagnostics for stale config and retired files)
3. Test suites (`test-consumer-migration.js`, `test-ws-doctor.js`, `test-install.js`)

Updating `RETIRED_HUB_FILES`, `RETIRED_DEFAULTS_KEYS`, `RETIRED_DEFAULTS_COMMENT_KEYS`, and `STALE_LIVE_REFERENCE_PATTERNS` ensures that when `update` runs in a consumer or global install, `pruneRetiredConsumerArtifacts` unlinks obsolete `backend.md.template` / `frontend.md.template` files and strips `defaults._comment_patterns` from `config.json`.

## 3. Step-by-Step Implementation Plan

### Step 1: Update Retired Registry (`retired_artifacts.cjs` & `doctor.js`)
- In `.agents/skills/ws-shared/scripts/retired_artifacts.cjs`:
  - Add `'backend.md.template'` and `'frontend.md.template'` to `RETIRED_HUB_FILES`.
  - Add `'patterns'` to `RETIRED_DEFAULTS_KEYS`.
  - Add `'_comment_patterns'` to `RETIRED_DEFAULTS_COMMENT_KEYS`.
- In `.agents/skills/ws-doctor/scripts/doctor.js`:
  - Update the fallback object keys and `RETIRED_HUB_FILES` to match.

### Step 2: Verify and Align Live Pattern Notes (`backend.md`, `frontend.md`)
- Ensure `.agents/skills/ws-shared/backend.md` and `.agents/skills/ws-shared/frontend.md` clarify that architecture notes belong in `STACK.md` / architecture docs, with 0 mentions of `ws-patterns`.

### Step 3: Extend Test Suites (`test-consumer-migration.js`, `test-ws-doctor.js`, `test-install.js`)
- In `test/test-consumer-migration.js`:
  - Assert that `stripRetiredConfigKeys` removes `defaults._comment_patterns` and `defaults.patterns`.
  - Assert that `pruneRetiredConsumerArtifacts` removes `backend.md.template` and `frontend.md.template` from `ws-shared/`.
- In `test/test-ws-doctor.js`:
  - Verify that `ws-doctor` detects `backend.md.template`, `frontend.md.template`, and `defaults._comment_patterns` as stale retired artifacts.
- In `test/test-install.js`:
  - Verify that `update` prunes `backend.md.template` and `frontend.md.template`.

### Step 4: Verification & Integrity Regeneration
- Run `npm test` to execute the full test suite.
- Run `npm run generate-integrity` to refresh checksums.
- Confirm 0 errors and 0 warnings on harness checks.

## 4. Testing & Verification Plan

### Automated Tests
- `node test/test-consumer-migration.js`
- `node test/test-ws-doctor.js`
- `node test/test-install.js`
- `npm test`

### Manual Verification
- Verify `ws-doctor` JSON output on a fixture containing `backend.md.template` and `_comment_patterns`.
