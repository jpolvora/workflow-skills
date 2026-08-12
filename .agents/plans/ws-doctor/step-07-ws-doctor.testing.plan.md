# step-07-ws-doctor.testing.plan.md

slug: ws-doctor
skill: ws-testing
status: planned
skipTesting: false
skip-browser: true
skipMutationTesting: true

## 0. Scope

Pre-PR testing for `ws-doctor` (read-only diagnose skill + `scripts/doctor.js` + hub/router registration + thin smoke tests). No browser/UI surface. Mutation skipped per `defaults.skipMutationTesting: true` and empty `verification.mutationTest`.

## 1. Unit & coverage commands

| Area | Command | Source |
|------|---------|--------|
| Full package suite | `npm run test` | `config.json` → `verification.backendTest` |
| Focused doctor smoke | `node test/test-ws-doctor.js` | Plan/T5; wired in `package.json` `tests` |
| Frontend | n/a | `verification.frontendTest` empty |
| Build | n/a | `verification.backendBuild` / `frontendBuild` empty |

Coverage notes: no separate coverage runner configured. Treat suite exit code + doctor smoke assertions as the quality signal. Gaps vs changed files: `test/test-ws-doctor.js` covers syntax (`node --check`), `--help`, `--json --skill` report shape (four sections), missing-config + read-only; AC3/AC4 broken-path/launcher/parse-fail fixtures not automated (accepted in Step 5).

## 2. Target hosts / credentials / DB

| Item | Plan |
|------|------|
| apiHost / devHost | Not applicable — CLI/Node harness, no HTTP surface |
| Credentials | None |
| DB seeds / rollback | Unnecessary — no database |

## 3. API contracts / RBAC / tenancy

Not applicable (no API endpoints). Skip with reason recorded in report.

## 4. Integration / E2E

| Path | Plan |
|------|------|
| Installer + integrity + quality gates | Covered by `npm run test` (`pretests` → pack; `tests` chain including `test-ws-doctor.js`) |
| Doctor live smoke | Asserted inside `test/test-ws-doctor.js` |
| UI / browser | **Skip** — no browser/UI surface; orch `skip-browser` |

## 5. Feature-quality AC checklist (observable)

| AC | Observable check in this Step 7 |
|----|----------------------------------|
| AC1–AC2 | Package + smoke exit 0 / report tool field |
| AC3–AC6 | JSON report keys: pathErrors, toolScriptDiagnostics, configuration, missingReferences |
| AC7 | Missing-config fixture: available false, no invented config, tree unchanged |
| AC8–AC10 | Structural (reviewed prior); not re-asserted by suite beyond skill presence |
| AC11 | Integrity/harness membership exercised by full `npm run test` / prior verify; full agentic harness optional |

## 6. Defect thresholds

| Metric | Pass if |
|--------|---------|
| `npm run test` | exit 0 |
| `node test/test-ws-doctor.js` | exit 0, 0 failures |
| Mutation | skipped (not fail) |
| Browser | skipped (not fail) |

## 7. Mutation

**status: skipped** (planned)

Reasons (any one sufficient):
- `defaults.skipMutationTesting: true`
- `verification.mutationTest` empty/unset

No Mutation section execution. Do not fail Step 7 for skip.

## 8. Accessibility / contrast

No form UI / alert indicators in scope — skip with note in report.
