import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot } = utils;

const format = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-format/FORMAT.md'), 'utf8');
assert.match(format, /## Definition of Ready \(DoR\)/);
assert.match(format, /## Validation & Observation Notes/);
assert.match(format, /Readiness Item/);
assert.match(format, /Negative & Failing Test Scenarios/);

const writeSpec = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-write-spec/SKILL.md'), 'utf8');
assert.match(writeSpec, /Definition of Ready/);
assert.match(writeSpec, /negative failure/i);
assert.match(writeSpec, /observation notes/i);

const interview = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-interview/SKILL.md'), 'utf8');
assert.match(interview, /Definition of Ready/);
assert.match(interview, /failing test baseline/i);

const implement = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-implement-tasks/SKILL.md'), 'utf8');
assert.match(implement, /failing tests first/i);
assert.match(implement, /false-positive/i);
assert.match(implement, /--negative/);

const verify = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-verify-plan/SKILL.md'), 'utf8');
assert.match(verify, /negative test/i);
assert.match(verify, /negativeScenarios/);

const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.match(pkg.scripts['tests:harness-efficiency'], /test-validate-spec\.js/);
assert.match(pkg.scripts['tests:harness-efficiency'], /test-spec-dor-tdd\.js/);

console.log('test-spec-dor-tdd: ok');
