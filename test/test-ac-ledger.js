import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { loadJsonSchema, validateNode } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs'));
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const reviewScript = path.join(repoRoot, '.agents/skills/ws-code-review/scripts/write_review_round.cjs');
const root = temp('ws-ac-ledger-');
write(path.join(root, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' }, fable: { auditVerdictsBlockShip: 'refuted' } }));
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
write(path.join(aliasRoot, '.ws/config.json'), JSON.stringify({
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
const exampleConfig = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8'));
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
write(path.join(skipRoot, '.ws/config.json'), JSON.stringify({
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

const ledgerSchema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/runtime/ac-ledger.schema.json'), 'ac ledger');
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
write(path.join(nsRoot, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
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
write(path.join(stealRoot, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
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

// Test sync-plan-index and plan_index auto-sync
const syncRoot = temp('ws-ac-ledger-sync-');
write(path.join(syncRoot, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
write(path.join(syncRoot, 'sync.spec.md'), '## Acceptance Criteria\n- AC1: Task mapped criterion.\n');
write(path.join(syncRoot, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: ['T01'], planSectionIds: ['section-001'], expectedTestNames: ['test_sync'] },
  ],
}));
function syncInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', syncRoot]);
}
assert.strictEqual(syncInvoke(['init', '--spec', 'sync.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'sync']).status, 0);
let preSyncLedger = JSON.parse(fs.readFileSync(path.join(syncRoot, 'ac-ledger.json'), 'utf8'));
assert.strictEqual(preSyncLedger.acceptanceCriteria[0].tasks.length, 0);
assert.strictEqual(preSyncLedger.acceptanceCriteria[0].planSections.length, 0);

assert.strictEqual(syncInvoke(['sync-plan-index', '--ledger', 'ac-ledger.json', '--plan-index', 'plan.index.json']).status, 0);
let postSyncLedger = JSON.parse(fs.readFileSync(path.join(syncRoot, 'ac-ledger.json'), 'utf8'));
assert.deepStrictEqual(postSyncLedger.acceptanceCriteria[0].tasks, ['T01']);
assert.deepStrictEqual(postSyncLedger.acceptanceCriteria[0].planSections, ['section-001']);
assert.strictEqual(postSyncLedger.acceptanceCriteria[0].tests[0].name, 'test_sync');

// Test link with --plan-index
assert.strictEqual(syncInvoke(['init', '--spec', 'sync.spec.md', '--output', 'ac-ledger-2.json', '--workflow-id', 'wf', '--slug', 'sync']).status, 0);
assert.strictEqual(syncInvoke(['link', '--ledger', 'ac-ledger-2.json', '--event-id', 'link-plan', '--plan-index', 'plan.index.json']).status, 0);
let linkedPlanLedger = JSON.parse(fs.readFileSync(path.join(syncRoot, 'ac-ledger-2.json'), 'utf8'));
assert.deepStrictEqual(linkedPlanLedger.acceptanceCriteria[0].tasks, ['T01']);
// Test commit parsing (JSON and key=value) & scoped event-id deduplication
const commitTestRoot = temp('ws-ac-ledger-commit-');
write(path.join(commitTestRoot, '.ws/config.json'), JSON.stringify({ verification: {}, plans: { dir: '.agents/plans' } }));
write(path.join(commitTestRoot, 'commit.spec.md'), '## Acceptance Criteria\n- AC1: First.\n- AC2: Second.\n');
write(path.join(commitTestRoot, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: [] },
    { id: 'AC2', taskIds: ['T2'], planSectionIds: ['S2'], expectedTestNames: [] },
  ],
}));
function commitInvoke(args) {
  return run(ledgerScript, [...args, '--repo-root', commitTestRoot]);
}
assert.strictEqual(commitInvoke(['init', '--spec', 'commit.spec.md', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'commit']).status, 0);

// 1. Link AC1 with JSON commit and event-id 'evt-g2'
const linkJson = commitInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'evt-g2', '--ac', 'AC1',
  '--commit', JSON.stringify({ sha: '1111111', step: 5 }),
]);
assert.strictEqual(linkJson.status, 0, linkJson.stderr);

// 2. Link AC2 using the SAME event-id 'evt-g2' and shell key=value commit syntax
const linkKv = commitInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'evt-g2', '--ac', 'AC2',
  '--commit', 'sha=2222222,step=5',
]);
assert.strictEqual(linkKv.status, 0, linkKv.stderr);

let commitLedger = JSON.parse(fs.readFileSync(path.join(commitTestRoot, 'ac-ledger.json'), 'utf8'));
const ac1 = commitLedger.acceptanceCriteria.find((row) => row.id === 'AC1');
const ac2 = commitLedger.acceptanceCriteria.find((row) => row.id === 'AC2');
assert.strictEqual(ac1.commits.length, 1, 'AC1 has 1 commit linked');
assert.strictEqual(ac1.commits[0].sha, '1111111', 'AC1 commit sha matches JSON payload');
assert.strictEqual(ac2.commits.length, 1, 'AC2 is not skipped when sharing event-id with AC1');
assert.strictEqual(ac2.commits[0].sha, '2222222', 'AC2 commit parsed from key=value string');
assert.strictEqual(ac2.commits[0].step, 5, 'AC2 commit step converted to integer');

// 3. Repeated --commit options
const linkMultiCommit = commitInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'evt-multi', '--ac', 'AC1',
  '--commit', JSON.stringify({ sha: '3333333', step: 6 }),
  '--commit', 'sha=4444444,step=6',
]);
assert.strictEqual(linkMultiCommit.status, 0, linkMultiCommit.stderr);
commitLedger = JSON.parse(fs.readFileSync(path.join(commitTestRoot, 'ac-ledger.json'), 'utf8'));
const ac1Multi = commitLedger.acceptanceCriteria.find((row) => row.id === 'AC1');
assert.ok(ac1Multi.commits.some((c) => c.sha === '3333333'), 'AC1 has first repeated commit');
assert.ok(ac1Multi.commits.some((c) => c.sha === '4444444'), 'AC1 has second repeated commit from key=value');

// 4. Replaying identical event on the same AC emits notice and safely skips payload
const linkReplay = commitInvoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'evt-g2', '--ac', 'AC1',
  '--commit', JSON.stringify({ sha: '5555555', step: 5 }),
]);
assert.strictEqual(linkReplay.status, 0, linkReplay.stderr);
assert.match(linkReplay.stderr, /NOTICE: event-id "evt-g2" already applied to target criteria/, 'notice emitted on duplicate event-id replay');
commitLedger = JSON.parse(fs.readFileSync(path.join(commitTestRoot, 'ac-ledger.json'), 'utf8'));
const ac1AfterReplay = commitLedger.acceptanceCriteria.find((row) => row.id === 'AC1');
assert.ok(!ac1AfterReplay.commits.some((c) => c.sha === '5555555'), 'duplicate event-id replay skipped new payload');

// us-430: Alias defect evaluation and failingPaths / productFailure handling
const us430Root = temp('ws-ac-ledger-us430-');
write(path.join(us430Root, '.ws/config.json'), JSON.stringify({
  verification: {
    backendFormat: 'npm run lint',
    backendTest: 'npm run test',
  },
  plans: { dir: '.agents/plans' },
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(us430Root, 'us430.spec.md'), '## Acceptance Criteria\n- AC1: First behavior.\n');
write(path.join(us430Root, 'impl.js'), 'export const value = 1;\n');
write(path.join(us430Root, 'us430.test.js'), 'test("first behavior", () => {});\n');
write(path.join(us430Root, 'plan.index.json'), JSON.stringify({
  acceptanceCriteria: [
    { id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: ['first behavior'] },
  ],
}));
function us430Invoke(args) {
  return run(ledgerScript, [...args, '--repo-root', us430Root]);
}
assert.strictEqual(us430Invoke(['init', '--spec', 'us430.spec.md', '--plan-index', 'plan.index.json', '--output', 'ac-ledger.json', '--workflow-id', 'wf', '--slug', 'us430']).status, 0);

// Link AC1 with file impl.js:L1-L1 and planned test
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'link-ac1', '--ac', 'AC1',
  '--status', 'Implemented', '--file', 'impl.js:L1-L1',
  '--test', JSON.stringify({ name: 'first behavior', sourceFile: 'us430.test.js', phase: 'planned', alias: null, exitCode: null }),
]).status, 0);

// Link passing backendTest
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-test-pass', '--ac', 'AC1',
  '--alias-result', JSON.stringify({ alias: 'backendTest', command: 'npm run test', exitCode: 0 }),
]).status, 0);

