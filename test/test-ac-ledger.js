import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { loadJsonSchema, validateNode } = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/validate_json_schema.cjs'));
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const reviewScript = path.join(repoRoot, '.agents/skills/ws-code-review/scripts/write_review_round.cjs');
const root = temp('ws-ac-ledger-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' }, fable: { auditVerdictsBlockShip: 'refuted' } }));
write(path.join(root, 'feature.spec.md'), '## Acceptance Criteria\n- AC1: First behavior.\n- AC2: Second behavior.\n');
write(path.join(root, 'impl.js'), 'export const value = 1;\n');
write(path.join(root, 'feature.test.js'), 'test("first behavior", () => {});\ntest("second behavior", () => {});\n');
write(path.join(root, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: ['first behavior'] },
    { id: 'AC2', taskIds: ['T2'], planSectionIds: ['S2'], expectedTestNames: ['second behavior'] },
  ],
}));

function invoke(args) {
  return run(ledgerScript, [...args, '--repo-root', root]);
}

assert.strictEqual(invoke(['init', '--spec', 'feature.spec.md', '--plan-index', 'plan.index.json', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'feature']).status, 0);
for (const [id, name] of [['AC1', 'first behavior'], ['AC2', 'second behavior']]) {
  const result = invoke([
    'link', '--ledger', 'ac-ledger.json', '--event-id', `link-${id}`, '--ac', id,
    '--status', 'Implemented', '--file', 'impl.js:L1-L1',
    '--test', JSON.stringify({ name, sourceFile: 'feature.test.js', phase: 'planned', alias: null, exitCode: null }),
  ]);
  assert.strictEqual(result.status, 0, result.stderr);
}
const scored = JSON.parse(invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(scored.score, 10, 'complete valid evidence derives 10');

assert.strictEqual(invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'defect', '--ac', 'AC1',
  '--finding', JSON.stringify({ id: 'CR-001', severity: 'Warning', state: 'open', round: 1, evidence: 'impl.js:L1-L1' }),
  '--sabotage-exit', '1',
]).status, 0);
const capped = JSON.parse(invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.ok(capped.score <= 8 && capped.knownDefect, 'open Warning and failed sabotage cap below 9');

const rounds = path.join(root, 'rounds');
write(path.join(root, 'r1.md'), '# Review\n\n### CR-001 [Warning] open impl.js:L1-L1\n\nIneffective assertion permits a regression.\n');
write(path.join(root, 'r2.md'), '# Review\n\n### CR-001 [Warning] closed impl.js:L1-L1\n\nAssertion now rejects the regression.\n');
assert.strictEqual(run(reviewScript, ['--input', 'r1.md', '--output-dir', 'rounds', '--slug', 'feature', '--round', '1', '--repo-root', root]).status, 0);
assert.strictEqual(run(reviewScript, ['--input', 'r2.md', '--output-dir', 'rounds', '--slug', 'feature', '--round', '2', '--repo-root', root]).status, 0);
write(path.join(root, 'r1-other.md'), 'No feedback\n');
assert.notStrictEqual(run(reviewScript, ['--input', 'r1-other.md', '--output-dir', 'rounds', '--slug', 'feature', '--round', '1', '--repo-root', root]).status, 0, 'immutable round rewrite fails');
assert.match(fs.readFileSync(path.join(rounds, 'step-06-feature.review.md'), 'utf8'), /closed/);
assert.match(fs.readFileSync(path.join(rounds, 'step-06-feature.review.md'), 'utf8'), /^---\n[\s\S]*^step: 6\n/m);

// AC1 / AC14 — underscore verification keys are not required aliases
const aliasRoot = temp('ws-ac-ledger-alias-');
write(path.join(aliasRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  verification: {
    _comment_mutationTest: 'Optional mutation runner documentation only.',
    backendTest: 'npm run test',
  },
  plans: { dir: '.agents/plans' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(aliasRoot, 'alias.spec.md'), '## Acceptance Criteria\n- AC1: Behavior.\n');
function aliasInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', aliasRoot]);
}
assert.strictEqual(aliasInvoke(['init', '--spec', 'alias.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'alias']).status, 0);
const aliasScore = JSON.parse(aliasInvoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.ok(aliasScore.errors.some((error) => error.includes('backendTest')), 'unobserved backendTest fails');
assert.ok(!aliasScore.errors.some((error) => error.includes('_comment_mutationTest')), 'comment key is not a required alias');

// AC2 — example config has no _comment_mutationTest
const exampleConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/config.json.example'), 'utf8'));
assert.strictEqual(exampleConfig.verification._comment_mutationTest, undefined);

// AC3 — skipReason enum validation at link
for (const reason of ['not-applicable', 'baseline-dirty', 'comment-key']) {
  const link = aliasInvoke([
    'link', '--ledger', 'ac-ledger.json', '--event-id', `skip-${reason}`, '--ac', 'AC1',
    '--alias-result', JSON.stringify({ alias: 'backendTest', command: 'npm run test', exitCode: 0, skipReason: reason }),
  ]);
  assert.strictEqual(link.status, 0, `skipReason ${reason} accepted: ${link.stderr}`);
}
const invalidSkip = aliasInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'skip-invalid', '--ac', 'AC1',
  '--alias-result', JSON.stringify({ alias: 'backendTest', command: 'npm run test', exitCode: 0, skipReason: 'nope' }),
]);
assert.notStrictEqual(invalidSkip.status, 0, 'invalid skipReason rejected at link');

// AC4 / AC5 / AC6 — skip counts as observed; non-zero exit with skip does not set knownDefect
const skipRoot = temp('ws-ac-ledger-skip-');
write(path.join(skipRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  verification: { backendFormat: 'npm run lint', backendTest: 'npm run test' },
  plans: { dir: '.agents/plans' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(skipRoot, 'skip.spec.md'), '## Acceptance Criteria\n- AC1: First.\n- AC2: Second.\n');
write(path.join(skipRoot, 'impl.js'), 'export const value = 1;\n');
write(path.join(skipRoot, 'skip.test.js'), 'test("first behavior", () => {});\ntest("second behavior", () => {});\n');
write(path.join(skipRoot, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: [], planSectionIds: [], expectedTestNames: ['first behavior'] },
    { id: 'AC2', taskIds: ['T2'], planSectionIds: ['S2'], expectedTestNames: ['second behavior'] },
  ],
}));
function skipInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', skipRoot]);
}
assert.strictEqual(skipInvoke(['init', '--spec', 'skip.spec.md', '--plan-index', 'plan.index.json', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'skip']).status, 0);
for (const [id, name, withTest] of [['AC1', 'first behavior', true], ['AC2', 'second behavior', false]]) {
  const args = [
    'link', '--ledger', 'ac-ledger.json', '--event-id', `link-${id}`, '--ac', id,
    '--status', 'Implemented', '--file', 'impl.js:L1-L1',
    '--commit', JSON.stringify({ sha: 'abcdef1', step: 4 }),
  ];
  if (withTest) {
    args.push('--test', JSON.stringify({ name, sourceFile: 'skip.test.js', phase: 'observed', alias: 'backendTest', exitCode: 0 }));
  } else {
    args.push('--test', JSON.stringify({ name, sourceFile: 'skip.test.js', phase: 'planned', alias: null, exitCode: null }));
  }
  assert.strictEqual(skipInvoke(args).status, 0, skipInvoke(args).stderr);
}
assert.strictEqual(skipInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-test', '--ac', 'AC1',
  '--alias-result', JSON.stringify({ alias: 'backendTest', command: 'npm run test', exitCode: 0 }),
]).status, 0);
assert.strictEqual(skipInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format', '--ac', 'AC1',
  '--alias-result', JSON.stringify({ alias: 'backendFormat', command: 'npm run lint', exitCode: 2, skipReason: 'baseline-dirty' }),
]).status, 0);
const skipScore = JSON.parse(skipInvoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'pre-step6']).stdout);
assert.ok(!skipScore.errors.some((error) => error.includes('backendFormat')), 'skipped backendFormat is observed');
assert.strictEqual(skipScore.knownDefect, false, 'skip does not set knownDefect');
assert.ok(skipScore.score > 8, 'skip with non-zero exit does not cap score at 8');

