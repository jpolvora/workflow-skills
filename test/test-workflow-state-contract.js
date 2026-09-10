import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { parseFrontmatter, stateIdentityHash, sha256 } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const ledgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');
const root = temp('ws-state-contract-');
fs.mkdirSync(path.join(root, '.agents/skills/ws-shared/runtime'), { recursive: true });
fs.copyFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
);
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
assert.match(state, /stateVersion: 3/);
assert.match(state, /gateDecision:/);
const events = fs.readFileSync(path.join(root, '.agents/plans/demo/telemetry.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.deepStrictEqual(events.map((event) => event.type), ['dispatch', 'finish']);
assert.strictEqual(events[1].elapsedSec, 5);
assert.strictEqual(events[1].estimated, false);
const packageManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'bin/skill-dependencies.json'), 'utf8'));
assert.strictEqual(events[0].packageVersion, packageManifest.packageVersion, 'telemetry resolves packageVersion from skill dependencies');
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

const outputFixture = path.join(root, 'step-output.json');
write(outputFixture, JSON.stringify({
  status: 'completed',
  files_touched: ['src/generated-from-agent.js'],
  promptTokens: 17,
  completionTokens: 29,
  summary: 'agent output telemetry',
}));
assert.strictEqual(run(update, [
  'finish', stateRel, '--step', '1', '--step-output', outputFixture,
  '--timestamp', '2026-08-21T20:00:09.000Z', ...common,
]).status, 0);
const outputEvents = fs.readFileSync(path.join(root, '.agents/plans/demo/telemetry.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
const outputEvent = outputEvents.at(-1);
assert.deepStrictEqual(outputEvent.filesTouched.created, ['src/generated-from-agent.js']);
assert.strictEqual(outputEvent.promptTokens, 17);
assert.strictEqual(outputEvent.completionTokens, 29);
const missingLedger = run(validate, [stateRel, '--pre-advance', '1', '--repo-root', root]);
assert.notStrictEqual(missingLedger.status, 0, 'pre-advance 1 requires ac-ledger.json');
assert.match(`${missingLedger.stdout}${missingLedger.stderr}`, /ac-ledger\.json is required before advance/);
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
  const defaults = {};
  if (options.minVerifyScore !== undefined) defaults.minVerifyScore = options.minVerifyScore;
  write(path.join(pa6Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: { backendFormat: 'npm run lint', backendTest: 'npm run test' },
    defaults,
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(pa6Root, stateRel), `---
stateVersion: 3
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
  const setupFinish = run(update, [
    'finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T20:01:00.000Z',
    '--verification-score', '9', '--score-boundary', 'pre-step6', ...common,
  ]);
  if (Number(options.minVerifyScore) === 10) {
    assert.notStrictEqual(setupFinish.status, 0, 'below-bar fixture finish is rejected');
  } else {
    assert.strictEqual(setupFinish.status, 0, setupFinish.stderr || setupFinish.stdout);
  }
  return { pa6Root, stateRel, slug, workflowId, usDir, common, ledger };
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

{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true, minVerifyScore: 10 });
  const fail = run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]);
  assert.notStrictEqual(fail.status, 0, 'minVerifyScore 10 blocks ledger score 9');
  assert.match(`${fail.stdout}${fail.stderr}`, /ledger score must be at least 10 before step 6/);
}

{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true, minVerifyScore: 8 });
  assert.strictEqual(run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status, 0, 'minVerifyScore 8 allows ledger score 9');
}

{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true, minVerifyScore: 99 });
  assert.strictEqual(run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status, 0, 'invalid minVerifyScore falls back to 9');
}

{
  const { pa6Root, stateRel, slug, ledger } = setupPreAdvance6Fixture({ includeFormatSkip: true, minVerifyScore: 8 });
  const ledgerRel = `.agents/plans/${slug}/ac-ledger.json`;
  assert.strictEqual(ledger([
    'link', '--ledger', ledgerRel, '--event-id', 'defect', '--ac', 'AC1',
    '--finding', JSON.stringify({ id: 'CR-001', severity: 'Warning', state: 'open', round: 1, evidence: 'impl.js:L1-L1' }),
    '--sabotage-exit', '1',
  ]).status, 0);
  const rescored = JSON.parse(ledger(['score', '--ledger', ledgerRel, '--boundary', 'pre-step6']).stdout);
  assert.strictEqual(rescored.score, 8);
  assert.strictEqual(run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status, 0, 'minVerifyScore 8 allows ledger score 8');
}

{
  const { pa6Root, stateRel, slug, ledger } = setupPreAdvance6Fixture({ includeFormatSkip: true });
  const ledgerRel = `.agents/plans/${slug}/ac-ledger.json`;
  assert.strictEqual(ledger([
    'link', '--ledger', ledgerRel, '--event-id', 'defect', '--ac', 'AC1',
    '--finding', JSON.stringify({ id: 'CR-001', severity: 'Warning', state: 'open', round: 1, evidence: 'impl.js:L1-L1' }),
    '--sabotage-exit', '1',
  ]).status, 0);
  const rescored = JSON.parse(ledger(['score', '--ledger', ledgerRel, '--boundary', 'pre-step6']).stdout);
  assert.strictEqual(rescored.score, 8);
  const fail = run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]);
  assert.notStrictEqual(fail.status, 0, 'default minVerifyScore 9 blocks ledger score 8');
  assert.match(`${fail.stdout}${fail.stderr}`, /ledger score must be at least 9 before step 6/);
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
stateVersion: 3
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
stateVersion: 3
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
  const plansIndex = JSON.parse(fs.readFileSync(path.join(hashRoot, '.agents/plans/index.json'), 'utf8'));
  const row = plansIndex.workflows.find((item) => item.workflowId === 'wf-hash');
  const jsonText = fs.readFileSync(path.join(hashRoot, '.agents/plans/hash/wf.state.json'), 'utf8');
  const jsonHash = sha256(jsonText);
  const fullHash = sha256(stateText);
  assert.strictEqual(row.stateSha256, jsonHash);
  assert.notStrictEqual(row.stateSha256, fullHash);
  const appended = `${stateText.replace(/\s*$/, '\n\n')}## Gate history\n- checkpoint\n`;
  fs.writeFileSync(path.join(hashRoot, hashStateRel), appended, 'utf8');
  assert.strictEqual(run(validate, [hashStateRel, '--repo-root', hashRoot]).status, 0, 'gate history append does not break hash');
}

// Index stateSha256 passes pre-advance 6
{
  const { pa6Root, stateRel } = setupPreAdvance6Fixture({ includeFormatSkip: true });
  assert.strictEqual(
    run(validate, [stateRel, '--pre-advance', '6', '--repo-root', pa6Root]).status,
    0,
    'pre-advance 6 passes with valid index and state',
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
stateVersion: 3
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
stateVersion: 3
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

function assertTestingSkipPreAdvance8(reason) {
  const { pa6Root, stateRel, usDir, common } = setupPreAdvance6Fixture({ includeFormatSkip: true });
  stampArtifact(usDir, 'step-06-pa6.review.md', 6, 'pa6', 'wf-pa6');
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '6', '--timestamp', '2026-08-21T21:00:00.000Z', ...common]).status, 0);
  assert.strictEqual(run(update, ['finish', stateRel, '--step', '6', '--timestamp', '2026-08-21T21:00:05.000Z', ...common]).status, 0);
  assert.strictEqual(run(ledgerScript, [
    'score', '--ledger', '.agents/plans/pa6/ac-ledger.json', '--boundary', 'step5', '--repo-root', pa6Root,
  ]).status, 0);
  const blocked = run(validate, [stateRel, '--pre-advance', '8', '--repo-root', pa6Root]);
  assert.notStrictEqual(blocked.status, 0, `pre-advance 8 requires testing report when Step 7 not skipped (${reason})`);
  assert.match(`${blocked.stdout}${blocked.stderr}`, /step-07-pa6\.testing\.report\.md/);
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '7', '--timestamp', '2026-08-21T21:00:06.000Z', ...common]).status, 0);
  assert.strictEqual(run(update, [
    'finish', stateRel, '--step', '7', '--status', 'skipped', '--reason', reason,
    '--timestamp', '2026-08-21T21:00:07.000Z', ...common,
  ]).status, 0);
  assert.strictEqual(
    run(validate, [stateRel, '--pre-advance', '8', '--repo-root', pa6Root]).status,
    0,
    `pre-advance 8 accepts Step 7 ${reason} skip without testing report`,
  );
}
assertTestingSkipPreAdvance8('no-test-surface');
assertTestingSkipPreAdvance8('testing-disabled');

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
stateVersion: 3
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
const liteMissingLedger = run(liteValidate, [liteStateRel, '--pre-advance', '1', '--repo-root', liteRoot]);
assert.notStrictEqual(liteMissingLedger.status, 0, 'lite pre-advance 1 requires ac-ledger.json');
assert.match(`${liteMissingLedger.stdout}${liteMissingLedger.stderr}`, /ac-ledger\.json is required before advance/);
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
assert.notStrictEqual(run(liteValidate, [liteStateRel, '--pre-advance', '5', '--repo-root', liteRoot]).status, 0, 'lite pre-advance 5 requires ship result');
stampArtifact(path.join(liteRoot, '.agents/plans/lite'), 'step-08-lite.result.md', 8, 'lite', 'wf-lite');
assert.strictEqual(run(liteUpdate, ['dispatch', liteStateRel, '--step', '4', '--timestamp', '2026-08-21T20:00:10.000Z', ...liteCommon]).status, 0);
assert.strictEqual(run(liteUpdate, ['finish', liteStateRel, '--step', '4', '--timestamp', '2026-08-21T20:00:11.000Z', ...liteCommon]).status, 0);
const liteClosed = JSON.parse(fs.readFileSync(path.join(liteRoot, liteStateRel.replace(/\.state\.md$/, '.state.json')), 'utf8'));
assert.strictEqual(liteClosed.status, 'completed', 'lite close finish sets workflow status completed');
assert.strictEqual(liteClosed.shipStatus, 'pending', 'lite close finish defaults shipStatus pending');
assert.strictEqual(run(liteValidate, [liteStateRel, '--pre-advance', '5', '--repo-root', liteRoot]).status, 0, 'lite pre-advance 5 accepts step-08 result');

