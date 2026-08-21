/**
 * Hermes spec-to-pr enhancements (AC1–AC6).
 * Run: node test/test-hermes-spec-to-pr-enhancements.js
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
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

const contract = read('.agents/skills/ws-shared/scm-provider-contract.md');
const ghSkill = read('.agents/skills/ws-github-provider/SKILL.md');
const ghIntents = read('.agents/skills/ws-github-provider/INTENTS.md');
const adoSkill = read('.agents/skills/ws-azure-devops-provider/SKILL.md');
const adoIntents = read('.agents/skills/ws-azure-devops-provider/INTENTS.md');
const stepDispatch = read('.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md');
const lite = read('.agents/skills/ws-spec-to-pr-lite/SKILL.md');
const implement = read('.agents/skills/ws-implement-tasks/SKILL.md');
const review = read('.agents/skills/ws-code-review/SKILL.md');
const verify = read('.agents/skills/ws-verify-plan/SKILL.md');
const testing = read('.agents/skills/ws-testing/SKILL.md');
const writeSpec = read('.agents/skills/ws-write-spec/SKILL.md');
const format = read('.agents/skills/ws-spec-format/FORMAT.md');
const writePlan = read('.agents/skills/ws-write-plan/SKILL.md');
const ship = read('.agents/skills/ws-ship-pr/SKILL.md');
const fixPr = read('.agents/skills/ws-fix-pr/SKILL.md');
const goalFix = read('.agents/skills/ws-goal-fix-pr/SKILL.md');
const tools = read('.agents/skills/ws-shared/tools.md');
const readme = read('README.md');
const catalog = read('docs/index.html');

for (const id of ['sweep-prior-work', 'comment-issue']) {
  assert(contract.includes(`\`${id}\``), `contract Required intents includes ${id}`);
  assert(ghSkill.includes(id), `GitHub SKILL includes ${id}`);
  assert(ghIntents.includes(`## \`${id}\``), `GitHub INTENTS heading ${id}`);
  assert(adoSkill.includes(id), `ADO SKILL includes ${id}`);
  assert(adoIntents.includes(`## \`${id}\``), `ADO INTENTS heading ${id}`);
}

assert(/log-failed|baseline|flake|infra-flake/i.test(contract), 'check-pr-status guarantee mentions triage tokens');
assert(/gh run view.*log-failed/i.test(ghIntents), 'GitHub INTENTS log-failed recipe');
assert(/pipelines runs show|build log/i.test(adoIntents), 'ADO INTENTS build log parity');

assert(/Prior Work Sweep/i.test(format), 'FORMAT Prior Work Sweep');
assert(/sweep-prior-work/i.test(writeSpec), 'write-spec sweep dispatch');
assert(/git log -p -S|git log -L/i.test(writeSpec), 'write-spec design intent git log');
assert(/git log -p -S|git log -L/i.test(writePlan), 'write-plan design intent git log');

assert(/Fix the Entire Defect Class|repo-wide/i.test(implement), 'implement-tasks defect class scope');
assert(/beyond the diff|sibling modules/i.test(review), 'code-review sibling beyond diff');

assert(/run_sabotage\.py/i.test(verify), 'verify-plan sabotage script');
assert(/score \*\*< 9\*\*/i.test(verify), 'verify-plan fail-closed < 9');
assert(!/below 7|cap below 7/i.test(verify), 'verify-plan no below-7 cap');

assert(/run_sabotage\.py/i.test(testing), 'testing sabotage when mutation unset');

assert(/prior-work sweep/i.test(stepDispatch), 'STEP-DISPATCH Step 0 sweep');
assert(/Regression Sabotage/i.test(stepDispatch), 'STEP-DISPATCH sabotage');
assert(/comment-issue/i.test(stepDispatch), 'STEP-DISPATCH close-loop');
assert(/prior-work sweep/i.test(lite), 'lite Step 0 prior-work');
assert(/standard-orch Steps 5 and 7 only|standard-orch Step/i.test(lite), 'lite sabotage standard-only');

assert(/comment-issue/i.test(ship), 'ship-pr comment-issue dispatch');
assert(/check-pr-status/i.test(ship), 'ship-pr check-pr-status');
assert(/baseline/i.test(fixPr) && /check-pr-status/i.test(fixPr), 'fix-pr baseline triage');
assert(/baseline/i.test(goalFix) && /check-pr-status/i.test(goalFix), 'goal-fix-pr baseline triage');

assert(tools.includes('sweep-prior-work'), 'tools.md sweep-prior-work');
assert(tools.includes('comment-issue'), 'tools.md comment-issue');
assert(tools.includes('check-pr-status'), 'tools.md check-pr-status');
assert(/close-loop/i.test(tools), 'tools.md close-loop alias');

assert(readme.includes('Hermes delivery disciplines'), 'README Hermes feature bullets');
assert(/prior-work|sabotage|check-pr-status|comment-issue/i.test(readme), 'README Hermes keywords');

assert(catalog.includes('Hermes delivery disciplines'), 'catalog Hermes feature card');
assert(/prior-work|sabotage|check-pr-status|comment-issue/i.test(catalog), 'catalog Hermes keywords');

