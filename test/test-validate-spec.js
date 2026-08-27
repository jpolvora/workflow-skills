import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;

const script = path.join(repoRoot, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');
const root = temp('ws-validate-spec-dor-');

const base = `---
id: null
slug: dor-tdd
title: Dor Tdd
source: local
specDate: 2026-08-27
---
## Description
Create a small feature.
### Design Intent
Keep the behavior explicit.
## Acceptance Criteria
- AC1: Emit one deterministic result.
`;

const closure = `
## Out of Scope
| Feature | Reason |
|---------|--------|
| Merge spec boards | Breaks the two-board contract |
## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Validator default | compat | Keep historical exit codes | y |
| Remaining dimensions | N/A because this fixture is a unit test | Collapse rule | y |
`;

const dor = `
## Definition of Ready (DoR)
| Readiness Item | Requirement | Verification Method |
|----------------|-------------|---------------------|
| Bounded Scope | Clear problem statement | Inspect Description and Out of Scope |
`;

const notes = `
## Validation & Observation Notes
### Telemetry & Observable Signals
- Authoring validator emits PASS or FAIL for --mode=authoring.
### Negative & Failing Test Scenarios
- Missing DoR heading fails authoring validation with exit code 1.
`;

const missingDor = write(path.join(root, 'missing-dor.spec.md'), `${base}${closure}${notes}`);
const missingDorRun = run(script, [missingDor, '--mode=authoring', '--modification']);
assert.notStrictEqual(missingDorRun.status, 0, 'authoring fails when Definition of Ready is missing');
assert.match(`${missingDorRun.stdout}${missingDorRun.stderr}`, /Required section is missing: ## Definition of Ready \(DoR\)/);

const emptyNotes = write(path.join(root, 'empty-notes.spec.md'), `${base}${closure}${dor}
## Validation & Observation Notes
TBD
`);
const emptyNotesRun = run(script, [emptyNotes, '--mode=authoring', '--modification']);
assert.notStrictEqual(emptyNotesRun.status, 0, 'authoring fails when Validation Notes are placeholder-only');

const missingNotes = write(path.join(root, 'missing-notes.spec.md'), `${base}${closure}${dor}`);
const missingNotesRun = run(script, [missingNotes, '--mode=authoring', '--modification']);
assert.notStrictEqual(missingNotesRun.status, 0, 'authoring fails when Validation Notes heading is missing');
assert.match(`${missingNotesRun.stdout}${missingNotesRun.stderr}`, /Required section is missing: ## Validation & Observation Notes/);

const authoringPass = write(path.join(root, 'authoring-pass.spec.md'), `${base}${closure}${dor}${notes}`);
assert.strictEqual(run(script, [authoringPass, '--mode=authoring', '--modification']).status, 0, 'authoring passes with DoR and Validation Notes');

const compat = run(script, [missingDor, '--modification']);
assert.strictEqual(compat.status, 0, 'compat does not fail historical specs that omit DoR');
assert.match(compat.stderr, /WARN:[\s\S]*Definition of Ready \(DoR\)/i);

const liveSpec = path.join(repoRoot, '.agents/specs/spec-dor-tdd-refinement-hardening.spec.md');
assert.strictEqual(
  run(script, [liveSpec, '--mode=authoring']).status,
  0,
  'live hardening spec must pass authoring validation',
);

assert.ok(fs.existsSync(authoringPass));
console.log('test-validate-spec: ok');