const stdRoot = temp('ws-state-std-close-');
const stdStateRel = '.agents/plans/std/wf.state.md';
write(path.join(stdRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' }, verification: {}, defaults: {}, fable: { auditVerdictsBlockShip: 'refuted' },
}));
write(path.join(stdRoot, stdStateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-std
slug: std
workflowType: standard
status: active
currentStep: 8
completedSteps: [0,1,2,3,4,5,6,7]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`);
const stdCommon = ['--repo-root', stdRoot, '--jsonl-out', '.agents/plans/std/telemetry/step-08.jsonl'];
assert.strictEqual(run(update, ['finish', stdStateRel, '--step', '8', '--timestamp', '2026-08-21T20:00:11.000Z', ...stdCommon]).status, 0);
const stdClosed = JSON.parse(fs.readFileSync(path.join(stdRoot, stdStateRel.replace(/\.state\.md$/, '.state.json')), 'utf8'));
assert.strictEqual(stdClosed.status, 'completed', 'standard close sets workflow status completed');
assert.strictEqual(stdClosed.shipStatus, 'pending', 'standard close defaults shipStatus pending');

const barePreAdvance = run(validate, [stateRel, '--pre-advance', '--repo-root', root]);
assert.notStrictEqual(barePreAdvance.status, 0, 'bare --pre-advance is rejected');
assert.match(`${barePreAdvance.stdout}${barePreAdvance.stderr}`, /pre-advance requires a step number/);

const skipFinish = run(update, [
  'finish', stateRel, '--step', '3', '--status', 'skipped', '--reason', 'dag-disabled',
  '--evidence', 'enableDag false', '--timestamp', '2026-08-21T20:00:12.000Z', ...common,
]);
assert.strictEqual(skipFinish.status, 0, 'Node skip writes reason objects');
assert.match(fs.readFileSync(path.join(root, stateRel), 'utf8'), /reason: dag-disabled/);

const helpOut = run(validate, ['--help']);
assert.strictEqual(helpOut.status, 0, 'validate --help exits 0');
assert.match(helpOut.stdout, /Usage:/);

const indexGapRoot = temp('ws-state-index-gap-');
write(path.join(indexGapRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
  plans: { dir: '.agents/plans' },
  verification: {},
  defaults: {},
  fable: { auditVerdictsBlockShip: 'refuted' },
}));
const gapStateRel = '.agents/plans/gap/wf-gap.state.md';
write(path.join(indexGapRoot, gapStateRel), `---
stateVersion: 3
revision: 5
workflowId: wf-gap
slug: gap
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`);
write(path.join(indexGapRoot, '.agents/plans/index.json'), JSON.stringify({
  schemaVersion: 1,
  revision: 0,
  workflows: [],
}));
const missingRow = run(validate, [gapStateRel, '--repo-root', indexGapRoot]);
assert.notStrictEqual(missingRow.status, 0, 'validate fails when plans index exists without this workflowId');
assert.match(`${missingRow.stdout}${missingRow.stderr}`, /plans index missing workflow entry: wf-gap/);
assert.strictEqual(run(validate, ['rebuild-index', '--repo-root', indexGapRoot]).status, 0, 'rebuild-index exits 0');
assert.strictEqual(
  run(validate, [gapStateRel, '--repo-root', indexGapRoot]).status,
  0,
  'rebuild-index restores the missing workflow row even when state revision is > 0',
);

{
  const stampRoot = temp('ws-state-index-stamp-');
  write(path.join(stampRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  const idleTs = '2026-08-01T00:00:00Z';
  const liveTs = '2026-09-03T13:05:03Z';
  const idleState = '.agents/plans/idle/wf-idle.state.md';
  const liveState = '.agents/plans/live/wf-live.state.md';
  write(path.join(stampRoot, idleState), `---
stateVersion: 3
revision: 4
workflowId: wf-idle
slug: idle
workflowType: standard
status: completed
currentStep: 8
completedSteps: [8]
skippedSteps: []
startedAt: "${idleTs}"
endedAt: "${idleTs}"
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`);
  write(path.join(stampRoot, liveState), `---
stateVersion: 3
revision: 1
workflowId: wf-live
slug: live
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
startedAt: "${idleTs}"
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`);
  const memoTs = '2026-07-15T12:00:00Z';
  const memoState = '.agents/plans/memo/wf-memo.state.md';
  write(path.join(stampRoot, memoState), `---
workflowType: ws-multi-spec
runId: wf-memo
status: completed
createdAt: "2026-07-15T11:00:00Z"
updatedAt: "${memoTs}"
---
# Multi-spec
`);
  write(path.join(stampRoot, '.agents/plans/index.json'), JSON.stringify({
    schemaVersion: 1,
    revision: 4,
    generatedAt: idleTs,
    workflows: [
      {
        workflowId: 'wf-idle',
        slug: 'idle',
        pipeline: 'standard',
        statePath: idleState,
        stateSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        status: 'completed',
        currentStep: 8,
        updatedAt: idleTs,
        runPath: '.agents/plans/idle/wf.state.json',
      },
      {
        workflowId: 'wf-live',
        slug: 'live',
        pipeline: 'standard',
        statePath: liveState,
        stateSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        status: 'active',
        currentStep: 0,
        updatedAt: idleTs,
        runPath: '.agents/plans/live/wf.state.json',
      },
    ],
  }, null, 2));
  const liveCommon = ['--repo-root', stampRoot, '--jsonl-out', '.agents/plans/live/telemetry/step-00.jsonl'];
  const dispatchLive = run(update, ['dispatch', liveState, '--step', '0', '--timestamp', liveTs, ...liveCommon]);
  assert.strictEqual(dispatchLive.status, 0, dispatchLive.stderr);
  const rowById = (index, id) => index.workflows.find((row) => row.workflowId === id);
  const afterUpdate = JSON.parse(fs.readFileSync(path.join(stampRoot, '.agents/plans/index.json'), 'utf8'));
  assert.strictEqual(rowById(afterUpdate, 'wf-live').updatedAt, liveTs, 'update_state stamps only the current workflow updatedAt');
  assert.strictEqual(rowById(afterUpdate, 'wf-idle').updatedAt, idleTs, 'update_state leaves sibling workflow updatedAt unchanged');
  assert.strictEqual(run(validate, ['rebuild-index', '--repo-root', stampRoot]).status, 0, 'rebuild-index exits 0 with mixed workflows');
  const afterRebuild = JSON.parse(fs.readFileSync(path.join(stampRoot, '.agents/plans/index.json'), 'utf8'));
  assert.strictEqual(rowById(afterRebuild, 'wf-idle').updatedAt, idleTs, 'rebuild-index keeps idle workflow updatedAt from that workflow state');
  assert.strictEqual(rowById(afterRebuild, 'wf-live').updatedAt, liveTs, 'rebuild-index keeps live workflow updatedAt from that workflow activity');
  const memoRow = afterRebuild.workflows.find((row) => row.statePath && row.statePath.includes('/memo/'));
  assert.ok(memoRow, 'rebuild-index includes the multi-spec state row');
  assert.strictEqual(memoRow.updatedAt, memoTs, 'rebuild-index uses frontmatter updatedAt when dispatch timestamps are absent');
  assert.notStrictEqual(
    rowById(afterRebuild, 'wf-idle').updatedAt,
    afterRebuild.generatedAt,
    'rebuild-index generatedAt must not overwrite every workflow updatedAt',
  );
}

{
  const mdPath = path.join(root, stateRel);
  assert.ok(fs.existsSync(path.join(root, '.agents/plans/demo/wf.state.json')), 'shared fixture has .state.json');
  const md = fs.readFileSync(mdPath, 'utf8');
  fs.writeFileSync(mdPath, md.replace(/currentStep: \d+/, 'currentStep: 9'), 'utf8');
  const mismatch = run(validate, [stateRel, '--repo-root', root]);
  assert.notStrictEqual(mismatch.status, 0, 'markdown-only currentStep edit fails');
  assert.match(`${mismatch.stdout}${mismatch.stderr}`, /disagrees with JSON/);
}

{
  const idempRoot = temp('ws-state-idemp-');
  write(path.join(idempRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  const idempState = '.agents/plans/idemp/wf.state.md';
  write(path.join(idempRoot, idempState), `---
stateVersion: 3
revision: 0
workflowId: wf-idemp
slug: idemp
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
  const noPython = { env: { PATH: path.dirname(process.execPath) } };
  const idempCommon = ['--repo-root', idempRoot, '--jsonl-out', '.agents/plans/idemp/telemetry/step-00.jsonl'];
  const gate = JSON.stringify({ gate: 'entry', choice: 'continue', reason: 'approved', round: 1 });
  assert.strictEqual(run(update, [
    'dispatch', idempState, '--step', '0', '--timestamp', '2026-08-21T20:00:00.000Z', ...idempCommon,
  ], noPython).status, 0, 'dispatch without Python on PATH');
  assert.strictEqual(run(update, [
    'finish', idempState, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z',
    '--step-output', JSON.stringify({ summary: 'Rich subagent summary' }),
    '--gate-decision', gate, ...idempCommon,
  ], noPython).status, 0, 'finish without Python on PATH');
  const jsonPath = path.join(idempRoot, '.agents/plans/idemp/wf.state.json');
  const mdPath = path.join(idempRoot, idempState);
  assert.ok(fs.existsSync(jsonPath), 'dispatch/finish writes .state.json');
  const jsonText = fs.readFileSync(jsonPath, 'utf8');
  const jsonState = JSON.parse(jsonText);
  const mdData = parseFrontmatter(fs.readFileSync(mdPath, 'utf8')).data;
  assert.strictEqual(mdData.currentStep, jsonState.currentStep, '.state.md currentStep matches JSON');
  assert.strictEqual(mdData.revision, jsonState.revision, '.state.md revision matches JSON');
  const firstHash = sha256(jsonText);
  const plansIndex = JSON.parse(fs.readFileSync(path.join(idempRoot, '.agents/plans/index.json'), 'utf8'));
  const idempRow = plansIndex.workflows.find((item) => item.workflowId === 'wf-idemp');
  assert.strictEqual(idempRow.stateSha256, firstHash, 'index stateSha256 matches JSON SoT');
  const second = run(update, [
    'finish', idempState, '--step', '0', '--timestamp', '2026-08-21T20:00:05.000Z',
    '--step-output', JSON.stringify({ summary: 'Rich subagent summary' }),
    '--gate-decision', gate, ...idempCommon,
  ], noPython);
  assert.strictEqual(second.status, 0, second.stderr);
  assert.strictEqual(sha256(fs.readFileSync(jsonPath, 'utf8')), firstHash, 'identical finish is idempotent for state.json');
  assert.strictEqual(jsonState.handoffs['0'].step, 0);
  assert.strictEqual(jsonState.handoffs['0'].summary, 'Rich subagent summary', 'idempotent finish preserves original rich handoff summary');
  assert.ok(Buffer.byteLength(JSON.stringify(jsonState.handoffs['0']), 'utf8') <= 8192);
  const finishLines = fs.readFileSync(path.join(idempRoot, '.agents/plans/idemp/telemetry.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse).filter((row) => row.type === 'finish');
  assert.strictEqual(finishLines.length, 1, 'idempotent finish does not duplicate finish telemetry');
  const finishLine = finishLines[0];
  assert.equal(typeof finishLine.handoffBytes, 'number');
  assert.strictEqual(finishLine.pruneAfterStep, true);

  const third = run(update, [
    'finish', idempState, '--step', '0', '--timestamp', '2026-08-21T20:00:06.000Z',
    '--step-output', JSON.stringify({ summary: 'Updated subagent summary' }),
    '--gate-decision', gate, ...idempCommon,
  ], noPython);
  assert.strictEqual(third.status, 0, third.stderr);
  const updatedState = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(updatedState.handoffs['0'].summary, 'Updated subagent summary', 'non-identical replay updates handoff summary');
  const finishLinesAfterThird = fs.readFileSync(path.join(idempRoot, '.agents/plans/idemp/telemetry.jsonl'), 'utf8')
    .trim().split('\n').map(JSON.parse).filter((row) => row.type === 'finish');
  assert.strictEqual(finishLinesAfterThird.length, 1, 'repeat finish on same dispatch does not duplicate finish telemetry');
}

// Issue #302: subagent step-output discovery, filesTouched fallback, and runtime allowlist
{
  const testRoot = temp('ws-step-output-discovery-');
  const slug = 'outdisc';
  const workflowId = 'wf-outdisc';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(testRoot, '.agents/plans', slug);
  fs.mkdirSync(path.join(testRoot, '.agents/skills/ws-shared/runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(testRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  write(path.join(testRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    specs: { dir: '.agents/specs' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(testRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
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
  const jsonlRel = `.agents/plans/${slug}/telemetry.jsonl`;
  const common = ['--repo-root', testRoot, '--jsonl-out', jsonlRel];

  // 1. Dispatch Step 0
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '0', '--timestamp', '2026-09-09T20:00:00.000Z', ...common]).status, 0);

  // Write a step output file to .runtime/step-00-output.json (simulating subagent write)
  const runtimeDir = path.join(usDir, '.runtime');
  fs.mkdirSync(runtimeDir, { recursive: true });
  write(path.join(runtimeDir, 'step-00-output.json'), JSON.stringify({
    status: 'completed',
    files_touched: {
      created: [`.agents/specs/${slug}.spec.md`, `.agents/plans/${slug}/step-00-${slug}.spec.md`],
      modified: [],
      deleted: [],
    },
    notes: 'Spec written successfully',
    next_step_ready: true,
  }));
  // Also create the spec files on disk
  write(path.join(testRoot, `.agents/specs/${slug}.spec.md`), '# Spec');
  write(path.join(usDir, `step-00-${slug}.spec.md`), '---\nstep: 0\nslug: outdisc\nworkflowId: wf-outdisc\nstatus: completed\nstartedAt: 2026-09-09T20:00:00.000Z\nendedAt: 2026-09-09T20:00:05.000Z\nacRefs: []\n---\n# Step 0');

  // Finish Step 0 WITHOUT --step-output (should auto-discover from .runtime/step-00-output.json)
  const finishRes = run(update, ['finish', stateRel, '--step', '0', '--timestamp', '2026-09-09T20:00:05.000Z', ...common]);
  assert.strictEqual(finishRes.status, 0, finishRes.stderr);

  // Validate telemetry has the files_touched from the disk output
  const events = fs.readFileSync(path.join(testRoot, jsonlRel), 'utf8').trim().split('\n').map(JSON.parse);
  const finishEvent = events.find((e) => e.type === 'finish' && e.step === 0);
  assert.ok(finishEvent, 'finish event emitted');
  assert.deepStrictEqual(finishEvent.filesTouched.created, [
    `.agents/specs/${slug}.spec.md`,
    `.agents/plans/${slug}/step-00-${slug}.spec.md`,
  ], 'filesTouched populated from discovered .runtime/step-00-output.json');

  // Verify .runtime/step-00-output.json passes validate_state without runtime residue error
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({ acceptanceCriteria: [] }));
  const valRes = run(validate, [stateRel, '--pre-advance', '1', '--repo-root', testRoot]);
  assert.strictEqual(valRes.status, 0, `validate_state accepts step-output in .runtime: ${valRes.stderr}`);

  // Test 2: Fallback to stamped step artifacts when neither CLI nor disk step-output has files_touched
  const testRoot2 = temp('ws-artifact-fallback-');
  const slug2 = 'artfb';
  const workflowId2 = 'wf-artfb';
  const stateRel2 = `.agents/plans/${slug2}/wf.state.md`;
  const usDir2 = path.join(testRoot2, '.agents/plans', slug2);
  fs.mkdirSync(path.join(testRoot2, '.agents/skills/ws-shared/runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(testRoot2, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  write(path.join(testRoot2, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    specs: { dir: '.agents/specs' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(testRoot2, stateRel2), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId2}
slug: ${slug2}
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
  const jsonlRel2 = `.agents/plans/${slug2}/telemetry.jsonl`;
  const common2 = ['--repo-root', testRoot2, '--jsonl-out', jsonlRel2];

  // Dispatch Step 0
  assert.strictEqual(run(update, ['dispatch', stateRel2, '--step', '0', '--timestamp', '2026-09-09T20:00:00.000Z', ...common2]).status, 0);

  // Create step 0 artifacts on disk
  write(path.join(testRoot2, `.agents/specs/${slug2}.spec.md`), '# Spec');
  write(path.join(usDir2, `step-00-${slug2}.spec.md`), '---\nstep: 0\nslug: artfb\nworkflowId: wf-artfb\nstatus: completed\nstartedAt: 2026-09-09T20:00:00.000Z\nendedAt: 2026-09-09T20:00:05.000Z\nacRefs: []\n---\n# Step 0');

  // Finish Step 0 with NO step-output passed and NO .runtime file
  const finishRes2 = run(update, ['finish', stateRel2, '--step', '0', '--timestamp', '2026-09-09T20:00:05.000Z', ...common2]);
  assert.strictEqual(finishRes2.status, 0, finishRes2.stderr);

  const events2 = fs.readFileSync(path.join(testRoot2, jsonlRel2), 'utf8').trim().split('\n').map(JSON.parse);
  const finishEvent2 = events2.find((e) => e.type === 'finish' && e.step === 0);
  assert.ok(finishEvent2, 'finish event emitted');
  assert.ok(finishEvent2.filesTouched.created.includes(`.agents/plans/${slug2}/step-00-${slug2}.spec.md`), 'filesTouched falls back to stamped step artifact');
  assert.ok(finishEvent2.filesTouched.created.includes(`.agents/specs/${slug2}.spec.md`), 'filesTouched includes created spec');
}

// AC6 / NS1 — autoMode + standard + Step 0 only → pre-advance 4 fails (no plan → no code)
{
  const pa4Root = temp('ws-state-pa4-missing-');
  const slug = 'pa4miss';
  const workflowId = 'wf-pa4miss';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(pa4Root, '.agents/plans', slug);
  write(path.join(pa4Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(pa4Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
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
  write(path.join(usDir, `step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: Missing plan guard
source: local
specDate: 2026-09-03
step: 0
workflowId: ${workflowId}
---
## Description
Dogfood: plan must exist before product-path edits outside {plansDir}.
## Acceptance Criteria
- AC1: Guard blocks implement without step-01.
`);
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    workflowId,
    slug,
    specPath: `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    planIndexPath: null,
    declaredGaps: [],
    aliasResults: [],
    testingSkip: null,
    acceptanceCriteria: [{ id: 'AC1', text: 'Guard blocks implement without step-01.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
    scoreState: null,
  }));
  const fail = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', pa4Root]);
  assert.notStrictEqual(fail.status, 0, 'pre-advance 4 rejects Step 0-only autoMode standard workflow');
  const err = `${fail.stdout}${fail.stderr}`;
  assert.match(err, /step-01.*\.plan\.md/, 'pre-advance 4 stderr names missing step-01 plan');
  assert.match(err, /plan\.index\.json/, 'pre-advance 4 stderr names missing plan.index.json');
  assert.match(err, /HS-5/, 'pre-advance 4 stderr includes HS-5 token');
}

// PR 276 — Step 2 completed, Step 3 dag-disabled, no refined plan → pre-advance 4 fails
{
  const pa4Root = temp('ws-state-pa4-norefined-');
  const slug = 'pa4noref';
  const workflowId = 'wf-pa4noref';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(pa4Root, '.agents/plans', slug);
  write(path.join(pa4Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(pa4Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 3
completedSteps: [0, 1, 2]
skippedSteps: [{step: 3, reason: dag-disabled}]
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  write(path.join(usDir, `step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: Missing refined plan
source: local
specDate: 2026-09-03
step: 0
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
## Description
Interview completed requires refined plan before implement.
## Acceptance Criteria
- AC1: Guard names missing refined plan.
`);
  write(path.join(usDir, `step-01-${slug}.plan.md`), `---
step: 1
slug: ${slug}
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Plan

## Work

T00 implements AC1 in \`src/noref.js\` with V1:noref-test.
`);
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    workflowId,
    slug,
    specPath: `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    planIndexPath: null,
    declaredGaps: [],
    aliasResults: [],
    testingSkip: null,
    acceptanceCriteria: [{ id: 'AC1', text: 'Guard names missing refined plan.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
    scoreState: null,
  }));
  assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs'), [
    'build', '--plan', `.agents/plans/${slug}/step-01-${slug}.plan.md`, '--spec', `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    '--output', `.agents/plans/${slug}/plan.index.json`, '--repo-root', pa4Root,
  ]).status, 0);
  assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_sequential_dag.cjs'), [
    '--slug', slug, '--workflow-id', workflowId, '--plan', `.agents/plans/${slug}/step-01-${slug}.plan.md`,
    '--exec-out', `.agents/plans/${slug}/step-03-${slug}.plan.exec.md`,
    '--dag-out', `.agents/plans/${slug}/step-03-${slug}.exec.dag.json`,
    '--timestamp', '2026-08-21T20:00:10.000Z', '--repo-root', pa4Root,
  ]).status, 0);
  const failRefined = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', pa4Root]);
  assert.notStrictEqual(failRefined.status, 0, 'pre-advance 4 rejects completed Step 2 without refined plan');
  assert.match(`${failRefined.stdout}${failRefined.stderr}`, /step-02-.*\.plan\.refined\.md/, 'pre-advance 4 stderr names missing refined plan');
}

