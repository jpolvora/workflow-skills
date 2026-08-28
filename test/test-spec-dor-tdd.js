import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot } = utils;
const { negativeScenariosFromSpec } = require(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs'));

const format = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-format/FORMAT.md'), 'utf8');
assert.match(format, /## Definition of Ready \(DoR\)/);
assert.match(format, /## Validation & Observation Notes/);
assert.match(format, /Readiness Item/);
assert.match(format, /Negative & Failing Test Scenarios/);
assert.match(format, /authoring validation fails if/i);

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
assert.match(implement, /Lite orch/);
assert.doesNotMatch(implement, /Step 5 fail-closes/);

const verify = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-verify-plan/SKILL.md'), 'utf8');
assert.match(verify, /negative test/i);
assert.match(verify, /negativeScenarios/);

const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
assert.match(pkg.scripts['tests:harness-efficiency'], /test-validate-spec\.js/);
assert.match(pkg.scripts['tests:harness-efficiency'], /test-spec-dor-tdd\.js/);

// V9 — thin ingest assert: inline AC backticks must not steal Notes section
const stealSpec = [
  '## Acceptance Criteria',
  '- AC1: Inline `## Validation & Observation Notes` in AC backticks before the real section.',
  '- AC2: Another inline `## Validation & Observation Notes` reference in AC text.',
  '',
  '## Validation & Observation Notes',
  '',
  '### Negative & Failing Test Scenarios',
  '- First steal-case negative scenario.',
  '- Second negative scenario for ingest coverage.',
  '- Third negative scenario for ingest coverage.',
  '',
].join('\n');
const stealNegatives = negativeScenariosFromSpec(stealSpec);
assert.strictEqual(stealNegatives.length, 3, 'V9: negativeScenariosFromSpec ignores inline AC backticks');
assert.match(stealNegatives[0].text, /First steal-case negative scenario/);

console.log('test-spec-dor-tdd: ok');
