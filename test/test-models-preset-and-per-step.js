/**
 * modelsPreset / modelPresets / stepModels resolver + docs surface (AC1–AC14).
 * Run: node test/test-models-preset-and-per-step.js
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
const SHARED = path.join(REPO, '.agents/skills/ws-shared');
const { resolvePhaseModel } = require(path.join(SHARED, 'scripts/workflow_state.cjs'));

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

const example = JSON.parse(fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8'));
const defaultsProps = schema.properties?.defaults?.properties || {};

assert(defaultsProps.modelsPreset?.type === 'string', 'schema defaults.modelsPreset is string');
assert(defaultsProps.modelPresets?.type === 'object', 'schema defaults.modelPresets is object');
assert(
  defaultsProps.modelPresets?.additionalProperties?.type === 'object',
  'schema modelPresets allows custom preset names',
);
assert(defaultsProps.stepModels?.type === 'object', 'schema defaults.stepModels is object');
assert(!schema.properties?.defaults?.required?.includes('modelsPreset'), 'schema does not require modelsPreset');

assert(example.defaults.modelsPreset === 'default', 'example sets modelsPreset default');
assert(example.defaults.modelPresets?.default?.plannerModel === 'current', 'default preset plannerModel is current');
assert(example.defaults.modelPresets?.default?.executionModel === 'current', 'default preset executionModel is current');
assert(example.defaults.modelPresets?.default?.reviewerModel === 'current', 'default preset reviewerModel is current');
assert(example.defaults.modelPresets?.default?.testingModel === 'current', 'default preset testingModel is current');
assert(example.defaults.modelPresets?.cursor?.executionModel, 'example includes cursor preset');
assert(example.defaults.modelPresets?.deepseek, 'example includes deepseek preset');
assert(example.defaults.modelPresets?.opencode, 'example includes opencode preset');
assert(example.defaults.modelPresets?.cheap, 'example includes cheap preset');
assert(Object.prototype.hasOwnProperty.call(example.defaults.stepModels, 'dag'), 'example stepModels includes dag');

const STEP_TEMPLATE_KEYS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'dag', 'scoreAndRefine', 'reviewFix'];
for (const name of ['default', 'cursor', 'deepseek', 'opencode', 'cheap']) {
  const steps = example.defaults.modelPresets?.[name]?.steps;
  assert(steps && typeof steps === 'object', `example ${name} preset includes steps template`);
  for (const key of STEP_TEMPLATE_KEYS) {
    assert(Object.prototype.hasOwnProperty.call(steps, key), `example ${name}.steps includes ${key}`);
  }
  assert(steps['4'] === '' && steps['5'] === '', `example ${name}.steps 4 and 5 stay empty for lite session`);
}

const session = 'session-model';
const baseDefaults = {
  modelsPreset: 'cursor',
  modelPresets: example.defaults.modelPresets,
  plannerModel: '',
  executionModel: '',
  reviewerModel: '',
  testingModel: '',
  stepModels: { ...example.defaults.stepModels },
};

assert(
  resolvePhaseModel(baseDefaults, { step: 0, pipeline: 'standard', sessionModel: session }) ===
    'cursor-grok-4.6-xhigh',
  'preset plannerModel for step 0',
);
assert(
  resolvePhaseModel(baseDefaults, { step: 4, pipeline: 'standard', sessionModel: session }) === 'composer-2.5',
  'preset executionModel for step 4 sequential',
);
assert(
  resolvePhaseModel(
    { ...baseDefaults, stepModels: { ...baseDefaults.stepModels, 5: 'override-step-5' } },
    { step: 5, pipeline: 'standard', sessionModel: session },
  ) === 'override-step-5',
  'stepModels numeric wins over preset phase',
);
assert(
  resolvePhaseModel(
    { ...baseDefaults, stepModels: { ...baseDefaults.stepModels, scoreAndRefine: 'refine-model' } },
    { step: 5, role: 'scoreAndRefine', pipeline: 'standard', sessionModel: session },
  ) === 'refine-model',
  'stepModels role scoreAndRefine wins',
);
assert(
  resolvePhaseModel(
    baseDefaults,
    { step: 5, role: 'scoreAndRefine', pipeline: 'standard', sessionModel: session },
  ) === 'composer-2.5',
  'role scoreAndRefine uses executionModel bucket when no override',
);
assert(
  resolvePhaseModel(
    { ...baseDefaults, modelsPreset: 'missing', modelPresets: { default: { plannerModel: 'current' } } },
    { step: 1, pipeline: 'standard', sessionModel: session },
  ) === session,
  'unknown preset falls back to default preset current token',
);
assert(
  resolvePhaseModel(
    {
      modelsPreset: 'cheap',
      modelPresets: { cheap: { testingModel: '', executionModel: 'exec-only' } },
      stepModels: {},
    },
    { step: 7, pipeline: 'standard', sessionModel: session },
  ) === 'exec-only',
  'step 7 testing chain skips empty testingModel to executionModel',
);
assert(
  resolvePhaseModel(
    { ...baseDefaults, stepModels: { ...baseDefaults.stepModels, 7: 'step7-override' } },
    { step: 7, pipeline: 'standard', sessionModel: session },
  ) === 'step7-override',
  'stepModels step 7 overrides before testing chain',
);

const liteDefaults = {
  ...baseDefaults,
  stepModels: { 2: 'lite-step-2', dag: 'ignored-dag', reviewFix: 'ignored-fix' },
  testingModel: 'should-not-apply',
};
assert(
  resolvePhaseModel(liteDefaults, { step: 2, pipeline: 'lite', sessionModel: session }) === 'lite-step-2',
  'lite applies stepModels 0-5',
);
assert(
  resolvePhaseModel(liteDefaults, { step: 3, pipeline: 'lite', sessionModel: session }) ===
    'cursor-grok-4.6-medium',
  'lite step 3 uses reviewerModel preset',
);
assert(
  resolvePhaseModel(liteDefaults, { step: 4, pipeline: 'lite', sessionModel: session }) === session,
  'lite steps 4-5 default to session',
);
assert(
  resolvePhaseModel(liteDefaults, { step: 5, role: 'reviewFix', pipeline: 'lite', sessionModel: session }) ===
    session,
  'lite ignores reviewFix role',
);

const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(dispatch.includes('modelsPreset'), 'STEP-DISPATCH documents modelsPreset');
assert(dispatch.includes('scoreAndRefine'), 'STEP-DISPATCH documents scoreAndRefine role');
assert(dispatch.includes('enableDag: false'), 'STEP-DISPATCH mentions sequential step 4');

const tools = read('.agents/skills/ws-shared/tools.md');
assert(tools.includes('stepModels[role|N]'), 'tools.md documents resolve order');

const liteSkill = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(liteSkill.includes('reviewFix'), 'lite SKILL documents reviewFix ignore');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-models-preset-'));
const tempShared = path.join(tempRoot, '.agents/skills/ws-shared');
fs.mkdirSync(tempShared, { recursive: true });
fs.writeFileSync(
  path.join(tempShared, 'config.json'),
  JSON.stringify({
    plans: { dir: '.agents/plans' },
    defaults: {
      modelsPreset: 'cheap',
      modelPresets: { cheap: { plannerModel: 'cheap-planner' } },
    },
  }),
);
const tempStateDir = path.join(tempRoot, '.agents/plans/slug');
fs.mkdirSync(tempStateDir, { recursive: true });
const stateFile = path.join(tempStateDir, 'wf.state.md');
fs.writeFileSync(
  stateFile,
  `---
workflowId: wf
slug: slug
status: active
currentStep: 0
currentModel: temp-session
revision: 0
---
`,
);
const dispatchRun = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    stateFile,
    '--step',
    '0',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(dispatchRun.status === 0, `temp consumer dispatch: ${dispatchRun.stderr}`);
const updated = fs.readFileSync(stateFile, 'utf8');
assert(/currentModel: cheap-planner/.test(updated), 'CJS --repo-root resolves preset from temp consumer hub');

const roleCfg = JSON.parse(fs.readFileSync(path.join(tempShared, 'config.json'), 'utf8'));
roleCfg.defaults.modelPresets.cheap.executionModel = 'sequential-exec';
roleCfg.defaults.modelPresets.cheap.steps = { dag: 'dag-worker' };
fs.writeFileSync(path.join(tempShared, 'config.json'), JSON.stringify(roleCfg));
const roleState = path.join(tempStateDir, 'role.state.md');
fs.writeFileSync(
  roleState,
  `---
workflowId: wf-role
slug: slug
status: active
currentStep: 4
currentModel: temp-session
revision: 0
---
`,
);
const dagDispatch = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    roleState,
    '--step',
    '4',
    '--substep',
    'dag',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(dagDispatch.status === 0, `dag dispatch: ${dagDispatch.stderr}`);
assert(/currentModel: dag-worker/.test(fs.readFileSync(roleState, 'utf8')), 'dispatch --substep dag records dag-worker');
assert(/substep: dag/.test(fs.readFileSync(roleState, 'utf8')), 'dispatch persists substep on stepDispatches');
const dagFinish = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'finish',
    roleState,
    '--step',
    '4',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(dagFinish.status === 0, `dag finish: ${dagFinish.stderr}`);
assert(/currentModel: dag-worker/.test(fs.readFileSync(roleState, 'utf8')), 'finish without --substep keeps persisted dag role');
assert(!/currentModel: sequential-exec/.test(fs.readFileSync(roleState, 'utf8')), 'finish does not fall back to step-4 execution bucket');

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-models-preset-and-per-step: ok');
