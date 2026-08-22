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
assert(example.defaults.modelPresets?.cursor?.executionModel, 'example includes cursor preset');
assert(example.defaults.modelPresets?.deepseek, 'example includes deepseek preset');
assert(example.defaults.modelPresets?.cheap, 'example includes cheap preset');
assert(Object.prototype.hasOwnProperty.call(example.defaults.stepModels, 'dag'), 'example stepModels includes dag');

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

const pyScript = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/update_state.py');
const pyProbe = `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("std_update", ${JSON.stringify(pyScript)})
mod = importlib.util.module_from_spec(spec)
sys.modules["std_update"] = mod
spec.loader.exec_module(mod)
defaults = json.loads(sys.argv[1])
role = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "-" else None
print(mod.resolve_phase_model(int(sys.argv[2]), None, "sess", role=role, pipeline=sys.argv[4], defaults=defaults))
`;
const pyDefaults = JSON.stringify({
  modelsPreset: 'cursor',
  modelPresets: example.defaults.modelPresets,
  stepModels: { dag: 'dag-worker' },
});
const pyDag = spawnSync('python', ['-c', pyProbe, pyDefaults, '4', 'dag', 'standard'], {
  encoding: 'utf8',
});
assert(pyDag.status === 0, `python resolve_phase_model spawn: ${pyDag.stderr}`);
assert(pyDag.stdout.trim() === 'dag-worker', 'python standard role dag via injected defaults');

const pyLiteScript = `
import json, importlib.util, sys
spec = importlib.util.spec_from_file_location("lite_update", ${JSON.stringify(path.join(REPO, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py'))})
mod = importlib.util.module_from_spec(spec)
sys.modules["lite_update"] = mod
spec.loader.exec_module(mod)
defaults = json.loads(sys.argv[1])
print(mod.resolve_phase_model(4, None, "sess", role="reviewFix", pipeline="lite", defaults=defaults))
`;
const pyLiteRun = spawnSync('python', ['-c', pyLiteScript, pyDefaults], { encoding: 'utf8' });
assert(pyLiteRun.status === 0, `python lite resolve: ${pyLiteRun.stderr}`);
assert(pyLiteRun.stdout.trim() === 'sess', 'python lite ignores reviewFix');

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

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-models-preset-and-per-step: ok');