// sweep_prior_work dry-run JSON paths (GitHub)
const sweepDry = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-github-provider/scripts/sweep_prior_work.py'),
    '--dry-run',
    '--keywords',
    'hermes',
  ],
  { cwd: REPO, encoding: 'utf8' },
);
assert(sweepDry.status === 0, 'GitHub sweep_prior_work.py --dry-run exits 0');
const sweepJson = JSON.parse(sweepDry.stdout || '{}');
assert(sweepJson.repoRoot === '.', 'GitHub sweep JSON repoRoot relative');
assert(!/^[A-Za-z]:/.test(JSON.stringify(sweepJson)), 'GitHub sweep JSON no drive letters');

// sweep_prior_work dry-run JSON paths (ADO parity)
const adoSweepDry = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-azure-devops-provider/scripts/sweep_prior_work.py'),
    '--dry-run',
    '--keywords',
    'hermes',
    '--files',
    path.join(REPO, 'README.md'),
  ],
  { cwd: REPO, encoding: 'utf8' },
);
assert(adoSweepDry.status === 0, 'ADO sweep_prior_work.py --dry-run exits 0');
const adoSweepJson = JSON.parse(adoSweepDry.stdout || '{}');
assert(adoSweepJson.repoRoot === '.', 'ADO sweep JSON repoRoot relative');
assert(!/^[A-Za-z]:/.test(JSON.stringify(adoSweepJson)), 'ADO sweep JSON no drive letters');
assert(
  !(adoSweepJson.commits || []).some((c) => (c.files || []).some((f) => /^[A-Za-z]:/.test(f))),
  'ADO sweep commit file paths repo-relative',
);

// comment_issue skip + dry-run
const commentSkip = spawnSync(
  'python',
  [path.join(SKILLS, 'ws-github-provider/scripts/comment_issue.py'), '--id', 'null', '--body', 'x'],
  { cwd: REPO, encoding: 'utf8' },
);
assert(commentSkip.status === 0, 'comment_issue null id skipped');
assert(/skipped/.test(commentSkip.stdout || ''), 'comment_issue skipped status');

// sabotage fixture (git repo; test fails only when invert bites)
const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-sabotage-'));
const relFixture = 'sample.txt';
const fixtureFile = path.join(fixtureDir, relFixture);
const otherFile = path.join(fixtureDir, 'other.txt');
fs.writeFileSync(fixtureFile, 'PASS', 'utf8');
fs.writeFileSync(otherFile, 'clean', 'utf8');
const patchFile = path.join(fixtureDir, 'invert.patch');
fs.writeFileSync(patchFile, '--- a/sample.txt\n+++ b/sample.txt\n@@ -1 +1 @@\n-PASS\n+FAIL\n', 'utf8');

const gitInit = spawnSync('git', ['init'], { cwd: fixtureDir, encoding: 'utf8' });
assert(gitInit.status === 0, 'sabotage fixture git init');
spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: fixtureDir, encoding: 'utf8' });
spawnSync('git', ['config', 'user.name', 'test'], { cwd: fixtureDir, encoding: 'utf8' });
spawnSync('git', ['config', 'core.autocrlf', 'false'], { cwd: fixtureDir, encoding: 'utf8' });
spawnSync('git', ['add', relFixture, 'other.txt'], { cwd: fixtureDir, encoding: 'utf8' });
spawnSync('git', ['commit', '-m', 'init'], { cwd: fixtureDir, encoding: 'utf8' });
fs.writeFileSync(otherFile, 'dirty', 'utf8');

const checkScript = path.join(fixtureDir, 'check_pass.py');
fs.writeFileSync(
  checkScript,
  "import pathlib, sys\nsys.exit(0 if pathlib.Path('sample.txt').read_text(encoding='utf-8').strip() == 'PASS' else 1)\n",
  'utf8',
);
const passTest = 'python check_pass.py';

const sabotage = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-testing/scripts/run_sabotage.py'),
    '--test',
    passTest,
    '--paths',
    relFixture,
    '--invert-patch',
    'invert.patch',
    '--repo-root',
    fixtureDir,
  ],
  { cwd: fixtureDir, encoding: 'utf8' },
);
assert(sabotage.status === 0, 'run_sabotage bites then restores');
assert(fs.readFileSync(fixtureFile, 'utf8') === 'PASS', 'fixture restored after sabotage');
assert(fs.readFileSync(otherFile, 'utf8') === 'dirty', 'other dirty tracked file untouched by restore proof');

const sabotageFail = spawnSync(
  'python',
  [
    path.join(SKILLS, 'ws-testing/scripts/run_sabotage.py'),
    '--test',
    'exit 0',
    '--paths',
    relFixture,
    '--invert-patch',
    'invert.patch',
    '--repo-root',
    fixtureDir,
    '--simulate-restore-failure',
  ],
  { cwd: fixtureDir, encoding: 'utf8' },
);
assert(sabotageFail.status === 1, 'simulate restore failure aborts non-zero');
fs.rmSync(fixtureDir, { recursive: true, force: true });

const pyScripts = [
  'ws-github-provider/scripts/sweep_prior_work.py',
  'ws-github-provider/scripts/comment_issue.py',
  'ws-azure-devops-provider/scripts/sweep_prior_work.py',
  'ws-azure-devops-provider/scripts/comment_issue.py',
  'ws-testing/scripts/run_sabotage.py',
];
for (const rel of pyScripts) {
  const c = spawnSync('python', ['-m', 'py_compile', path.join(SKILLS, rel)], { encoding: 'utf8' });
  assert(c.status === 0, `py_compile ${rel}`);
}

if (failures) {
  console.error(`\n${failures} hermes enhancement check(s) failed.`);
  process.exit(1);
}
console.log('\nAll hermes spec-to-pr enhancement checks passed.');
