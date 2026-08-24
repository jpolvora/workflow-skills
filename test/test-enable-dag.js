/**
 * enableDag config + schema + fallback surface checks.
 * Run: node test/test-enable-dag.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');
const SKILLS = path.join(REPO, '.agents/skills');

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

function read(relPath) {
  return fs.readFileSync(path.join(REPO, relPath), 'utf8');
}

const example = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8'),
);
const configPath = path.join(SHARED, 'config.json');
const config = fs.existsSync(configPath)
  ? JSON.parse(fs.readFileSync(configPath, 'utf8'))
  : null;
const schema = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8'),
);

const defaultsProps = schema.properties?.defaults?.properties || {};

assert(
  defaultsProps.enableDag?.type === 'boolean',
  'schema defaults.enableDag is a boolean type',
);
assert(
  defaultsProps.enableDag?.default === false,
  'schema defaults.enableDag defaults to false',
);
if (config) {
  assert(
    Object.prototype.hasOwnProperty.call(config.defaults || {}, 'enableDag'),
    'config.json has defaults.enableDag',
  );
  assert(
    config.defaults.enableDag === false,
    'config.json enableDag defaults to false',
  );
} else {
  console.log('SKIP config.json assertions (file absent in fresh clone/CI)');
}
assert(
  Object.prototype.hasOwnProperty.call(example.defaults || {}, 'enableDag'),
  'config.json.example has defaults.enableDag',
);
assert(
  example.defaults.enableDag === false,
  'config.json.example enableDag defaults to false',
);

function resolveEnableDag(configObj) {
  if (configObj?.defaults && typeof configObj.defaults.enableDag === 'boolean') {
    return configObj.defaults.enableDag;
  }
  return false;
}

assert(
  resolveEnableDag({ defaults: { enableDag: true } }) === true,
  'resolveEnableDag returns true when set to true',
);
assert(
  resolveEnableDag({ defaults: { enableDag: false } }) === false,
  'resolveEnableDag returns false when set to false',
);
assert(
  resolveEnableDag({}) === false,
  'resolveEnableDag falls back to false when omitted/missing',
);

// Check skills and documentation contracts for enableDag
const planToTasksSkill = read('.agents/skills/ws-plan-to-tasks/SKILL.md');
assert(
  planToTasksSkill.includes('defaults.enableDag'),
  'ws-plan-to-tasks SKILL.md references defaults.enableDag',
);
assert(
  /only when `defaults.enableDag` is `true`/.test(planToTasksSkill),
  'ws-plan-to-tasks SKILL.md is dispatched only when enableDag is true',
);

const specToPrSkill = read('.agents/skills/ws-spec-to-pr/SKILL.md');
assert(
  specToPrSkill.includes('enableDag'),
  'ws-spec-to-pr SKILL.md documents enableDag mode flag',
);

const stepDispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(
  stepDispatch.includes('defaults.enableDag'),
  'STEP-DISPATCH.md documents defaults.enableDag evaluation in Step 3',
);
assert(
  stepDispatch.includes('write_sequential_dag.cjs'),
  'STEP-DISPATCH.md writes sequential DAG via script when enableDag is false',
);
assert(
  /do \*\*not\*\* `dispatch-agent`/.test(stepDispatch),
  'STEP-DISPATCH.md does not dispatch a Step 3 subagent when enableDag is false',
);

const protocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(
  protocols.includes('defaults.enableDag'),
  'PROTOCOLS.md documents defaults.enableDag in Step 4 dispatch',
);

const configResolution = read('.agents/skills/ws-shared/config-resolution.md');
assert(
  configResolution.includes('defaults.enableDag'),
  'config-resolution.md has Parallel DAG task execution resolution section',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll enable-dag checks passed.');
