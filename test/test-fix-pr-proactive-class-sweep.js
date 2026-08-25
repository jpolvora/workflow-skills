/**
 * fix-pr proactive class sweep (AC1–AC10).
 * Run: node test/test-fix-pr-proactive-class-sweep.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SKILLS = path.join(REPO, '.agents/skills');

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

const cooperative = read('.agents/skills/ws-fix-pr/scripts/COOPERATIVE_FIX.md');
const fixPr = read('.agents/skills/ws-fix-pr/SKILL.md');
const autoFix = read('.agents/skills/ws-fix-pr/scripts/AUTO_FIX.md');
const goalFix = read('.agents/skills/ws-goal-fix-pr/SKILL.md');
const lite = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
const evals = JSON.parse(read('.agents/skills/ws-fix-pr/evals/evals.json'));
const goalEvals = JSON.parse(read('.agents/skills/ws-goal-fix-pr/evals/evals.json'));

// AC1 / AC3 / AC9 — shared contract proactive discovery + size gate + single source
assert(
  cooperative.includes('Proactive discovery') && cooperative.includes('MEMORY.md'),
  'COOPERATIVE_FIX defines proactive discovery with MEMORY consult',
);
assert(
  /consult-skipped/i.test(cooperative) && cooperative.includes('sourcesConsulted'),
  'COOPERATIVE_FIX consult-skipped and sourcesConsulted',
);
assert(
  cooperative.includes('proactiveFixed') && cooperative.includes('proactiveSkipped'),
  'COOPERATIVE_FIX proactive report fields',
);
assert(
  /Fix now/i.test(cooperative) && /Skip with reason/i.test(cooperative),
  'COOPERATIVE_FIX size gate fix-now vs skip-with-reason',
);
assert(
  cooperative.includes('same-PR context') || cooperative.includes('Context'),
  'COOPERATIVE_FIX names same-PR context sources',
);
assert(
  !fs.existsSync(path.join(SKILLS, 'ws-fix-pr/scripts/COOPERATIVE_FIX_LEGACY.md')),
  'no dual cooperative-fix contract folder',
);

// AC2 — fix-pr step 5 proactive pass before resolve
assert(
  /proactive discovery/i.test(fixPr) && fixPr.includes('resolve-thread'),
  'fix-pr SKILL requires proactive discovery before resolve-thread',
);
assert(
  fixPr.includes('defectClass') && fixPr.includes('sourcesConsulted'),
  'fix-pr SKILL plan-gate proactive fields',
);
assert(
  /Forbidden/i.test(fixPr) || /forbidden/i.test(fixPr),
  'fix-pr SKILL forbids anchor-only close',
);

// AC4 — plan-gate and resolution bodies
assert(
  fixPr.includes('proactiveFixed') && fixPr.includes('proactiveSkipped'),
  'fix-pr SKILL proactiveFixed and proactiveSkipped',
);

// Batch plan -> execute mutation barrier and durable handoff
assert(
  /batch.*all active threads/i.test(fixPr) && /one `fixPrPlan`.*`fixPrExec` pair/i.test(fixPr),
  'fix-pr defines one role pair per active-thread batch',
);
assert(
  fixPr.indexOf('1. **Outer preflight**') < fixPr.indexOf('2. **`fixPrPlan`'),
  'sync and dirty-worktree preflight precedes fixPrPlan',
);
assert(
  /1\. \*\*Outer preflight\*\*[\s\S]*validate-auth[\s\S]*2\. \*\*`fixPrPlan`/i.test(fixPr),
  'outer preflight requires validate-auth before fixPrPlan',
);
assert(
  /fixPrPlan[\s\S]*write only this `plan-gate\.md`[\s\S]*must not edit product files, commit, push, call `resolve-thread`, or call `finish --step 9`/i.test(fixPr),
  'fixPrPlan is gate-only and forbids product, remote, and finish mutations',
);
for (const field of [
  'batchId', 'prId', 'scope', 'headSha', 'plannedAt', 'activeThreadIds',
  'threadId', 'score', 'proposedAction', 'amendments',
]) {
  assert(fixPr.includes(field), `fix-pr gate contract includes ${field}`);
}
assert(
  /stale or invalid gate blocks execution and returns to `fixPrPlan`/i.test(fixPr),
  'fixPrExec stale identity or HEAD returns to planning',
);
assert(
  /headSha` to equal current HEAD/i.test(fixPr) || /`headSha` to equal current HEAD/i.test(fixPr),
  'fixPrExec requires gate headSha to equal current HEAD',
);
// Stale-gate fixture: wrong headSha must not match live HEAD (contract remains fail-closed in SKILL)
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fixpr-gate-'));
  const gate = path.join(tmp, 'plan-gate.md');
  fs.writeFileSync(
    gate,
    ['batchId: batch-1', 'prId: 241', 'headSha: deadbeef', 'status: planned', 'activeThreadIds: [1]'].join('\n'),
  );
  const head = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const gateText = fs.readFileSync(gate, 'utf8');
  assert(!gateText.includes(head), 'stale gate fixture headSha differs from current HEAD');
  assert(/headSha.*equal current HEAD/i.test(fixPr), 'SKILL still requires headSha === HEAD before exec');
  fs.rmSync(tmp, { recursive: true, force: true });
}
for (const field of [
  'timestamp', 'newFact', 'previousAction', 'revisedAction', 'rationale', 'evidence source',
]) {
  assert(fixPr.includes(field), `fix-pr amendment contract includes ${field}`);
}
assert(
  /Before the first product edit that differs from `proposedAction`, append an amendment/i.test(fixPr),
  'fixPrExec appends amendment before deviating edit',
);
assert(
  fixPr.includes('fixPrPlan') && fixPr.includes('reviewerModel') &&
    fixPr.includes('fixPrExec') && fixPr.includes('executionModel'),
  'fix-pr binds plan and execute roles to reviewer/execution phases',
);

// AC5 — Auto-Fix mirrors proactive discovery
assert(
  /proactive discovery/i.test(autoFix) && autoFix.includes('sourcesConsulted'),
  'AUTO_FIX proactive discovery and sourcesConsulted',
);
assert(
  autoFix.includes('proactiveSkipped') && autoFix.includes('defectClass'),
  'AUTO_FIX explanation carries proactive fields',
);

// AC6 — goal loop act round
assert(
  /proactive class sweep/i.test(goalFix) && goalFix.includes('COOPERATIVE_FIX.md'),
  'goal-fix-pr act round requires proactive class sweep',
);
assert(
  goalFix.includes('proactiveSkipped') && /resolve-thread|push/i.test(goalFix),
  'goal-fix-pr blocks resolve/push without proactive evidence',
);
assert(
  /invoke .*ws-fix-pr.* once/i.test(goalFix) && /one ordered `fixPrPlan`.*`fixPrExec` pair/i.test(goalFix),
  'goal Act round invokes one batch-wide plan-execute pair',
);
assert(
  /Forbidden:.*resolve or push before both substeps have evidence/s.test(goalFix),
  'goal Done-when blocks resolve/push before both role evidence sets',
);
assert(
  /never finish outer Step 9/i.test(goalFix),
  'goal internal roles never finish outer Step 9',
);
assert(
  lite.includes('fixPrPlan') && lite.includes('fixPrExec') &&
    /gate-only plan.*before any product edit/i.test(lite) &&
    /numeric Step `5` remains the only outer telemetry row/i.test(lite),
  'lite ignores role switches but enforces inline plan-before-edit with outer Step 5 telemetry',
);

// Post-round learning (reviewer/CI mistakes → MEMORY / patterns)
const selfLearning = read('.agents/skills/ws-self-learning/SKILL.md');
assert(
  /Post fix-pr round/i.test(selfLearning) &&
    /ws-goal-fix-pr/.test(selfLearning) &&
    /Learning: N\/A/.test(selfLearning),
  'ws-self-learning defines post fix-pr round write protocol',
);
assert(
  /Post-round learning/i.test(goalFix) &&
    goalFix.includes('ws-self-learning') &&
    /Forbidden:.*Learning: N\/A/s.test(goalFix),
  'goal-fix-pr requires post-round learning each loop',
);
assert(
  /post-round learning/i.test(fixPr) && fixPr.includes('ws-self-learning'),
  'ws-fix-pr verify step runs post-round learning',
);
const goalEval7 = JSON.parse(read('.agents/skills/ws-goal-fix-pr/evals/evals.json')).evals.find(
  (e) => e.id === 7,
);
assert(
  goalEval7 && /post-round learning/i.test(goalEval7.assertions.join(' ')),
  'goal-fix-pr eval id 7 covers post-round learning',
);
const eval8 = evals.evals.find((e) => e.id === 8);
const eval9 = evals.evals.find((e) => e.id === 9);
const goalEval8 = goalEvals.evals.find((e) => e.id === 8);
assert(eval8 && /one batch-wide fixPrPlan/i.test(eval8.expected_output), 'fix-pr eval covers one batch pair');
assert(eval9 && /structured amendment before/i.test(eval9.expected_output), 'fix-pr eval covers amendment-before-edit');
assert(
  goalEval8 && /never finish outer Step 9/i.test(goalEval8.assertions.join(' ')),
  'goal-fix-pr eval covers no early Step 9 finish',
);

// AC7 / AC8 — evals second-path, skip reason, MEMORY consult-skipped
const eval4 = evals.evals.find((e) => e.id === 4);
const eval5 = evals.evals.find((e) => e.id === 5);
const eval6 = evals.evals.find((e) => e.id === 6);
assert(eval4 && /second|refresh/i.test(eval4.prompt), 'eval id 4 second-path same-class');
assert(
  eval4.assertions.some((a) => /proactiveSkipped|proactiveFixed/i.test(a)),
  'eval id 4 asserts proactive report fields',
);
assert(eval5 && /proactiveSkipped|size gate|large/i.test(eval5.prompt + eval5.expected_output), 'eval id 5 explicit skip');
assert(eval6 && /MEMORY/i.test(eval6.prompt), 'eval id 6 MEMORY missing scenario');
assert(
  eval6.assertions.some((a) => /consult-skipped/i.test(a)),
  'eval id 6 consult-skipped not fatal',
);

const normalizedAutoFix = autoFix.replace(/\r\n/g, '\n');
const autoFixBlob = createHash('sha1')
  .update(`blob ${Buffer.byteLength(normalizedAutoFix, 'utf8')}\0`)
  .update(normalizedAutoFix, 'utf8')
  .digest('hex');
assert(autoFixBlob === '59e51b370edd51d6b8ae5ef87c9a9c29b931cf9b', 'AUTO_FIX.md remains byte-for-byte unchanged');
assert(!/fixPrPlan|fixPrExec/.test(autoFix), 'AUTO_FIX.md contains no dual-model role contract');

// AC10 — sabotage guardrail still referenced in harness test sibling
const hermes = read('test/test-hermes-spec-to-pr-enhancements.js');
assert(hermes.includes('run_sabotage.py'), 'sabotage guardrail test still present');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-fix-pr-proactive-class-sweep: ok');
