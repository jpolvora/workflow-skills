# Step 7 Testing Plan, US-150

## Scope and pass criteria

US-150 adds the optional `ws-senior-developer` package skill, its generated evals, Workflows package registration, installer assertions, and related hub, README, and site output. Pass requires current-tree integrity, local packed-install tests, site generation, workflow validation, and the full read-only harness scan to succeed. The package, test-consumer tarball reference, and generated site footer must all report version `0.0.97`.

## Test matrix

| Area | Check | Expected evidence |
|---|---|---|
| Integrity | `npm run verify-integrity` | Current installable content matches `bin/skill-integrity.json`. |
| Package and installer | `npm run tests -- --local` | `npm pack` plus local consumer installation passes, including the new Workflows member and evals. |
| Generated documentation | `node bin/build-site.js` | Site regenerates without a version bump; `docs/index.html` footer remains `v0.0.97`. |
| Workflow graph | `python .agents/skills/ws-check-workflows/scripts/check_workflows.py` | Standard/lite dispatch, package closure, and artifact contracts pass. |
| Harness | ws-check-harness Phases 0–5c | No critical path, portability, routing, integrity, or auto-load conflict finding. |
| Release parity | Read `package.json`, `test/package.json`, and generated site footer | All use `0.0.97`; test consumer points at `workflow-skills-0.0.97.tgz`. |
| Documentation hygiene | Conflict-marker scan in changed human and hub docs | No `<<<<<<<`, `=======`, or `>>>>>>>` markers. |

## Non-applicable surfaces

- No API, database, RBAC, tenancy, seed-data, migration, locale, or runtime service surface exists for this package-only change.
- No browser or UI/E2E validation will run: the repository has generated static documentation only and no application UI test surface. This invocation explicitly skips browser testing.
- Accessibility and contrast validation for form errors and alert indicators is not applicable because US-150 introduces no forms, interactive alerts, or rendered application UI.

## Defect threshold

Any command failure, integrity mismatch, package-version mismatch, documentation conflict marker, or harness critical finding fails Step 7. Non-critical harness observations are recorded for the parent workflow and do not authorize implementation edits in this step.
