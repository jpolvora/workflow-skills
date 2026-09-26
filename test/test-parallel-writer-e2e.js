/**
 * Parallel-writer end-to-end test (0138 AC11-AC14): a second writer commits
 * to the base mid-run; the session advances its baseline, keeps its own
 * commit, and leaves foreign paths byte-identical. Plus the warn-only
 * bootstrap concurrency preflight.
 * Run: node test/test-parallel-writer-e2e.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const REFRESH = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'refresh_baseline.cjs');
const PREFLIGHT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-to-pr', 'scripts', 'concurrency_preflight.cjs');

console.log('--- Testing parallel-writer end-to-end ---');

const tmpRoots = [];
function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}
function git(args, cwd) {
  const r = cp.spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return (r.stdout || '').trim();
}

// AC13: second writer commits to base mid-run; session survives intact.
console.log('1. mid-run base advance keeps session commit and foreign bytes');
{
  const work = mkTmp('ws-pw-e2e-');
  git(['init', '-q'], work);
  git(['config', 'user.email', 'test@example.com'], work);
  git(['config', 'user.name', 'test'], work);
  git(['checkout', '-q', '-b', 'base'], work);
  fs.writeFileSync(path.join(work, 'own.txt'), 'own v1\n', 'utf8');
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign v1\n', 'utf8');
  git(['add', '--', 'own.txt', 'foreign.txt'], work);
  git(['commit', '-qm', 'initial'], work);
  const baseline = git(['rev-parse', 'HEAD'], work);

  const stateFile = path.join(work, 'wf.state.json');
  fs.writeFileSync(stateFile, JSON.stringify({
    stateVersion: 3, revision: 0, workflowId: 'wf', slug: 'demo', workflowType: 'standard',
    status: 'active', currentStep: 4, completedSteps: [0, 1, 2, 3], skippedSteps: [],
    baselineCommit: baseline, baselineSourceRef: 'base (local tip)',
    preExistingDirty: ['foreign.txt'],
    workflowManifest: { created: [], modified: ['own.txt'], deleted: [] },
  }), 'utf8');

  // Foreign uncommitted dirt + second writer's upstream commit on an unrelated path.
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign local dirt\n', 'utf8');
  fs.writeFileSync(path.join(work, 'unrelated.txt'), 'upstream\n', 'utf8');
  git(['add', '--', 'unrelated.txt'], work);
  git(['commit', '-qm', 'second writer ships unrelated'], work);
  const tip = git(['rev-parse', 'base'], work);

  const refreshed = cp.spawnSync(process.execPath, [REFRESH, '--state', 'wf.state.json', '--base-ref', 'base', '--no-fetch', '--repo', work], { cwd: work, encoding: 'utf8' });
  assert.strictEqual(refreshed.status, 0, `baseline refreshes: ${refreshed.stderr}`);
  assert.strictEqual(JSON.parse(refreshed.stdout).baselineCommit, tip, 'baseline advances to the new tip');

  // Session commits its own work path-scoped.
  fs.writeFileSync(path.join(work, 'own.txt'), 'own v2 session work\n', 'utf8');
  git(['add', '--', 'own.txt'], work);
  git(['commit', '-qm', 'session: own work'], work);

  const log = git(['log', '--format=%s', 'base'], work);
  assert.ok(log.includes('second writer ships unrelated'), 'second writer commit present');
  assert.ok(log.includes('session: own work'), 'session commit survived');
  assert.strictEqual(fs.readFileSync(path.join(work, 'foreign.txt'), 'utf8'), 'foreign local dirt\n', 'foreign dirt byte-identical');
  assert.strictEqual(JSON.parse(fs.readFileSync(stateFile, 'utf8')).baselineCommit, tip, 'state holds the new baseline');
  const reflog = git(['reflog', 'show', 'HEAD', '--format=%gs'], work);
  assert.ok(!/reset: moving to/i.test(reflog), 'no reset rewrote history');
  assert.strictEqual(git(['stash', 'list'], work), '', 'no stash entries left behind');
}

// AC14: foreign path changes upstream → STOP naming paths, nothing mutated.
console.log('2. foreign overlap STOPs with state and files unmutated');
{
  const work = mkTmp('ws-pw-stop-');
  git(['init', '-q'], work);
  git(['config', 'user.email', 'test@example.com'], work);
  git(['config', 'user.name', 'test'], work);
  git(['checkout', '-q', '-b', 'base'], work);
  fs.writeFileSync(path.join(work, 'own.txt'), 'own v1\n', 'utf8');
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign v1\n', 'utf8');
  git(['add', '--', 'own.txt', 'foreign.txt'], work);
  git(['commit', '-qm', 'initial'], work);
  const baseline = git(['rev-parse', 'HEAD'], work);
  const stateFile = path.join(work, 'wf.state.json');
  fs.writeFileSync(stateFile, JSON.stringify({
    stateVersion: 3, revision: 0, workflowId: 'wf', slug: 'demo', workflowType: 'standard',
    status: 'active', currentStep: 4, completedSteps: [], skippedSteps: [],
    baselineCommit: baseline, baselineSourceRef: 'base',
    preExistingDirty: ['foreign.txt'],
    workflowManifest: { created: [], modified: ['own.txt'], deleted: [] },
  }), 'utf8');
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign local dirt\n', 'utf8');
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign v2 upstream\n', 'utf8');
  git(['add', '--', 'foreign.txt'], work);
  git(['commit', '-qm', 'upstream foreign change'], work);
  // Restore the local dirt the commit consumed: the conflict scenario is a
  // foreign path moving upstream while locally dirty — re-dirty it.
  fs.writeFileSync(path.join(work, 'foreign.txt'), 'foreign local dirt v2\n', 'utf8');
  const beforeState = fs.readFileSync(stateFile, 'utf8');
  const stopped = cp.spawnSync(process.execPath, [REFRESH, '--state', 'wf.state.json', '--base-ref', 'base', '--no-fetch', '--repo', work], { cwd: work, encoding: 'utf8' });
  assert.strictEqual(stopped.status, 2, 'foreign overlap STOPs');
  assert.ok(JSON.parse(stopped.stdout).overlapping.includes('foreign.txt'), 'STOP names foreign.txt');
  assert.strictEqual(fs.readFileSync(stateFile, 'utf8'), beforeState, 'STOP leaves state untouched');
  assert.strictEqual(fs.readFileSync(path.join(work, 'foreign.txt'), 'utf8'), 'foreign local dirt v2\n', 'STOP leaves foreign file untouched');
}

// AC11/AC12: warn-only preflight reports co-writers and never blocks.
console.log('3. concurrency preflight warns without blocking');
{
  const work = mkTmp('ws-pw-preflight-');
  git(['init', '-q'], work);
  git(['config', 'user.email', 'test@example.com'], work);
  git(['config', 'user.name', 'test'], work);
  fs.mkdirSync(path.join(work, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(work, '.ws', 'config.json'), JSON.stringify({ plans: { dir: '.agents/plans' } }), 'utf8');
  const selfDir = path.join(work, '.agents', 'plans', 'us-self');
  const otherDir = path.join(work, '.agents', 'plans', 'us-other');
  fs.mkdirSync(selfDir, { recursive: true });
  fs.mkdirSync(otherDir, { recursive: true });
  fs.writeFileSync(path.join(selfDir, 'us-self.state.json'), JSON.stringify({ stateVersion: 1, workflowId: 'us-self', slug: 'self', workflowType: 'standard', status: 'active', currentStep: 1, branch: 'develop' }), 'utf8');
  fs.writeFileSync(path.join(otherDir, 'us-other.state.json'), JSON.stringify({ stateVersion: 1, workflowId: 'us-other', slug: 'other', workflowType: 'standard', status: 'active', currentStep: 4, branch: 'develop', updatedAt: '2026-09-26T00:00:00Z' }), 'utf8');
  fs.writeFileSync(path.join(work, 'tracked.txt'), 'v1\n', 'utf8');
  git(['add', '--', 'tracked.txt', '.ws/config.json'], work);
  git(['commit', '-qm', 'initial'], work);
  fs.writeFileSync(path.join(work, 'tracked.txt'), 'foreign dirt\n', 'utf8');

  const statusBefore = git(['status', '--porcelain'], work);
  const r = cp.spawnSync(process.execPath, [PREFLIGHT, '--state', '.agents/plans/us-self/us-self.state.json', '--repo-root', work, '--json'], { cwd: work, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, 'preflight exits 0 when writers found');
  const report = JSON.parse(r.stdout);
  assert.strictEqual(report.blocking, false);
  assert.strictEqual(report.otherActive.length, 1, 'one other active workflow');
  assert.strictEqual(report.otherActive[0].workflowId, 'us-other');
  assert.strictEqual(report.otherActive[0].branch, 'develop');
  assert.ok(report.foreignDirty.includes('tracked.txt'), 'foreign dirty path reported');
  assert.ok(/useWorktrees/.test(report.recommendation), 'recommends isolation');
  assert.strictEqual(git(['status', '--porcelain'], work), statusBefore, 'preflight mutates nothing');

  // Clear tree, no co-writers → clear report, still exit 0.
  fs.rmSync(path.join(otherDir, 'us-other.state.json'));
  git(['checkout', '--', 'tracked.txt'], work);
  git(['add', '--', '.agents'], work);
  git(['commit', '-qm', 'track plans'], work);
  const r2 = cp.spawnSync(process.execPath, [PREFLIGHT, '--state', '.agents/plans/us-self/us-self.state.json', '--repo-root', work], { cwd: work, encoding: 'utf8' });
  assert.strictEqual(r2.status, 0, 'clear preflight exits 0');
  assert.match(r2.stdout, /clear/, 'clear preflight says so');
}

for (const dir of tmpRoots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

console.log('--- All parallel-writer e2e tests PASSED ---');
