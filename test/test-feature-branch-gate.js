/**
 * Feature branch gate contract tests (AC1–AC11).
 * Run: node test/test-feature-branch-gate.js
 *
 * Grep contracts against skill prose — no live git E2E.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SHARED = path.join(REPO_ROOT, '.agents/skills/ws-shared');
const SETUP_MD = path.join(SHARED, 'setup.md');
const GATES_MD = path.join(SHARED, 'gates.md');
const SHIP_SKILL = path.join(REPO_ROOT, '.agents/skills/ws-ship-pr/SKILL.md');
const ORCH_STANDARD = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr/SKILL.md');
const ORCH_LITE = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr-lite/SKILL.md');

const NL = '\\r?\\n';

let failures = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
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
const ship = read(SHIP_SKILL);
const orchStandard = read(ORCH_STANDARD);
const orchLite = read(ORCH_LITE);

/** Gate copy must live only in setup.md (not forked into orch bodies). */
const GATE_COPY_SNIPPET =
  'Git branch for this workflow (HEAD: {currentBranch}; base: {baseBranch})';

// ---------------------------------------------------------------------------
// AC1 — testGateThreeChoicesAndHs1
// ---------------------------------------------------------------------------

function testGateThreeChoicesAndHs1() {
  assert(
    /Create feature branch from current HEAD/.test(setup) &&
      /Create feature branch from \{baseBranch\}/.test(setup) &&
      /Stay on \{currentBranch\}/.test(setup),
    'testGateThreeChoicesAndHs1: setup.md has three primary choices',
  );
  assert(
    /Option \*\*2\*\* when `\{currentBranch\}` is in the protected set/.test(setup) &&
      /Option \*\*1\*\* otherwise/.test(setup),
    'testGateThreeChoicesAndHs1: recommended-option rule documented',
  );
  assert(
    /Cancel.*HS-1|HS-1.*never infer yes/i.test(setup),
    'testGateThreeChoicesAndHs1: cancel maps to HS-1',
  );
  assert(
    /Feature branch \(new start\).*Stay on current/s.test(gates),
    'testGateThreeChoicesAndHs1: gates.md auto-gate new-start stay row',
  );
  const identityIdx = setup.search(/5\.\s+\*\*Identity\*\*/);
  const gateIdx = setup.search(/5b\.\s+\*\*Feature branch gate/);
  const baselineIdx = setup.search(/6\.\s+\*\*Baseline\*\*/);
  assert(
    identityIdx >= 0 && gateIdx > identityIdx && baselineIdx > gateIdx,
    'testGateThreeChoicesAndHs1: Feature branch gate (5b) after Identity and before Baseline',
  );
}

// ---------------------------------------------------------------------------
// AC2 — testBaseBranchResolution
// ---------------------------------------------------------------------------

function testBaseBranchResolution() {
  assert(
    /config\.json.*project\.baseBranch|project\.baseBranch/.test(setup),
    'testBaseBranchResolution: setup.md cites config.project.baseBranch',
  );
  assert(
    /detect-base-branch\.sh/.test(setup),
    'testBaseBranchResolution: setup.md cites detect-base-branch.sh',
  );
  assert(
    /never treat `master` as the sole hardcoded base/i.test(setup),
    'testBaseBranchResolution: gate copy forbids master-only hardcode',
  );
  const soleMasterOnly = /base[^`]*`master`[^`]*\)/i.test(
    setup.replace(/main.*master|master.*main/g, ''),
  );
  assert(
    !soleMasterOnly,
    'testBaseBranchResolution: no base example hardcodes only master without guard',
  );
}

// ---------------------------------------------------------------------------
// AC3 — testCreateFromCurrentRecipe
// ---------------------------------------------------------------------------

