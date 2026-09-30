/**
 * Fresh-worker verifier step (ws-fresh-verify) — regression test.
 *
 * Covers AC1-AC8 plus the four spec negative scenarios:
 *  AC1 fresh dispatch construction (compact handoff, prior-output refusal)
 *  AC2 independent verdicts with file:line evidence
 *  AC3 per-AC fault injection with red signal on a scratch worktree
 *  AC4 evidence-or-zero defect listing
 *  AC5 bounded fix loop (max 3 rounds, then Pause)
 *  AC6 step-05b report artifact shape
 *  AC7 stage placement + skip rules
 *  AC8 worktree removal + byte-identical primary
 */
import cp from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, write } = utils;

const SKILL = path.join(repoRoot, '.agents', 'skills', 'ws-fresh-verify');
const BUILD = path.join(SKILL, 'scripts', 'build_fresh_dispatch.cjs');
const INJECT = path.join(SKILL, 'scripts', 'run_fresh_injection.cjs');
const REPORT = path.join(SKILL, 'scripts', 'write_fresh_report.cjs');

function runNode(script, args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd: cwd || repoRoot, encoding: 'utf8' });
}
function lastJson(stdout) {
  return JSON.parse(String(stdout || '').trim().split('\n').at(-1));
}

// ---- CLI hygiene (all three scripts) ----
for (const [script, label] of [[BUILD, 'build'], [INJECT, 'inject'], [REPORT, 'report']]) {
  const help = runNode(script, ['--help']);
  assert(help.status === 0, `${label} --help exits 0`);
  assert(/Usage:/.test(help.stdout || ''), `${label} --help prints usage`);
  const unknown = runNode(script, ['--nope-unknown-flag']);
  assert(unknown.status === 2, `${label} unknown flag exits 2`);
}

// ---- AC1: fresh dispatch construction ----
const specFile = temp('ws-fv-spec-');
const specPath = write(path.join(specFile, 'probe.spec.md'), '---\nslug: probe\n---\n\n## Acceptance Criteria\n\n- AC1: First thing works.\n- AC2: Second thing works.\n');
const planPath = write(path.join(specFile, 'plan.md'), '# plan\n');
const treeDir = temp('ws-fv-tree-');
const handoffPath = path.join(specFile, 'fresh-dispatch.json');
const buildOk = runNode(BUILD, ['--spec', specPath, '--plan', planPath, '--product-tree', treeDir, '--output', handoffPath]);
assert(buildOk.status === 0, 'AC1: dispatch builder emits handoff');
const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
assert.deepStrictEqual(Object.keys(handoff).sort(), ['acList', 'createdAt', 'planOfRecordPath', 'productTreeRoot', 'specPath'], 'AC1: handoff carries only spec/plan/tree/AC list');
assert(handoff.acList.map((row) => row.id).join(',') === 'AC1,AC2', 'AC1: AC list extracted');
for (const refused of ['step-05-probe.plan.report.md', 'step-03-probe.exec.dag.json', 'step-02-probe.plan-interview.md', 'step-06-probe.review.md', 'ac-ledger.json']) {
  const denied = runNode(BUILD, ['--spec', specPath, '--plan', planPath, '--product-tree', treeDir, '--output', handoffPath, '--prior-output', refused]);
  assert(denied.status === 1, `AC1: refuses prior output ${refused}`);
  assert(lastJson(denied.stdout).reason === 'prior-full-step-output', `AC1: refusal reason for ${refused}`);
}
const allowedPlan = runNode(BUILD, ['--spec', specPath, '--plan', planPath, '--product-tree', treeDir, '--output', handoffPath, '--prior-output', planPath]);
assert(allowedPlan.status === 0, 'AC1: plan of record passes the allowlist');

