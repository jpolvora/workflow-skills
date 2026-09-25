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
const { resolvePhaseModel, resolveDispatchModel } = require(path.join(SHARED, 'runtime', 'scripts', 'workflow_state.cjs'));

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

const example = JSON.parse(fs.readFileSync(path.join(SHARED, 'templates', 'config.json.example'), 'utf8'));
const schema = JSON.parse(fs.readFileSync(path.join(SHARED, 'runtime', 'config.schema.json'), 'utf8'));
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

const stateSchema = JSON.parse(fs.readFileSync(path.join(SHARED, 'runtime', 'workflow-state.schema.json'), 'utf8'));
assert(stateSchema.properties?.modelsPreset?.type === 'string', 'workflow-state schema defines modelsPreset as string');

const telemetrySchema = JSON.parse(fs.readFileSync(path.join(SHARED, 'runtime', 'telemetry.schema.json'), 'utf8'));
assert(telemetrySchema.properties?.modelsPreset?.type === 'string', 'telemetry schema defines modelsPreset as string');
assert(telemetrySchema.properties?.presetWarning?.type === 'string', 'telemetry schema defines presetWarning as string');

assert(example.defaults.modelsPreset === 'cursor', 'example sets modelsPreset to cursor');
assert(
  example.defaults.modelPresets?.default?.plannerModel === 'current',
  'default preset plannerModel is current',
);
assert(
  example.defaults.modelPresets?.default?.executionModel === 'current',
  'default preset executionModel is current',
);
assert(
  example.defaults.modelPresets?.default?.reviewerModel === 'current',
  'default preset reviewerModel is current',
);
assert(
  example.defaults.modelPresets?.default?.testingModel === 'current',
  'default preset testingModel is current',
);
assert(
  example.defaults.modelPresets?.cursor?.plannerModel === 'cursor-grok-4.6-high',
  'cursor preset plannerModel is cursor-grok-4.6-high',
);
assert(
  example.defaults.modelPresets?.cursor?.executionModel === 'composer-2.5',
  'cursor preset executionModel is composer-2.5',
);
assert(
  example.defaults.modelPresets?.cursor?.reviewerModel === 'cursor-grok-4.6-medium',
  'cursor preset reviewerModel is cursor-grok-4.6-medium',
);
assert(
  example.defaults.modelPresets?.cursor?.testingModel === 'composer-2.5',
  'cursor preset testingModel is composer-2.5',
);
assert(example.defaults.modelPresets?.deepseek, 'example includes deepseek preset');
assert(example.defaults.modelPresets?.opencode, 'example includes opencode preset');
assert(example.defaults.modelPresets?.cheap, 'example includes cheap preset');
assert(example.defaults.modelPresets?.['muse-spark'], 'example includes muse-spark preset');
assert(Object.prototype.hasOwnProperty.call(example.defaults.stepModels, 'dag'), 'example stepModels includes dag');

