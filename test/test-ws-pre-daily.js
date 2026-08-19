/**
 * Test suite for ws-pre-daily skill & collect_window.py
 * Run: node test/test-ws-pre-daily.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  '.agents/skills/ws-pre-daily/scripts/collect_window.py',
);
const SKILL_MD = path.join(
  REPO_ROOT,
  '.agents/skills/ws-pre-daily/SKILL.md',
);
const OUTPUT_MD = path.join(
  REPO_ROOT,
  '.agents/skills/ws-pre-daily/references/OUTPUT.md',
);
const DEPS_JSON = path.join(REPO_ROOT, 'bin/skill-dependencies.json');
const PYTHON = process.env.PYTHON || 'python';

const tmpRoots = [];
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

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function runGit(repo, args) {
  return cp.spawnSync('git', args, {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: '' },
  });
}

function runPython(args, cwd = REPO_ROOT) {
  return cp.spawnSync(PYTHON, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
}

console.log('Running ws-pre-daily tests...');

try {
  // Test 1: SKILL.md and OUTPUT.md exist and have correct metadata
  assert(fs.existsSync(SKILL_MD), 'ws-pre-daily/SKILL.md exists');
  assert(fs.existsSync(OUTPUT_MD), 'ws-pre-daily/references/OUTPUT.md exists');
  assert(fs.existsSync(SCRIPT), 'ws-pre-daily/scripts/collect_window.py exists');

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const skillContent = fs.readFileSync(SKILL_MD, 'utf8');
  assert(skillContent.includes('name: ws-pre-daily'), 'SKILL.md has name');
  assert(skillContent.includes(`version: ${pkg.version}`), `SKILL.md has version ${pkg.version}`);
  assert(skillContent.includes('pre-daily'), 'SKILL.md has invocation_names');
  assert(skillContent.includes('{skillsRoot}'), 'SKILL.md uses {skillsRoot}');
  assert(skillContent.includes('{plansDir}'), 'SKILL.md uses {plansDir}');

  // Test 2: Registered in bin/skill-dependencies.json
  const deps = JSON.parse(fs.readFileSync(DEPS_JSON, 'utf8'));
  assert(
    deps.packages.workflows.skills.includes('ws-pre-daily'),
    'ws-pre-daily registered in workflows package',
  );
  assert(
    deps.dependencies['ws-pre-daily'] !== undefined,
    'ws-pre-daily defined in dependencies map',
  );

  // Test 3: Non-git repo handling
  const emptyDir = mkTmp('ws-pre-daily-empty-');
  const resEmpty = runPython([SCRIPT, '--repo', emptyDir]);
  assert(resEmpty.status !== 0, 'collect_window exits non-zero on non-git dir');
  const jsonEmpty = JSON.parse(resEmpty.stdout.trim());
  assert(jsonEmpty.ok === false, 'collect_window returns ok: false on non-git dir');
  assert(jsonEmpty.error === 'not-a-git-repo', 'collect_window reports not-a-git-repo');

  // Test 4: Real git fixture repo with commits, plans, and changelog
  const fixtureRepo = mkTmp('ws-pre-daily-repo-');
  runGit(fixtureRepo, ['init', '-b', 'main']);
  runGit(fixtureRepo, ['config', 'user.email', 'tester@example.com']);
  runGit(fixtureRepo, ['config', 'user.name', 'Tester']);

  // Commit on main (base)
  fs.writeFileSync(path.join(fixtureRepo, 'README.md'), '# Fixture\n');
  runGit(fixtureRepo, ['add', 'README.md']);
  runGit(fixtureRepo, ['commit', '-m', 'initial commit on main']);

  // Branch and commit
  runGit(fixtureRepo, ['checkout', '-b', 'feat/test-feature']);
  fs.writeFileSync(path.join(fixtureRepo, 'feature.txt'), 'feature content\n');
  runGit(fixtureRepo, ['add', 'feature.txt']);
  runGit(fixtureRepo, ['commit', '-m', 'feat(core): add feature implementation']);

  // Create plans directory and sample state.md
  const plansDir = path.join(fixtureRepo, '.agents', 'plans');
  const usDir = path.join(plansDir, 'us-100');
  fs.mkdirSync(usDir, { recursive: true });

  const stateContent = `---
workflowType: standard
workflowId: us-100-20260819T000000Z
slug: us-100
us: us-100
title: "Test Feature Delivery"
currentStep: 8
branch: feat/test-feature
pr: "https://github.com/example/repo/pull/123"
---
# Workflow State: us-100
`;
  fs.writeFileSync(path.join(usDir, 'us-100-state.state.md'), stateContent);

  // Create changelog file with recent dynamic timestamp
  const recentTime = new Date(Date.now() - 2 * 3600 * 1000).toISOString().slice(0, 16).replace('T', ' ');
  const changelogPath = path.join(fixtureRepo, 'CHANGELOG.md');
  const changelogContent = `# Changelog

### [${recentTime}] us-100: Shipped Test Feature
- Added feature implementation
- Verified automated tests
`;
  fs.writeFileSync(changelogPath, changelogContent);

  // Execute collector on fixture
  const resFixture = runPython([
    SCRIPT,
    '--repo',
    fixtureRepo,
    '--plans-dir',
    plansDir,
    '--changelog',
    changelogPath,
    '--hours',
    '48',
    '--all-authors',
  ]);

  assert(resFixture.status === 0, 'collect_window exits 0 on valid git fixture');
  const jsonFixture = JSON.parse(resFixture.stdout.trim());
  assert(jsonFixture.ok === true, 'collect_window returns ok: true');
  assert(jsonFixture.window.hours === 48, 'collect_window reflects window.hours');
  assert(jsonFixture.git.currentBranch === 'feat/test-feature', 'git currentBranch parsed');
  assert(jsonFixture.git.commits.length >= 2, 'git commits collected');

  const mainCommit = jsonFixture.git.commits.find((c) => c.subject === 'initial commit on main');
  assert(mainCommit && mainCommit.onBase === true, 'base commit has onBase: true');

  const featCommit = jsonFixture.git.commits.find((c) => c.subject.includes('add feature implementation'));
  assert(featCommit && featCommit.onBase === false, 'feature commit has onBase: false');

  assert(jsonFixture.plans.length === 1, 'plans collected exactly 1 state.md');
  assert(jsonFixture.plans[0].usId === 'us-100', 'plan usId extracted');
  assert(jsonFixture.plans[0].title === 'Test Feature Delivery', 'plan title extracted');
  assert(jsonFixture.plans[0].currentStep === '8', 'plan currentStep extracted');
  assert(jsonFixture.plans[0].pr === 'https://github.com/example/repo/pull/123', 'plan pr extracted');

  assert(jsonFixture.changelog.length === 1, 'changelog entries extracted');
  assert(jsonFixture.changelog[0].heading.includes(recentTime), 'changelog heading parsed');
  assert(jsonFixture.gaps.length === 0, 'no gaps reported when all paths valid');

  // Test 5: Gap reporting when paths are missing
  const resMissing = runPython([
    SCRIPT,
    '--repo',
    fixtureRepo,
    '--plans-dir',
    path.join(fixtureRepo, 'non-existent-plans'),
    '--changelog',
    path.join(fixtureRepo, 'non-existent-changelog.md'),
  ]);
  assert(resMissing.status === 0, 'collect_window exits 0 when optional paths missing');
  const jsonMissing = JSON.parse(resMissing.stdout.trim());
  assert(jsonMissing.gaps.includes('plans-dir-missing'), 'reports plans-dir-missing gap');
  assert(jsonMissing.gaps.includes('changelog-missing'), 'reports changelog-missing gap');

  // Test 6: Timezone support
  const resTz = runPython([
    SCRIPT,
    '--repo',
    fixtureRepo,
    '--tz',
    'America/Manaus',
  ]);
  assert(resTz.status === 0, 'collect_window exits 0 with --tz');
  const jsonTz = JSON.parse(resTz.stdout.trim());
  assert(jsonTz.window.tz === 'America/Manaus', 'collect_window reflects window.tz');

} finally {
  cleanup();
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed.`);
  process.exit(1);
} else {
  console.log('\nAll ws-pre-daily tests passed successfully.');
}