// PR 276 — skipped Step 1 is not enough for --pre-advance 4
{
  const pa4Root = temp('ws-state-pa4-skip1-');
  const slug = 'pa4skip1';
  const workflowId = 'wf-pa4skip1';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(pa4Root, '.agents/plans', slug);
  write(path.join(pa4Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(pa4Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 1
completedSteps: [0]
skippedSteps: [{step: 1, reason: dag-disabled}]
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  write(path.join(usDir, `step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: Skip step 1 blocked
source: local
specDate: 2026-09-03
step: 0
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
## Description
Step 1 skip cannot waive plan-of-record.
## Acceptance Criteria
- AC1: Guard requires completed Step 1.
`);
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    workflowId,
    slug,
    specPath: `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    planIndexPath: null,
    declaredGaps: [],
    aliasResults: [],
    testingSkip: null,
    acceptanceCriteria: [{ id: 'AC1', text: 'Guard requires completed Step 1.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
    scoreState: null,
  }));
  const failSkip1 = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', pa4Root]);
  assert.notStrictEqual(failSkip1.status, 0, 'pre-advance 4 rejects skipped Step 1');
  assert.match(`${failSkip1.stdout}${failSkip1.stderr}`, /step 1 must be completed before implement/);
}

function seedPa4PlanningFiles(pa4Root, slug, workflowId, opts = {}) {
  const usDir = path.join(pa4Root, '.agents/plans', slug);
  write(path.join(pa4Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {},
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  write(path.join(usDir, `step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: ${opts.title || 'pa4'}
source: local
specDate: 2026-09-03
step: 0
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
## Description
${opts.title || 'pa4'}
## Acceptance Criteria
- AC1: Guard.
`);
  write(path.join(usDir, `step-01-${slug}.plan.md`), `---
step: 1
slug: ${slug}
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Plan

## Work

T00 implements AC1 in \`src/${slug}.js\` with V1:${slug}.
`);
  write(path.join(usDir, 'ac-ledger.json'), JSON.stringify({
    schemaVersion: 1,
    revision: 1,
    workflowId,
    slug,
    specPath: `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    planIndexPath: null,
    declaredGaps: [],
    aliasResults: [],
    testingSkip: null,
    acceptanceCriteria: [{ id: 'AC1', text: 'Guard.', status: 'Pending', evidence: [], tasks: [], planSections: [], files: [], commits: [], tests: [], verdicts: [], findings: [], sabotage: { required: false, status: 'not-required', exitCode: null }, linkEventIds: [] }],
    scoreState: null,
  }));
  if (opts.refined) {
    write(path.join(usDir, `step-02-${slug}.plan-interview.md`), `---
step: 2
slug: ${slug}
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Interview registry
`);
    write(path.join(usDir, `step-02-${slug}.plan.refined.md`), `---
step: 2
slug: ${slug}
workflowId: ${workflowId}
status: completed
startedAt: 2026-08-21T20:00:00.000Z
endedAt: 2026-08-21T20:00:05.000Z
acRefs: [AC1]
---
# Refined plan

## Work

T00 implements AC1 in \`src/${slug}.js\` with V1:${slug}.
`);
  }
  const planRel = opts.refined
    ? `.agents/plans/${slug}/step-02-${slug}.plan.refined.md`
    : `.agents/plans/${slug}/step-01-${slug}.plan.md`;
  assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/plan_index.cjs'), [
    'build', '--plan', planRel, '--spec', `.agents/plans/${slug}/step-00-${slug}.spec.md`,
    '--output', `.agents/plans/${slug}/plan.index.json`, '--repo-root', pa4Root,
  ]).status, 0);
  assert.strictEqual(run(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/write_sequential_dag.cjs'), [
    '--slug', slug, '--workflow-id', workflowId, '--plan', planRel,
    '--exec-out', `.agents/plans/${slug}/step-03-${slug}.plan.exec.md`,
    '--dag-out', `.agents/plans/${slug}/step-03-${slug}.exec.dag.json`,
    '--timestamp', '2026-08-21T20:00:10.000Z', '--repo-root', pa4Root,
  ]).status, 0);
}

