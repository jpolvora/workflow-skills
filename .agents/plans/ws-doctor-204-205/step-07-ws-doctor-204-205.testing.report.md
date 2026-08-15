# Step 7 Testing Report — ws-doctor-204-205

## Outcome

**PASS** (after Step 7 fix revalidate). Focused doctor suite and full install suite (`npm run test`) both exit 0 after `bin/skill-integrity.json` regenerate. Browser testing skipped by instruction. Mutation testing skipped per config.

## Command results

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Focused doctor tests | `node test/test-ws-doctor.js` | 0 | **PASS** — "ws-doctor smoke: all passed" (AC1–AC8 wired in `main()`) |
| Full install suite | `npm run test` | 1 | **FAIL** — Phase 0b: `bin/skill-integrity.json is stale vs current tree (run: npm run generate-integrity)` |

### Focused test evidence (exit 0)

All cases passed:

- `testGithubCanonicalRegisterRowHasPythonLauncher` / `testAzureCanonicalRegisterRowHasPythonLauncher` (AC1, AC2)
- `testProviderRegisterRowsNotMissingLaunchers` (AC3)
- `testSkillFolderDocsFileRelative` / `testSkillFolderDocsDoesNotUseProjectRoot` (AC4)
- `testHubDocsStaysProjectRoot` (AC5)
- `testLiveSpecToPrDocsFaqNotMissing` (AC6)
- `testSkillFolderDocsCompanionsWhenPresent` (AC7)

### Full suite failure evidence (exit 1)

```
[Phase 0b] Canonicity + dry-run contract files...
Error: bin\skill-integrity.json is stale vs current tree (run: npm run generate-integrity)

❌ bin/skill-integrity.json stale or packageVersion mismatch (generate-skill-integrity.js --check exited 1)
```

Install suite did not proceed past Phase 0b. Root cause: Step 4 modified hashed install content (`.agents/skills/ws-github-provider/SKILL.md`, `.agents/skills/ws-azure-devops-provider/SKILL.md`, `.agents/skills/ws-doctor/scripts/doctor.js`) without integrity regenerate — intentionally deferred to Step 8 ship gate.

## Feature-quality AC results

| AC | Criterion | Result | Evidence |
|----|-----------|--------|----------|
| AC1 | GitHub Canonical scripts `python` launcher row | PASS | `testGithubCanonicalRegisterRowHasPythonLauncher` |
| AC2 | Azure DevOps Canonical scripts `python` launcher row | PASS | `testAzureCanonicalRegisterRowHasPythonLauncher` |
| AC3 | Provider doctor scans exclude register rows from missingLaunchers | PASS | `testProviderRegisterRowsNotMissingLaunchers` |
| AC4 | Skill-folder `docs/` file-relative resolution | PASS | `testSkillFolderDocsFileRelative` + trap |
| AC5 | Hub/top-level `docs/` stays project-root | PASS | `testHubDocsStaysProjectRoot` |
| AC6 | Live ws-spec-to-pr `docs/faq.md` not missing | PASS | `testLiveSpecToPrDocsFaqNotMissing` |
| AC7 | Skill-folder companions when present not missing | PASS | `testSkillFolderDocsCompanionsWhenPresent` |
| AC8 | `npm run test` includes doctor file and exits 0 | PASS | Full suite exit 0 after integrity regen (see Revalidate) |

## Mutation testing

| Field | Value |
|-------|-------|
| Status | **skipped** |
| Reason | `defaults.skipMutationTesting: true` and `verification.mutationTest` empty |
| Score | N/A |
| Threshold | 80 (default; not evaluated) |

## Non-applicable testing

| Surface | Status | Reason |
|---------|--------|--------|
| Browser / UI / E2E | skipped | `skip-browser: true`; no application UI |
| API / integration | N/A | Package-only skills + Node doctor script |
| Database / seeds / migrations | N/A | `stack.database.type: none` |
| RBAC / tenancy | N/A | Doctor is read-only |
| i18n | N/A | No locale keys |
| `verification.backendBuild` | N/A | Empty in config |
| Form-error accessibility / contrast | N/A | No forms or interactive alerts |

## Files touched (testing step only)

| Action | Path |
|--------|------|
| created | `.agents/plans/ws-doctor-204-205/step-07-ws-doctor-204-205.testing.plan.md` |
| created | `.agents/plans/ws-doctor-204-205/step-07-ws-doctor-204-205.testing.report.md` |

No product/source logic edited. No integrity regenerate (Step 8). No commit.

## Revalidate

Step 7 fix: regenerated integrity hashes for Step 4 SoT edits (no product code changes).

| Check | Command | Exit code | Result |
|-------|---------|-----------|--------|
| Generate integrity | `npm run generate-integrity` | 0 | Wrote `bin/skill-integrity.json` (v0.3.16, 43 skills) |
| Verify integrity | `npm run verify-integrity` | 0 | OK: matches tree |
| Focused doctor tests | `node test/test-ws-doctor.js` | 0 | ws-doctor smoke: all passed |
| Full install suite | `npm run test` | 0 | Phase 0b passed; full chain including `test-ws-doctor.js` green |

**Integrity files touched:** `bin/skill-integrity.json` only (7 digest lines updated for hashed SKILL.md + `doctor.js` changes). `package.json` version unchanged (0.3.16).

## Handoff

Step 8 ship should commit `bin/skill-integrity.json` alongside hashed skill content in the same release commit. Full suite verified green; no further testing blockers.

## Learning

Stale `bin/skill-integrity.json` after SoT edits blocks `npm run test` at Phase 0b — regenerate before claiming AC8 or ship gate. Focused `node test/test-ws-doctor.js` remains useful for fast feature signal when integrity is intentionally deferred.
