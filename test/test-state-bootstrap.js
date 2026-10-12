import fs from 'fs';
import { createRequire } from 'module';
import utils from './harness-test-utils.cjs';

const require = createRequire(import.meta.url);
const { assert, path, repoRoot, temp, run, write } = utils;
const { sha256 } = require(path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const updateLite = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
const validate = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/validate_state.cjs');

// us-506: deterministic state bootstrap. Asserts the creation path, the index
// row refresh, and both fail-closed cases (existing state, missing input).
function makeRoot(prefix) {
  const root = temp(prefix);
  fs.mkdirSync(path.join(root, '.agents/skills/ws-shared/runtime'), { recursive: true });
  fs.copyFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
    path.join(root, '.agents/skills/ws-shared/runtime/skill-dependencies.json'),
  );
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
    verification: {},
    defaults: { dryRun: false },
    fable: { auditVerdictsBlockShip: 'refuted' },
  }));
  return root;
}

function writeSpec(root, slug) {
  write(path.join(root, `.agents/plans/${slug}/step-00-${slug}.spec.md`), `---
id: null
slug: ${slug}
title: ${slug}
source: local
specDate: 2026-10-12
---
## Description
${slug}.
`);
}

// AC1/AC2/AC3: bootstrap creates both files from run arguments + registered spec.
{
  const root = makeRoot('ws-state-bootstrap-');
  const slug = 'demo';
  const workflowId = 'wf-demo';
  const stateRel = `.agents/plans/${slug}/${workflowId}.state.md`;
  writeSpec(root, slug);
  const result = run(update, ['init', stateRel, '--slug', slug, '--workflow-id', workflowId, '--repo-root', root]);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const jsonPath = path.join(root, `.agents/plans/${slug}/${workflowId}.state.json`);
  const mdPath = path.join(root, stateRel);
  assert.ok(fs.existsSync(jsonPath), 'init writes .state.json');
  assert.ok(fs.existsSync(mdPath), 'init writes .state.md');
  const state = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(state.stateVersion, 3, 'AC3 stateVersion 3');
  assert.ok(Number.isInteger(state.revision), 'AC3 integer revision');
  assert.strictEqual(state.revision, 0, 'AC3 revision seed 0');
  assert.strictEqual(state.workflowId, workflowId, 'AC3 workflowId');
  assert.strictEqual(state.slug, slug, 'AC3 slug');
  assert.strictEqual(state.workflowType, 'standard', 'AC3 workflowType');
  assert.strictEqual(state.status, 'active', 'AC3 status active');
  assert.strictEqual(state.currentStep, 0, 'AC3 currentStep 0');
  assert.deepStrictEqual(state.completedSteps, [], 'AC3 empty completedSteps');
  assert.deepStrictEqual(state.skippedSteps, [], 'AC3 empty skippedSteps');

  // The markdown mirror carries the same identity fields.
  const mdText = fs.readFileSync(mdPath, 'utf8');
  assert.match(mdText, /^workflowId: wf-demo$/m, 'AC1 markdown mirror identity');
  assert.match(mdText, /^stateVersion: 3$/m, 'AC1 markdown mirror stateVersion');

  // AC4: the validator exits zero immediately after bootstrap.
  const validated = run(validate, [workflowId, '--repo-root', root]);
  assert.strictEqual(validated.status, 0, validated.stderr || validated.stdout);

  // AC5: the plans index row exists, matches the written state hash, and lists currentStep 0.
  const index = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/index.json'), 'utf8'));
  const row = index.workflows.find((item) => item.workflowId === workflowId);
  assert.ok(row, 'AC5 index row present');
  assert.strictEqual(row.stateSha256, sha256(fs.readFileSync(jsonPath, 'utf8')), 'AC5 index row hash matches state');
  assert.strictEqual(Number(row.currentStep), 0, 'AC5 index row currentStep 0');

  // AC6: a second bootstrap fails closed and leaves the state byte-identical.
  const before = fs.readFileSync(jsonPath, 'utf8');
  const second = run(update, ['init', stateRel, '--slug', slug, '--workflow-id', workflowId, '--repo-root', root]);
  assert.notStrictEqual(second.status, 0, 'AC6 second bootstrap exits non-zero');
  assert.match(second.stderr, /state already exists/, 'AC6 second bootstrap names the create-only guard');
  assert.strictEqual(fs.readFileSync(jsonPath, 'utf8'), before, 'AC6 existing state unmodified');

  // AC16: a normal Step 0 dispatch+finish after bootstrap yields numeric elapsedSec telemetry.
  const common = ['--repo-root', root];
  assert.strictEqual(run(update, ['dispatch', stateRel, '--step', '0', '--timestamp', '2026-10-12T20:00:00.000Z', ...common]).status, 0);
  assert.strictEqual(run(update, ['finish', stateRel, '--step', '0', '--timestamp', '2026-10-12T20:00:05.000Z', ...common]).status, 0);
  const telemetryFile = path.join(root, `.agents/plans/${slug}/telemetry.jsonl`);
  assert.ok(fs.existsSync(telemetryFile), 'AC16 telemetry.jsonl exists after Step 0 finish');
  const events = fs.readFileSync(telemetryFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const step0 = events.find((event) => event.type === 'finish' && Number(event.step) === 0);
  assert.ok(step0, 'AC16 Step 0 finish recorded');
  assert.strictEqual(typeof step0.elapsedSec, 'number', 'AC16 numeric elapsedSec');
}

// AC7: an unresolvable required input fails closed, naming it, with no partial state.
{
  const root = makeRoot('ws-state-bootstrap-missing-');
  const stateRel = '.agents/plans/nospec/wf.state.md';
  // Deliberately no step-00 spec registered.
  const result = run(update, ['init', stateRel, '--slug', 'nospec', '--workflow-id', 'wf', '--repo-root', root]);
  assert.notStrictEqual(result.status, 0, 'AC7 missing spec exits non-zero');
  assert.match(result.stderr, /step-00-nospec\.spec\.md/, 'AC7 error names the missing spec input');
  assert.ok(!fs.existsSync(path.join(root, '.agents/plans/nospec/wf.state.json')), 'AC7 no partial json');
  assert.ok(!fs.existsSync(path.join(root, stateRel)), 'AC7 no partial markdown');
}

// AC9: a state-mutating operation against an absent state names the bootstrap command.
{
  const root = makeRoot('ws-state-bootstrap-absent-');
  const stateRel = '.agents/plans/gone/wf.state.md';
  const result = run(update, ['finish', stateRel, '--step', '0', '--repo-root', root]);
  assert.notStrictEqual(result.status, 0, 'AC9 absent state exits non-zero');
  assert.match(result.stderr, /state file not found/, 'AC9 keeps the missing-state message');
  assert.match(result.stderr, /update_state\.cjs init/, 'AC9 names the bootstrap remediation');
}

// AC8: a standard pre-advance check with absent state is an HS-5 hard stop naming the path.
{
  const root = makeRoot('ws-state-bootstrap-hs5-');
  const stateRel = '.agents/plans/gone/wf.state.md';
  const result = run(validate, [stateRel, '--pre-advance', '1', '--repo-root', root]);
  assert.notStrictEqual(result.status, 0, 'AC8 absent-state pre-advance exits non-zero');
  assert.match(result.stderr, /state file not found/, 'AC8 names the missing state path');
  assert.match(result.stderr, /\.agents\/plans\/gone\/wf\.state\.md/, 'AC8 resolved state path');
  assert.match(result.stderr, /HS-5/, 'AC8 HS-5 hard stop');
}

// AC13: the lite wrapper accepts the bootstrap with workflowType lite.
{
  const root = makeRoot('ws-state-bootstrap-lite-');
  const slug = 'demo-lite';
  const stateRel = `.agents/plans/${slug}/wf-lite.state.md`;
  writeSpec(root, slug);
  const result = run(updateLite, ['init', stateRel, '--slug', slug, '--workflow-id', 'wf-lite', '--repo-root', root]);
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  const state = JSON.parse(fs.readFileSync(path.join(root, `.agents/plans/${slug}/wf-lite.state.json`), 'utf8'));
  assert.strictEqual(state.workflowType, 'lite', 'AC13 lite wrapper sets workflowType lite');
}

console.log('test-state-bootstrap: ok');
