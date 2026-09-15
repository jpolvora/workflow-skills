---
step: 6
slug: installer-antigravity-gemini-skills-json
workflowId: installer-antigravity-gemini-skills-json
status: completed
startedAt: "2026-09-15T03:57:32Z"
endedAt: "2026-09-15T03:58:48Z"
acRefs: []
---
# Code Review: Declarative Antigravity & Gemini skills.json Configuration

**Slug:** `installer-antigravity-gemini-skills-json`
**Review Target:** `develop` (commit `51d3acb5`) vs `main`
**Reviewer:** `named:ws-code-review` (inline)
**Date:** 2026-09-14
**Status:** Approved (0 Critical, 0 Warning, 0 Suggestion)

---

## Phase 1: Triage & Defect-Class Scan

- **Scope & Footprint:**
  - `bin/install-rules.js`: +175 lines. Helper functions for `skills.json` lifecycle (`getGeminiSkillsJsonPath`, `readGeminiSkillsJson`, `upsertGeminiSkillsJsonEntry`, `removeGeminiSkillsJsonEntry`, `cleanupLegacyGeminiSkills`) and secondary target config path resolution.
  - `bin/cli.js`: +60 lines. Integration in `projectSkillsToSecondaryTargets` and `removeSkillsFromSecondaryTargets`.
  - `test/test-install.js`: +136 lines. Complete test coverage across unit operations, corrupt recovery, legacy cleanup, custom preservation, and end-to-end multi-target CLI lifecycles.
  - `README.md` & `docs/index.html`: Documentation of declarative `skills.json` vs folder projections.
  - `bin/skill-integrity.json`: Synchronized hash manifest.
- **Defect Classes Inspected:**
  1. *Dangling Reparse Points / Lexical Removal*: Verified `cleanupLegacyGeminiSkills` uses `pathLexists` and `removeLexicalPath` so broken symlinks/junctions heal without `ENOENT`/`EEXIST`.
  2. *Data Loss on User Config*: Verified `upsertGeminiSkillsJsonEntry` preserves existing user `entries`, `inherits`, and custom keys.
  3. *Malformed JSON Handling*: Verified `readGeminiSkillsJson` catches parse errors, writes `.bak.<timestamp>` copy, logs warning, and heals safely.
  4. *Uninstall Cascade Symmetry*: Verified `removeGeminiSkillsJsonEntry` is called on uninstallation of workflow skills or removal of the gemini target, and does not strip user entries.
  5. *Secondary Auto-Detection Safety*: Verified `detectExistingSecondaryTargets` checks both folder and `configPath` existence, with best-effort containment when paths are unwritable.

---

## Phase 2: Deep-Dive Verification

### Acceptance Criteria Verification

| Criterion | Status | Evidence |
|-----------|--------|----------|
| **AC1:** Define helper functions in `bin/install-rules.js` | Verified | `bin/install-rules.js:L604-L707` |
| **AC2:** Update global install & update in `bin/cli.js` | Verified | `bin/cli.js:L377-L415` |
| **AC3:** Automatically detect and remove legacy `ws-*` skills | Verified | `bin/install-rules.js:L715-L747`, `bin/cli.js:L388-L393` |
| **AC4:** Update global uninstallation in `bin/cli.js` | Verified | `bin/cli.js:L448-L465`, `bin/install-rules.js:L692-L707` |
| **AC5:** Preserve pre-existing custom entries and inherits | Verified | `bin/install-rules.js:L615-L684` |
| **AC6:** Update secondary target auto-detection | Verified | `bin/install-rules.js:L105-L127`, `bin/install-rules.js:L245-L270` |
| **AC7:** Update CLI documentation in README & docs | Verified | `README.md:L138-L141`, `docs/index.html:L2224-L2242` |
| **AC8:** Automated tests in `test/test-install.js` | Verified | `test/test-install.js:L2630-L2725` |

### Negative Scenarios Verification

| Scenario | Status | Evidence |
|----------|--------|----------|
| **NS1:** Corrupt JSON recovery creates backup and heals safely | Verified | `test/test-install.js` (`corrupt skills.json recovery creates backup and heals safely (NS1)`) |
| **NS2:** Legacy directory cleanup preserves custom user skills | Verified | `test/test-install.js` (`cleanupLegacyGeminiSkills cleans legacy ws-* and preserves custom skills (AC3, NS2)`) |
| **NS3:** Uninstallation removes only canonical entry | Verified | `test/test-install.js` (`removeGeminiSkillsJsonEntry removes canonical entry and keeps user entries (AC4)`) |
| **NS4:** Read-only / unwritable containment | Verified | `test/test-install.js` (`failing auto-detected secondary warns and continues without aborting`) |

---

## Verdict

- **Critical Findings:** 0
- **Warning Findings:** 0
- **Suggestions:** 0
- **Final Verdict:** APPROVED