// PR 276 r2 — Step 1 done, Step 2 neither completed nor skipped, Step 3 dag-disabled
{
  const pa4Root = temp('ws-state-pa4-skip2-');
  const slug = 'pa4skip2';
  const workflowId = 'wf-pa4skip2';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  seedPa4PlanningFiles(pa4Root, slug, workflowId, { title: 'Step 2 incomplete' });
  write(path.join(pa4Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 1
completedSteps: [0, 1]
skippedSteps: [{step: 3, reason: dag-disabled}]
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  const failSkip2 = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', pa4Root]);
  assert.notStrictEqual(failSkip2.status, 0, 'pre-advance 4 rejects incomplete Step 2');
  assert.match(`${failSkip2.stdout}${failSkip2.stderr}`, /step 2 must be completed or skipped with reason interview-not-required/);
}

// PR 276 r2 — Steps 1–2 done, Step 3 neither completed nor dag-disabled skip
{
  const pa4Root = temp('ws-state-pa4-nostep3-');
  const slug = 'pa4nostep3';
  const workflowId = 'wf-pa4nostep3';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  seedPa4PlanningFiles(pa4Root, slug, workflowId, { title: 'Step 3 incomplete', refined: true });
  write(path.join(pa4Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 2
completedSteps: [0, 1, 2]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  const failStep3 = run(validate, [stateRel, '--pre-advance', '4', '--repo-root', pa4Root]);
  assert.notStrictEqual(failStep3.status, 0, 'pre-advance 4 rejects incomplete Step 3');
  assert.match(`${failStep3.stdout}${failStep3.stderr}`, /step 3 must be completed or skipped with reason dag-disabled/);
}

// Step 2 completion requires the dedicated interview artifact and refined plan
{
  const interviewRoot = temp('ws-state-interview-artifact-');
  const slug = 'interview-artifact';
  const workflowId = 'wf-interview-artifact';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(interviewRoot, '.agents/plans', slug);
  write(path.join(interviewRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans' },
    defaults: {},
  }));
  write(path.join(interviewRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
status: active
currentStep: 2
completedSteps: [0, 1]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`);
  write(path.join(usDir, `step-02-${slug}.plan.refined.md`), '# Refined plan\n');
  const missingInterview = run(update, [
    'finish', stateRel, '--step', '2', '--timestamp', '2026-08-21T22:00:00.000Z',
    '--repo-root', interviewRoot,
  ]);
  assert.notStrictEqual(missingInterview.status, 0, 'Step 2 finish rejects a missing plan-interview artifact');
  assert.match(`${missingInterview.stdout}${missingInterview.stderr}`, /plan-interview\.md/);
  write(path.join(usDir, `step-02-${slug}.plan-interview.md`), '# Interview registry\n');
  const completeInterview = run(update, [
    'finish', stateRel, '--step', '2', '--timestamp', '2026-08-21T22:00:00.000Z',
    '--repo-root', interviewRoot,
  ]);
  assert.strictEqual(completeInterview.status, 0, completeInterview.stderr);
  for (const artifact of [
    `step-02-${slug}.plan-interview.md`,
    `step-02-${slug}.plan.refined.md`,
  ]) {
    assert.match(fs.readFileSync(path.join(usDir, artifact), 'utf8'), /^step: 2$/m, `${artifact} is stamped`);
  }
}

// Step 5 scoreAndRefine and Step 6 dispatch guard tests
{
  const guardRoot = temp('ws-state-guard-s5-');
  const slug = 'guards5';
  const workflowId = 'wf-guards5';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const common = ['--repo-root', guardRoot, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  write(path.join(guardRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'guard' },
    defaults: { minVerifyScore: 9 },
  }));
  write(path.join(guardRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 5
completedSteps: [0, 1, 2, 3, 4]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 1
verificationScore: 7
---
# State
`);

  // 1. Dispatching step 6 when Step 5 is not completed and score is 7/10 fails closed
  const failDispatch6 = run(update, ['dispatch', stateRel, '--step', '6', '--timestamp', '2026-08-21T21:00:00.000Z', ...common]);
  assert.notStrictEqual(failDispatch6.status, 0, 'dispatch step 6 fails when step 5 is not completed');
  assert.match(`${failDispatch6.stdout}${failDispatch6.stderr}`, /cannot dispatch step 6/);

  const failFinish5 = run(update, [
    'finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T21:00:30.000Z', ...common,
  ]);
  assert.notStrictEqual(failFinish5.status, 0, 'Step 5 cannot advance with a below-bar score');
  assert.match(`${failFinish5.stdout}${failFinish5.stderr}`, /scoreAndRefine/);

  // 2. Finishing scoreAndRefine substep keeps currentStep at 5 and stepStatus active
  const refineFinish = run(update, [
    'finish', stateRel, '--step', '5', '--substep', 'scoreAndRefine',
    '--timestamp', '2026-08-21T21:01:00.000Z', ...common,
  ]);
  assert.strictEqual(refineFinish.status, 0, refineFinish.stderr);
  const jsonPath = path.join(guardRoot, `.agents/plans/${slug}/wf.state.json`);
  const refinedState = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(refinedState.currentStep, 5, 'scoreAndRefine finish keeps currentStep at 5');
  assert.strictEqual(refinedState.stepStatus['5'], 'active', 'step 5 remains active during scoreAndRefine');
  assert.ok(!refinedState.completedSteps.includes(5), 'step 5 is not marked completed during scoreAndRefine');

  // 3. Dispatching step 4 without plan artifacts fails closed
  const failDispatch4 = run(update, ['dispatch', stateRel, '--step', '4', '--timestamp', '2026-08-21T21:02:00.000Z', ...common]);
  assert.notStrictEqual(failDispatch4.status, 0, 'dispatch step 4 fails when plan artifacts missing on disk');
  assert.match(`${failDispatch4.stdout}${failDispatch4.stderr}`, /plan artifact missing|plan\.index\.json is required/);
}

// Step 6 dispatch requires a passing Step 5 score even when Step 5 is completed
for (const [name, scoreLine, shouldPass] of [
  ['below-min', 'verificationScore: 7', false],
  ['undefined-score', '', false],
  ['passing', 'verificationScore: 9', true],
]) {
  const scoreRoot = temp(`ws-state-guard-s6-${name}-`);
  const scoreStateRel = '.agents/plans/guards6/wf.state.md';
  write(path.join(scoreRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'guard' },
    defaults: { minVerifyScore: 9 },
  }));
  write(path.join(scoreRoot, scoreStateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-guards6
slug: guards6
workflowType: standard
autoMode: true
status: active
currentStep: 5
completedSteps: [0, 1, 2, 3, 4, 5]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 1
${scoreLine}
---
# State
`);
  const scoreCommon = ['--repo-root', scoreRoot, '--jsonl-out', '.agents/plans/guards6/telemetry.jsonl'];
  const dispatch6 = run(update, ['dispatch', scoreStateRel, '--step', '6', '--timestamp', '2026-08-21T21:00:00.000Z', ...scoreCommon]);
  if (shouldPass) {
    assert.strictEqual(dispatch6.status, 0, `dispatch step 6 succeeds with passing score (${name})`);
  } else {
    assert.notStrictEqual(dispatch6.status, 0, `dispatch step 6 fails closed (${name})`);
    assert.match(`${dispatch6.stdout}${dispatch6.stderr}`, /cannot dispatch step 6/);
  }
}

// Issue #301: Step 5 finish auto-derives verificationScore from ac-ledger.json when omitted
{
  const s5Root = temp('ws-state-s5-derive-');
  const slug = 's5derive';
  const workflowId = 'wf-s5derive';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(s5Root, '.agents/plans', slug);
  const common = ['--repo-root', s5Root, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  write(path.join(s5Root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'derive' },
    plans: { dir: '.agents/plans' },
    defaults: { minVerifyScore: 9 },
  }));
  function setupS5State(initialScoreLine = '') {
    write(path.join(s5Root, stateRel), `---
stateVersion: 3
revision: 0
workflowId: ${workflowId}
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 5
completedSteps: [0, 1, 2, 3, 4]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 1
${initialScoreLine}
---
# State
`);
  }

  // 1. Without ac-ledger.json and without --verification-score: finish fails with score (missing)
  setupS5State('');
  const failNoLedger = run(update, ['finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T21:00:00.000Z', ...common]);
  assert.notStrictEqual(failNoLedger.status, 0, 'finish step 5 without score or ledger is rejected');
  assert.match(`${failNoLedger.stdout}${failNoLedger.stderr}`, /score \(missing\) is below minVerifyScore \(9\)/);

  // Set up ac-ledger.json in usDir with a score of 9
  write(path.join(s5Root, 'feature.spec.md'), '## Acceptance Criteria\n- AC1: First behavior.\n');
  write(path.join(s5Root, 'impl.js'), 'export const val = 1;\n');
  write(path.join(s5Root, 'feature.test.js'), 'test("first behavior", () => {});\n');
  write(path.join(usDir, 'plan.index.json'), JSON.stringify({
    acceptanceCriteria: [{ id: 'AC1', taskIds: ['T1'], planSectionIds: ['S1'], expectedTestNames: ['first behavior'] }],
  }));
  const ledgerRel = `.agents/plans/${slug}/ac-ledger.json`;
  assert.strictEqual(run(ledgerScript, ['init', '--spec', 'feature.spec.md', '--plan-index', `.agents/plans/${slug}/plan.index.json`, '--output', ledgerRel, '--workflow-id', workflowId, '--slug', slug, '--repo-root', s5Root]).status, 0);
  assert.strictEqual(run(ledgerScript, [
    'link', '--ledger', ledgerRel, '--event-id', 'link-ac1', '--ac', 'AC1',
    '--status', 'Implemented', '--file', 'impl.js:L1-L1',
    '--test', JSON.stringify({ name: 'first behavior', sourceFile: 'feature.test.js', phase: 'observed', exitCode: 0 }),
    '--repo-root', s5Root,
  ]).status, 0);

  // 2. Omitted --verification-score derives 10 from ac-ledger.json and completes step 5
  setupS5State('');
  const okDerive = run(update, ['finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T21:00:05.000Z', ...common]);
  assert.strictEqual(okDerive.status, 0, okDerive.stderr);
  const stateAfterDerive = JSON.parse(fs.readFileSync(path.join(s5Root, `.agents/plans/${slug}/wf.state.json`), 'utf8'));
  assert.strictEqual(stateAfterDerive.verificationScore, 10, 'auto-derived score 10 is persisted to state');
  assert.strictEqual(stateAfterDerive.currentStep, 6, 'step 5 finished, advanced to 6');
  assert.ok(stateAfterDerive.completedSteps.includes(5), 'step 5 recorded in completedSteps');

  // 3. Explicit matching --verification-score 10 succeeds
  setupS5State('');
  const okExplicit = run(update, ['finish', stateRel, '--step', '5', '--verification-score', '10', '--timestamp', '2026-08-21T21:00:10.000Z', ...common]);
  assert.strictEqual(okExplicit.status, 0, okExplicit.stderr);

  // 4. Mismatched explicit score fails with mismatch error
  setupS5State('');
  const failMismatch = run(update, ['finish', stateRel, '--step', '5', '--verification-score', '8', '--timestamp', '2026-08-21T21:00:15.000Z', ...common]);
  assert.notStrictEqual(failMismatch.status, 0, 'mismatched verification score is rejected');
  assert.match(`${failMismatch.stdout}${failMismatch.stderr}`, /verification score mismatch: supplied 8, derived 10/);

  // 5. Capped ledger (score 8 < minVerifyScore 9): auto-derivation fails closed with score (8)
  assert.strictEqual(run(ledgerScript, [
    'link', '--ledger', ledgerRel, '--event-id', 'defect', '--ac', 'AC1',
    '--finding', JSON.stringify({ id: 'CR-001', severity: 'Warning', state: 'open', round: 1, evidence: 'impl.js:L1-L1' }),
    '--sabotage-exit', '1',
    '--repo-root', s5Root,
  ]).status, 0);
  setupS5State('');
  const failLowScore = run(update, ['finish', stateRel, '--step', '5', '--timestamp', '2026-08-21T21:00:20.000Z', ...common]);
  assert.notStrictEqual(failLowScore.status, 0, 'below-bar derived score is rejected');
  assert.match(`${failLowScore.stdout}${failLowScore.stderr}`, /score \(8\) is below minVerifyScore \(9\)/);
}

// Step 4 dispatch guard applies to fresh states with no completed steps
{
  const emptyRoot = temp('ws-state-guard-s4empty-');
  const slug = 'guardempty';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  write(path.join(emptyRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'guard' },
    defaults: { minVerifyScore: 9 },
  }));
  write(path.join(emptyRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-guardempty
slug: ${slug}
workflowType: standard
autoMode: true
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
  const emptyCommon = ['--repo-root', emptyRoot, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  const failEmpty4 = run(update, ['dispatch', stateRel, '--step', '4', '--timestamp', '2026-08-21T21:00:00.000Z', ...emptyCommon]);
  assert.notStrictEqual(failEmpty4.status, 0, 'dispatch step 4 fails on a fresh state with no completed steps');
  assert.match(`${failEmpty4.stdout}${failEmpty4.stderr}`, /step 1 must be completed before implement/);
}

// Finishing a Fix-PR internal substep keeps Step 9 active instead of completing it
{
  const fixRoot = temp('ws-state-guard-fixpr-');
  const slug = 'guardfixpr';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  write(path.join(fixRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'guard' },
    defaults: { minVerifyScore: 9 },
  }));
  write(path.join(fixRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-guardfixpr
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 9
completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8]
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 1
verificationScore: 9
---
# State
`);
  const fixCommon = ['--repo-root', fixRoot, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  const planFinish = run(update, [
    'finish', stateRel, '--step', '9', '--substep', 'fixPrPlan',
    '--timestamp', '2026-08-21T21:00:00.000Z', ...fixCommon,
  ]);
  assert.strictEqual(planFinish.status, 0, planFinish.stderr);
  const fixState = JSON.parse(fs.readFileSync(path.join(fixRoot, `.agents/plans/${slug}/wf.state.json`), 'utf8'));
  assert.strictEqual(fixState.currentStep, 9, 'fixPrPlan finish keeps currentStep at 9');
  assert.strictEqual(fixState.stepStatus['9'], 'active', 'step 9 remains active during fixPrPlan');
  assert.ok(!fixState.completedSteps.includes(9), 'step 9 is not marked completed during fixPrPlan');
}

// Dispatching step 4 with corrupt or empty plan artifacts fails closed
{
  const corruptRoot = temp('ws-state-guard-s4corrupt-');
  const slug = 'guardcorrupt';
  const stateRel = `.agents/plans/${slug}/wf.state.md`;
  const usDir = path.join(corruptRoot, '.agents/plans', slug);
  write(path.join(corruptRoot, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'guard' },
    defaults: { minVerifyScore: 9 },
  }));
  write(path.join(corruptRoot, stateRel), `---
stateVersion: 3
revision: 0
workflowId: wf-guardcorrupt
slug: ${slug}
workflowType: standard
autoMode: true
status: active
currentStep: 3
completedSteps: [0, 1]
skippedSteps: [{step: 2, reason: interview-not-required}, {step: 3, reason: dag-disabled}]
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 1
acImplemented: 0
---
# State
`);
  const corruptCommon = ['--repo-root', corruptRoot, '--jsonl-out', `.agents/plans/${slug}/telemetry.jsonl`];
  write(path.join(usDir, `step-01-${slug}.plan.md`), `---
step: 1
slug: ${slug}
workflowId: wf-guardcorrupt
status: completed
---
# Plan
`);
  write(path.join(usDir, 'plan.index.json'), '{invalid json');
  const failCorrupt = run(update, ['dispatch', stateRel, '--step', '4', '--timestamp', '2026-08-21T21:00:00.000Z', ...corruptCommon]);
  assert.notStrictEqual(failCorrupt.status, 0, 'dispatch step 4 fails when plan.index.json is corrupt');
  assert.match(`${failCorrupt.stdout}${failCorrupt.stderr}`, /plan\.index\.json is required/);
  write(path.join(usDir, `step-01-${slug}.plan.md`), '');
  write(path.join(usDir, 'plan.index.json'), JSON.stringify({ acceptanceCriteria: [] }));
  const failEmpty = run(update, ['dispatch', stateRel, '--step', '4', '--timestamp', '2026-08-21T21:01:00.000Z', ...corruptCommon]);
  assert.notStrictEqual(failEmpty.status, 0, 'dispatch step 4 fails when the plan file is empty');
  assert.match(`${failEmpty.stdout}${failEmpty.stderr}`, /plan artifact missing/);
}

console.log('test-workflow-state-contract: ok');