// Case 1: External format failure with skipReason: baseline-dirty -> knownDefect: false, score: 10 (V1:format-baseline-dirty-cleared, V7:first-verify-score-ten)
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-external-skip', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
    skipReason: 'baseline-dirty',
    failingPaths: ['external/dirty.js'],
  }),
]).status, 0);
let us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, false, 'external format failure with skipReason does not set knownDefect');
assert.strictEqual(us430Scored.score, 10, 'score is 10 when external format is skipped');

// Case 2 (Negative 1): External format failure WITHOUT skipReason, failingPaths outside files_touched -> knownDefect: false (V3:format-bare-exit-not-defect)
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-external-no-skip', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
    failingPaths: ['external/dirty.js', 'other/unrelated.js'],
  }),
]).status, 0);
us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, false, 'external format failure without skipReason does not set knownDefect if outside files_touched');

// Case 3 (Negative 2): Format failure WITHOUT skipReason, failingPaths intersecting files_touched -> knownDefect: true, score <= 8 (V2:format-touched-defect)
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-internal', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
    failingPaths: ['impl.js'],
  }),
]).status, 0);
us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, true, 'format failure touching files_touched sets knownDefect');
assert.ok(us430Scored.score <= 8, 'score capped at 8 on internal defect');

// Case 4: Non-zero exit with productFailure: true -> knownDefect: true even if failingPaths is empty (V4:product-failure-flag, V5:ac-ledger-fail-closed-touched)
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-prod-fail', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 1,
    productFailure: true,
  }),
]).status, 0);
us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, true, 'productFailure: true sets knownDefect');

