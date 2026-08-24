import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { parseFrontmatter, stateIdentityHash, sha256 } = require(path.join(repoRoot, '.agents/skills/ws-shared/scripts/workflow_state.cjs'));
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
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

function stampArtifact(dir, name, step, slug, workflowId) {
  write(path.join(dir, name), `---
step: ${step}
slug: ${slug}
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: []
---
# Artifact
`);
}

function setupPreAdvance6Fixture(options = {}) {
  const pa6Root = temp('ws-state-pa6-');
  const slug = 'pa6';
  const workflowId = 'wf-pa6';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(pa6Root, '.agents/plans', slug);
  write(path.join(pa6Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: { backendFormat: 'npm run lint', backendTest: 'npm run test' },
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(pa6Root, stateRel), `---
stateVersion: 2
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
status: active
currentStep: 6
completedSteps: [0, 1, 2, 3, 4, 5]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 2
acImplemented: 2
verificationScore: 9
---
# State
`);
  write(path.join(pa6Root, 'impl.js'), 'export const value = 1;\n');
  write(path.join(pa6Root, 'pa6.test.js'), 'test("first behavior", () => {});\ntest("second behavior", () => {});\n');
  write(path.join(pa6Root, 'pa6.spec.md'), '## Acceptance Criteria\n- AC1: First.\n- AC2: Second.\n');
  write(path.join(pa6Root, 'plan.index.json'), JSON.stringify({
    acceptanceCriteria: [
      { id: 'AC1', taskIds: [], planSectionIds: [], expectedTestNames: ['first behavior'] },
      { id: 'AC2', taskIds: ['T2'], planSectionIds: ['S2'], expectedTestNames: ['second behavior'] },
    ],
  }));
  write(path.join(usDir, 'plan.index.json'), fs.readFileSync(path.join(pa6Root, 'plan.index.json')));
  const ledgerRel = `.agents/plans/${slug}/ac-ledger.json`;
  function ledger(args) {
    return run(ledgerScript, [...args, '--repo-root', pa6Root]);
  }
  assert.strictEqual(ledger(['init', '--spec', 'pa6.spec.md', '--plan-index', 'plan.index.json', '--output', ledgerRel, '--workflow-id', workflowId, '--slug', slug]).status, 0);
  for (const [id, name, withTest] of [['AC1', 'first behavior', true], ['AC2', 'second behavior', false]]) {
    const args = [
      'link', '--ledger', ledgerRel, '--event-id', `link-${id}`, '--ac', id,
      '--status', 'Implemented', '--file', 'impl.js:L1-L1',
      '--commit', JSON.stringify({ sha: 'abcdef1', step: 4 }),
    ];
    if (withTest) {
      args.push('--test', JSON.stringify({ name, sourceFile: 'pa6.test.js', phase: 'observed', alias: 'backendTest', exitCode: 0 }));
    } else {
      args.push('--test', JSON.stringify({ name, sourceFile: 'pa6.test.js', phase: 'planned', alias: null, exitCode: null }));
    }
    assert.strictEqual(ledger(args).status, 0);
  }
  assert.strictEqual(ledger([
    'link', '--ledger', ledgerRel, '--event-id', 'alias-test', '--ac', 'AC1',
    '--alias-result', JSON.stringify({ alias: 'backendTest', command: 'npm run test', exitCode: 0 }),
  ]).status, 0);
  if (options.includeFormatSkip) {
    assert.strictEqual(ledger([
      'link', '--ledger', ledgerRel, '--event-id', 'alias-format', '--ac', 'AC1',
      '--alias-result', JSON.stringify({ alias: 'backendFormat', command: 'npm run lint', exitCode: 2, skipReason: 'baseline-dirty' }),
    ]).status, 0);
  }
  const scored = JSON.parse(ledger(['score', '--ledger', ledgerRel, '--boundary', 'pre-step6']).stdout);
  assert.strictEqual(scored.score, 9);
  assert.strictEqual(scored.knownDefect, false);
  stampArtifact(usDir, `step-00-${slug}.spec.md`, 0, slug, workflowId);
  stampArtifact(usDir, `step-01-${slug}.plan.md`, 1, slug, workflowId);
  stampArtifact(usDir, `step-02-${slug}.plan.refined.md`, 2, slug, workflowId);
  stampArtifact(usDir, `step-03-${slug}.plan.exec.md`, 3, slug, workflowId);
  stampArtifact(usDir, `step-05-${slug}.plan.report.md`, 5, slug, workflowId);
  const common = ['--repo-root', pa6Root, '--jsonl-out', `.agents/plans/${slug}/telemetry/step-05.jsonl`];
  assert.strictEqual(run(update, [
    'finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T20:01:00.000Z',
    '--verification-score', '9', '--score-boundary', 'pre-step6', ...common,
  ]).status, 0);
  return { pa6Root, stateRel, slug, workflowId, usDir, common };
}

// AC7 — missing required alias fails pre-advance 6
{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: false });
  const fail = run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]);
  assert.notStrictEqual(fail.status, 0, 'missing backendFormat blocks pre-advance 6');
  assert.match(`${fail.stdout}${fail.stderr}`, /lacks observed result: backendFormat/);
}

