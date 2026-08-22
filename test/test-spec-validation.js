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
console.log('test-spec-validation: ok');
