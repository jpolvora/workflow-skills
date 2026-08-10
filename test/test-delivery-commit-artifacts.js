/**
 * Delivery-commit artifacts config (AC1–AC6 surface checks).
 * Run: node test/test-delivery-commit-artifacts.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');

let failures = 0;

function assert(cond, msg) {
  if (cond) console.log(`✅ ${msg}`);
  else {
    console.error(`❌ ${msg}`);
    failures += 1;
  }
}

const example = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.json.example'), 'utf8'),
);
const schema = JSON.parse(
  fs.readFileSync(path.join(SHARED, 'config.schema.json'), 'utf8'),
);

const dca = example.defaults?.deliveryCommitArtifacts;
assert(!!dca, 'example has defaults.deliveryCommitArtifacts');
assert(dca.includeRefinedPlan === true, 'example includeRefinedPlan default true');
assert(dca.includeDeliveryResult === false, 'example includeDeliveryResult default false');
assert(dca.includeSpec === false, 'example includeSpec default false');
assert(dca.includeCheckReport === false, 'example includeCheckReport default false');
assert(dca.includeCodeReview === false, 'example includeCodeReview default false');
assert(dca.includeTestingReport === false, 'example includeTestingReport default false');

const schemaDca =
  schema.properties?.defaults?.properties?.deliveryCommitArtifacts;
assert(!!schemaDca, 'schema defines deliveryCommitArtifacts');
const props = schemaDca.properties || {};
for (const key of [
  'includeRefinedPlan',
  'includeDeliveryResult',
  'includeSpec',
  'includeCheckReport',
  'includeCodeReview',
  'includeTestingReport',
]) {
  assert(props[key]?.type === 'boolean', `schema ${key} is boolean`);
}
assert(props.includeRefinedPlan?.default === true, 'schema refined default true');
assert(props.includeDeliveryResult?.default === false, 'schema result default false');

const artifacts = fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-spec-to-pr/ARTIFACTS.md'),
  'utf8',
);
assert(
  artifacts.includes('defaults.deliveryCommitArtifacts'),
  'ARTIFACTS.md references deliveryCommitArtifacts',
);
assert(
  !/Stage \*\*only\*\*:\s*\n\s*1\.\s*`step-02/.test(artifacts),
  'ARTIFACTS.md no longer hardcodes unconditional plan+result list',
);

const gates = fs.readFileSync(path.join(SHARED, 'gates.md'), 'utf8');
assert(
  gates.includes('Commit configured delivery artifacts'),
  'gates.md uses configured delivery artifacts wording',
);
assert(
  !gates.includes('Commit plan + result'),
  'gates.md has no mandatory Commit plan + result',
);

const tools = fs.readFileSync(path.join(SHARED, 'tools.md'), 'utf8');
assert(
  tools.includes('defaults.deliveryCommitArtifacts'),
  'tools.md commit-delivery references config',
);

const interview = fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-configure-project/INTERVIEW.md'),
  'utf8',
);
assert(
  interview.includes('Delivery commit artifacts'),
  'INTERVIEW.md documents delivery commit artifacts',
);
assert(interview.includes('includeRefinedPlan'), 'INTERVIEW.md includes includeRefinedPlan');

const ship = fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-ship-pr/SKILL.md'),
  'utf8',
);
assert(
  ship.includes('includeDeliveryResult'),
  'ws-ship-pr documents includeDeliveryResult',
);
assert(
  ship.includes('resolved stage set is empty'),
  'ws-ship-pr documents fail-closed empty stage set',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll delivery-commit artifact checks passed.');