// ---- Injection fixture (git repo; test fails only when invert bites) ----
function makeFixture() {
  const dir = temp('ws-fv-inject-');
  write(path.join(dir, '.ws', 'config.json'), JSON.stringify({ verification: { backendTest: 'node check_pass.cjs' } }));
  write(path.join(dir, 'sample.txt'), 'PASS\n');
  write(
    path.join(dir, 'check_pass.cjs'),
    "const fs = require('fs');\nif (fs.readFileSync('sample.txt', 'utf8').trim() !== 'PASS') { console.error('FAIL: sample stays PASS'); process.exit(1); }\nconsole.log('PASS');\n",
  );
  write(path.join(dir, 'invert.patch'), '--- a/sample.txt\n+++ b/sample.txt\n@@ -1 +1 @@\n-PASS\n+FAIL\n');
  assert(cp.spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' }).status === 0, 'AC3: fixture git init');
  cp.spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir, encoding: 'utf8' });
  cp.spawnSync('git', ['config', 'user.name', 'test'], { cwd: dir, encoding: 'utf8' });
  cp.spawnSync('git', ['config', 'core.autocrlf', 'false'], { cwd: dir, encoding: 'utf8' });
  cp.spawnSync('git', ['add', 'sample.txt', 'check_pass.cjs', '.ws/config.json'], { cwd: dir, encoding: 'utf8' });
  assert(cp.spawnSync('git', ['commit', '-m', 'init'], { cwd: dir, encoding: 'utf8' }).status === 0, 'AC3: fixture commit');
  return dir;
}
function worktreeList(dir) {
  return cp.spawnSync('git', ['worktree', 'list'], { cwd: dir, encoding: 'utf8' }).stdout || '';
}

// ---- AC3 + AC8: injection red signal, removal, byte-identity ----
const fixture = makeFixture();
const beforeBytes = fs.readFileSync(path.join(fixture, 'sample.txt'));
const injectOk = runNode(INJECT, ['--ac', 'AC1', '--test', 'node check_pass.cjs', '--paths', 'sample.txt', '--invert-patch', path.join(fixture, 'invert.patch'), '--worktree-dir', path.join(fixture, 'wt-ac1'), '--repo-root', fixture], fixture);
assert(injectOk.status === 0, `AC3: injection observes red (got ${injectOk.stdout.trim()})`);
const red = lastJson(injectOk.stdout);
assert(red.redObserved === true, 'AC3: redObserved true');
assert(red.failingTest === 'sample stays PASS', 'AC3: failing test name recorded');
assert(red.testExitCode === 1, 'AC3: exit code recorded');
assert(red.testAlias === 'backendTest', 'AC3: configured alias named');
assert(red.restored === true && red.worktreeRemoved === true, 'AC8: restored + worktree removed');
assert(!/wt-ac1/.test(worktreeList(fixture)), 'AC8: no leftover scratch worktree');
assert(Buffer.compare(fs.readFileSync(path.join(fixture, 'sample.txt')), beforeBytes) === 0, 'AC8: primary bytes identical');

// ---- AC3 negative: invert that changes nothing fails ----
const noopPatch = write(path.join(fixture, 'noop.patch'), '--- a/sample.txt\n+++ b/sample.txt\n@@ -1 +1 @@\n-PASS\n+PASS\n');
const injectNoop = runNode(INJECT, ['--ac', 'AC1', '--test', 'node check_pass.cjs', '--paths', 'sample.txt', '--invert-patch', noopPatch, '--worktree-dir', path.join(fixture, 'wt-noop'), '--repo-root', fixture], fixture);
assert(injectNoop.status === 1, 'AC3: no-change invert exits 1');
assert(/invert-did-not-change-every-path|invert-apply-failed/.test(lastJson(injectNoop.stdout).reason), 'AC3: no-change reason named');
assert(!/wt-noop/.test(worktreeList(fixture)), 'AC8: failed injection still removes worktree');

