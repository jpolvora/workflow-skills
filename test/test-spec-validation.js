import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;

const script = path.join(repoRoot, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');
const root = temp('ws-spec-validation-');
const valid = write(path.join(root, 'valid.spec.md'), `---
id: null
slug: valid
title: Valid
source: local
specDate: 2026-08-21
---
## Description
Create a small feature.
### Design Intent
Keep the behavior explicit.
## Acceptance Criteria
- AC1: Emit one deterministic result.
- AC2: Validate the result with a named test.
`);
assert.strictEqual(run(script, [valid, '--modification']).status, 0, 'valid specification should pass');

const composite = write(path.join(root, 'composite.spec.md'), fs.readFileSync(valid, 'utf8').replace(
  '- AC1: Emit one deterministic result.',
  '- AC1: **Emit** one result and **validate** another result.',
));
const result = run(script, [composite, '--modification', '--json']);
assert.notStrictEqual(result.status, 0, 'composite AC should fail');
assert.match(result.stdout, /AC1[\s\S]*composite/i);

const tracker = write(path.join(root, 'tracker.spec.md'), fs.readFileSync(valid, 'utf8').replace('source: local', 'source: github'));
assert.notStrictEqual(run(script, [tracker]).status, 0, 'tracker spec without Prior Work Sweep should fail');

const closureBlock = `
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

const missingOut = write(path.join(root, 'missing-out.spec.md'), `${fs.readFileSync(valid, 'utf8')}
## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default | compat | Keep tests green | y |
`);
assert.notStrictEqual(run(script, [missingOut, '--mode=authoring']).status, 0, 'authoring fails when Out of Scope is missing');

const emptyAssume = write(path.join(root, 'empty-assume.spec.md'), `${fs.readFileSync(valid, 'utf8')}
## Out of Scope
| Feature | Reason |
|---------|--------|
| Shim folders | Latest layout only |
## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default | TBD |  | n |
`);
assert.notStrictEqual(run(script, [emptyAssume, '--mode=authoring']).status, 0, 'authoring fails on empty assumption cells');

const emptyOut = write(path.join(root, 'empty-out.spec.md'), `${fs.readFileSync(valid, 'utf8')}
## Out of Scope
| Feature | Reason |
|---------|--------|
## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
| Default | compat | Keep tests green | y |
`);
assert.notStrictEqual(run(script, [emptyOut, '--mode=authoring']).status, 0, 'authoring fails when Out of Scope has zero data rows');

const emptyAssumeTable = write(path.join(root, 'empty-assume-table.spec.md'), `${fs.readFileSync(valid, 'utf8')}
## Out of Scope
| Feature | Reason |
|---------|--------|
| Shim folders | Latest layout only |
## Assumptions & Open Questions
| Assumption | Chosen default | Rationale | Confirmed |
|------------|----------------|-----------|-----------|
`);
assert.notStrictEqual(run(script, [emptyAssumeTable, '--mode=authoring']).status, 0, 'authoring fails when Assumptions has zero data rows');

const compat = run(script, [valid, '--modification']);
assert.strictEqual(compat.status, 0, 'compat omits --mode and does not fail missing closure');
assert.match(compat.stderr, /WARN:[\s\S]*Out of Scope/i);

const authoringPass = write(path.join(root, 'authoring-pass.spec.md'), `${fs.readFileSync(valid, 'utf8')}${closureBlock}`);
assert.strictEqual(run(script, [authoringPass, '--mode=authoring', '--modification']).status, 0, 'full authoring fixture should pass');

const help = run(script, ['--help']);
assert.strictEqual(help.status, 0, '--help exits 0');
assert.match(`${help.stdout}${help.stderr}`, /Usage/i);
assert.match(`${help.stdout}${help.stderr}`, /--mode/);

const unknownFlag = run(script, ['--nope']);
assert.notStrictEqual(unknownFlag.status, 0, 'unknown dash flag exits non-zero');
assert.match(unknownFlag.stderr, /unknown argument: --nope/i);
assert.doesNotMatch(unknownFlag.stderr, /ENOENT/);

console.log('test-spec-validation: ok');
