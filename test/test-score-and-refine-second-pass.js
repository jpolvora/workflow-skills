/**
 * scoreAndRefine second-pass wide-context simplify contract.
 * Run: node test/test-score-and-refine-second-pass.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');

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

const gates = read('.agents/skills/ws-shared/gates.md');
const dispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
const implement = read('.agents/skills/ws-implement-tasks/SKILL.md');
const verify = read('.agents/skills/ws-verify-plan/SKILL.md');
const lite = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
const schema = read('.agents/skills/ws-shared/config.schema.json');
const example = read('.agents/skills/ws-shared/config.json.example');
const setup = read('.agents/skills/ws-shared/setup.md');
const faq = read('.agents/skills/ws-spec-to-pr/docs/faq.md');
const site = read('docs/index.html');
const features = read('FEATURES.md');

assert(
  /Overengineering sweep/i.test(gates) &&
    /Dead artifact removal/i.test(gates) &&
    /full.*Pass 1 diff/i.test(gates),
  'gates.md second pass names overengineering sweep, dead artifact removal, full Pass 1 diff',
);
assert(
  /this workflow introduced/i.test(gates) &&
    /Do not drop ACs/i.test(gates) &&
    /Do not delete pre-existing unused code/i.test(gates),
  'gates.md limits deletion to workflow-introduced artifacts and keeps ACs',
);
assert(
  /Post-simplify score must stay ≥ 9/i.test(gates),
  'gates.md requires post-simplify score ≥ 9',
);
assert(
  /Option 1 runs even when zero tasks are flagged/i.test(gates),
  'gates.md Option 1 runs with zero flagged tasks',
);
assert(
  /Second pass reviews the full Pass 1 diff for overengineering/i.test(gates) &&
    /Proceed with Second Pass Refinement/.test(gates) &&
    /Accept First Pass As-Is/.test(gates) &&
    /Selective Refinement/.test(gates),
  'gates.md user-gate keeps three polish options and names the simplify sweep',
);
assert(
  /simplifications\/deletions/.test(gates),
  'gates.md comparative gate records simplifications/deletions',
);

assert(
  /wide-context second pass/i.test(dispatch) &&
    /Option 1 runs even when zero tasks are flagged/i.test(dispatch),
  'STEP-DISPATCH dispatches wide-context second pass even with zero flagged tasks',
);
assert(
  /simplifications\/deletions/.test(dispatch),
  'STEP-DISPATCH second-pass report includes simplifications/deletions',
);

assert(
  /ScoreAndRefine second pass/i.test(implement) &&
    /this workflow introduced/i.test(implement) &&
    /Do not drop ACs/i.test(implement),
  'ws-implement-tasks executes second-pass simplify without dropping ACs',
);
assert(
  /assigned set is the full Pass 1 `files_touched`/.test(implement),
  'ws-implement-tasks second-pass scope is full Pass 1 files_touched',
);

assert(
  /optional `scoreAndRefine` second pass/i.test(verify),
  'ws-verify-plan handoff points at optional second pass',
);
assert(
  /wide-context simplify per/i.test(lite),
  'ws-spec-to-pr-lite scoreAndRefine follows gates.md simplify',
);

assert(
  /wide-context overengineering sweep/i.test(schema),
  'config.schema.json scoreAndRefine describes overengineering sweep',
);
assert(
  /wide-context overengineering sweep/i.test(example),
  'config.json.example comments the overengineering sweep',
);
assert(
  /wide-context overengineering sweep per/i.test(setup),
  'setup.md completed-workflow bootstrap mentions the sweep',
);

assert(
  /overengineering and unused workflow-introduced artifacts/i.test(faq),
  'orch FAQ documents second-pass overengineering review',
);
assert(
  /overengineering and unused workflow-introduced/i.test(site),
  'docs/index.html FAQ documents second-pass overengineering review',
);
assert(
  /wide-context overengineering sweep/i.test(features),
  'FEATURES.md Score & refine row names the wide-context sweep',
);

if (failures > 0) {
  console.error(`FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('test-score-and-refine-second-pass: ok');
process.exit(0);