const ledgerSchema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/ac-ledger.schema.json'), 'ac ledger');
const skipLedger = JSON.parse(fs.readFileSync(path.join(skipRoot, 'ac-ledger.json'), 'utf8'));
const schemaErrors = validateNode(skipLedger, ledgerSchema, 'ac-ledger.json');
assert.ok(
  skipLedger.aliasResults.some((row) => row.skipReason === 'baseline-dirty'),
  'linked ledger persists skipReason',
);
assert.ok(
  !schemaErrors.some((error) => /unexpected key skipReason/.test(error)),
  `schema rejects skipReason: ${schemaErrors.join('; ')}`,
);

const nsRoot = temp('ws-ac-ledger-ns-');
write(path.join(nsRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
write(path.join(nsRoot, 'ns.spec.md'), [
  '## Acceptance Criteria',
  '- AC1: First behavior.',
  '',
  '## Validation & Observation Notes',
  '',
  '### Telemetry & Observable Signals',
  '- Authoring validator output.',
  '',
  '### Negative & Failing Test Scenarios',
  '- Missing DoR section fails authoring validation.',
  '',
].join('\n'));
write(path.join(nsRoot, 'impl.js'), 'export const value = 1;\n');
write(path.join(nsRoot, 'ns.test.js'), 'test("missing DoR section fails", () => {});\n');
function nsInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', nsRoot]);
}
assert.strictEqual(nsInvoke(['init', '--spec', 'ns.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'ns']).status, 0);
const nsLedger = JSON.parse(fs.readFileSync(path.join(nsRoot, 'ac-ledger.json'), 'utf8'));
assert.strictEqual(nsLedger.negativeScenarios.length, 1);
assert.strictEqual(nsLedger.negativeScenarios[0].id, 'NS1');
assert.strictEqual(nsInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'link-ac1', '--ac', 'AC1',
  '--status', 'Implemented', '--file', 'impl.js:L1-L1',
  '--test', JSON.stringify({ name: 'missing DoR section fails', sourceFile: 'ns.test.js', phase: 'planned', alias: null, exitCode: null }),
]).status, 0);
const nsCapped = JSON.parse(nsInvoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.ok(nsCapped.score <= 8 && nsCapped.knownDefect, 'uncovered negative scenario caps at 8');
assert.strictEqual(nsInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'link-ns1', '--negative', 'NS1',
  '--test', JSON.stringify({ name: 'missing DoR section fails', sourceFile: 'ns.test.js', phase: 'observed', alias: null, exitCode: 0 }),
]).status, 0);
const nsCovered = JSON.parse(nsInvoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.ok(!nsCovered.knownDefect, 'observed negative scenario clears knownDefect');
const nsSchemaErrors = validateNode(JSON.parse(fs.readFileSync(path.join(nsRoot, 'ac-ledger.json'), 'utf8')), ledgerSchema, 'ac-ledger.json');
assert.strictEqual(nsSchemaErrors.length, 0, nsSchemaErrors.join('; '));

// V9 — inline AC backticks must not steal Notes ingest; start-of-line section wins (3 bullets)
const stealRoot = temp('ws-ac-ledger-steal-');
write(path.join(stealRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
write(path.join(stealRoot, 'steal.spec.md'), [
  '## Acceptance Criteria',
  '- AC1: `ws-spec-format/FORMAT.md` documents `## Validation & Observation Notes` before the real section.',
  '- AC2: `validate_spec.cjs` in `--mode=authoring` validates `## Validation & Observation Notes` inline in AC text.',
  '',
  '## Definition of Ready (DoR)',
  '| Readiness Item | Requirement | Verification Method |',
  '|----------------|-------------|---------------------|',
  '| Bounded Scope | Steal-case fixture | Inspect ingest |',
  '',
  '## Out of Scope',
  '| Feature | Reason |',
  '|---------|--------|',
  '| Retroactive DoR | Historical specs stay compat |',
  '',
  '## Validation & Observation Notes',
  '',
  '### Telemetry & Observable Signals',
  '- Ledger init ingests negative scenarios from start-of-line Notes only.',
  '',
  '### Negative & Failing Test Scenarios',
  '- First steal-case negative scenario.',
  '- Second negative scenario for ingest coverage.',
  '- Third negative scenario for ingest coverage.',
  '',
].join('\n'));
function stealInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', stealRoot]);
}
assert.strictEqual(stealInvoke(['init', '--spec', 'steal.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'steal']).status, 0);
const stealLedger = JSON.parse(fs.readFileSync(path.join(stealRoot, 'ac-ledger.json'), 'utf8'));
assert.strictEqual(stealLedger.negativeScenarios.length, 3, 'V9: ingest reads start-of-line Notes, not inline AC backticks');
assert.strictEqual(stealLedger.negativeScenarios[0].id, 'NS1');
assert.match(stealLedger.negativeScenarios[0].text, /First steal-case negative scenario/);

console.log('test-ac-ledger: ok');
