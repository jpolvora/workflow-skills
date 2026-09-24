/**
 * test-run-state-integrity.js — Run-state and telemetry integrity pins
 * (us-414-run-state-integrity: AC1 fail-closed preset, AC2 resolved model ids,
 * AC3 ship writeback, AC4 round-artifact-or-reason, AC5 truthful skip reasons).
 *
 * Run: node test/test-run-state-integrity.js
 */

import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const UPDATE_STATE = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const CHECK_ROUNDS = path.join(REPO, '.agents/skills/ws-goal-fix-pr/scripts/check_fixpr_rounds.cjs');
const { resolvePhaseModel } = require(path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs'));

let failures = 0;

function assert(cond, msg) {
  if (cond) {
    console.log(`OK ${msg}`);
  } else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function runUpdate(args, repoRoot) {
  return spawnSync(process.execPath, [UPDATE_STATE, ...args, '--repo-root', repoRoot], { encoding: 'utf8' });
}

function makeRoot(configDefaults) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-414-test-'));
  const sharedDir = path.join(root, '.ws');
  const usDir = path.join(root, '.agents/plans/slug');
  fs.mkdirSync(sharedDir, { recursive: true });
  fs.mkdirSync(usDir, { recursive: true });
  fs.writeFileSync(
    path.join(sharedDir, 'config.json'),
    JSON.stringify({
      project: { name: 'run-state-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      defaults: configDefaults,
    }, null, 2),
  );
  return { root, usDir };
}

function writeState(usDir, overrides = {}) {
  const stateFile = path.join(usDir, 'wf-414.state.md');
  const base = {
    workflowId: 'wf-414',
    slug: 'slug',
    status: 'active',
    currentStep: 0,
    currentModel: 'session-model',
    revision: 0,
    completedSteps: [],
    stepStatus: {},
    ...overrides,
  };
  const lines = ['---', ...Object.entries(base).map(([k, v]) => `${k}: ${JSON.stringify(v)}`), '---', '# State', ''];
  fs.writeFileSync(stateFile, lines.join('\n'));
  return stateFile;
}

const PRESETS = {
  default: { plannerModel: 'default-planner', executionModel: 'default-exec', reviewerModel: 'default-rev', testingModel: 'default-test' },
  cursor: { plannerModel: 'cursor-planner', executionModel: 'cursor-exec', reviewerModel: 'cursor-rev', testingModel: 'cursor-test' },
};

// AC1/NEG1: unknown configured modelsPreset fails at run start, naming the preset and the available presets.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'no-such-preset', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const before = fs.readFileSync(stateFile, 'utf8');
  const res = runUpdate(['dispatch', stateFile, '--step', '0'], root);
  assert(res.status !== 0, 'AC1: dispatch with unknown modelsPreset fails closed');
  assert(/no-such-preset/.test(res.stderr), 'AC1: error names the unknown preset');
  assert(/cursor/.test(res.stderr) && /default/.test(res.stderr), 'AC1: error names the available presets');
  assert(fs.readFileSync(stateFile, 'utf8') === before, 'AC1: failed dispatch leaves state unmutated');
}

// AC1: unknown --preset override fails closed instead of being silently dropped.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const res = runUpdate(['dispatch', stateFile, '--step', '0', '--preset', 'bogus-preset'], root);
  assert(res.status !== 0, 'AC1: dispatch with unknown --preset fails closed');
  assert(/bogus-preset/.test(res.stderr), 'AC1: --preset error names the unknown preset');
}

// AC1: known preset still dispatches (no regression).
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const res = runUpdate(['dispatch', stateFile, '--step', '0'], root);
  assert(res.status === 0, `AC1: dispatch with known preset succeeds: ${res.stderr}`);
}

// AC1: resolvePhaseModel never silently resolves an unknown preset to another preset's model.
{
  const model = resolvePhaseModel(
    { modelsPreset: 'bogus', modelPresets: PRESETS },
    { step: 0, pipeline: 'standard', sessionModel: 'sess' },
  );
  assert(model !== 'default-planner' && model !== 'cursor-planner', `AC1: unknown preset does not fall through to another preset model (got ${model})`);
}

// AC2: dispatch --model carrying a preset name records the resolved id.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const res = runUpdate(['dispatch', stateFile, '--step', '0', '--model', 'cursor'], root);
  assert(res.status === 0, `AC2: preset-name dispatch succeeds: ${res.stderr}`);
  const stateJson = JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
  const d0 = stateJson.stepDispatches.find((d) => Number(d.step) === 0);
  assert(d0 && d0.model === 'cursor-planner', `AC2: dispatch records resolved id not preset name (got ${d0 && d0.model})`);
}

// AC2: finish --model carrying a preset name records the resolved id.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir, {
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'completed' },
  });
  fs.writeFileSync(path.join(usDir, 'step-00-slug.spec.md'), '# Spec\n');
  fs.writeFileSync(path.join(usDir, 'step-01-slug.plan.md'), '# Plan\n');
  fs.writeFileSync(path.join(usDir, 'step-02-slug.plan-interview.md'), '# Interview\n');
  fs.writeFileSync(path.join(usDir, 'step-02-slug.plan.refined.md'), '# Refined\n');
  fs.writeFileSync(path.join(usDir, 'plan.index.json'), JSON.stringify({ schemaVersion: 1, slug: 'slug', tasks: [] }));
  const d = runUpdate(['dispatch', stateFile, '--step', '4'], root);
  assert(d.status === 0, `AC2: step 4 dispatch succeeds: ${d.stderr}`);
  const f = runUpdate(['finish', stateFile, '--step', '4', '--model', 'cursor', '--noop', 'model probe touches nothing'], root);
  assert(f.status === 0, `AC2: step 4 finish succeeds: ${f.stderr}`);
  const stateJson = JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
  const row = stateJson.telemetry.steps.find((s) => Number(s.N ?? s.step) === 4);
  assert(row && row.model === 'cursor-exec', `AC2: finish records resolved id not preset name (got ${row && row.model})`);
}

