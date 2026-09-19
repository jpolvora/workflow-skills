/**
 * us-352: fix-PR loop execution-mode gate (`ws-goal-fix-pr.useSubAgents`).
 * AC1: documented key selects inline (default) vs subagent dispatch.
 * AC2: absent/false resolves inline (zero dispatches on the fix path).
 * AC3: explicit true resolves to per-round subagent dispatch.
 * AC4: schema + GUI editor + docs updated atomically (no drift).
 * Run: node test/test-fix-pr-subagent-mode.js
 */
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SHARED = path.join(REPO, '.agents/skills/ws-shared');
const { resolveFixPrDispatchMode } = require(path.join(SHARED, 'runtime', 'scripts', 'workflow_state.cjs'));

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

// AC1 — schema documents the key with inline default.
const schema = JSON.parse(read('.agents/skills/ws-shared/runtime/config.schema.json'));
const section = schema.properties?.['ws-goal-fix-pr'];
assert(section?.type === 'object', 'AC1 schema: ws-goal-fix-pr section is an object');
assert(
  section?.properties?.useSubAgents?.type === 'boolean',
  'AC1 schema: ws-goal-fix-pr.useSubAgents is boolean',
);
assert(
  section?.properties?.useSubAgents?.default === false,
  'AC1 schema: ws-goal-fix-pr.useSubAgents defaults to false',
);

// AC1 — example seeds the key at its default.
const example = JSON.parse(read('.agents/skills/ws-shared/templates/config.json.example'));
assert(
  example?.['ws-goal-fix-pr']?.useSubAgents === false,
  'AC1 example: ws-goal-fix-pr.useSubAgents seeded false',
);

// AC1 — runtime behavior in both positions: resolver is exported and strict.
assert(
  typeof resolveFixPrDispatchMode === 'function',
  'AC1 resolver: resolveFixPrDispatchMode is exported from workflow_state.cjs',
);

// AC2 — default (absent or false, plus null/non-boolean) runs inline.
for (const [label, config] of [
  ['absent section', {}],
  ['undefined config', undefined],
  ['empty section', { 'ws-goal-fix-pr': {} }],
  ['explicit false', { 'ws-goal-fix-pr': { useSubAgents: false } }],
  ['null flag', { 'ws-goal-fix-pr': { useSubAgents: null } }],
  ['null section', { 'ws-goal-fix-pr': null }],
  ['truthy non-boolean', { 'ws-goal-fix-pr': { useSubAgents: 1 } }],
  ['string true', { 'ws-goal-fix-pr': { useSubAgents: 'true' } }],
]) {
  assert(resolveFixPrDispatchMode(config) === 'inline', `AC2 default-inline: ${label} resolves inline`);
}

// AC3 — explicit boolean true restores per-round subagent dispatch.
assert(
  resolveFixPrDispatchMode({ 'ws-goal-fix-pr': { useSubAgents: true } }) === 'subagent',
  'AC3 opt-in: explicit true resolves subagent',
);

// AC1/AC2 — ws-goal-fix-pr documents the inline-default mode table.
const goalFix = read('.agents/skills/ws-goal-fix-pr/SKILL.md');
assert(
  /Fix-loop execution mode.*`ws-goal-fix-pr\.useSubAgents`/s.test(goalFix),
  'AC1 goal-fix-pr: execution-mode section names the key',
);
assert(
  /absent or `false` \(default\)[\s\S]*Inline legacy loop/i.test(goalFix) &&
    /Zero subagent dispatches per fix-loop run/i.test(goalFix),
  'AC2 goal-fix-pr: default inline posture promises zero dispatches',
);
assert(
  /`true` \(explicit opt-in\)[\s\S]*Subagent dispatch/i.test(goalFix),
  'AC3 goal-fix-pr: opt-in row promises per-round dispatch',
);

// AC1 — the whole fix path reads the same single key (no sibling keys).
const fixPr = read('.agents/skills/ws-fix-pr/SKILL.md');
const shipPr = read('.agents/skills/ws-ship-pr/SKILL.md');
assert(
  /`ws-goal-fix-pr\.useSubAgents`/.test(fixPr),
  'AC1 ws-fix-pr: standalone batches read the shared key',
);
assert(
  /`ws-goal-fix-pr\.useSubAgents`/.test(shipPr),
  'AC1 ws-ship-pr: pre-ship convergence inherits the shared key',
);
for (const [label, body] of [['ws-fix-pr', fixPr], ['ws-ship-pr', shipPr]]) {
  assert(
    !/ws-fix-pr\.useSubAgents|ws-ship-pr\.useSubAgents/.test(body),
    `AC1 ${label}: no sibling per-skill key (single default, no mode skew)`,
  );
}

// AC4 — GUI editor binds the key atomically with the schema change.
const gui = read('.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1');
assert(
  /-Section\s+'ws-goal-fix-pr'\s+-Key\s+'useSubAgents'/.test(gui),
  'AC4 gui: ws-goal-fix-pr.useSubAgents row is bound',
);
assert(
  /-Section\s+'ws-goal-fix-pr'\s+-Key\s+'useSubAgents'[^@\n]*-Type\s+'bool'/.test(gui),
  'AC4 gui: row binds the boolean key as bool',
);

// AC4 — docs name the key and its default.
const readme = read('README.md');
assert(
  /`ws-goal-fix-pr\.useSubAgents`/.test(readme),
  'AC4 readme: key documented',
);
assert(
  /default `false` = inline legacy loop/.test(readme),
  'AC4 readme: inline default documented',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-fix-pr-subagent-mode: ok');
