/**
 * user-gate option-count portability contract.
 * Run: node test/test-user-gate-option-cap.js
 *
 * Regression: the setup.md unfinished-workflow resume gate rendered one
 * question with N+2 options (resume #1..N + start-new + cancel). Hosts whose
 * structured-choice tool caps a question at 3 options reject that request
 * (observed: `question resume-select must have 2-3 options, got 4` with 3
 * unfinished standard workflows). Grep contracts against skill prose.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime');
const SETUP_MD = path.join(SHARED, 'setup.md');
const GATES_MD = path.join(SHARED, 'gates.md');
const TOOLS_MD = path.join(SHARED, 'tools.md');

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

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

const setup = read(SETUP_MD);
const gates = read(GATES_MD);
const tools = read(TOOLS_MD);

function testPortableCeilingDocumented() {
  assert(
    /at most 3 options per question/.test(gates),
    'gates.md documents the portable ceiling (at most 3 options per question)',
  );
  assert(
    /chunk/i.test(gates) && /More/i.test(gates),
    'gates.md names the chunk/paging fallback for longer candidate lists',
  );
  assert(
    /2[–-]3 options per question/.test(tools),
    'tools.md user-gate row states 2-3 options per question',
  );
}

function testResumeGateBounded() {
  const resumeIdx = setup.indexOf('Unfinished Workflow Check');
  const resumeSection = resumeIdx >= 0 ? setup.slice(resumeIdx, resumeIdx + 4000) : '';
  assert(
    resumeSection.length > 0,
    'setup.md keeps the Unfinished Workflow Check gate',
  );
  assert(
    /at most 3 options per question/.test(resumeSection),
    'resume gate bounds every question to at most 3 options',
  );
  assert(
    /More workflows/.test(resumeSection),
    'resume gate pages overflow workflows via More workflows',
  );
  assert(
    !/Cancel for now/.test(setup),
    'resume gate no longer renders Cancel as a numbered option (dismiss = HS-1)',
  );
}

function testResumeBranchesReachable() {
  const resumeIdx = setup.indexOf('Unfinished Workflow Check');
  const resumeSection = resumeIdx >= 0 ? setup.slice(resumeIdx, resumeIdx + 4000) : '';
  assert(
    /Start new workflow from zero/.test(resumeSection),
    'resume gate keeps the start-new branch reachable',
  );
  assert(
    /Resume an existing workflow/.test(resumeSection),
    'resume gate keeps the resume branch reachable',
  );
  assert(
    /HS-1/.test(resumeSection),
    'resume gate keeps cancel reachable via dismiss (HS-1)',
  );
  assert(
    /N == 1/.test(resumeSection),
    'resume gate defines the single-workflow shortcut (no ambiguous pick)',
  );
}

console.log('[cap] Portable ceiling documented');
testPortableCeilingDocumented();

console.log('[cap] Resume gate bounded');
testResumeGateBounded();

console.log('[cap] Resume branches reachable');
testResumeBranchesReachable();

console.log('------------------------------------------------------------');
if (failures > 0) {
  console.error(`FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('All user-gate-option-cap tests passed.');
process.exit(0);
