/**
 * testingModel (test executor) config + orch docs (AC1–AC9 surface checks).
 * Run: node test/test-testing-executor-model.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');

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

const example = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8'),
);
const schema = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8'),
);

const defaultsProps = schema.properties?.defaults?.properties || {};
const requiredDefaults = schema.properties?.defaults?.required || [];

assert(
  defaultsProps.testingModel?.type === 'string',
  'schema defaults.testingModel is optional string',
);
assert(
  defaultsProps.testingModel?.default === undefined,
  'schema testingModel has no JSON Schema default (resolve at dispatch)',
);
assert(
  !requiredDefaults.includes('testingModel'),
  'schema does not require testingModel (omitted valid)',
);
assert(
  Object.prototype.hasOwnProperty.call(example.defaults || {}, 'testingModel'),
  'example has defaults.testingModel',
);
assert(example.defaults.testingModel === '', 'example testingModel is empty string');

const reviewerDesc = defaultsProps.reviewerModel?.description || '';
assert(
  /Steps 5-6/.test(reviewerDesc) && !/Steps 5-7/.test(reviewerDesc),
  'schema reviewerModel description is Steps 5-6 not 5-7',
);

const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(
  dispatch.includes('Steps 5–6 → `reviewerModel`') ||
    dispatch.includes('Steps 5-6 → `reviewerModel`'),
  'STEP-DISPATCH maps reviewerModel to Steps 5-6',
);
assert(
  /Step 7 resolve/.test(dispatch) && dispatch.includes('testingModel'),
  'STEP-DISPATCH documents Step 7 testingModel resolve',
);
assert(!/Steps 5–7 → `reviewerModel`/.test(dispatch), 'STEP-DISPATCH no longer maps 5-7 to reviewer');

const orchSkill = read('.agents/skills/ws-spec-to-pr/SKILL.md');
assert(orchSkill.includes('testingModel'), 'ws-spec-to-pr SKILL.md mentions testingModel');
assert(
  orchSkill.includes('reviewerModel` is Steps 5–6') ||
    orchSkill.includes('reviewerModel is Steps 5–6'),
  'ws-spec-to-pr SKILL.md narrows reviewerModel to Steps 5-6',
);

const tools = read('.agents/skills/ws-shared/tools.md');
assert(tools.includes('testingModel'), 'tools.md mentions testingModel');
assert(
  tools.includes('standard Steps 5–6') || tools.includes('standard Steps 5-6'),
  'tools.md reviewer range is Steps 5-6',
);
assert(
  /Lite does not read or apply `testingModel`/.test(tools),
  'tools.md says lite does not apply testingModel',
);

const interview = read('.agents/skills/ws-configure-project/INTERVIEW.md');
assert(interview.includes('testingModel'), 'INTERVIEW.md includes testingModel');
assert(
  /Recommended:.*empty/.test(interview) || /leave empty/.test(interview),
  'INTERVIEW.md recommends empty testingModel (same as execution)',
);

const lite = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
assert(
  /Do \*\*not\*\* read or apply `defaults.testingModel`/.test(lite),
  'lite SKILL.md does not apply testingModel',
);
assert(
  lite.includes('reviewerModel` (Step 3)'),
  'lite Step 3 remains reviewerModel',
);

const testing = read('.agents/skills/ws-testing/SKILL.md');
assert(
  testing.includes('resolved test-executor') || testing.includes('testingModel'),
  'ws-testing documents orch-supplied test-executor model',
);
assert(
  testing.includes('Standalone `/testing`') && testing.includes('does not switch'),
  'ws-testing standalone does not switch models',
);

function resolveTestingModel(defaults, sessionModel) {
  const testingVal =
    typeof defaults?.testingModel === 'string' ? defaults.testingModel.trim() : '';
  if (testingVal) return testingVal;
  const execution =
    typeof defaults?.executionModel === 'string' ? defaults.executionModel.trim() : '';
  if (execution) return execution;
  return sessionModel;
}

assert(
  resolveTestingModel({ testingModel: 'fast-test' }, 'session') === 'fast-test',
  'resolve: non-empty testingModel wins',
);
assert(
  resolveTestingModel({ testingModel: '', executionModel: 'exec' }, 'session') ===
    'exec',
  'resolve: empty testingModel falls back to executionModel',
);
assert(
  resolveTestingModel({ executionModel: 'exec' }, 'session') === 'exec',
  'resolve: omitted testingModel falls back to executionModel',
);
assert(
  resolveTestingModel({}, 'session') === 'session',
  'resolve: both empty/omitted keeps session model',
);

const updateStatePy = read('.agents/skills/ws-spec-to-pr/scripts/update_state.py');
assert(
  updateStatePy.includes('def resolve_phase_model'),
  'ws-spec-to-pr update_state.py contains resolve_phase_model helper',
);

const updateStateLitePy = read('.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py');
assert(
  updateStateLitePy.includes('def resolve_phase_model'),
  'ws-spec-to-pr-lite update_state.py contains resolve_phase_model helper',
);

const protocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(
  protocols.includes('applies it during `dispatch-agent` and `update_state.py`'),
  'PROTOCOLS.md documents phase model application and update_state.py passing',
);

const gates = read('.agents/skills/ws-shared/gates.md');
assert(
  gates.includes('Target phase model: {targetPhaseModel}'),
  'gates.md documents Target phase model in banner',
);

const stateHygiene = read('.agents/skills/ws-spec-to-pr/protocols/state-hygiene.md');
assert(
  stateHygiene.includes('Pass resolved phase model'),
  'state-hygiene.md documents passing resolved phase model into update_state.py',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll testing-executor-model checks passed.');
