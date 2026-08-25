/**
 * defaults.minVerifyScore resolver + schema + seed surface.
 * Run: node test/test-min-verify-score.js
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const { resolveMinVerifyScore } = require(
  path.join(REPO, '.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs'),
);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}

assert(resolveMinVerifyScore({}) === 9, 'omitted → 9');
assert(resolveMinVerifyScore({ defaults: {} }) === 9, 'empty defaults → 9');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 8 } }) === 8, 'explicit 8');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 10 } }) === 10, 'explicit 10');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 1 } }) === 1, 'explicit 1');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 0 } }) === 9, '0 → 9');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 11 } }) === 9, '11 → 9');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: 9.5 } }) === 9, 'non-integer → 9');
assert(resolveMinVerifyScore({ defaults: { minVerifyScore: '9' } }) === 9, 'string → 9');

const schema = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/config.schema.json'), 'utf8'));
const prop = schema.properties?.defaults?.properties?.minVerifyScore || {};
assert(prop.type === 'integer' && prop.minimum === 1 && prop.maximum === 10 && prop.default === 9, 'schema shape');

const example = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/config.json.example'), 'utf8'));
assert(example.defaults.minVerifyScore === 9, 'example seeds 9');

function read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}
const gates = read('.agents/skills/ws-shared/gates.md');
assert(gates.includes('defaults.minVerifyScore'), 'gates.md names defaults.minVerifyScore');
assert(/Reach 10 before advance/i.test(gates), 'gates.md Reach-10 user-gate');
assert(/autoMode.*skip.*Reach-10|skip the Reach-10 offer/i.test(gates), 'gates.md autoMode skips Reach-10');

const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
assert(dispatch.includes('defaults.minVerifyScore'), 'STEP-DISPATCH names defaults.minVerifyScore');

const protocols = read('.agents/skills/ws-spec-to-pr/PROTOCOLS.md');
assert(/Reach[- ]10/i.test(protocols), 'PROTOCOLS.md documents Reach-10 offer');

assert(
  /fixPrPlan/.test(gates) && /fixPrExec/.test(gates) && /Fix-PR gate[\s\S]*plan-gate/i.test(gates),
  'gates.md Fix-PR gate documents batch plan/exec contract',
);

const verify = read('.agents/skills/ws-verify-plan/SKILL.md');
assert(verify.includes('defaults.minVerifyScore'), 'ws-verify-plan names defaults.minVerifyScore');

const interview = read('.agents/skills/ws-configure-project/INTERVIEW.md');
assert(interview.includes('minVerifyScore'), 'INTERVIEW.md asks minVerifyScore');
assert(/Recommended.*9/.test(interview), 'INTERVIEW.md Recommended 9');

const autoload = read('.agents/skills/ws-shared/autoload.md');
assert(autoload.includes('defaults.minVerifyScore'), 'autoload.md names defaults.minVerifyScore');

const site = read('docs/index.html');
assert(site.includes('defaults.minVerifyScore'), 'docs/index.html names defaults.minVerifyScore');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll min-verify-score checks passed.');
