# Step 7 Testing Plan — ws-doctor-204-205

## Scope and pass criteria

Fix ws-doctor GitHub issues #204 (provider Canonical scripts `python` launcher prefix) and #205 (skill-folder file-relative `docs/` resolution). Pass requires:

1. Focused doctor suite `node test/test-ws-doctor.js` exits 0 (AC1–AC8)
2. Full install suite `npm run test` (`verification.backendTest`) exits 0
3. No browser/UI surface (`skip-browser: true`)
4. Mutation testing skipped per config (see below)
5. **Do not** run `npm run generate-integrity` in this step — integrity regenerate is Step 8 ship gate

## Test matrix

| Area | Command | Expected evidence | AC |
|------|---------|-------------------|-----|
| Focused doctor tests | `node test/test-ws-doctor.js` | Exit 0; AC1–AC8 cases in `main()` pass | AC1–AC8 |
| Full install suite | `npm run test` | Exit 0; `pretests` pack + all chained test files | AC8 / packaging |

## Feature-quality AC checklist (observable)

| AC | Observable check | Where asserted |
|----|------------------|----------------|
| AC1 | GitHub Canonical scripts row has `python {skillsRoot}/ws-local-spec-provider/scripts/register_local_spec.py --source github` | `testGithubCanonicalRegisterRowHasPythonLauncher` |
| AC2 | Azure DevOps Canonical scripts row has `python` prefix and `--source azure-devops` | `testAzureCanonicalRegisterRowHasPythonLauncher` |
| AC3 | `--json --skill ws-github-provider` and `--skill ws-azure-devops-provider` missingLaunchers exclude `register_local_spec.py --source` rows | `testProviderRegisterRowsNotMissingLaunchers` |
| AC4 | Skill-folder `docs/faq.md` resolves file-relative when companion exists under skill | `testSkillFolderDocsFileRelative` |
| AC4 trap | Skill-folder cite still missing when only project-root `docs/faq.md` exists | `testSkillFolderDocsDoesNotUseProjectRoot` |
| AC5 | Hub `AGENTS.md` citing `docs/catalog.md` resolves against project root | `testHubDocsStaysProjectRoot` |
| AC6 | Live `--skill ws-spec-to-pr` does not report `docs/faq.md` missing when skill companion exists | `testLiveSpecToPrDocsFaqNotMissing` |
| AC7 | Fixture skill with companions under skill `docs/specs/`, `docs/testing/`, `docs/faq.md` not reported missing | `testSkillFolderDocsCompanionsWhenPresent` |
| AC8 | `package.json` `tests` includes `test/test-ws-doctor.js`; full `npm run test` exit 0 | install suite chain |

## Mutation testing

**Skipped.** Reasons:

- `defaults.skipMutationTesting: true` (config)
- `verification.mutationTest` empty/unset

No mutation command will run; Step 7 does not fail on mutation absence.

## Non-applicable surfaces

- No API, database, RBAC, tenancy, seeds, migrations, or locale runtime (`stack.id`: `node-skills-package`)
- Browser / UI / E2E skipped (`skip-browser: true`; no application UI)
- `verification.backendBuild` empty — no separate build step
- Accessibility / contrast for form errors: N/A (no forms or interactive alerts)

## Defect threshold

- Focused or full test suite failure → Step 7 **failed**; hand off to implement fix loop (this step does not edit product/test code)
- Integrity stale without Step 8 regenerate → expected pre-ship state; report failure with handoff to Step 8 `generate-integrity`
- Do **not** bump `package.json` version in this step
