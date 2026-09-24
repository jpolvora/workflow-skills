/**
 * us-412/us-413: mid-step checkpoints, turn-boundary pause markers, schemas,
 * and orchestrator docs (T1-T9, D1-D2).
 * Run: node test/test-liveness-checkpoints.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import crypto from 'crypto';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const UPDATE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const VALIDATE = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const require = createRequire(import.meta.url);
const {
  canonicalStateJson,
  serializeFrontmatter,
  parseFrontmatter,
} = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const { loadJsonSchema, validateNode } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs'));

const tempRoots = [];

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-liveness-'));
  tempRoots.push(root);
  fs.mkdirSync(path.join(root, '.ws'), { recursive: true });
  fs.writeFileSync(
    path.join(root, '.ws/config.json'),
    JSON.stringify({ plans: { dir: '.agents/plans' }, fable: { auditVerdictsBlockShip: 'refuted' } }),
  );
  return root;
}

function makeState(root, options = {}) {
  const slug = options.slug || 'us-live';
  const workflowId = options.workflowId || 'wf-us-live';
  const dir = path.join(root, '.agents', 'plans', slug);
  fs.mkdirSync(dir, { recursive: true });
  const state = {
    stateVersion: 3,
    revision: 7,
    workflowId,
    slug,
    workflowType: 'standard',
    status: 'active',
    currentStep: 4,
    completedSteps: [0, 1, 2, 3],
    skippedSteps: [],
    stepStatus: { 3: 'completed', 4: 'active' },
    currentModel: 'test-model',
    ...(options.state || {}),
  };
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.json`;
  const statePath = path.join(root, stateRel);
  const mdPath = statePath.replace(/\.json$/, '.md');
  fs.writeFileSync(statePath, canonicalStateJson(state));
  fs.writeFileSync(mdPath, `---\n${serializeFrontmatter(state)}\n---\n# state\n`, 'utf8');
  return { stateRel, statePath, mdPath, usDir: dir, slug, workflowId };
}

function runCli(script, args, root) {
  return cp.spawnSync(process.execPath, [script, ...args, '--repo-root', root], { encoding: 'utf8' });
}

function readState(fixture) {
  return JSON.parse(fs.readFileSync(fixture.statePath, 'utf8'));
}

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readTelemetry(fixture, root) {
  const file = path.join(root, path.dirname(fixture.stateRel), 'telemetry.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

function writeProgressFile(root, name, payload) {
  const file = path.join(root, name);
  fs.writeFileSync(file, typeof payload === 'string' ? payload : JSON.stringify(payload));
  return name;
}

function checkpoint(fixture, root, step, payload, name = 'progress.json') {
  const file = writeProgressFile(root, name, payload);
  return runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', String(step), '--progress-file', file], root);
}

// T1 - AC1/AC2
{
  const root = makeRoot();
  const fixture = makeState(root);
  const before = readState(fixture).revision;
  const result = checkpoint(fixture, root, 4, { substep: 'wave-1', completedUnits: ['T1', 'T2'], remainingUnits: 3 });
  assert.equal(result.status, 0, result.stderr);
  const stdout = JSON.parse(result.stdout);
  assert.equal(stdout.ok, true);
  assert.equal(stdout.operation, 'checkpoint');
  assert.equal(stdout.revision, before + 1, 'checkpoint bumps revision by one');
  const state = readState(fixture);
  const record = state.stepCheckpoints['4'];
  assert.equal(record.step, 4);
  assert.equal(record.substep, 'wave-1');
  assert.deepEqual(record.completedUnits, ['T1', 'T2']);
  assert.equal(record.remainingUnits, 3);
  assert.ok(!Number.isNaN(Date.parse(record.updatedAt)), 'updatedAt is a valid timestamp');
  const events = readTelemetry(fixture, root);
  const last = events.at(-1);
  assert.equal(last.type, 'checkpoint');
  assert.equal(last.step, 4);
  assert.equal(last.substep, 'wave-1');
  assert.deepEqual(last.progress.completedUnits, ['T1', 'T2']);
  assert.equal(last.progress.remainingUnits, 3);
  assert.ok(!Number.isNaN(Date.parse(last.timestamp)), 'telemetry timestamp valid');
  const index = JSON.parse(fs.readFileSync(path.join(root, '.agents', 'plans', 'index.json'), 'utf8'));
  const row = index.workflows.find((item) => item.workflowId === fixture.workflowId);
  assert.ok(row, 'plans index row exists');
  assert.equal(row.stateSha256, sha256File(fixture.statePath), 'plans index row sha refreshed');
  console.log('T1 checkpoint persists sub-progress, telemetry, and revision: ok');
}

// T2 - AC3/AC4/AC9
{
  const root = makeRoot();
  const fixture = makeState(root);
  assert.equal(checkpoint(fixture, root, 4, { substep: 'wave-2', completedUnits: ['T3'], remainingUnits: 2 }).status, 0);
  const before = readState(fixture).revision;
  const explicit = runCli(UPDATE, [
    'pause-turn', fixture.stateRel, '--step', '4',
    '--reason', 'host turn ended mid-step', '--next-action', 'Finish step 4',
  ], root);
  assert.equal(explicit.status, 0, explicit.stderr);
  assert.equal(JSON.parse(explicit.stdout).revision, before + 1, 'pause-turn bumps revision by one');
  const state = readState(fixture);
  assert.equal(state.turnPause.step, 4);
  assert.equal(state.turnPause.reason, 'host turn ended mid-step');
  assert.equal(state.turnPause.nextAction, 'Finish step 4');
  assert.ok(!Number.isNaN(Date.parse(state.turnPause.at)), 'pause at is a valid timestamp');
  const events = readTelemetry(fixture, root);
  const last = events.at(-1);
  assert.equal(last.type, 'turn_paused');
  assert.equal(last.step, 4);
  assert.equal(last.reason, 'host turn ended mid-step');
  assert.equal(last.nextAction, 'Finish step 4');
  const derived = runCli(UPDATE, ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'second pause'], root);
  assert.equal(derived.status, 0, derived.stderr);
  assert.equal(readState(fixture).turnPause.nextAction, 'Resume step 4 (wave-2; 2 remaining)', 'nextAction derives from the checkpoint');
  console.log('T2 pause-turn persists marker, nextAction, telemetry, and revision: ok');
}

// T3 - AC5
{
  const root = makeRoot();
  const fixture = makeState(root);
  assert.equal(checkpoint(fixture, root, 3, { substep: 'node-1', completedUnits: ['T0'], remainingUnits: 2 }).status, 0);
  assert.equal(checkpoint(fixture, root, 4, { substep: 'wave-1', completedUnits: ['T1'], remainingUnits: 1 }).status, 0);
  assert.equal(runCli(UPDATE, ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'turn end'], root).status, 0);
  const finish = runCli(UPDATE, ['finish', fixture.stateRel, '--step', '4', '--status', 'completed', '--noop', 'liveness test'], root);
  assert.equal(finish.status, 0, finish.stderr);
  const state = readState(fixture);
  assert.equal(state.turnPause, undefined, 'finish clears the pause marker naming the finished step');
  assert.equal(state.stepCheckpoints['4'], undefined, 'finish deletes the finished step checkpoint');
  assert.ok(state.stepCheckpoints['3'], 'checkpoint of another step is untouched');

  const root2 = makeRoot();
  const fixture2 = makeState(root2, { slug: 'us-live2', workflowId: 'wf-us-live2' });
  assert.equal(checkpoint(fixture2, root2, 4, { substep: 'wave-1', completedUnits: [], remainingUnits: 1 }).status, 0);
  assert.equal(runCli(UPDATE, ['pause-turn', fixture2.stateRel, '--step', '4', '--reason', 'turn end'], root2).status, 0);
  assert.equal(runCli(UPDATE, ['finish', fixture2.stateRel, '--step', '4', '--status', 'completed', '--noop', 'liveness test'], root2).status, 0);
  const state2 = readState(fixture2);
  assert.equal(state2.stepCheckpoints, undefined, 'emptied stepCheckpoints map is omitted');
  assert.equal(state2.turnPause, undefined);
  console.log('T3 finish clears pause marker and step checkpoint: ok');
}

// T4 - AC6
{
  const root = makeRoot();
  const fixture = makeState(root);
  assert.equal(checkpoint(fixture, root, 4, { substep: 'wave-1', completedUnits: ['T1'], remainingUnits: 1 }).status, 0);
  assert.equal(runCli(UPDATE, ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'turn end'], root).status, 0);
  const schema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/runtime/telemetry.schema.json'), 'telemetry');
  assert.ok(schema.properties.type.enum.includes('checkpoint'), 'schema enum carries checkpoint');
  assert.ok(schema.properties.type.enum.includes('turn_paused'), 'schema enum carries turn_paused');
  const events = readTelemetry(fixture, root);
  assert.ok(events.some((event) => event.type === 'checkpoint'));
  assert.ok(events.some((event) => event.type === 'turn_paused'));
  for (const event of events) {
    const errors = validateNode(event, schema, event.type);
    assert.deepEqual(errors, [], `${event.type} event satisfies the telemetry schema`);
  }
  const checkpointEvent = events.find((event) => event.type === 'checkpoint');
  assert.ok(validateNode({ ...checkpointEvent, progress: { completedUnits: 'T1', remainingUnits: 1 } }, schema, 'bad-progress').length > 0, 'wrong-typed progress rejected');
  const pausedEvent = events.find((event) => event.type === 'turn_paused');
  assert.ok(validateNode({ ...pausedEvent, nextAction: '' }, schema, 'bad-nextAction').length > 0, 'empty nextAction rejected');
  console.log('T4 telemetry schema accepts checkpoint and turn_paused: ok');
}

// T5 - AC7 + G11
{
  const root = makeRoot();
  const fixture = makeState(root);
  fs.writeFileSync(path.join(fixture.usDir, 'plan.index.json'), JSON.stringify({ schemaVersion: 1, tasks: [] }));
  fs.writeFileSync(path.join(fixture.usDir, 'ac-ledger.json'), JSON.stringify({ acceptanceCriteria: [] }));
  fs.writeFileSync(
    path.join(fixture.usDir, `step-05-${fixture.slug}.plan.report.md`),
    `---\nstep: 5\nslug: ${fixture.slug}\nworkflowId: ${fixture.workflowId}\nstatus: completed\nstartedAt: 2026-09-24T00:00:00.000Z\nendedAt: ""\nacRefs: []\n---\n# report\n`,
  );
  assert.equal(checkpoint(fixture, root, 4, { substep: 'wave-1', completedUnits: ['T1'], remainingUnits: 1 }).status, 0);
  assert.equal(runCli(UPDATE, ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'turn end'], root).status, 0);
  const plain = runCli(VALIDATE, [fixture.stateRel], root);
  assert.equal(plain.status, 0, plain.stderr);
  const preAdvance = runCli(VALIDATE, [fixture.stateRel, '--pre-advance', '5'], root);
  assert.equal(preAdvance.status, 0, preAdvance.stderr);
  const stateSchema = JSON.parse(fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/workflow-state.schema.json'), 'utf8'));
  assert.ok(stateSchema.properties.stepCheckpoints, 'state schema declares stepCheckpoints');
  assert.deepEqual(stateSchema.properties.turnPause.required, ['step', 'reason', 'at', 'nextAction']);
  const state = readState(fixture);
  const fm = parseFrontmatter(fs.readFileSync(fixture.mdPath, 'utf8')).data;
  for (const key of ['workflowId', 'revision', 'currentStep', 'status', 'stateVersion', 'slug', 'workflowType']) {
    assert.deepEqual(fm[key], state[key], `frontmatter core key ${key} agrees with JSON`);
  }
  assert.equal(fm.turnPause.step, 4);
  assert.equal(fm.turnPause.nextAction, state.turnPause.nextAction);
  assert.deepEqual(fm.stepCheckpoints['4'].completedUnits, ['T1'], 'frontmatter checkpoint round-trips');
  console.log('T5 state schema + validate_state accept checkpoint/pause fields: ok');
}

// T6 - NS5
{
  const root = makeRoot();
  const fixture = makeState(root);
  writeProgressFile(root, 'progress.json', { substep: 'wave-1', completedUnits: ['T1'], remainingUnits: 1 });
  const baseline = sha256File(fixture.statePath);
  const cases = [
    ['checkpoint out-of-range step', ['checkpoint', fixture.stateRel, '--step', '99', '--progress-file', 'progress.json']],
    ['checkpoint malformed json', ['checkpoint', fixture.stateRel, '--step', '4', '--progress', '{not-json']],
    ['checkpoint negative remaining', ['checkpoint', fixture.stateRel, '--step', '4', '--progress', JSON.stringify({ substep: 's', completedUnits: [], remainingUnits: -1 })]],
    ['checkpoint wrong completedUnits type', ['checkpoint', fixture.stateRel, '--step', '4', '--progress', JSON.stringify({ substep: 's', completedUnits: 'T1', remainingUnits: 1 })]],
    ['checkpoint missing progress', ['checkpoint', fixture.stateRel, '--step', '4']],
    ['checkpoint both inputs', ['checkpoint', fixture.stateRel, '--step', '4', '--progress-file', 'progress.json', '--progress', JSON.stringify({ substep: 's', completedUnits: [], remainingUnits: 0 })]],
    ['pause-turn out-of-range step', ['pause-turn', fixture.stateRel, '--step', '99', '--reason', 'x']],
    ['pause-turn missing reason', ['pause-turn', fixture.stateRel, '--step', '4']],
    ['pause-turn without nextAction or checkpoint', ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'x']],
  ];
  for (const [label, args] of cases) {
    const result = runCli(UPDATE, args, root);
    assert.notEqual(result.status, 0, `${label} exits non-zero`);
    assert.equal(sha256File(fixture.statePath), baseline, `${label} leaves state byte-identical`);
  }
  assert.equal(fs.existsSync(path.join(fixture.usDir, 'telemetry.jsonl')), false, 'no telemetry on fail-closed paths');
  console.log('T6 out-of-range or malformed input leaves state unchanged: ok');
}

// T7 - NS6
{
  const root = makeRoot();
  const cases = [
    ['wrong-typed completedUnits', { stepCheckpoints: { 4: { step: 4, substep: 'wave', completedUnits: 'T1', remainingUnits: 3, updatedAt: '2026-09-24T00:00:00.000Z' } } }],
    ['out-of-range step key', { stepCheckpoints: { 99: { step: 99, substep: 'wave', completedUnits: [], remainingUnits: 0, updatedAt: '2026-09-24T00:00:00.000Z' } } }],
    ['non-ISO updatedAt', { stepCheckpoints: { 4: { step: 4, substep: 'wave', completedUnits: [], remainingUnits: 0, updatedAt: 'not-a-date' } } }],
    ['malformed turnPause', { turnPause: { step: 4, reason: '', at: 'nope', nextAction: 'x' } }],
  ];
  let index = 0;
  for (const [label, extra] of cases) {
    index += 1;
    const fixture = makeState(root, { slug: `bad-${index}`, workflowId: `wf-bad-${index}`, state: extra });
    const result = runCli(VALIDATE, [fixture.stateRel], root);
    assert.notEqual(result.status, 0, `${label} exits non-zero`);
  }
  console.log('T7 validate_state rejects malformed checkpoint record: ok');
}

// T8 - AC1 + G2
{
  const root = makeRoot();
  const fixture = makeState(root);
  const payload = { substep: 'node-2', completedUnits: ['T1'], remainingUnits: 4 };
  writeProgressFile(root, 'progress.json', payload);
  const viaFile = runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', '4', '--progress-file', 'progress.json'], root);
  assert.equal(viaFile.status, 0, viaFile.stderr);
  const fromFile = readState(fixture).stepCheckpoints['4'];
  const viaInline = runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', '4', '--progress', JSON.stringify(payload)], root);
  assert.equal(viaInline.status, 0, viaInline.stderr);
  const fromInline = readState(fixture).stepCheckpoints['4'];
  assert.deepEqual(
    { ...fromFile, updatedAt: null },
    { ...fromInline, updatedAt: null },
    '--progress-file and --progress persist the same record',
  );
  const baseline = sha256File(fixture.statePath);
  const missing = runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', '4', '--progress-file', 'missing-progress.json'], root);
  assert.notEqual(missing.status, 0, 'missing progress file fails closed');
  assert.equal(sha256File(fixture.statePath), baseline);
  writeProgressFile(root, 'bad-progress.json', '{oops');
  const invalid = runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', '4', '--progress-file', 'bad-progress.json'], root);
  assert.notEqual(invalid.status, 0, 'invalid progress file fails closed');
  assert.equal(sha256File(fixture.statePath), baseline);
  const both = runCli(UPDATE, ['checkpoint', fixture.stateRel, '--step', '4', '--progress', JSON.stringify(payload), '--progress-file', 'progress.json'], root);
  assert.notEqual(both.status, 0, 'mutually exclusive inputs fail closed');
  assert.equal(sha256File(fixture.statePath), baseline);
  console.log('T8 --progress-file parity and fail-closed: ok');
}

// T9 - G4/G9
{
  const root = makeRoot();
  const fixture = makeState(root);
  fs.writeFileSync(path.join(fixture.usDir, 'plan.index.json'), JSON.stringify({ schemaVersion: 1, tasks: [] }));
  fs.writeFileSync(path.join(fixture.usDir, `step-02-${fixture.slug}.plan-interview.md`), '# interview\n');
  fs.writeFileSync(path.join(fixture.usDir, `step-02-${fixture.slug}.plan.refined.md`), '# refined\n');
  assert.equal(checkpoint(fixture, root, 4, { substep: 'wave-1', completedUnits: ['T1'], remainingUnits: 2 }).status, 0);
  assert.equal(runCli(UPDATE, ['pause-turn', fixture.stateRel, '--step', '4', '--reason', 'turn end'], root).status, 0);
  const before = readState(fixture);
  const dispatch = runCli(UPDATE, ['dispatch', fixture.stateRel, '--step', '4'], root);
  assert.equal(dispatch.status, 0, dispatch.stderr);
  const afterDispatch = readState(fixture);
  assert.deepEqual(afterDispatch.turnPause, before.turnPause, 'dispatch leaves the pause marker untouched');
  assert.deepEqual(afterDispatch.stepCheckpoints, before.stepCheckpoints, 'dispatch leaves step checkpoints untouched');
  const finish1 = runCli(UPDATE, ['finish', fixture.stateRel, '--step', '4', '--status', 'completed', '--noop', 'liveness test'], root);
  assert.equal(finish1.status, 0, finish1.stderr);
  const afterFirst = readState(fixture);
  assert.equal(afterFirst.turnPause, undefined);
  const finish2 = runCli(UPDATE, ['finish', fixture.stateRel, '--step', '4', '--status', 'completed', '--noop', 'liveness test'], root);
  assert.equal(finish2.status, 0, finish2.stderr);
  const afterSecond = readState(fixture);
  assert.equal(afterSecond.revision, afterFirst.revision, 'repeat finish does not bump revision');
  assert.equal(afterSecond.turnPause, undefined, 'repeat finish does not resurrect the pause marker');
  assert.equal(afterSecond.stepCheckpoints, undefined, 'repeat finish does not resurrect checkpoints');
  console.log('T9 dispatch leaves markers untouched; repeat finish is idempotent: ok');
}

// D1 - AC8
{
  const skill = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/SKILL.md'), 'utf8');
  const protocols = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/PROTOCOLS.md'), 'utf8');
  assert.ok(/does not chain host turns/i.test(skill), 'SKILL.md states autoMode does not chain host turns');
  assert.ok(/turn[- ]boundary/i.test(skill), 'SKILL.md documents the turn-boundary pause');
  assert.ok(/turn[- ]boundary/i.test(protocols), 'PROTOCOLS.md documents the turn-boundary pause');
  assert.ok(/checkpoint/.test(protocols) && /pause-turn/.test(protocols), 'PROTOCOLS.md documents both operations');
  console.log('D1 orchestrator docs state autoMode does not chain host turns: ok');
}

// D2 - AC19
{
  const readme = fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  const features = fs.readFileSync(path.join(repoRoot, 'FEATURES.md'), 'utf8');
  for (const [label, text] of [['README.md', readme], ['FEATURES.md', features]]) {
    assert.ok(/checkpoint/.test(text), `${label} mentions checkpoint`);
    assert.ok(/pause-turn|turn[- ]boundary/.test(text), `${label} mentions the turn-boundary pause`);
    assert.ok(/--until-terminal/.test(text), `${label} mentions --until-terminal`);
  }
  console.log('D2 README + FEATURES describe operations, pause semantics, --until-terminal: ok');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-liveness-checkpoints: ok');
