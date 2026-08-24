import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const indexScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs');
const dagScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_sequential_dag.cjs');
const root = temp('ws-artifact-economy-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({ plans: { dir: '.agents/plans' }, fable: { auditVerdictsBlockShip: 'refuted' } }));
write(path.join(root, 'spec.md'), '## Acceptance Criteria\n- AC1: First.\n- AC2: Second.\n');
write(path.join(root, 'plan.md'), '## Árvore\n\nT00 handles AC1 in `src/a.js` and V1:test-a.\n\n## Second\n\nT01 handles AC2 in `test/a.test.js` and V2:test-b.\n');
const base = ['--repo-root', root];
assert.strictEqual(run(indexScript, ['build', '--plan', 'plan.md', '--spec', 'spec.md', '--output', 'plan.index.json', ...base]).status, 0);
const index = JSON.parse(fs.readFileSync(path.join(root, 'plan.index.json'), 'utf8'));
assert.strictEqual(index.acceptanceCriteria.length, 2);
assert.ok(index.sections.every((section) => section.byteEnd > section.byteStart && section.lineEnd >= section.lineStart));
const slice = run(indexScript, ['read', '--index', 'plan.index.json', '--ac', 'AC1', ...base]);
assert.strictEqual(slice.status, 0);
assert.match(slice.stdout, /Árvore[\s\S]*AC1/);
write(path.join(root, 'plan.md'), fs.readFileSync(path.join(root, 'plan.md'), 'utf8').replace('handles AC1', 'handles changed AC1'));
assert.notStrictEqual(run(indexScript, ['read', '--index', 'plan.index.json', '--ac', 'AC1', ...base]).status, 0, 'source hash drift fails closed');

write(path.join(root, 'plan.md'), '## Work\n\nT00 handles AC1 and AC2.\n');
assert.strictEqual(run(dagScript, [
  '--slug', 'feature', '--workflow-id', 'wf', '--plan', 'plan.md',
  '--exec-out', 'step-03-feature.plan.exec.md', '--dag-out', 'step-03-feature.exec.dag.json',
  '--timestamp', '2026-08-21T20:00:00Z', ...base,
]).status, 0);
const dag = JSON.parse(fs.readFileSync(path.join(root, 'step-03-feature.exec.dag.json'), 'utf8'));
assert.deepStrictEqual(dag.tasks, []);
assert.strictEqual(dag.skipReason, 'dag-disabled');

const dispatch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'), 'utf8');
assert.match(dispatch, /ac_ledger\.cjs init/);
assert.match(dispatch, /plan_index\.cjs build/);
assert.match(dispatch, /write_sequential_dag\.cjs/);
assert.match(dispatch, /probe_test_surface\.cjs/);
assert.match(dispatch, /force_interview/);
const artifacts = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/ARTIFACTS.md'), 'utf8');
assert.match(artifacts, /plan\.index\.json/);
assert.match(artifacts, /ac-ledger\.json/);
const testing = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-testing/SKILL.md'), 'utf8');
assert.match(testing, /probe_test_surface\.cjs/);
const setup = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/setup.md'), 'utf8');
assert.match(setup, /index\.json/);
assert.doesNotMatch(setup, /Glob `\{plansDir\}\/\*\*\/\*\.state\.md`/);
console.log('test-artifact-economy: ok');