// ---- NS1: fault that does not break the test is a defect, not a pass ----
const tamePatch = write(path.join(fixture, 'tame.patch'), '--- a/check_pass.cjs\n+++ b/check_pass.cjs\n@@ -1,3 +1,3 @@\n-const fs = require(\'fs\');\n+const fs = require(\'fs\'); // tame\n if (fs.readFileSync(\'sample.txt\', \'utf8\').trim() !== \'PASS\') { console.error(\'FAIL: sample stays PASS\'); process.exit(1); }\n console.log(\'PASS\');\n');
const injectTame = runNode(INJECT, ['--ac', 'AC2', '--test', 'node check_pass.cjs', '--paths', 'check_pass.cjs', '--invert-patch', tamePatch, '--worktree-dir', path.join(fixture, 'wt-tame'), '--repo-root', fixture], fixture);
assert(injectTame.status === 1, 'NS1: passing-under-fault exits 1');
assert(lastJson(injectTame.stdout).reason === 'test-passed-with-inverted-code', 'NS1: non-failing injection named');
assert(!/wt-tame/.test(worktreeList(fixture)), 'NS1: tame worktree removed');

// ---- NS3: unrestored injection aborts before any fix dispatch ----
const injectCorrupt = runNode(INJECT, ['--ac', 'AC1', '--test', 'node check_pass.cjs', '--paths', 'sample.txt', '--invert-patch', path.join(fixture, 'invert.patch'), '--worktree-dir', path.join(fixture, 'wt-corrupt'), '--repo-root', fixture, '--simulate-restore-failure'], fixture);
assert(injectCorrupt.status === 1, 'NS3: restore failure exits 1');
assert(lastJson(injectCorrupt.stdout).reason === 'restore-failure-simulated', 'NS3: restore failure named');
assert(Buffer.compare(fs.readFileSync(path.join(fixture, 'sample.txt')), beforeBytes) === 0, 'NS3: primary untouched by corrupt run');

