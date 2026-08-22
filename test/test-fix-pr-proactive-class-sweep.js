/**
 * fix-pr proactive class sweep (AC1–AC10).
 * Run: node test/test-fix-pr-proactive-class-sweep.js
 */
import fs from 'fs';
import path from 'path';
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
const evals = JSON.parse(read('.agents/skills/ws-fix-pr/evals/evals.json'));

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

// AC10 — sabotage guardrail still referenced in harness test sibling
const hermes = read('test/test-hermes-spec-to-pr-enhancements.js');
assert(hermes.includes('run_sabotage.py'), 'sabotage guardrail test still present');

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('test-fix-pr-proactive-class-sweep: ok');
