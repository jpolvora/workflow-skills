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
assert(defaultsProps.stepModels?.properties?.fixPrPlan?.type === 'string', 'schema stepModels includes fixPrPlan');
assert(defaultsProps.stepModels?.properties?.fixPrExec?.type === 'string', 'schema stepModels includes fixPrExec');
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

const STEP_TEMPLATE_KEYS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'dag', 'scoreAndRefine', 'reviewFix', 'fixPrPlan', 'fixPrExec',
];
for (const name of ['default', 'cursor', 'deepseek', 'opencode', 'cheap']) {
  const steps = example.defaults.modelPresets?.[name]?.steps;
  assert(steps && typeof steps === 'object', `example ${name} preset includes steps template`);
  for (const key of STEP_TEMPLATE_KEYS) {
    assert(Object.prototype.hasOwnProperty.call(steps, key), `example ${name}.steps includes ${key}`);
  }
  assert(steps['4'] === '' && steps['5'] === '', `example ${name}.steps 4 and 5 stay empty for lite session`);
  const expectedRole = name === 'default' ? 'current' : '';
  assert(steps.fixPrPlan === expectedRole, `example ${name}.steps fixPrPlan uses ${expectedRole || 'empty'} template`);
  assert(steps.fixPrExec === expectedRole, `example ${name}.steps fixPrExec uses ${expectedRole || 'empty'} template`);
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
    { ...baseDefaults, stepModels: { fixPrPlan: 'plan-role-model' } },
    { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session },
  ) === 'plan-role-model',
  'fixPrPlan top-level role override wins',
);
assert(
  resolvePhaseModel(
    {
      modelsPreset: 'roles',
      modelPresets: {
        roles: {
          reviewerModel: 'preset-reviewer',
          executionModel: 'preset-execution',
          steps: { fixPrPlan: 'preset-plan', fixPrExec: 'preset-exec' },
        },
      },
      stepModels: {},
    },
    { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session },
  ) === 'preset-plan',
  'fixPrPlan preset role override wins before phase fallback',
);
assert(
  resolvePhaseModel(
    {
      modelsPreset: 'roles',
      modelPresets: { roles: { reviewerModel: 'preset-reviewer', executionModel: 'preset-execution', steps: {} } },
      stepModels: { 9: 'outer-step-nine' },
      reviewerModel: 'top-reviewer',
      executionModel: 'top-execution',
    },
    { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session },
  ) === 'top-reviewer',
  'fixPrPlan bypasses numeric 9 and falls back to reviewerModel',
);
assert(
  resolvePhaseModel(
    {
      modelsPreset: 'roles',
      modelPresets: { roles: { reviewerModel: 'preset-reviewer', executionModel: 'preset-execution', steps: {} } },
      stepModels: { 9: 'outer-step-nine' },
    },
    { step: 9, role: 'fixPrExec', pipeline: 'standard', sessionModel: session },
  ) === 'preset-execution',
  'fixPrExec bypasses numeric 9 and falls back to preset executionModel',
);
assert(
  resolvePhaseModel(
    {
      modelsPreset: 'roles',
      modelPresets: { roles: { reviewerModel: 'current', executionModel: '', steps: {} } },
      stepModels: {},
    },
    { step: 9, role: 'fixPrPlan', pipeline: 'standard', sessionModel: session },
  ) === session,
  'fixPrPlan current token resolves captured session',
);
assert(
  resolvePhaseModel(
    { modelsPreset: 'roles', modelPresets: { roles: { steps: {} } }, stepModels: { 9: 'outer-step-nine' } },
    { step: 9, role: 'fixPrExec', pipeline: 'standard', sessionModel: session },
  ) === session,
  'fixPrExec empty chain falls back to session without numeric 9',
);
assert(
  resolvePhaseModel(
    { stepModels: { 9: 'outer-step-nine' } },
    { step: 9, role: 'unknown-role', pipeline: 'standard', sessionModel: session },
  ) === 'outer-step-nine',
  'unknown substep is non-throwing and does not become an internal role',
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
  stepModels: {
    2: 'lite-step-2',
    dag: 'ignored-dag',
    reviewFix: 'ignored-fix',
    fixPrPlan: 'ignored-plan',
    fixPrExec: 'ignored-exec',
  },
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
assert(
  resolvePhaseModel(liteDefaults, { step: 5, role: 'fixPrPlan', pipeline: 'lite', sessionModel: session }) ===
    session,
  'lite ignores fixPrPlan role',
);
assert(
  resolvePhaseModel(liteDefaults, { step: 5, role: 'fixPrExec', pipeline: 'lite', sessionModel: session }) ===
    session,
  'lite ignores fixPrExec role',
);

const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(dispatch.includes('modelsPreset'), 'STEP-DISPATCH documents modelsPreset');
assert(dispatch.includes('scoreAndRefine'), 'STEP-DISPATCH documents scoreAndRefine role');
assert(dispatch.includes('fixPrPlan') && dispatch.includes('fixPrExec'), 'STEP-DISPATCH documents Fix-PR roles');
assert(/never consult numeric[^\n]*9/i.test(dispatch), 'STEP-DISPATCH reserves numeric Step 9 for outer skill');
assert(dispatch.includes('enableDag: false'), 'STEP-DISPATCH mentions sequential step 4');

const tools = read('.agents/skills/ws-shared/tools.md');
assert(tools.includes('stepModels[role|N]'), 'tools.md documents resolve order');
assert(
  tools.includes('fixPrPlan') && tools.includes('fixPrExec') && /rejected|unsupported/i.test(tools),
  'tools.md documents Fix-PR roles and unsupported-model fallback',
);

const liteSkill = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(liteSkill.includes('reviewFix'), 'lite SKILL documents reviewFix ignore');
assert(
  liteSkill.includes('fixPrPlan') && liteSkill.includes('fixPrExec') && /plan.*before.*edit/i.test(liteSkill),
  'lite SKILL ignores Fix-PR model switches but keeps plan-before-edit',
);

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
fs.mkdirSync(path.join(tempRoot, '.agents/plans'), { recursive: true });
fs.writeFileSync(
  path.join(tempRoot, '.agents/plans/index.json'),
  JSON.stringify({ schemaVersion: 1, workflows: [] }),
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
assert(dispatchRun.status === 0, 'temp consumer plans index starts empty and accepts dispatch');
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

const fixState = path.join(tempStateDir, 'fix-pr.state.md');
const fixJsonl = path.join(tempStateDir, 'telemetry/step-09.jsonl');
fs.writeFileSync(
  fixState,
  `---
workflowId: wf-fix-pr
slug: slug
status: active
currentStep: 9
currentModel: captured-session
revision: 0
completedSteps: []
---
`,
);
for (const [substep, model] of [
  ['fixPrPlan', 'actual-plan-model'],
  ['fixPrExec', 'actual-exec-model'],
]) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
      'dispatch',
      fixState,
      '--step',
      '9',
      '--substep',
      substep,
      '--model',
      model,
      '--jsonl-out',
      path.relative(tempRoot, fixJsonl),
      '--repo-root',
      tempRoot,
    ],
    { encoding: 'utf8' },
  );
  assert(result.status === 0, `${substep} dispatch exits 0: ${result.stderr}`);
}
const fixDispatchEvents = fs.readFileSync(fixJsonl, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
assert(
  fixDispatchEvents.map((event) => event.substep).join(',') === 'fixPrPlan,fixPrExec',
  'Step 9 JSONL retains ordered Fix-PR substeps',
);
assert(
  fixDispatchEvents.map((event) => event.model).join(',') === 'actual-plan-model,actual-exec-model',
  'Step 9 JSONL records actual Fix-PR role models',
);
let fixStateText = fs.readFileSync(fixState, 'utf8');
assert(
  !/completedSteps:\s*(?:\[[^\]]*\b9\b|(?:\r?\n\s+-\s+\d+\s*)*\r?\n\s+-\s+9\b)/.test(fixStateText),
  'internal Fix-PR dispatches do not complete Step 9',
);
assert(/substep: fixPrExec/.test(fixStateText), 'compact Step 9 dispatch state keeps latest internal role');

const outerFinish = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'finish',
    fixState,
    '--step',
    '9',
    '--model',
    'outer-step-nine-model',
    '--jsonl-out',
    path.relative(tempRoot, fixJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(outerFinish.status === 0, `outer Step 9 finish exits 0: ${outerFinish.stderr}`);
fixStateText = fs.readFileSync(fixState, 'utf8');
assert(
  /completedSteps:\s*(?:\[[^\]]*\b9\b|(?:\r?\n\s+-\s+\d+\s*)*\r?\n\s+-\s+9\b)/.test(fixStateText),
  'outer finish completes Step 9 once after internal roles',
);

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-models-preset-and-per-step: ok');