const PHASE_KEYS = ['plannerModel', 'executionModel', 'reviewerModel', 'testingModel'];
for (const name of ['default', 'cursor', 'deepseek', 'opencode', 'cheap', 'muse-spark']) {
  const preset = example.defaults.modelPresets?.[name];
  assert(preset && typeof preset === 'object', `example ${name} preset exists`);
  for (const key of PHASE_KEYS) {
    assert(typeof preset[key] === 'string' && preset[key].length > 0, `example ${name}.${key} is set`);
  }
  assert(preset.steps === undefined, `example ${name} preset omits steps (lean phase-key bundle)`);
}
assert(
  Object.values(example.defaults.modelPresets.default).every((value) => value === 'current'),
  'example default preset is all current (session-only fallback)',
);

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
    'cursor-grok-4.6-high',
  'preset step 0 uses cursor-grok-4.6-high',
);
assert(
  resolvePhaseModel(baseDefaults, { step: 0, pipeline: 'standard', sessionModel: session, preset: 'deepseek' }) ===
    'opencode-go/deepseek-v4-pro',
  'preset option overrides baseDefaults.modelsPreset for step 0',
);
assert(
  resolvePhaseModel(baseDefaults, { step: 4, pipeline: 'standard', sessionModel: session, preset: 'cheap' }) ===
    'composer-2.5',
  'preset option overrides baseDefaults.modelsPreset for step 4',
);
assert(
  resolvePhaseModel(baseDefaults, { step: 0, pipeline: 'standard', sessionModel: session, preset: 'nonexistent-preset' }) !==
    'cursor-grok-4.6-high',
  'us-414: unknown preset never resolves to another preset model (fail-closed)',
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

const hostContext = {
  sharedDir: fs.mkdtempSync(path.join(os.tmpdir(), 'ws-model-capabilities-')),
  config: { defaults: {} },
};
fs.writeFileSync(
  path.join(hostContext.sharedDir, 'host-capabilities.json'),
  JSON.stringify({
    'test-host::session-model': {
      binding: { supportedModels: ['composer-2.5'] },
    },
  }),
);
const fallback = resolveDispatchModel(
  hostContext,
  { hostBinding: { supportedModels: ['composer-2.5'] } },
  'cursor-grok-4.6-high',
  session,
);
assert(
  fallback.model === session &&
    fallback.configuredModel === 'cursor-grok-4.6-high' &&
    fallback.fallbackReason === 'unsupported-host-model',
  'unsupported configured model falls back to captured session model',
);
const fileFallback = resolveDispatchModel(
  hostContext,
  { hostBinding: {} },
  'cursor-grok-4.6-high',
  session,
);
assert(
  fileFallback.model === session &&
    fileFallback.configuredModel === 'cursor-grok-4.6-high' &&
    fileFallback.fallbackReason === 'unsupported-host-model',
  'host-capabilities binding models trigger session fallback',
);
assert(
  resolveDispatchModel(
    hostContext,
    { hostBinding: { supportedModels: ['composer-2.5'] } },
    'composer-2.5',
    session,
  ).model === 'composer-2.5',
  'supported configured model is retained',
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
  resolvePhaseModel(
    { ...liteDefaults, stepModels: {} },
    { step: 2, pipeline: 'lite', sessionModel: session },
  ) === 'composer-2.5',
  'lite step 2 falls through to executionModel when steps 2 empty',
);
assert(
  resolvePhaseModel(
    { ...liteDefaults, stepModels: {} },
    { step: 3, pipeline: 'lite', sessionModel: session },
  ) === 'cursor-grok-4.6-medium',
  'lite step 3 falls through to reviewerModel when steps 3 empty',
);
assert(
  resolvePhaseModel(
    { ...liteDefaults, stepModels: {} },
    { step: 4, pipeline: 'lite', sessionModel: session },
  ) === session,
  'lite steps 4-5 default to session when steps empty',
);
assert(
  resolvePhaseModel(
    { ...liteDefaults, stepModels: {} },
    { step: 5, pipeline: 'lite', sessionModel: session },
  ) === session,
  'lite step 5 defaults to session when steps empty',
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

const tools = read('.agents/skills/ws-shared/runtime/tools.md');
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

const setupDoc = read('.agents/skills/ws-shared/runtime/setup.md');
assert(/preset=<name>/.test(setupDoc), 'setup.md documents preset=<name>');
assert(/modelsPreset/.test(setupDoc), 'setup.md documents modelsPreset in init banner');

const specSkill = read('.agents/skills/ws-spec-to-pr/SKILL.md');
assert(/preset=<name>/.test(specSkill), 'ws-spec-to-pr SKILL.md documents preset=<name>');

const specReadme = read('.agents/skills/ws-spec-to-pr/README.md');
assert(/preset=<name>/.test(specReadme), 'ws-spec-to-pr README.md documents preset=<name>');

const specProtocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(/preset=<name>/.test(specProtocols), 'ws-spec-to-pr PROTOCOLS.md documents preset=<name>');

assert(/preset=<name>/.test(dispatch), 'STEP-DISPATCH documents preset=<name>');
assert(/preset=<name>/.test(liteSkill), 'ws-spec-to-pr-lite SKILL.md documents preset=<name>');

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-models-preset-'));
const tempShared = path.join(tempRoot, '.ws');
fs.mkdirSync(tempShared, { recursive: true });
fs.writeFileSync(
  path.join(tempShared, 'config.json'),
  JSON.stringify({
    plans: { dir: '.agents/plans' },
    defaults: {
      modelsPreset: 'cheap',
      modelPresets: {
        cheap: { plannerModel: 'cheap-planner', executionModel: 'cheap-exec' },
        deepseek: { plannerModel: 'deepseek-planner', executionModel: 'deepseek-exec' },
      },
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

const presetDir = path.join(tempRoot, '.agents/plans/preset-flow');
fs.mkdirSync(presetDir, { recursive: true });
const presetState = path.join(presetDir, 'preset.state.md');
const presetJsonl = path.join(presetDir, 'telemetry.jsonl');
fs.writeFileSync(
  presetState,
  `---
workflowId: wf-preset
slug: preset-flow
status: active
currentStep: 0
currentModel: temp-session
revision: 0
completedSteps: []
---
`,
);
const presetDispatch0 = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step',
    '0',
    '--preset',
    'deepseek',
    '--jsonl-out',
    path.relative(tempRoot, presetJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(presetDispatch0.status === 0, `preset dispatch exits 0: ${presetDispatch0.stderr}`);
let presetStateMd = fs.readFileSync(presetState, 'utf8');
assert(/modelsPreset: deepseek/.test(presetStateMd), 'dispatch --preset deepseek records modelsPreset in state.md');
assert(/currentModel: deepseek-planner/.test(presetStateMd), 'dispatch --preset deepseek resolves deepseek-planner');
let presetStateJson = JSON.parse(fs.readFileSync(path.join(presetDir, 'preset.state.json'), 'utf8'));
assert(presetStateJson.modelsPreset === 'deepseek', 'dispatch --preset deepseek records modelsPreset in state.json');

const presetFinish0 = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'finish',
    presetState,
    '--step',
    '0',
    '--jsonl-out',
    path.relative(tempRoot, presetJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(presetFinish0.status === 0, `preset finish exits 0: ${presetFinish0.stderr}`);
presetStateJson = JSON.parse(fs.readFileSync(path.join(presetDir, 'preset.state.json'), 'utf8'));
assert(presetStateJson.modelsPreset === 'deepseek', 'finish retains modelsPreset in state.json');

const presetDispatch1 = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step',
    '1',
    '--jsonl-out',
    path.relative(tempRoot, presetJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(presetDispatch1.status === 0, `preset dispatch 1 exits 0: ${presetDispatch1.stderr}`);
presetStateMd = fs.readFileSync(presetState, 'utf8');
assert(/modelsPreset: deepseek/.test(presetStateMd), 'step 1 dispatch retains modelsPreset in state.md');
assert(/currentModel: deepseek-planner/.test(presetStateMd), 'step 1 dispatch resolves using retained deepseek');

const presetDispatchUpdate = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step',
    '1',
    '--preset=cheap',
    '--jsonl-out',
    path.relative(tempRoot, presetJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(presetDispatchUpdate.status === 0, `inline --preset=cheap dispatch exits 0: ${presetDispatchUpdate.stderr}`);
presetStateMd = fs.readFileSync(presetState, 'utf8');
assert(/modelsPreset: cheap/.test(presetStateMd), 'inline --preset=cheap updates modelsPreset in state.md');
assert(/currentModel: cheap-planner/.test(presetStateMd), 'inline --preset=cheap resolves cheap-planner');
presetStateJson = JSON.parse(fs.readFileSync(path.join(presetDir, 'preset.state.json'), 'utf8'));
assert(presetStateJson.modelsPreset === 'cheap', 'inline --preset=cheap updates modelsPreset in state.json');

const presetEvents = fs.readFileSync(presetJsonl, 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
assert(presetEvents.some((e) => e.modelsPreset === 'deepseek'), 'telemetry records modelsPreset: deepseek');
assert(presetEvents.some((e) => e.modelsPreset === 'cheap'), 'telemetry records modelsPreset: cheap');

const presetDispatchUnknown = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step',
    '1',
    '--preset',
    'unknown-xyz',
    '--jsonl-out',
    path.relative(tempRoot, presetJsonl),
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(presetDispatchUnknown.status !== 0, `us-414: unknown preset dispatch fails closed: ${presetDispatchUnknown.stdout}`);
assert(/unknown-xyz/.test(presetDispatchUnknown.stderr), 'us-414: unknown preset error names the requested preset');
assert(/cheap/.test(presetDispatchUnknown.stderr), 'us-414: unknown preset error names the available presets');
const eventsAfterUnknown = fs.readFileSync(presetJsonl, 'utf8').trim().split(/\r?\n/).map((l) => JSON.parse(l));
const lastUnknownEvent = eventsAfterUnknown[eventsAfterUnknown.length - 1];
assert(
  !lastUnknownEvent.presetWarning,
  'us-414: failed unknown-preset dispatch appends no warning event',
);
presetStateJson = JSON.parse(fs.readFileSync(path.join(presetDir, 'preset.state.json'), 'utf8'));
assert(presetStateJson.modelsPreset === 'cheap', 'unknown preset does not overwrite state.modelsPreset');

// NS2: empty/whitespace preset is treated as unset (falls back to state/config)
const emptyPreset = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step',
    '1',
    '--preset=',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(emptyPreset.status === 0, `empty --preset= is treated as unset: ${emptyPreset.stderr}`);
presetStateJson = JSON.parse(fs.readFileSync(path.join(presetDir, 'preset.state.json'), 'utf8'));
assert(presetStateJson.modelsPreset === 'cheap', 'empty --preset= retains state.modelsPreset');

// Generic inline --key=value form keeps existing flags working
const inlineStep = spawnSync(
  process.execPath,
  [
    path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs'),
    'dispatch',
    presetState,
    '--step=1',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(inlineStep.status === 0, `--step=1 inline form parses: ${inlineStep.stderr}`);

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
    '--noop',
    'dag role probe touches no product files',
    '--repo-root',
    tempRoot,
  ],
  { encoding: 'utf8' },
);
assert(dagFinish.status === 0, `dag finish: ${dagFinish.stderr}`);
assert(/currentModel: dag-worker/.test(fs.readFileSync(roleState, 'utf8')), 'finish without --substep keeps persisted dag role');
assert(!/currentModel: sequential-exec/.test(fs.readFileSync(roleState, 'utf8')), 'finish does not fall back to step-4 execution bucket');

const fixStateDir = path.join(tempRoot, '.agents/plans/fix-pr');
fs.mkdirSync(fixStateDir, { recursive: true });
const fixState = path.join(fixStateDir, 'fix-pr.state.md');
const fixJsonl = path.join(fixStateDir, 'telemetry.jsonl');
fs.writeFileSync(
  fixState,
  `---
workflowId: wf-fix-pr
slug: fix-pr
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