function testCreateFromCurrentRecipe() {
  assert(
    /git checkout -b \{name\}` from HEAD/.test(setup),
    'testCreateFromCurrentRecipe: documents git checkout -b from HEAD',
  );
  assert(
    /feat\/\{slug\}/.test(setup),
    'testCreateFromCurrentRecipe: default branch name feat/{slug}',
  );
  assert(
    new RegExp(
      `State write \\(mandatory before step 6\\)[\\s\\S]*?branch[\\s\\S]*?before step 6`,
      'i',
    ).test(setup) || /mandatory before step 6[\s\S]*`branch`/.test(setup),
    'testCreateFromCurrentRecipe: state.branch written before step 6 baseline',
  );
  assert(
    /branchStrategy.*from-current/.test(setup),
    'testCreateFromCurrentRecipe: branchStrategy from-current documented',
  );
}

// ---------------------------------------------------------------------------
// AC4 — testCreateFromBaseAndDirtyStop
// ---------------------------------------------------------------------------

function testCreateFromBaseAndDirtyStop() {
  assert(
    /git fetch \{gitRemote\} \{baseBranch\}/.test(setup),
    'testCreateFromBaseAndDirtyStop: fetch remote base documented',
  );
  assert(
    /--no-track/.test(setup),
    'testCreateFromBaseAndDirtyStop: create-from-base uses --no-track so @{u} does not track base',
  );
  assert(
    /git checkout -b \{name\} \{baseBranch\}/.test(setup),
    'testCreateFromBaseAndDirtyStop: local base checkout documented',
  );
  assert(
    /Stash then continue/.test(setup) &&
      /Switch to create-from-current/.test(setup) &&
      /Cancel \(HS-1\)/.test(setup),
    'testCreateFromBaseAndDirtyStop: dirty STOP offers stash / from-current / cancel',
  );
  assert(
    /Never `git reset --hard`/i.test(setup),
    'testCreateFromBaseAndDirtyStop: forbids reset --hard',
  );
  assert(
    /branchStrategy.*from-base/.test(setup),
    'testCreateFromBaseAndDirtyStop: branchStrategy from-base documented',
  );
}

// ---------------------------------------------------------------------------
// AC5 — testStayAndDetached
// ---------------------------------------------------------------------------

function testStayAndDetached() {
  assert(
    /No checkout\/create/.test(setup) && /branchStrategy.*stay/.test(setup),
    'testStayAndDetached: stay = no create/switch; branchStrategy stay',
  );
  assert(
    /stay is invalid/i.test(setup) && /detached/i.test(setup),
    'testStayAndDetached: detached HEAD cannot stay',
  );
}

// ---------------------------------------------------------------------------
// AC6 — testExistingFeatSlug
// ---------------------------------------------------------------------------

function testExistingFeatSlug() {
  assert(
    /Check out existing `feat\/\{slug\}`/.test(setup) &&
      /Enter a different branch name/.test(setup) &&
      /Stay on `\{currentBranch\}`/.test(setup) &&
      /Cancel \(HS-1\)/.test(setup),
    'testExistingFeatSlug: existing feat/{slug} offers checkout-existing / different / stay / cancel',
  );
  assert(
    /git branch --list feat\/\{slug\}/.test(setup) &&
      /git ls-remote --heads \{gitRemote\} feat\/\{slug\}/.test(setup) &&
      /alternate name[\s\S]*ls-remote/.test(setup),
    'testExistingFeatSlug: existence uses local list + ls-remote; re-check alternate names',
  );
  assert(
    /fails for auth\/network/.test(setup) &&
      /Never infer "branch absent"/.test(setup),
    'testExistingFeatSlug: ls-remote auth/network failure does not infer absent',
  );
  assert(
    /Never `git reset`/.test(setup) && /never `git branch -D`/i.test(setup),
    'testExistingFeatSlug: no reset / -D on existing branch',
  );
  assert(
    /checkout-existing/.test(setup),
    'testExistingFeatSlug: checkout-existing branchStrategy documented',
  );
  assert(
    /git fetch \{gitRemote\} \{name\}/.test(setup) &&
      /git checkout \{name\}/.test(setup),
    'testExistingFeatSlug: remote-only feat/{slug} fetch then checkout',
  );
}

// ---------------------------------------------------------------------------
// AC7 — testResumeSkipAndMismatch
// ---------------------------------------------------------------------------

function testResumeSkipAndMismatch() {
  assert(
    /skip bootstrap[\s\S]*5b Feature branch gate[\s\S]*do not re-run/i.test(setup),
    'testResumeSkipAndMismatch: resume skips 5b feature branch gate',
  );
  const resumeSection = setup.split('Branch resume')[1] ?? '';
  assert(
    resumeSection.includes('Check out `{state.branch}` (Recommended)') &&
      resumeSection.includes('Cancel (HS-1)'),
    'testResumeSkipAndMismatch: HEAD mismatch STOP offers checkout-recorded / cancel in 4b',
  );
  assert(
    /Feature branch resume mismatch.*Check out `state\.branch`/s.test(gates),
    'testResumeSkipAndMismatch: gates.md resume-mismatch auto-gate row',
  );
  assert(
    /branch-resume \| auto \| checkout/.test(setup),
    'testResumeSkipAndMismatch: autoMode resume checkout logged',
  );
}

// ---------------------------------------------------------------------------
// AC8 — testAutoModeStayAndDryRun
// ---------------------------------------------------------------------------

function testAutoModeStayAndDryRun() {
  assert(
    /`autoMode`[\s\S]*?stay[\s\S]*?current HEAD/i.test(setup) &&
      /branch-gate \| auto \| stay/.test(setup) &&
      /Never persist the literal `HEAD`/.test(setup) &&
      /detached[\s\S]*?create `feat\/\{slug\}` from HEAD/.test(setup),
    'testAutoModeStayAndDryRun: autoMode stay + detached creates feat/{slug}; never persist HEAD',
  );
  assert(
    /local-check-only/.test(setup) &&
      /never infer "branch absent" from a failed `ls-remote`/.test(setup),
    'testAutoModeStayAndDryRun: autoMode ls-remote auth/network falls back to local-check-only',
  );
  assert(
    /`dryRun`:.*no ref mutation/i.test(setup) &&
      /do not run `git checkout -b`/.test(setup),
    'testAutoModeStayAndDryRun: dryRun documents no git ref mutation',
  );
}

// ---------------------------------------------------------------------------
// AC9 — testShipPrWorkflowHead
// ---------------------------------------------------------------------------

function testShipPrWorkflowHead() {
  assert(
    /workflowMode: true[\s\S]*state\.branch/.test(ship) &&
      /shipHead/.test(ship) &&
      /confirm active branch is `shipHead`/.test(ship),
    'testShipPrWorkflowHead: workflow-mode head/preflight uses state.branch via shipHead',
  );
  assert(
    /Standalone.*workingBranch/.test(ship) || /else `config\.project\.workingBranch`/.test(ship),
    'testShipPrWorkflowHead: standalone still defaults to workingBranch',
  );
  assert(
    /Never rewrite `config\.project\.workingBranch`/i.test(ship) ||
      /Do \*\*not\*\* rewrite `config\.project\.workingBranch`/i.test(ship),
    'testShipPrWorkflowHead: explicit do-not-rewrite workingBranch',
  );
  assert(
    /pull only when upstream exists/i.test(ship) &&
      /skip pull/i.test(ship) &&
      /skipped \(no upstream\)/i.test(ship) &&
      /git ls-remote --heads/.test(ship) &&
      /Do \*\*not\*\* trust `@\{u\}`/.test(ship),
    'testShipPrWorkflowHead: skip pull when ls-remote misses head; do not trust @{u}',
  );
}

// ---------------------------------------------------------------------------
// AC10 — testSharedSetupNoOrchFork
// ---------------------------------------------------------------------------

function testSharedSetupNoOrchFork() {
  assert(
    /setup\.md/.test(orchStandard),
    'testSharedSetupNoOrchFork: ws-spec-to-pr references setup.md',
  );
  assert(
    /setup\.md/.test(orchLite),
    'testSharedSetupNoOrchFork: ws-spec-to-pr-lite references setup.md',
  );
  assert(
    !orchStandard.includes(GATE_COPY_SNIPPET) && !orchLite.includes(GATE_COPY_SNIPPET),
    'testSharedSetupNoOrchFork: neither orch SKILL.md contains forked three-choice gate body',
  );
  assert(
    /\| `branch` \|[\s\S]*?\| `baseBranch` \|/.test(setup),
    'testSharedSetupNoOrchFork: init banner has branch / baseBranch rows',
  );
  assert(
    /Feature branch gate result|re-print the init banner `branch`/.test(setup),
    'testSharedSetupNoOrchFork: setup.md describes banner sync after gate',
  );
}

// ---------------------------------------------------------------------------
// AC11 — testProtectedStayWarning
// ---------------------------------------------------------------------------

function testProtectedStayWarning() {
  assert(
    /`main`, `master`, `develop`/.test(setup) &&
      /config\.project\.baseBranch/.test(setup) &&
      /config\.project\.workingBranch/.test(setup),
    'testProtectedStayWarning: protected set includes main/master/develop + configured base/working',
  );
  assert(
    /AC11 warning.*ship will use/i.test(setup) ||
      /option 3 copy \*\*must\*\* include the AC11 warning/i.test(setup),
    'testProtectedStayWarning: stay on protected branch includes ship PR head warning',
  );
  assert(
    /Option \*\*2\*\* when `\{currentBranch\}` is in the protected set/.test(setup),
    'testProtectedStayWarning: recommend option 2 when HEAD is protected',
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('============================================================');
console.log('  Feature Branch Gate — Contract Test Suite (T6)');
console.log('============================================================');

console.log('\n[AC1] Three choices, HS-1, gate order');
testGateThreeChoicesAndHs1();

console.log('\n[AC2] Base branch resolution');
testBaseBranchResolution();

console.log('\n[AC3] Create from current HEAD');
testCreateFromCurrentRecipe();

console.log('\n[AC4] Create from base + dirty STOP');
testCreateFromBaseAndDirtyStop();

console.log('\n[AC5] Stay + detached HEAD');
testStayAndDetached();

console.log('\n[AC6] Existing feat/{slug}');
testExistingFeatSlug();

console.log('\n[AC7] Resume skip + mismatch');
testResumeSkipAndMismatch();

console.log('\n[AC8] autoMode + dryRun');
testAutoModeStayAndDryRun();

console.log('\n[AC9] ws-ship-pr workflow head');
testShipPrWorkflowHead();

console.log('\n[AC10] Shared setup, no orch fork');
testSharedSetupNoOrchFork();

console.log('\n[AC11] Protected stay warning');
testProtectedStayWarning();

console.log('\n------------------------------------------------------------');
if (failures > 0) {
  console.error(`FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('All feature-branch-gate tests passed.');
process.exit(0);