// Case 5: Bare non-zero exit without productFailure and no matching failingPaths -> knownDefect: false
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-bare-nonzero', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 1,
    failingPaths: [],
  }),
]).status, 0);
us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, false, 'bare non-zero exit without productFailure or matching paths does not set knownDefect');

// Case 6: Full test alias exiting 0 clears defect even if an earlier filtered run failed (V3:full-test-pass-clears-defect)
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-test-pass-full', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendTest',
    command: 'npm run test',
    exitCode: 0,
    productFailure: false,
    failingPaths: [],
  }),
]).status, 0);
us430Scored = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(us430Scored.knownDefect, false, 'passing full test alias keeps knownDefect false');
assert.strictEqual(us430Scored.score, 10, 'score recovers to 10 with passing test alias and non-defect format');

// Case 7: Schema validation with failingPaths, productFailure, and filesTouched (V5:schema-validation)
const us430Ledger = JSON.parse(fs.readFileSync(path.join(us430Root, 'ac-ledger.json'), 'utf8'));
us430Ledger.filesTouched = ['impl.js'];
const us430SchemaErrors = validateNode(us430Ledger, ledgerSchema, 'ac-ledger.json');
assert.strictEqual(us430SchemaErrors.length, 0, us430SchemaErrors.join('; '));

// Case 8: --files-touched persistence in link and score determinism
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'link-persist-touched', '--ac', 'AC1',
  '--files-touched', 'extra/touched-file.js',
]).status, 0);
const postLinkLedger = JSON.parse(fs.readFileSync(path.join(us430Root, 'ac-ledger.json'), 'utf8'));
assert.ok(postLinkLedger.filesTouched.includes('extra/touched-file.js'), 'filesTouched persisted into ledger');
const scoreWithoutOption = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(scoreWithoutOption.score, postLinkLedger.scoreState.score, 'score matches persisted scoreState');

// Case 9: productFailure: true with skipReason: baseline-dirty still triggers knownDefect
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-prod-fail-with-skip', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 1,
    skipReason: 'baseline-dirty',
    productFailure: true,
  }),
]).status, 0);
let prodFailWithSkipScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(prodFailWithSkipScore.knownDefect, true, 'productFailure: true outranks skipReason');

// Reset to clean passing format for subsequent checks
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-clean-reset', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 0,
  }),
]).status, 0);

// Case 10: score persists filesTouched, verify/report reject filesTouched
assert.strictEqual(us430Invoke([
  'score', '--ledger', 'ac-ledger.json', '--boundary', 'step5', '--files-touched', 'extra/score-touched.js',
]).status, 0);
const postScoreLedger = JSON.parse(fs.readFileSync(path.join(us430Root, 'ac-ledger.json'), 'utf8'));
assert.ok(postScoreLedger.filesTouched.includes('extra/score-touched.js'), 'score persists filesTouched');

const verifyWithTouched = us430Invoke(['verify', '--ledger', 'ac-ledger.json', '--files-touched', 'extra/foo.js']);
assert.notStrictEqual(verifyWithTouched.status, 0, 'verify rejects --files-touched');

const reportWithTouched = us430Invoke(['report', '--ledger', 'ac-ledger.json', '--output', 'report.md', '--files-touched', 'extra/foo.js']);
assert.notStrictEqual(reportWithTouched.status, 0, 'report rejects --files-touched');