// AC8 / AC15 — score 9 with baseline-dirty skip passes pre-advance 6
{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true });
  const ledgerData = JSON.parse(fs.readFileSync(path.join(pa6Root, '.agents/plans/pa6/ac-ledger.json'), 'utf8'));
  assert.strictEqual(ledgerData.scoreState.boundary, 'pre-step6');
  assert.strictEqual(run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status, 0);
}

// AC9 — runtime allowlist for cjs, patch, md
{
  const runtimeRoot = temp('ws-state-runtime-');
  const runtimeStateRel = '.agents/plans/rt/wf.state.md';
  write(path.join(runtimeRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(runtimeRoot, runtimeStateRel), `---
stateVersion: 2
revision: 0
workflowId: wf-rt
slug: rt
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 0
acImplemented: 0
---
# State
`);
  const runtimeDir = path.join(runtimeRoot, '.agents/plans/rt/.runtime');
  write(path.join(runtimeDir, 'score.cjs'), 'module.exports = {};\n');
  write(path.join(runtimeDir, 'invert.patch'), 'diff\n');
  write(path.join(runtimeDir, 'notes.md'), '# notes\n');
  const rtCommon = ['--repo-root', runtimeRoot];
  assert.strictEqual(run(update, ['dispatch', runtimeStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...rtCommon]).status, 0);
  write(path.join(runtimeDir, 'helper.txt'), 'bad\n');
  const badRuntime = run(validate, [runtimeStateRel, '--repo-root', runtimeRoot]);
  assert.notStrictEqual(badRuntime.status, 0);
  assert.match(`${badRuntime.stdout}${badRuntime.stderr}`, /unknown .runtime residue: helper.txt/);
}

// AC10 / AC11 — frontmatter-only state hash; gate history append stable
{
  const hashRoot = temp('ws-state-hash-');
  const hashStateRel = '.agents/plans/hash/wf.state.md';
  write(path.join(hashRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(hashRoot, hashStateRel), `---
stateVersion: 2
revision: 0
workflowId: wf-hash
slug: hash
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 0
acImplemented: 0
---
# State body
`);
  const hashCommon = ['--repo-root', hashRoot];
  assert.strictEqual(run(update, ['dispatch', hashStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...hashCommon]).status, 0);
  assert.strictEqual(run(update, ['finish', hashStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z', ...hashCommon]).status, 0);
  const stateText = fs.readFileSync(path.join(hashRoot, hashStateRel), 'utf8');
  const runJson = JSON.parse(fs.readFileSync(path.join(hashRoot, '.agents/plans/hash/run.json'), 'utf8'));
  const frontHash = stateIdentityHash(stateText);
  const fullHash = sha256(stateText);
  assert.strictEqual(runJson.stateSha256, frontHash);
  assert.notStrictEqual(runJson.stateSha256, fullHash);
  const appended = `${stateText.replace(/\s*$/, '\n\n')}## Gate history\n- checkpoint\n`;
  fs.writeFileSync(path.join(hashRoot, hashStateRel), appended, 'utf8');
  assert.strictEqual(run(validate, [hashStateRel, '--repo-root', hashRoot]).status, 0, 'gate history append does not break hash');
}

// Legacy full-file stateSha256 still passes pre-advance 6
{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true });
  const stateFile = path.join(pa6Root, stateRel);
  const stateText = fs.readFileSync(stateFile, 'utf8');
  const fullHash = sha256(stateText);
  assert.notStrictEqual(fullHash, stateIdentityHash(stateText), 'legacy full-file digest differs from frontmatter hash');
  const runPath = path.join(pa6Root, '.agents/plans/pa6/run.json');
  const runJson = JSON.parse(fs.readFileSync(runPath, 'utf8'));
  runJson.stateSha256 = fullHash;
  fs.writeFileSync(runPath, `${JSON.stringify(runJson, null, 2)}\n`);
  assert.strictEqual(
    run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status,
    0,
    'legacy full-file run.json hash accepted until next performUpdate',
  );
}

// AC12 / AC13 — finish --commit writes and dedupes commits
{
  const commitRoot = temp('ws-state-commit-');
  const commitStateRel = '.agents/plans/cm/wf.state.md';
  write(path.join(commitRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(commitRoot, commitStateRel), `---
stateVersion: 2
revision: 0
workflowId: wf-cm
slug: cm
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 0
acImplemented: 0
---
# State
`);
  const cmCommon = ['--repo-root', commitRoot];
  assert.strictEqual(run(update, ['dispatch', commitStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...cmCommon]).status, 0);
  assert.strictEqual(run(update, [
    'finish', commitStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z',
    '--commit', 'abcdef1', ...cmCommon,
  ]).status, 0);
  let stateData = parseFrontmatter(fs.readFileSync(path.join(commitRoot, commitStateRel), 'utf8')).data;
  assert.strictEqual(stateData.commits.length, 1);
  assert.deepStrictEqual(stateData.commits[0], { sha: 'abcdef1', step: 0 });
  assert.strictEqual(run(update, ['dispatch', commitStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:10.000Z', ...cmCommon]).status, 0);
  assert.strictEqual(run(update, [
    'finish', commitStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:15.000Z',
    '--commit', 'abcdef1', ...cmCommon,
  ]).status, 0);
  stateData = parseFrontmatter(fs.readFileSync(path.join(commitRoot, commitStateRel), 'utf8')).data;
  assert.strictEqual(stateData.commits.filter((item) => item.sha === 'abcdef1').length, 1, 'same SHA is not duplicated');
}

const skipRoot = temp('ws-state-skip-');
const skipStateRel = '.agents/plans/skip/wf.state.md';
write(path.join(skipRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  verification: {},
  defaults: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(skipRoot, skipStateRel), `---
stateVersion: 2
revision: 0
workflowId: wf-skip
slug: skip
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
write(path.join(skipRoot, '.agents/plans/skip/step-00-skip.spec.md'), `---
id: null
slug: skip
title: Skip
source: local
specDate: 2026-08-21
---
## Description
Skip.
## Acceptance Criteria
- AC1: Skip interview still advances.
`);
write(path.join(skipRoot, '.agents/plans/skip/step-01-skip.plan.md'), `---
step: 1
slug: skip
workflowId: wf-skip
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Plan

## Work

T00 implements AC1 in \`src/skip.js\` with V1:skip-test.
`);
write(path.join(skipRoot, '.agents/plans/skip/ac-ledger.json'), JSON.stringify({
  schemaVersion: 1,
  revision: 1,
  workflowId: 'wf-skip',
  slug: 'skip',
  specPath: '.agents/plans/skip/step-00-skip.spec.md',
  planIndexPath: null,
  declaredGaps: [],
  aliasResults: [],
  testingSkip: null,
  acceptanceCriteria: [{ id: 'AC1', text: 'Skip interview still advances.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
  scoreState: null,
}));
const skipCommon = ['--repo-root', skipRoot, '--jsonl-out', '.agents/plans/skip/telemetry/step-00.jsonl'];
assert.strictEqual(run(update, ['dispatch', skipStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...skipCommon]).status, 0);
assert.strictEqual(run(update, ['finish', skipStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z', ...skipCommon]).status, 0);
assert.strictEqual(run(update, ['dispatch', skipStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:06.000Z', ...skipCommon]).status, 0);
assert.strictEqual(run(update, ['finish', skipStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:07.000Z', ...skipCommon]).status, 0);
assert.notStrictEqual(run(validate, [skipStateRel, '--pre-advance', '3', '--repo-root', skipRoot]).status, 0, 'pre-advance 3 requires refined plan when interview was not skipped');
assert.strictEqual(run(update, ['dispatch', skipStateRel, '--step', '2', '--timestamp', '2026-08-21T20:00:08.000Z', ...skipCommon]).status, 0);
assert.strictEqual(run(update, [
  'finish', skipStateRel, '--step', '2', '--status', 'skipped', '--reason', 'interview-not-required',
  '--timestamp', '2026-08-21T20:00:09.000Z', ...skipCommon,
]).status, 0);
assert.strictEqual(run(validate, [skipStateRel, '--pre-advance', '3', '--repo-root', skipRoot]).status, 0, 'pre-advance 3 skips refined plan when interview-not-required');
assert.notStrictEqual(run(validate, [skipStateRel, '--pre-advance', '4', '--repo-root', skipRoot]).status, 0, 'pre-advance 4 requires plan.index.json before implement');
assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs'), [
  'build', '--plan', '.agents/plans/skip/step-01-skip.plan.md', '--spec', '.agents/plans/skip/step-00-skip.spec.md',
  '--output', '.agents/plans/skip/plan.index.json', '--repo-root', skipRoot,
]).status, 0);
assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_sequential_dag.cjs'), [
  '--slug', 'skip', '--workflow-id', 'wf-skip', '--plan', '.agents/plans/skip/step-01-skip.plan.md',
  '--exec-out', '.agents/plans/skip/step-03-skip.plan.exec.md',
  '--dag-out', '.agents/plans/skip/step-03-skip.exec.dag.json',
  '--timestamp', '2026-08-21T20:00:10.000Z', '--repo-root', skipRoot,
]).status, 0);
assert.strictEqual(run(update, ['dispatch', skipStateRel, '--step', '3', '--timestamp', '2026-08-21T20:00:10.000Z', ...skipCommon]).status, 0);
assert.strictEqual(run(update, [
  'finish', skipStateRel, '--step', '3', '--status', 'skipped', '--reason', 'dag-disabled',
  '--timestamp', '2026-08-21T20:00:11.000Z', ...skipCommon,
]).status, 0);
assert.strictEqual(run(validate, [skipStateRel, '--pre-advance', '4', '--repo-root', skipRoot]).status, 0, 'pre-advance 4 accepts sequential DAG stub plus plan.index.json');

const liteValidate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.cjs');
const liteUpdate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
const liteRoot = temp('ws-state-lite-');
const liteStateRel = '.agents/plans/lite/wf.state.md';
write(path.join(liteRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  verification: {},
  defaults: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(liteRoot, liteStateRel), `---
stateVersion: 2
revision: 0
workflowId: wf-lite
slug: lite
workflowType: lite
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
write(path.join(liteRoot, '.agents/plans/lite/step-00-lite.spec.md'), `---
id: null
slug: lite
title: Lite
source: local
specDate: 2026-08-21
---
## Description
Lite.
## Acceptance Criteria
- AC1: Lite implement uses plan.index.json.
`);
write(path.join(liteRoot, '.agents/plans/lite/step-01-lite.plan.md'), `---
step: 1
slug: lite
workflowId: wf-lite
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Plan

## Work

T00 implements AC1 in \`src/lite.js\` with V1:lite-test.
`);
write(path.join(liteRoot, '.agents/plans/lite/ac-ledger.json'), JSON.stringify({
  schemaVersion: 1, revision: 1, workflowId: 'wf-lite', slug: 'lite',
  specPath: '.agents/plans/lite/step-00-lite.spec.md', planIndexPath: null,
  declaredGaps: [], aliasResults: [], testingSkip: null,
  acceptanceCriteria: [{ id: 'AC1', text: 'Lite implement uses plan.index.json.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
  scoreState: null,
}));
const liteCommon = ['--repo-root', liteRoot, '--jsonl-out', '.agents/plans/lite/telemetry/step-00.jsonl'];
assert.strictEqual(run(liteUpdate, ['dispatch', liteStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteUpdate, ['finish', liteStateRel, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteUpdate, ['dispatch', liteStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:06.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteUpdate, ['finish', liteStateRel, '--step', '1', '--timestamp', '2026-08-21T20:00:07.000Z', ...liteCommon]).status, 0);
assert.notStrictEqual(run(liteValidate, [liteStateRel, '--pre-advance', '2', '--repo-root', liteRoot]).status, 0, 'lite pre-advance 2 requires plan.index.json');
assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs'), [
  'build', '--plan', '.agents/plans/lite/step-01-lite.plan.md', '--spec', '.agents/plans/lite/step-00-lite.spec.md',
  '--output', '.agents/plans/lite/plan.index.json', '--repo-root', liteRoot,
]).status, 0);
assert.strictEqual(run(liteValidate, [liteStateRel, '--pre-advance', '2', '--repo-root', liteRoot]).status, 0, 'lite pre-advance 2 accepts plan.index.json without step-02');
stampArtifact(path.join(liteRoot, '.agents/plans/lite'), 'step-06-lite.review.md', 6, 'lite', 'wf-lite');
assert.strictEqual(run(liteUpdate, ['dispatch', liteStateRel, '--step', '2', '--timestamp', '2026-08-21T20:00:08.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteUpdate, ['finish', liteStateRel, '--step', '2', '--timestamp', '2026-08-21T20:00:09.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteValidate, [liteStateRel, '--pre-advance', '4', '--repo-root', liteRoot]).status, 0, 'lite pre-advance 4 uses step-06 review, not step-03 exec');

console.log('test-workflow-state-contract: ok');
