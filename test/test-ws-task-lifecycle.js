/**
 * Contracts for ws-task-lifecycle SKILL.md and evals (us-236).
 * Run: node test/test-ws-task-lifecycle.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILL_MD = path.join(REPO_ROOT, '.agents/skills/ws-task-lifecycle/SKILL.md');
const EVALS = path.join(REPO_ROOT, '.agents/skills/ws-task-lifecycle/evals/evals.json');
const AUTOLOAD = path.join(REPO_ROOT, '.agents/skills/ws-shared/autoload.md');

let failures = 0;

function fail(msg) {
  console.error(`FAIL ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

console.log('Running ws-task-lifecycle tests...');

const skill = fs.readFileSync(SKILL_MD, 'utf8');
const autoload = fs.readFileSync(AUTOLOAD, 'utf8');
const evals = JSON.parse(fs.readFileSync(EVALS, 'utf8'));

assert(/name:\s*ws-task-lifecycle/.test(skill), 'SKILL.md YAML name is ws-task-lifecycle');
assert(/## Phase 1 — Intake/.test(skill), 'phase Intake');
assert(/## Phase 2 — Implementation/.test(skill), 'phase Implementation');
assert(/## Phase 3 — Completion/.test(skill), 'phase Completion');
assert(
  (skill.match(/^## Phase \d+ — /gm) || []).length === 3,
  'exactly three named phases',
);

const completion = skill.split('## Phase 3 — Completion')[1]?.split('## Rules')[0] || '';
const featIdx = completion.indexOf('FEATURES.md');
const planIdx = completion.indexOf('PLAN.md');
assert(featIdx >= 0 && planIdx > featIdx, 'AC16/AC38: Completion lists FEATURES.md before PLAN.md');

assert(
  /ws-write-spec/.test(skill) &&
    /ws-spec-index/.test(skill) &&
    /track \{slug\}/.test(skill) &&
    /\[~\]/.test(skill),
  'AC6/AC8: write-spec then spec-index track then [~] before product edits',
);
assert(skill.includes('{specsDir}'), 'AC11: uses {specsDir} token');
assert(
  !skill.includes('.agents/specs'),
  'AC11: SKILL.md prose does not hardcode .agents/specs',
);
assert(
  /Do \*\*not\*\* create `\{plansDir\}/.test(skill) ||
    /Never mkdir a workflow plan tree/.test(skill),
  'AC9/AC39: forbids creating a {plansDir} workflow tree',
);
assert(!/mkdir `\{plansDir\}/.test(skill), 'AC39: does not instruct mkdir {plansDir}');
assert(
  /does \*\*not\*\* write `step-00/.test(skill) ||
    /Do \*\*not\*\*.*write `step-00/.test(skill),
  'AC10: forbids writing step-00-*.spec.md',
);
assert(
  skill.includes('defaults.autoloadTaskLifecycle') &&
    /on-demand/i.test(skill) &&
    /opt-in/i.test(skill),
  'AC51: default invoke on-demand; Always-applied membership opt-in via defaults.autoloadTaskLifecycle',
);

const tableMatch = autoload.match(
  /\| Skill \| Path \| Trigger \|\r?\n\|[-| ]+\|\r?\n((?:\|[^\r\n]*\|\r?\n)+)/,
);
const alwaysTable = tableMatch ? tableMatch[1] : '';
assert(alwaysTable.length > 0, 'autoload.md Always-applied table parsed');
assert(
  !/`ws-task-lifecycle`/.test(alwaysTable),
  'AC33: shipped Always-applied table omits ws-task-lifecycle',
);

const evalBlob = JSON.stringify(evals);
assert(
  evalBlob.includes('FEATURES.md before PLAN.md'),
  'eval asserts FEATURES.md before PLAN.md',
);
assert(
  evalBlob.includes('{plansDir}'),
  'eval asserts no {plansDir} workflow tree',
);
assert(
  evalBlob.includes('ws-spec-index track'),
  'eval asserts Intake tracks new slugs via ws-spec-index',
);

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll ws-task-lifecycle tests passed.');