const reportWithFileTouched = us430Invoke(['report', '--ledger', 'ac-ledger.json', '--output', 'report.md', '--file-touched', 'extra/foo.js']);
assert.notStrictEqual(reportWithFileTouched.status, 0, 'report rejects --file-touched');

// Case 11: Suffix collision protection: external/impl.js does NOT match touched impl.js
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-suffix-collision', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
    failingPaths: ['external/impl.js'],
  }),
]).status, 0);
let suffixScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(suffixScore.knownDefect, false, 'external/impl.js does not match touched impl.js');
assert.strictEqual(suffixScore.score, 10, 'score is not capped when failing file merely shares basename');

// Case 12: CLI fallback flags --failing-paths and --failing-path populate failingPaths
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-cli-failing-paths', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
  }),
  '--failing-paths', 'external/separate.js',
]).status, 0);
let cliPathsScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(cliPathsScore.knownDefect, false, 'CLI --failing-paths outside touched does not trigger knownDefect');

assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-cli-failing-internal', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
  }),
  '--failing-paths', 'impl.js',
]).status, 0);
cliPathsScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(cliPathsScore.knownDefect, true, 'CLI --failing-paths matching touched triggers knownDefect');

// Reset to clean passing format for subsequent checks
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-clean-final', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 0,
  }),
]).status, 0);

// Case 13: bare --product-failure flag sets productFailure: true
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-cli-bare-prod-fail', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 2,
  }),
  '--product-failure',
]).status, 0);
let bareProdFailScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(bareProdFailScore.knownDefect, true, 'bare --product-failure flag triggers knownDefect');

// Clean reset after Case 13
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-format-clean-post-13', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendFormat',
    command: 'npm run lint',
    exitCode: 0,
  }),
]).status, 0);

// Case 14: Non-zero test alias without enumerated paths fails closed -> knownDefect: true
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-test-bare-fail', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendTest',
    command: 'npm run test',
    exitCode: 1,
    failingPaths: [],
  }),
]).status, 0);
let bareTestFailScore = JSON.parse(us430Invoke(['score', '--ledger', 'ac-ledger.json', '--boundary', 'step5']).stdout);
assert.strictEqual(bareTestFailScore.knownDefect, true, 'non-zero test alias without failingPaths fails closed');

// Reset backendTest to clean passing
assert.strictEqual(us430Invoke([
  'link', '--ledger', 'ac-ledger.json', '--event-id', 'alias-test-clean-post-14', '--ac', 'AC1',
  '--alias-result', JSON.stringify({
    alias: 'backendTest',
    command: 'npm run test',
    exitCode: 0,
    failingPaths: [],
  }),
]).status, 0);

// V1:implement-scoring-aliases: ws-implement-tasks documents scoring aliases
const implementSkill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-implement-tasks/SKILL.md'), 'utf8');
assert.ok(implementSkill.includes('backendFormat') && implementSkill.includes('backendBuild') && implementSkill.includes('backendTest') && implementSkill.includes('frontendTest'), 'V1:implement-scoring-aliases: scoring aliases documented');

// V2:format-surgical-repair: ws-implement-tasks documents surgical format repair
assert.ok(implementSkill.includes('format only files this step created or modified') || implementSkill.includes('format only created/modified paths'), 'V2:format-surgical-repair: surgical format repair documented');

// V4:verify-baseline-dirty-link: ws-plan-verify documents baseline-dirty and failingPaths inspection
const verifySkill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-plan-verify/SKILL.md'), 'utf8');
assert.ok(verifySkill.includes('skipReason: baseline-dirty') && verifySkill.includes('failing paths are enumerated'), 'V4:verify-baseline-dirty-link: verification linking contract documented');

// V6:interview-spec-rewrite: ws-plan-interview documents spec synchronization
const interviewSkill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-plan-interview/SKILL.md'), 'utf8');
assert.ok(interviewSkill.includes('ImplementedDifferently') && interviewSkill.includes('spec of record'), 'V6:interview-spec-rewrite: spec sync documented');

// V8:node-only-runtime: No python files in skill trees
const pythonFiles = [];
function findPythonFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) findPythonFiles(path.join(dir, entry.name));
    else if (/\.(py|pyc|pyo)$/i.test(entry.name)) pythonFiles.push(path.join(dir, entry.name));
  }
}
findPythonFiles(path.join(repoRoot, '.agents/skills'));
assert.strictEqual(pythonFiles.length, 0, `V8:node-only-runtime: python files found: ${pythonFiles.join(', ')}`);

console.log('test-ac-ledger: ok');
