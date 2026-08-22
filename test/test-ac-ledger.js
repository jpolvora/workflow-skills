import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
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
console.log('test-ac-ledger: ok');