// ---- AC4/AC5/AC6 + NS2/NS4: evidence-or-zero, loop bound, report shape ----
const verdictsBoth = [{ ac: 'AC1', verdict: 'pass', evidence: 'a.js:L1-L5' }, { ac: 'AC2', verdict: 'pass', evidence: null }];
const injectionsBoth = [
  { ac: 'AC1', redObserved: true, failingTest: 'boom', testExitCode: 1, restored: true, worktreeRemoved: true },
  { ac: 'AC2', redObserved: false, failingTest: null, testExitCode: 0, restored: true, worktreeRemoved: true },
];
const verdictsFile = write(path.join(specFile, 'verdicts.json'), JSON.stringify(verdictsBoth));
const injectionsFile = write(path.join(specFile, 'injections.json'), JSON.stringify(injectionsBoth));
const report1 = path.join(specFile, 'fresh-verify-r1.md');
const scored1 = runNode(REPORT, ['--slug', 'probe', '--verdicts', verdictsFile, '--injections', injectionsFile, '--output', report1, '--round', '1']);
assert(scored1.status === 1, 'AC4: defects exit 1');
assert(lastJson(scored1.stdout).loopAction === 'continue', 'AC5: round 1 continues');
const body1 = fs.readFileSync(report1, 'utf8');
assert(/\| AC1 \| pass \| a\.js:L1-L5 \| boom \(exit 1\) \| 1 \|/.test(body1), 'AC2: pass evidence + red scores 1');
assert(/\| AC2 \| pass \| \*none\* \| \*none\* \| 0 \|/.test(body1), 'AC4/NS2: zero-evidence AC scores zero');
assert(/\*\*AC2\*\*: missing pass evidence \+ missing red signal/.test(body1), 'AC4: defect names both gaps');
assert(/## Per-AC Verdicts/.test(body1) && /## Injection Results/.test(body1) && /## Defects/.test(body1) && /## Round History/.test(body1), 'AC6: report carries all sections');
const report3 = path.join(specFile, 'fresh-verify-r3.md');
const scored3 = runNode(REPORT, ['--slug', 'probe', '--verdicts', verdictsFile, '--injections', injectionsFile, '--output', report3, '--round', '3']);
assert(scored3.status === 1, 'NS4: exhausted rounds exit 1');
assert(lastJson(scored3.stdout).loopAction === 'pause', 'AC5/NS4: round 3 pauses');
assert(/- \[ \] \*\*AC2\*\*: missing pass evidence/.test(fs.readFileSync(report3, 'utf8')), 'NS4: residual list names AC2');
const cleanVerdicts = write(path.join(specFile, 'verdicts-clean.json'), JSON.stringify([{ ac: 'AC1', verdict: 'pass', evidence: 'a.js:L1' }]));
const cleanInjections = write(path.join(specFile, 'injections-clean.json'), JSON.stringify([{ ac: 'AC1', redObserved: true, failingTest: 'boom', testExitCode: 1, restored: true, worktreeRemoved: true }]));
const scoredClean = runNode(REPORT, ['--slug', 'probe', '--verdicts', cleanVerdicts, '--injections', cleanInjections, '--output', path.join(specFile, 'fresh-verify-clean.md'), '--round', '2']);
assert(scoredClean.status === 0, 'AC5: zero defects exits 0');
assert(lastJson(scoredClean.stdout).loopAction === 'done', 'AC5: zero defects done');

// ---- AC7: placement, registry, skip rule ----
const dispatch = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md'), 'utf8');
assert(/### Step 6b — Fresh-worker verify/.test(dispatch), 'AC7: STEP-DISPATCH carries the 6b section');
assert(/After Step 6 review completes and before Step 7 testing/.test(dispatch), 'AC7: placement after 6 before 7');
assert(/--skip no-product-changes/.test(dispatch), 'AC7: skip rule named');
const artifacts = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-spec-to-pr/ARTIFACTS.md'), 'utf8');
assert(/step-05b-\{slug\}\.fresh-verify\.md/.test(artifacts), 'AC7: ARTIFACTS registers the report');
const gates = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/gates.md'), 'utf8');
assert(/## Fresh-verify fix loop/.test(gates), 'AC7: gates carry the fix loop');
const ownership = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/git-ownership.md'), 'utf8');
assert(/ws-fresh-verify/.test(ownership), 'AC7: ownership matrix lists the skill');
const skipReport = path.join(specFile, 'fresh-verify-skip.md');
const skipped = runNode(REPORT, ['--slug', 'probe', '--output', skipReport, '--skip', 'no-product-changes']);
assert(skipped.status === 0, 'AC7: skip marker exits 0');
assert(/no-product-changes/.test(fs.readFileSync(skipReport, 'utf8')), 'AC7: skip marker written');

// ---- Registration + skill hygiene ----
for (const deps of ['bin/skill-dependencies.json', '.agents/skills/ws-shared/runtime/skill-dependencies.json']) {
  const graph = JSON.parse(fs.readFileSync(path.join(repoRoot, deps), 'utf8'));
  assert(graph.packages.workflows.skills.includes('ws-fresh-verify'), `registration: workflows list in ${deps}`);
  assert(graph.dependencies['ws-spec-to-pr'].includes('ws-fresh-verify'), `registration: orch deps in ${deps}`);
}
assert(/ws-fresh-verify/.test(fs.readFileSync(path.join(repoRoot, 'CATALOG.md'), 'utf8')), 'registration: CATALOG row');
assert(/ws-fresh-verify/.test(fs.readFileSync(path.join(repoRoot, 'FEATURES.md'), 'utf8')), 'registration: FEATURES row');
assert(/ws-fresh-verify/.test(fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8')), 'registration: README row');
assert(/ws-fresh-verify/.test(fs.readFileSync(path.join(repoRoot, 'AGENTS.md'), 'utf8')), 'registration: AGENTS row');
const skillBody = fs.readFileSync(path.join(SKILL, 'SKILL.md'), 'utf8');
assert(skillBody.split('\n').length <= 150, 'hygiene: SKILL.md stays within the 150-line tier budget');
assert(!/\.py\b/.test(skillBody), 'hygiene: no Python runtime in the skill body');

console.log('test-fresh-verify: all assertions passed');