// AC3/NEG2: ship fields persist on finish; invalid shipStatus fails.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir, {
    currentStep: 8, completedSteps: [0, 1, 2, 3, 4, 5, 6, 7],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'completed', 4: 'completed', 5: 'completed', 6: 'completed', 7: 'completed', 8: 'active' },
  });
  const res = runUpdate(
    ['finish', stateFile, '--step', '8', '--ship-status', 'pr-open', '--pr-number', '421', '--pr-url', 'https://example.com/pr/421'],
    root,
  );
  assert(res.status === 0, `AC3: ship writeback finish succeeds: ${res.stderr}`);
  const stateJson = JSON.parse(fs.readFileSync(stateFile.replace(/\.state\.md$/, '.state.json'), 'utf8'));
  assert(stateJson.shipStatus === 'pr-open', `AC3: shipStatus persisted (got ${stateJson.shipStatus})`);
  assert(stateJson.prNumber === '421', `AC3: prNumber persisted (got ${stateJson.prNumber})`);
  assert(stateJson.prUrl === 'https://example.com/pr/421', `AC3: prUrl persisted (got ${stateJson.prUrl})`);
  const bad = runUpdate(['finish', stateFile, '--step', '8', '--ship-status', 'bogus'], root);
  assert(bad.status !== 0, 'AC3: invalid shipStatus fails closed');
}

// AC4/NEG3: round-artifact-or-reason rule.
assert(fs.existsSync(CHECK_ROUNDS), 'AC4: check_fixpr_rounds.cjs exists');
if (fs.existsSync(CHECK_ROUNDS)) {
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-414-rounds-empty-'));
  const emptyRes = spawnSync(process.execPath, [CHECK_ROUNDS, '--reviews-dir', emptyDir, '--pr', '7'], { encoding: 'utf8' });
  assert(emptyRes.status !== 0, 'AC4: empty reviews dir fails with no artifacts or reason');
  assert(/round artifact| clean-immediate /i.test(emptyRes.stderr), 'AC4: failure names the round-artifact-or-reason rule');

  const roundDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-414-rounds-full-'));
  fs.writeFileSync(path.join(roundDir, 'PR-7-round-1.md'), '# Round 1\n');
  const fullRes = spawnSync(process.execPath, [CHECK_ROUNDS, '--reviews-dir', roundDir, '--pr', '7'], { encoding: 'utf8' });
  assert(fullRes.status === 0, `AC4: present round artifact passes: ${fullRes.stderr}`);

  const markerDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-414-rounds-marker-'));
  fs.writeFileSync(
    path.join(markerDir, 'PR-7-round-0-clean-immediate.md'),
    '---\npr: 7\nround: 0\nexitBranch: clean-immediate\nreason: fresh read clean, activeThreads [] and checks green\n---\n# Clean immediate\n',
  );
  const markerRes = spawnSync(process.execPath, [CHECK_ROUNDS, '--reviews-dir', markerDir, '--pr', '7'], { encoding: 'utf8' });
  assert(markerRes.status === 0, `AC4: reasoned clean-immediate marker passes: ${markerRes.stderr}`);

  const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-414-rounds-bare-'));
  fs.writeFileSync(path.join(bareDir, 'PR-7-round-0-clean-immediate.md'), '# no frontmatter reason\n');
  const bareRes = spawnSync(process.execPath, [CHECK_ROUNDS, '--reviews-dir', bareDir, '--pr', '7'], { encoding: 'utf8' });
  assert(bareRes.status !== 0, 'AC4: reason-less marker fails');
}

// AC5: bare `dag` reason fails with the contradiction diagnostic.
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const res = runUpdate(['finish', stateFile, '--step', '3', '--status', 'skipped', '--reason', 'dag'], root);
  assert(res.status !== 0, 'AC5: bare dag skip reason fails closed');
  assert(/dag-disabled/.test(res.stderr), 'AC5: diagnostic names the truthful sequential reason');
  const ok = runUpdate(['finish', stateFile, '--step', '3', '--status', 'skipped', '--reason', 'dag-disabled'], root);
  assert(ok.status === 0, `AC5: dag-disabled still accepted: ${ok.stderr}`);
}

// AC5: bare `dag` on a dispatch reason fails closed (telemetry-event hole).
{
  const { root, usDir } = makeRoot({ modelsPreset: 'cursor', modelPresets: PRESETS });
  const stateFile = writeState(usDir);
  const res = runUpdate(['dispatch', stateFile, '--step', '0', '--reason', 'dag'], root);
  assert(res.status !== 0, 'AC5: bare dag dispatch reason fails closed');
}

if (failures) {
  console.error(`test-run-state-integrity: ${failures} failure(s)`);
  process.exit(1);
}
console.log('test-run-state-integrity: ok');
