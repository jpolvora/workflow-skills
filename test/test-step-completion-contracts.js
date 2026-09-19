/**
 * Step 3 / Step 4 completion contracts + monitor detection flags.
 * AC1: completed Step 3 requires the exec artifact pair (sequential skip stays legal).
 * AC2: completed mutating Step 4 requires filesTouched or an explicit --noop.
 * AC3: monitor raises missing-exec-artifact + empty-files-touched on violation shapes.
 * AC4: monitor stays silent on the grandfathered dag-disabled skip shape.
 * Run: node test/test-step-completion-contracts.js
 */
import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const {
  classifyWorkflow,
} = require(path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs'));

const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const roots = [];

function seedState(root, slug, overrides = {}) {
  const usDir = path.join(root, '.agents/plans', slug);
  fs.mkdirSync(usDir, { recursive: true });
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
  }));
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  write(path.join(root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf
slug: ${slug}
workflowType: standard
status: active
currentStep: ${overrides.currentStep ?? 3}
completedSteps: [${(overrides.completedSteps ?? [0, 1, 2]).join(', ')}]
skippedSteps: ${(overrides.skippedSteps ?? '[]')}
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  return { usDir, stateRel, common: ['--repo-root', root, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`] };
}

function readState(root, slug) {
  return JSON.parse(fs.readFileSync(path.join(root, `.agents/plans/${slug}/wf.state.json`), 'utf8'));
}

// AC1: completed Step 3 without the exec pair fails closed.
{
  const root = temp('ws-step-contract-ac1-');
  roots.push(root);
  const { usDir, stateRel, common } = seedState(root, 'demo');
  const blocked = run(update, ['finish', stateRel, '--step', '3', '--timestamp', '2026-09-19T10:00:00.000Z', ...common]);
  assert.notStrictEqual(blocked.status, 0, 'finish step 3 completed without artifacts must fail');
  assert.match(`${blocked.stdout}${blocked.stderr}`, /required artifacts missing: step-03-demo\.plan\.exec\.md/);
  write(path.join(usDir, 'step-03-demo.plan.exec.md'), '# exec\n');
  const halfBlocked = run(update, ['finish', stateRel, '--step', '3', '--timestamp', '2026-09-19T10:00:01.000Z', ...common]);
  assert.notStrictEqual(halfBlocked.status, 0, 'finish step 3 completed with only the exec file must fail');
  assert.match(`${halfBlocked.stdout}${halfBlocked.stderr}`, /step-03-demo\.exec\.dag\.json/);
  write(path.join(usDir, 'step-03-demo.exec.dag.json'), '{}\n');
  const ok = run(update, ['finish', stateRel, '--step', '3', '--timestamp', '2026-09-19T10:00:02.000Z', ...common]);
  assert.strictEqual(ok.status, 0, `finish step 3 completed with both files must pass: ${ok.stderr}`);
  assert.ok(readState(root, 'demo').completedSteps.includes(3), 'step 3 recorded completed with artifacts');
}

// AC1 compat: skipped dag-disabled stays legal, drops the completed listing, waives pre-advance 4.
{
  const root = temp('ws-step-contract-skip-');
  roots.push(root);
  const slug = 'skip';
  const usDir = path.join(root, '.agents/plans', slug);
  fs.mkdirSync(usDir, { recursive: true });
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
  }));
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  write(path.join(root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf
slug: ${slug}
workflowType: standard
status: active
currentStep: 3
completedSteps: [0, 1]
skippedSteps: [{step: 2, reason: interview-not-required, evidence: ''}]
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  write(path.join(usDir, `step-01-${slug}.plan.md`), '# Plan\n');
  write(path.join(usDir, '.runtime/plan.index.json'), JSON.stringify({ schemaVersion: 1, slug, tasks: [] }));
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({ schemaVersion: 1, slug, acceptanceCriteria: [] }));
  const common = ['--repo-root', root, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  const skipped = run(update, [
    'finish', stateRel, '--step', '3', '--status', 'skipped', '--reason', 'dag-disabled',
    '--timestamp', '2026-09-19T10:00:00.000Z', ...common,
  ]);
  assert.strictEqual(skipped.status, 0, `skipped dag-disabled finish must pass: ${skipped.stderr}`);
  const state = readState(root, 'skip');
  assert.ok(!state.completedSteps.includes(3), 'skipped step 3 is not listed as completed');
  assert.ok(state.skippedSteps.some((item) => Number(item.step) === 3 && item.reason === 'dag-disabled'), 'skip record kept');
  assert.strictEqual(
    run(validate, [stateRel, '--pre-advance', '4', '--repo-root', root]).status,
    0,
    'pre-advance 4 accepts the dag-disabled skip without exec files',
  );
}

// AC1 gate: pre-advance 4 fails when Step 3 claims completed but the files are absent.
{
  const root = temp('ws-step-contract-gate-');
  roots.push(root);
  const { stateRel } = seedState(root, 'gate', { completedSteps: [0, 1, 2, 3], currentStep: 4 });
  const blocked = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', root]);
  assert.notStrictEqual(blocked.status, 0, 'pre-advance 4 must fail on completed-without-artifact Step 3');
  assert.match(`${blocked.stdout}${blocked.stderr}`, /step-03-gate\.plan\.exec\.md/);
}

// AC2: completed Step 4 with empty filesTouched fails closed unless --noop declares it.
{
  const root = temp('ws-step-contract-ac2-');
  roots.push(root);
  const { usDir, stateRel, common } = seedState(root, 'impl', { completedSteps: [0, 1], currentStep: 2 });
  write(path.join(usDir, 'step-01-impl.plan.md'), '# Plan\n');
  write(path.join(usDir, '.runtime/plan.index.json'), JSON.stringify({ schemaVersion: 1, slug: 'impl', tasks: [] }));
  assert.strictEqual(run(update, [
    'finish', stateRel, '--step', '2', '--status', 'skipped', '--reason', 'interview-not-required',
    '--timestamp', '2026-09-19T10:00:00.000Z', ...common,
  ]).status, 0);
  assert.strictEqual(run(update, [
    'finish', stateRel, '--step', '3', '--status', 'skipped', '--reason', 'dag-disabled',
    '--timestamp', '2026-09-19T10:00:01.000Z', ...common,
  ]).status, 0);
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '4', '--timestamp', '2026-09-19T10:00:02.000Z', ...common]).status, 0);
  const blocked = run(update, ['finish', stateRel, '--step', '4', '--timestamp', '2026-09-19T10:00:01.000Z', ...common]);
  assert.notStrictEqual(blocked.status, 0, 'finish step 4 completed with empty filesTouched must fail');
  assert.match(`${blocked.stdout}${blocked.stderr}`, /filesTouched is empty/);
  const emptyNoop = run(update, ['finish', stateRel, '--step', '4', '--noop', '', '--timestamp', '2026-09-19T10:00:02.000Z', ...common]);
  assert.notStrictEqual(emptyNoop.status, 0, 'finish step 4 with an empty --noop must fail');
  const noopOk = run(update, [
    'finish', stateRel, '--step', '4', '--noop', 'verification-only retry touched nothing',
    '--timestamp', '2026-09-19T10:00:03.000Z', ...common,
  ]);
  assert.strictEqual(noopOk.status, 0, `finish step 4 with --noop must pass: ${noopOk.stderr}`);
  const events = fs.readFileSync(path.join(root, '.agents/plans/impl/telemetry.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  const last = events[events.length - 1];
  assert.strictEqual(last.noop, 'verification-only retry touched nothing', 'telemetry finish event records the parsed --noop value');
  write(path.join(usDir, 'src.js'), 'module.exports = 1;\n');
  const filesOk = run(update, [
    'dispatch', stateRel, '--step', '4', '--timestamp', '2026-09-19T10:00:04.000Z', ...common,
  ]);
  assert.strictEqual(filesOk.status, 0);
  const touchedOk = run(update, [
    'finish', stateRel, '--step', '4', '--created', '.agents/plans/impl/src.js',
    '--timestamp', '2026-09-19T10:00:05.000Z', ...common,
  ]);
  assert.strictEqual(touchedOk.status, 0, `finish step 4 with files must pass: ${touchedOk.stderr}`);
}

// AC3: monitor raises both named flags on violation shapes.
{
  const root = temp('ws-step-contract-mon-');
  roots.push(root);
  const violationDir = path.join(root, '.agents/plans/violation');
  fs.mkdirSync(violationDir, { recursive: true });
  const violation = classifyWorkflow(
    {
      slug: 'violation', currentStep: 4, verificationScore: 9,
      completedSteps: [0, 1, 2, 3], skippedSteps: [],
    },
    violationDir,
    {
      events: [{ type: 'finish', step: 4, skipReason: null, filesTouched: { created: [], modified: [], deleted: [] } }],
      errors: [],
    },
    9,
    root,
  );
  const codes = violation.map((finding) => finding.code);
  assert.ok(codes.includes('missing-exec-artifact'), 'monitor must raise missing-exec-artifact on completed-without-artifact Step 3');
  assert.ok(codes.includes('empty-files-touched'), 'monitor must raise empty-files-touched on completed-with-empty Step 4');
  assert.strictEqual(
    violation.find((finding) => finding.code === 'missing-exec-artifact').severity,
    'critical',
    'missing-exec-artifact is critical',
  );
}

// AC3 carve-out: an explicit no-op declaration silences empty-files-touched.
{
  const root = temp('ws-step-contract-noop-');
  roots.push(root);
  const dir = path.join(root, '.agents/plans/noopdemo');
  fs.mkdirSync(dir, { recursive: true });
  write(path.join(dir, 'step-03-noopdemo.plan.exec.md'), '# exec\n');
  const findings = classifyWorkflow(
    {
      slug: 'noopdemo', currentStep: 5, verificationScore: 9,
      completedSteps: [0, 1, 2, 3, 4], skippedSteps: [],
    },
    dir,
    {
      events: [{
        type: 'finish', step: 4, skipReason: null, noop: 'verification-only retry touched nothing',
        filesTouched: { created: [], modified: [], deleted: [] },
      }],
      errors: [],
    },
    9,
    root,
  );
  assert.ok(!findings.some((finding) => finding.code === 'empty-files-touched'), 'monitor must stay silent on declared no-op');
}

// AC4: grandfathered shapes (skip record, with or without the historical dual completed listing) stay silent.
for (const [label, completedSteps] of [['truthful', [0, 1, 2, 4, 5, 6, 7, 8]], ['historical-dual', [0, 1, 2, 3, 4, 5, 6, 7, 8]]]) {
  const root = temp(`ws-step-contract-compat-${label}-`);
  roots.push(root);
  const dir = path.join(root, '.agents/plans/compat');
  fs.mkdirSync(dir, { recursive: true });
  const findings = classifyWorkflow(
    {
      slug: 'compat', currentStep: 9, verificationScore: 9,
      completedSteps,
      skippedSteps: [{ step: 3, reason: 'dag-disabled', evidence: '' }],
    },
    dir,
    {
      events: [
        {
          type: 'finish', step: 3, skipReason: 'dag-disabled',
          filesTouched: { created: [], modified: [], deleted: [] },
        },
        {
          type: 'finish', step: 4, skipReason: null,
          filesTouched: { created: ['src/line.js'], modified: [], deleted: [] },
        },
      ],
      errors: [],
    },
    9,
    root,
  );
  assert.ok(
    !findings.some((finding) => finding.code === 'missing-exec-artifact'),
    `compat ${label}: monitor must not raise missing-exec-artifact on the dag-disabled skip shape`,
  );
  assert.ok(
    !findings.some((finding) => finding.code === 'empty-files-touched'),
    `compat ${label}: monitor must not raise empty-files-touched for the skipped step or the touched step`,
  );
}

for (const directory of roots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-step-completion-contracts: ok');
