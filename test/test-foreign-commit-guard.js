/**
 * Foreign-commit guard — regression test for the shared-head batch guard.
 *
 * Asserts the executable contract in ws-spec-multi/scripts/foreign_commit_guard.cjs:
 *   AC1 record-baseline stores local + origin run-branch tips.
 *   AC2/NS1 a commit landing between dispatches makes check-advance pause (exit 1)
 *           and name the new commit.
 *   AC3 the protocol surface offers Resume / Skip / Abort on the advance pause.
 *   AC4 check-convergence passes when the PR head equals the local tip.
 *   AC5/NS2 check-convergence refuses (exit 1) on a mismatch, naming both heads.
 *   AC6 list-foreign lists range commits not in the batch's own set + a markdown block.
 *   AC7/NS3 the quiet path (unchanged tips) exits 0 with no gate.
 * Plus: the guard is git-read-only (only rev-parse / log).
 *
 * Run: node test/test-foreign-commit-guard.js
 */
import assert from 'assert';
import cp from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const GUARD = path.join(REPO_ROOT, '.agents/skills/ws-spec-multi/scripts/foreign_commit_guard.cjs');
const PROTOCOL = path.join(REPO_ROOT, '.agents/skills/ws-spec-multi/PROTOCOL.md');

function sh(cwd, cmd, args) {
  const proc = cp.spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(proc.status, 0, `${cmd} ${args.join(' ')} failed: ${proc.stderr}`);
  return String(proc.stdout || '').trim();
}

function guard(args) {
  return cp.spawnSync(process.execPath, [GUARD, ...args], { encoding: 'utf8', timeout: 60000 });
}

function jsonOf(proc) {
  return JSON.parse(proc.stdout);
}

// Build a throwaway repo: local develop + a bare origin with the pushed branch.
function scenario() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fcg-'));
  const repo = path.join(tmp, 'repo');
  const origin = path.join(tmp, 'origin.git');
  fs.mkdirSync(repo, { recursive: true });
  sh(repo, 'git', ['init', '-b', 'develop']);
  sh(repo, 'git', ['config', 'user.email', 'guard@example.test']);
  sh(repo, 'git', ['config', 'user.name', 'Guard Test']);
  fs.writeFileSync(path.join(repo, 'a.txt'), 'one\n');
  sh(repo, 'git', ['add', '--', 'a.txt']);
  sh(repo, 'git', ['commit', '-m', 'one']);
  const c1 = sh(repo, 'git', ['rev-parse', 'HEAD']);
  sh(tmp, 'git', ['init', '--bare', 'origin.git']);
  sh(repo, 'git', ['remote', 'add', 'origin', origin]);
  sh(repo, 'git', ['push', '-u', 'origin', 'develop']);
  const plansDir = path.join(repo, '.agents/plans/ms-test');
  fs.mkdirSync(plansDir, { recursive: true });
  const runState = path.join(plansDir, 'ms-test.state.md');
  fs.writeFileSync(
    runState,
    ['---', 'workflowType: ws-spec-multi', 'runId: ms-test', 'slug: us-x', 'branch: develop', 'baseBranch: develop', '---', '', '# run', ''].join('\n'),
  );
  const addCommit = (file, message) => {
    fs.writeFileSync(path.join(repo, file), `${message}\n`);
    sh(repo, 'git', ['add', '--', file]);
    sh(repo, 'git', ['commit', '-m', message]);
    return sh(repo, 'git', ['rev-parse', 'HEAD']);
  };
  return { tmp, repo, plansDir, runState, c1, addCommit };
}

