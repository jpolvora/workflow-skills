import fs from 'fs';
import utils from './harness-test-utils.cjs';

const { assert, path, repoRoot, temp, run, write } = utils;
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const root = temp('ws-state-contract-');
write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  verification: {},
  defaults: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
const stateRel = '.agents/plans/demo/wf.state.md';
write(path.join(root, stateRel), `---
stateVersion: 7
revision: 0
workflowId: wf
slug: demo
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
const common = ['--repo-root', root, '--jsonl-out', '.agents/plans/demo/telemetry/step-00.jsonl'];
assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...common]).status, 0);
assert.strictEqual(run(update, [
  'finish', stateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z',
  '--gate-decision', JSON.stringify({ gate: 'entry', choice: 'continue', reason: 'approved', round: 1 }),
  ...common,
]).status, 0);

const state = fs.readFileSync(path.join(root, stateRel), 'utf8');
assert.match(state, /stateVersion: 2/);
assert.match(state, /gateDecision:/);
const events = fs.readFileSync(path.join(root, '.agents/plans/demo/telemetry/step-00.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.deepStrictEqual(events.map((event) => event.type), ['dispatch', 'finish']);
assert.strictEqual(events[1].elapsedSec, 5);
assert.strictEqual(events[1].estimated, false);
const index = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/index.json'), 'utf8'));
assert.strictEqual(index.workflows[0].workflowId, 'wf');
assert.ok(index.workflows[0].statePath.includes('/demo/') && !index.workflows[0].statePath.includes('\\'));
assert.strictEqual(run(validate, ['wf', '--repo-root', root]).status, 0, 'index-based discovery validates by workflow id');

write(path.join(root, '.agents/plans/demo/step-00-demo.spec.md'), `---
id: null
slug: demo
title: Demo
source: local
specDate: 2026-08-21
---
## Description
Demo.
`);
assert.strictEqual(run(update, [
  'finish', stateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:08.000Z', ...common,
]).status, 0);
assert.match(fs.readFileSync(path.join(root, '.agents/plans/demo/step-00-demo.spec.md'), 'utf8'), /^step: 0$/m);
assert.match(fs.readFileSync(path.join(root, '.agents/plans/demo/step-00-demo.spec.md'), 'utf8'), /^workflowId: wf$/m);
write(path.join(root, '.agents/plans/demo/ac-ledger.json'), JSON.stringify({ acceptanceCriteria: [] }));
assert.strictEqual(run(validate, [stateRel, '--pre-advance', '1', '--repo-root', root]).status, 0, 'pre-advance 1 accepts stamped spec metadata');

const invalidGate = run(update, [
  'finish', stateRel, '--step', '1', '--gate-decision', '"continue"', '--timestamp', '2026-08-21T20:00:06.000Z', ...common,
]);
assert.notStrictEqual(invalidGate.status, 0, 'free-form gate decision is rejected');
const invalidSkip = run(update, [
  'finish', stateRel, '--step', '1', '--status', 'skipped', '--reason', 'agent-choice', '--timestamp', '2026-08-21T20:00:06.000Z', ...common,
]);
assert.notStrictEqual(invalidSkip.status, 0, 'open-ended skip reason is rejected');
const refuted = run(update, [
  'finish', stateRel, '--step', '1', '--fable-verdict', 'REFUTED', '--timestamp', '2026-08-21T20:00:06.000Z', ...common,
]);
assert.notStrictEqual(refuted.status, 0, 'REFUTED always blocks, including the default refuted policy');
console.log('test-workflow-state-contract: ok');
