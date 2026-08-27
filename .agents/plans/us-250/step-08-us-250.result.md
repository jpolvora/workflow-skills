---
slug: us-250
workflowId: us-250-20260827T143734Z
step: 8
status: completed
startedAt: "2026-08-27T15:10:39Z"
endedAt: "2026-08-27T15:11:35Z"
acRefs:
  - AC1
  - AC2
  - AC3
  - AC4
  - AC5
  - AC6
---

# Delivery Result — US-250

**Title:** Harness: remove retired ws-patterns references from hub templates/seeds
**Issue:** https://github.com/jpolvora/workflow-skills/issues/250
**Pull Request:** https://github.com/jpolvora/workflow-skills/pull/251
**PR Number:** 251
**Branch:** `develop` → `main`
**Commit:** `b2f10f76`

---

## Acceptance Criteria Summary

| AC | Requirement | Status |
|---|---|---|
| AC1 | `retired_artifacts.cjs` lists `'backend.md.template'` and `'frontend.md.template'` in `RETIRED_HUB_FILES` | PASS |
| AC2 | `retired_artifacts.cjs` lists `'patterns'` and `'_comment_patterns'` in `RETIRED_DEFAULTS_KEYS` / `RETIRED_DEFAULTS_COMMENT_KEYS` | PASS |
| AC3 | `STALE_LIVE_REFERENCE_PATTERNS` in `retired_artifacts.cjs` contains patterns to detect any stale references | PASS |
| AC4 | Live `backend.md` and `frontend.md` intros reference `STACK.md` / architecture docs with zero `ws-patterns` mentions | PASS |
| AC5 | `test-consumer-migration.js`, `test-ws-doctor.js`, and `test-install.js` verify template pruning and config key stripping | PASS |
| AC6 | Harness checks (`ws-check-harness` / `npm test`) pass with 0 errors | PASS |

---

## Changes Delivered

1. **`retired_artifacts.cjs`**: Added `'backend.md.template'`, `'frontend.md.template'` to `RETIRED_HUB_FILES`; added `'patterns'` to `RETIRED_DEFAULTS_KEYS` and `'_comment_patterns'` to `RETIRED_DEFAULTS_COMMENT_KEYS`.
2. **`doctor.js`**: Synchronized fallback object in `ws-doctor` with the new retired hub files and comment keys.
3. **`backend.md` & `frontend.md`**: Updated intros to direct agents to `STACK.md` and architecture documentation.
4. **`test/test-consumer-migration.js`**: Added assertions verifying that `_comment_patterns` and `patterns` are stripped, and `backend.md.template` / `frontend.md.template` are pruned.
5. **`test/test-ws-doctor.js`**: Verified that `ws-doctor` detects `backend.md.template`, `frontend.md.template`, and `_comment_patterns` as stale retired artifacts.
6. **`test/test-install.js`**: Verified that `update` unlinks `backend.md.template` and `frontend.md.template` and strips comment keys.
7. **`bin/skill-integrity.json`**: Regenerated integrity digests.