function testRecordsBaselineLocalAndRemoteTips() {
  const s = scenario();
  const recorded = guard(['record-baseline', '--run', s.runState, '--repo', s.repo, '--json']);
  assert.strictEqual(recorded.status, 0, `record-baseline exits 0: ${recorded.stderr}`);
  const baseline = jsonOf(recorded);
  assert.strictEqual(baseline.localTip, s.c1, 'AC1 local tip recorded');
  assert.strictEqual(baseline.remoteTip, s.c1, 'AC1 remote tip recorded');
  const store = JSON.parse(fs.readFileSync(path.join(s.plansDir, 'foreign-commits.json'), 'utf8'));
  assert.strictEqual(store.records[0].slug, 'us-x', 'AC1 baseline keyed by slug');
  assert.strictEqual(store.records[0].localTip, s.c1, 'AC1 baseline sidecar holds the local tip');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testQuietAdvanceNoGate() {
  const s = scenario();
  guard(['record-baseline', '--run', s.runState, '--repo', s.repo, '--json']);
  const quiet = guard(['check-advance', '--run', s.runState, '--repo', s.repo, '--json']);
  assert.strictEqual(quiet.status, 0, 'AC7 quiet path exits 0');
  const parsed = jsonOf(quiet);
  assert.strictEqual(parsed.advanced, false, 'AC7 no advance reported');
  assert.deepStrictEqual(parsed.local.newCommits, [], 'AC7 no new commits on the quiet path');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testAdvanceNamesNewCommits() {
  const s = scenario();
  guard(['record-baseline', '--run', s.runState, '--repo', s.repo, '--json']);
  const c2 = s.addCommit('b.txt', 'foreign change');
  const advanced = guard(['check-advance', '--run', s.runState, '--repo', s.repo, '--json']);
  assert.strictEqual(advanced.status, 1, 'AC2/NS1 unexpected advance exits 1 (pause)');
  const parsed = jsonOf(advanced);
  assert.strictEqual(parsed.advanced, true, 'AC2 advance detected');
  assert.strictEqual(parsed.local.newCommits.length, 1, 'AC2 names the new commit');
  assert.strictEqual(parsed.local.newCommits[0].sha, c2, 'AC2 names the correct sha');
  assert.match(parsed.local.newCommits[0].subject, /foreign change/, 'AC2 names the commit subject');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testConvergencePassesOnEqualHead() {
  const s = scenario();
  const converged = guard(['check-convergence', '--pr-head', s.c1, '--local-tip', s.c1, '--repo', s.repo, '--json']);
  assert.strictEqual(converged.status, 0, 'AC4 equal heads converge (exit 0)');
  assert.strictEqual(jsonOf(converged).converged, true, 'AC4 converged flag true');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testConvergenceRefusesOnMismatch() {
  const s = scenario();
  const c2 = s.addCommit('b.txt', 'moved');
  const refused = guard(['check-convergence', '--pr-head', s.c1, '--local-tip', c2, '--repo', s.repo, '--json']);
  assert.strictEqual(refused.status, 1, 'AC5/NS2 mismatch refuses (exit 1)');
  const parsed = jsonOf(refused);
  assert.strictEqual(parsed.converged, false, 'AC5 not converged');
  assert.ok(parsed.error.includes(s.c1.slice(0, 7)) && parsed.error.includes(c2.slice(0, 7)), 'AC5 names both heads');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testListForeignExcludesOwnCommits() {
  const s = scenario();
  const c2 = s.addCommit('b.txt', 'foreign change');
  const noOwn = guard(['list-foreign', '--base', s.c1, '--head', c2, '--repo', s.repo, '--json']);
  assert.strictEqual(noOwn.status, 0, 'AC6 list-foreign exits 0');
  const parsed = jsonOf(noOwn);
  assert.deepStrictEqual(parsed.foreign.map((commit) => commit.sha), [c2], 'AC6 foreign commit listed when no own set');
  assert.match(parsed.markdown, /### Foreign commits in range/, 'AC6 markdown block emitted');
  const allOwn = guard(['list-foreign', '--base', s.c1, '--head', c2, '--own', c2, '--repo', s.repo, '--json']);
  assert.deepStrictEqual(jsonOf(allOwn).foreign, [], 'AC6 own commit excluded from foreign list');
  fs.rmSync(s.tmp, { recursive: true, force: true });
}

function testDocOffersResumeSkipAbort() {
  const protocolText = fs.readFileSync(PROTOCOL, 'utf8');
  assert.match(protocolText, /foreign_commit_guard\.cjs/, 'AC3 protocol references the guard');
  assert.match(protocolText, /\*\*Resume \(Recommended\):\*\*/, 'AC3 protocol offers Resume');
  assert.match(protocolText, /\*\*Skip:\*\*/, 'AC3 protocol offers Skip');
  assert.match(protocolText, /\*\*Abort run:\*\*/, 'AC3 protocol offers Abort');
  assert.match(protocolText, /check-convergence/, 'AC3 protocol wires the convergence guard');
}

function testGuardIsGitReadOnly() {
  const guardSource = fs.readFileSync(GUARD, 'utf8');
  assert.doesNotMatch(guardSource, /\['(push|reset|checkout|clean|add|commit|merge|rebase|stash|switch)'(,|\])/, 'guard is git-read-only (no write verbs)');
}

testRecordsBaselineLocalAndRemoteTips();
testQuietAdvanceNoGate();
testAdvanceNamesNewCommits();
testConvergencePassesOnEqualHead();
testConvergenceRefusesOnMismatch();
testListForeignExcludesOwnCommits();
testDocOffersResumeSkipAbort();
testGuardIsGitReadOnly();

process.stdout.write('ok: foreign-commit guard contract held\n');
