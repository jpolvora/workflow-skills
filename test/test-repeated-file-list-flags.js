import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

// AC map (ledger test-name anchors — each name must appear verbatim in this file):
// T1/NS1 (AC1): three repeated --modified flags; T2/NS2 (AC2): repeated --created;
// T3/NS3 (AC3): repeated --deleted; T4/NS4 (AC4): comma-separated single flag;
// T5 (AC5): mixed repeated + comma; T6/NS6 (AC6): duplicates deduped;
// T7/NS5 (AC7): scalar last-wins; T8 (AC8): suite wiring.

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const workflowState = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const { parseArgs } = workflowState;
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');

function setupFixture(name) {
  const root = temp(name);
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  const stateRel = '.agents/plans/fix/wf.state.md';
  write(path.join(root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-fix
slug: fix
workflowType: standard
status: active
currentStep: 4
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  const jsonlRel = '.agents/plans/fix/telemetry.jsonl';
  return { root, stateRel, common: ['--repo-root', root, '--jsonl-out', jsonlRel], jsonlRel };
}

function finishWith(root, stateRel, common, extraArgs) {
  const res = run(update, [
    'finish', stateRel, '--step', '4',
    '--timestamp', '2026-09-10T12:00:00.000Z',
    ...extraArgs, ...common,
  ]);
  assert.strictEqual(res.status, 0, res.stderr || res.stdout);
  const events = fs.readFileSync(path.join(root, common[common.indexOf('--jsonl-out') + 1]), 'utf8')
    .trim().split('\n').map(JSON.parse);
  const finishEvent = events.find((e) => e.type === 'finish' && e.step === 4);
  assert.ok(finishEvent, 'finish event emitted');
  const state = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/fix/wf.state.json'), 'utf8'));
  return { finishEvent, state };
}

function assertSurfaces({ finishEvent, state }, key, expected) {
  const sorted = [...expected].sort();
  assert.deepStrictEqual([...finishEvent.filesTouched[key]].sort(), sorted, `telemetry filesTouched.${key}`);
  assert.deepStrictEqual([...(state.workflowManifest[key] || [])].sort(), sorted, `workflowManifest.${key}`);
  const handoffPaths = state.handoffs?.['4']?.artifactPaths || [];
  for (const item of expected) {
    assert.ok(handoffPaths.includes(item), `handoff artifactPaths includes ${item}`);
  }
}

// T1/NS1 (AC1): three repeated --modified flags retain all three paths
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t1-');
  const out = finishWith(root, stateRel, common, [
    '--modified', 'path/to/first-file',
    '--modified', 'path/to/second-file',
    '--modified', 'path/to/third-file',
  ]);
  assertSurfaces(out, 'modified', ['path/to/first-file', 'path/to/second-file', 'path/to/third-file']);
}

// T2/NS2 (AC2): repeated --created flags retain every path
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t2-');
  const out = finishWith(root, stateRel, common, [
    '--created', 'src/new-one.js',
    '--created', 'src/new-two.js',
  ]);
  assertSurfaces(out, 'created', ['src/new-one.js', 'src/new-two.js']);
}

// T3/NS3 (AC3): repeated --deleted flags retain every path
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t3-');
  const out = finishWith(root, stateRel, common, [
    '--deleted', 'old/gone-one.js',
    '--deleted', 'old/gone-two.js',
    '--deleted', 'old/gone-three.js',
  ]);
  assertSurfaces(out, 'deleted', ['old/gone-one.js', 'old/gone-two.js', 'old/gone-three.js']);
}

// T4/NS4 (AC4): single comma-separated flag still yields both paths
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t4-');
  const out = finishWith(root, stateRel, common, ['--modified', 'alpha/one.js,alpha/two.js']);
  assertSurfaces(out, 'modified', ['alpha/one.js', 'alpha/two.js']);
}

// T5 (AC5): mixed repeated and comma-separated values accumulate
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t5-');
  const out = finishWith(root, stateRel, common, ['--modified', 'mix/a.js,mix/b.js', '--modified', 'mix/c.js']);
  assertSurfaces(out, 'modified', ['mix/a.js', 'mix/b.js', 'mix/c.js']);
}

// T6/NS6 (AC6): duplicate paths across repeated flags deduplicate
{
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t6-');
  const out = finishWith(root, stateRel, common, ['--modified', 'dup/same.js', '--modified', 'dup/same.js']);
  assertSurfaces(out, 'modified', ['dup/same.js']);
}

// T7/NS5 (AC7): scalar flags keep last-wins; file-list flags accumulate
{
  assert.strictEqual(parseArgs(['--step', '1', '--step', '2']).options.step, '2', 'repeated --step keeps last-wins');
  assert.strictEqual(parseArgs(['--model', 'a', '--model', 'b']).options.model, 'b', 'repeated --model keeps last-wins');
  assert.deepStrictEqual(
    parseArgs(['--modified', 'a', '--modified', 'b']).options.modified,
    ['a', 'b'],
    'repeated --modified accumulates',
  );
  assert.strictEqual(parseArgs(['--modified', 'solo']).options.modified, 'solo', 'single file-list flag stays a raw string');
  assert.ok(workflowState.FILE_LIST_FLAGS instanceof Set, 'FILE_LIST_FLAGS exported as Set');
  assert.deepStrictEqual([...workflowState.FILE_LIST_FLAGS].sort(), ['created', 'deleted', 'modified'], 'allowlist is exactly the three file-list flags');

  // CLI-level: repeated scalar --model surfaces last-wins in the finish event
  const { root, stateRel, common } = setupFixture('ws-repeated-flags-t7-');
  const res = run(update, [
    'finish', stateRel, '--step', '4',
    '--timestamp', '2026-09-10T12:00:00.000Z',
    '--model', 'first-model', '--model', 'last-model',
    '--modified', 'scalar/probe.js',
    ...common,
  ]);
  assert.strictEqual(res.status, 0, res.stderr || res.stdout);
  const events = fs.readFileSync(path.join(root, '.agents/plans/fix/telemetry.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse);
  const finishEvent = events.find((e) => e.type === 'finish' && e.step === 4);
  assert.strictEqual(finishEvent.model, 'last-model', 'CLI-level repeated scalar keeps last-wins');
  assert.deepStrictEqual(finishEvent.filesTouched.modified, ['scalar/probe.js'], 'file-list flag unaffected in the same call');
}

// T8 (AC8): suite wiring — this file is registered in tests:harness-efficiency
{
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.ok(
    String(pkg.scripts?.['tests:harness-efficiency'] || '').includes('test-repeated-file-list-flags.js'),
    'tests:harness-efficiency registers test-repeated-file-list-flags.js',
  );
}

console.log('test-repeated-file-list-flags: ok');
