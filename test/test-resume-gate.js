import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const setupMd = path.join(REPO_ROOT, '.agents/skills/ws-shared/setup.md');
const skillMd = path.join(REPO_ROOT, '.agents/skills/ws-spec-to-pr/SKILL.md');

const tmpRoots = [];
let failures = 0;

function fail(msg) { console.error('X ' + msg); failures += 1; }
function ok(msg) { console.log('ok ' + msg); }
function assert(cond, msg) { if (cond) ok(msg); else fail(msg); }

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

function git(dir, args, opts = {}) {
  return cp.spawnSync('git', args, { cwd: dir, encoding: 'utf8', env: { ...process.env, ...(opts.env || {}) } });
}

function initRepo() {
  const dir = mkTmp('ws-resume-gate-');
  let r = git(dir, ['init']);
  if (r.status !== 0) throw new Error('git init failed: ' + (r.stderr || r.stdout));
  git(dir, ['config', 'user.email', 'resume-gate@example.com']);
  git(dir, ['config', 'user.name', 'resume-gate']);
  git(dir, ['checkout', '-b', 'base']);
  fs.writeFileSync(path.join(dir, 'base.txt'), 'base\n');
  git(dir, ['add', 'base.txt']);
  r = git(dir, ['commit', '-m', 'base']);
  if (r.status !== 0) throw new Error('base commit failed: ' + (r.stderr || r.stdout));
  return dir;
}

function uniqueCommitCount(dir, baseBranch) {
  const r = git(dir, ['rev-list', '--count', baseBranch + '..HEAD']);
  if (r.status !== 0) {
    console.error('rev-list failed:', r.stderr, r.stdout);
    return null;
  }
  return parseInt((r.stdout || '').trim(), 10);
}

function resumeGate(uniqueCount) {
  return uniqueCount > 0 ? 'proceed' : 'mark-complete-stop';
}

function testZeroUniqueCommitsStops() {
  const dir = initRepo();
  git(dir, ['checkout', '-b', 'feat/slug', 'base']);
  const count = uniqueCommitCount(dir, 'base');
  assert(count === 0, 'feature from base has 0 unique commits vs base');
  assert(resumeGate(count) === 'mark-complete-stop', '0 unique commits -> mark-complete + stop');
  fs.writeFileSync(path.join(dir, 'work.txt'), 'work\n');
  git(dir, ['add', 'work.txt']);
  const commit = git(dir, ['commit', '-m', 'feature work']);
  assert(commit.status === 0, 'feature commit succeeds');
  const count2 = uniqueCommitCount(dir, 'base');
  assert(count2 >= 1, 'feature with work has >= 1 unique commit vs base');
  assert(resumeGate(count2) === 'proceed', '>= 1 unique commits -> proceed / re-implement');
}

function testContractEncoded() {
  const setup = fs.readFileSync(setupMd, 'utf8');
  assert(/resume pre-check[\s\S]*?origin\/\{state\.baseBranch\}/i.test(setup), 'setup.md encodes resume pre-check (rev-list --count origin/{state.baseBranch})');
  assert(/0-unique-commits|NOT > 0|already merged/i.test(setup), 'setup.md encodes mark-complete/stop on zero unique commits');
  const skill = fs.readFileSync(skillMd, 'utf8');
  assert(/rev-list --count origin\/\{baseBranch\}\.\.HEAD/.test(skill), 'ws-spec-to-pr SKILL.md encodes the rev-list resume pre-check');
}

function main() {
  console.log('test-resume-gate.js');
  testZeroUniqueCommitsStops();
  testContractEncoded();
  cleanup();
  if (failures > 0) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('All resume-gate tests passed.');
}

main();
