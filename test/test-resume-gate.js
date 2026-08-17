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

/** Resolve integration branch: workingBranch when set, else baseBranch (AC9 / stale-orch-resume). */
function resolveIntegrationBranch(workingBranch, baseBranch) {
  const w = (workingBranch || '').trim();
  return w || baseBranch;
}

/** First required G2-code step: 5 standard, 2 lite (AC9 product-commit signal). */
function firstG2CodeStep(workflowType) {
  return workflowType === 'lite' ? 2 : 5;
}

function workflowHasProductCommits(state, workflowType) {
  const commits = state?.commits;
  if (Array.isArray(commits) && commits.length > 0) return true;
  const completed = state?.completedSteps;
  if (!Array.isArray(completed)) return false;
  return completed.includes(firstG2CodeStep(workflowType));
}

function initRepo() {
  const dir = mkTmp('ws-resume-gate-');
  let r = git(dir, ['init']);
  if (r.status !== 0) throw new Error('git init failed: ' + (r.stderr || r.stdout));
  git(dir, ['config', 'user.email', 'resume-gate@example.com']);
  git(dir, ['config', 'user.name', 'resume-gate']);
  git(dir, ['checkout', '-b', 'main']);
  fs.writeFileSync(path.join(dir, 'base.txt'), 'base\n');
  git(dir, ['add', 'base.txt']);
  r = git(dir, ['commit', '-m', 'base']);
  if (r.status !== 0) throw new Error('base commit failed: ' + (r.stderr || r.stdout));
  return dir;
}

function headSha(dir) {
  const r = git(dir, ['rev-parse', 'HEAD']);
  return r.status === 0 ? (r.stdout || '').trim() : '';
}

function uniqueCommitCount(dir, ref) {
  const r = git(dir, ['rev-list', '--count', ref + '..HEAD']);
  if (r.status !== 0) {
    return null;
  }
  return parseInt((r.stdout || '').trim(), 10);
}

/** Contract from setup.md §4c: skip-check when origin/{integrationBranch} is unavailable. */
function originIntegrationRefExists(dir, integrationBranch) {
  const r = git(dir, ['rev-parse', '--verify', 'origin/' + integrationBranch]);
  return r.status === 0;
}

/**
 * AC9 resume gate: count==0 marks complete only when workflow has product commits
 * and HEAD != baselineCommit; early workflows with bare count==0 proceed.
 */
function resumeGate(uniqueCount, state, head, workflowType = 'standard') {
  if (uniqueCount > 0) return 'proceed';
  if (uniqueCount === null) return 'mark-complete-stop';
  const baseline = (state?.baselineCommit || '').trim();
  const headTrim = (head || '').trim();
  const hasProduct = workflowHasProductCommits(state, workflowType);
  if (hasProduct && headTrim && baseline && headTrim !== baseline) {
    return 'mark-complete-stop';
  }
  return 'proceed';
}

function resumePreCheck(dir, integrationBranch, state, workflowType = 'standard') {
  if (!originIntegrationRefExists(dir, integrationBranch)) {
    return { action: 'skip-check-continue', gate: 'proceed' };
  }
  const count = uniqueCommitCount(dir, 'origin/' + integrationBranch);
  if (count === null) {
    return { action: 'skip-check-continue', gate: 'proceed' };
  }
  return {
    action: 'count',
    gate: resumeGate(count, state, headSha(dir), workflowType),
    count,
  };
}

function setupOriginRemote(dir) {
  const r = git(dir, ['remote', 'add', 'origin', dir]);
  if (r.status !== 0) throw new Error('remote add failed: ' + (r.stderr || r.stdout));
  const pushMain = git(dir, ['push', '-u', 'origin', 'main']);
  if (pushMain.status !== 0) throw new Error('push main failed: ' + (pushMain.stderr || pushMain.stdout));
}

function pushBranchToOrigin(dir, branch) {
  const r = git(dir, ['push', '-u', 'origin', branch]);
  if (r.status !== 0) throw new Error('push ' + branch + ' failed: ' + (r.stderr || r.stdout));
}

function testEarlyWorkflowZeroCommitsProceeds() {
  const dir = initRepo();
  git(dir, ['checkout', '-b', 'feat/slug', 'main']);
  const baseline = headSha(dir);
  const count = uniqueCommitCount(dir, 'main');
  assert(count === 0, 'feature from main has 0 unique commits vs main');
  const earlyState = { baselineCommit: baseline, commits: [], completedSteps: [] };
  assert(
    resumeGate(count, earlyState, baseline) === 'proceed',
    '0 unique commits on early workflow (no product commits) -> proceed'
  );
  fs.writeFileSync(path.join(dir, 'work.txt'), 'work\n');
  git(dir, ['add', 'work.txt']);
  const commit = git(dir, ['commit', '-m', 'feature work']);
  assert(commit.status === 0, 'feature commit succeeds');
  const count2 = uniqueCommitCount(dir, 'main');
  assert(count2 >= 1, 'feature with work has >= 1 unique commit vs main');
  assert(resumeGate(count2, earlyState, headSha(dir)) === 'proceed', '>= 1 unique commits -> proceed');
}

/**
 * Stale-orch-resume trap: feature already merged into develop while baseBranch is main.
 * Comparing only to main keeps uniqueCount > 0 and wrongly allows re-implement.
 * Comparing to workingBranch (develop) yields 0 and must mark-complete/stop when product commits exist.
 */
function testMergedIntoDevelopWhileBaseIsMain() {
  const dir = initRepo();
  setupOriginRemote(dir);
  const baseline = headSha(dir);
  // Integration line ahead of main
  git(dir, ['checkout', '-b', 'develop', 'main']);
  fs.writeFileSync(path.join(dir, 'develop.txt'), 'on develop\n');
  git(dir, ['add', 'develop.txt']);
  assert(git(dir, ['commit', '-m', 'develop ahead of main']).status === 0, 'develop commit succeeds');
  pushBranchToOrigin(dir, 'develop');

  // Feature branched from older main, then "merged" into develop (ff)
  git(dir, ['checkout', '-b', 'feat/stale', 'main']);
  fs.writeFileSync(path.join(dir, 'feat.txt'), 'feat\n');
  git(dir, ['add', 'feat.txt']);
  assert(git(dir, ['commit', '-m', 'feature work']).status === 0, 'feat commit succeeds');
  const featHead = headSha(dir);
  git(dir, ['checkout', 'develop']);
  const merge = git(dir, ['merge', '--no-ff', '-m', 'merge feat into develop', 'feat/stale']);
  assert(merge.status === 0, 'merge feat into develop (non-ff ok; branches diverged from main)');
  pushBranchToOrigin(dir, 'develop');
  // Stale tip still points at the pre-merge feature commit; those commits are now in develop
  git(dir, ['checkout', 'feat/stale']);

  const vsMain = uniqueCommitCount(dir, 'origin/main');
  const vsDevelop = uniqueCommitCount(dir, 'origin/develop');
  assert(vsMain >= 1, 'stale tip still has unique commits vs origin/main (false proceed if gate used baseBranch)');
  assert(vsDevelop === 0, 'stale tip has 0 unique commits vs origin/develop (true already-merged signal)');

  const wrongRef = resolveIntegrationBranch('', 'main'); // missing workingBranch only
  const rightRef = resolveIntegrationBranch('develop', 'main');
  assert(wrongRef === 'main', 'fallback integrationBranch is baseBranch when workingBranch empty');
  assert(rightRef === 'develop', 'integrationBranch prefers workingBranch when set');
  assert(
    resumeGate(vsDevelop, { baselineCommit: baseline, commits: [{ sha: featHead }] }, featHead) === 'mark-complete-stop',
    '0 vs develop with product commits and HEAD != baseline -> mark-complete/stop'
  );
  assert(
    resumeGate(uniqueCommitCount(dir, 'origin/' + wrongRef), { baselineCommit: baseline, commits: [{ sha: featHead }] }, featHead) === 'proceed',
    'baseBranch-only count would wrongly proceed without integrationBranch'
  );
  const mergedState = { baselineCommit: baseline, commits: [{ sha: featHead }], completedSteps: [5] };
  const preCheck = resumePreCheck(dir, rightRef, mergedState, 'standard');
  assert(preCheck.action === 'count', 'origin/develop present -> count path (not skip-check)');
  assert(preCheck.gate === 'mark-complete-stop', 'workingBranch count correctly mark-complete/stop when merged');
}

function testSkipCheckWhenOriginIntegrationRefAbsent() {
  const dir = initRepo();
  // No origin remote -> origin/develop unavailable
  git(dir, ['checkout', '-b', 'feat/no-origin', 'main']);
  fs.writeFileSync(path.join(dir, 'work.txt'), 'work\n');
  git(dir, ['add', 'work.txt']);
  assert(git(dir, ['commit', '-m', 'feature work']).status === 0, 'feature commit succeeds');

  assert(!originIntegrationRefExists(dir, 'develop'), 'origin/develop absent without remote');
  const preCheck = resumePreCheck(dir, 'develop', { commits: [{ sha: 'x' }] });
  assert(preCheck.action === 'skip-check-continue', 'missing origin ref -> skip-check path');
  assert(preCheck.gate === 'proceed', 'skip-check continues resume (never blocks dry-run/git-less)');

  // rev-list against missing origin ref also fails; must not mark-complete-stop
  const count = uniqueCommitCount(dir, 'origin/develop');
  assert(count === null, 'rev-list fails when origin/develop missing');
  assert(resumeGate(count, { commits: [{ sha: 'x' }] }, headSha(dir)) === 'mark-complete-stop', 'null count alone would wrongly stop');
  assert(preCheck.gate === 'proceed', 'skip-check overrides null-count stop');
}

function testLiteG2StepSignal() {
  const baseline = 'abc123';
  const head = 'def456';
  assert(
    resumeGate(0, { baselineCommit: baseline, completedSteps: [2] }, head, 'lite') === 'mark-complete-stop',
    'lite completedSteps includes Step 2 G2 -> mark-complete when count==0 and HEAD != baseline'
  );
  assert(
    resumeGate(0, { baselineCommit: baseline, completedSteps: [1] }, head, 'lite') === 'proceed',
    'lite without G2 step in completedSteps -> proceed on count==0'
  );
}

function testContractEncoded() {
  const setup = fs.readFileSync(setupMd, 'utf8');
  assert(
    /resume pre-check[\s\S]*?origin\/\{integrationBranch\}/i.test(setup),
    'setup.md encodes resume pre-check (rev-list --count origin/{integrationBranch})'
  );
  assert(
    /workingBranch[\s\S]*?integrationBranch|integrationBranch[\s\S]*?workingBranch/i.test(setup),
    'setup.md resolves integrationBranch from workingBranch (else baseBranch)'
  );
  assert(/0-unique-commits|NOT > 0|already merged/i.test(setup), 'setup.md encodes mark-complete/stop on zero unique commits');
  assert(
    /state\.commits|completedSteps[\s\S]*?G2-code|baselineCommit/i.test(setup),
    'setup.md encodes product-commit guard before mark-complete on count==0'
  );
  assert(
    /pre-first-commit|do \*\*not\*\* mark completed/i.test(setup),
    'setup.md encodes proceed on bare count==0 early workflow'
  );
  assert(
    /skip-check/i.test(setup) && /dry-run\/git-less never blocks/i.test(setup),
    'setup.md encodes skip-check when origin/{integrationBranch} unavailable'
  );
  const skill = fs.readFileSync(skillMd, 'utf8');
  assert(
    /rev-list --count origin\/\{integrationBranch\}\.\.HEAD/.test(skill),
    'ws-spec-to-pr SKILL.md encodes the rev-list resume pre-check vs integrationBranch'
  );
  assert(
    /workingBranch/i.test(skill) && /do \*\*not\*\* compare only to `origin\/\{baseBranch\}`/i.test(skill),
    'ws-spec-to-pr SKILL.md warns against baseBranch-only comparison when workingBranch is set'
  );
  assert(
    /state\.commits|baselineCommit|pre-first-commit/i.test(skill),
    'ws-spec-to-pr SKILL.md encodes product-commit guard for count==0 mark-complete'
  );
}

function main() {
  console.log('test-resume-gate.js');
  testEarlyWorkflowZeroCommitsProceeds();
  testMergedIntoDevelopWhileBaseIsMain();
  testSkipCheckWhenOriginIntegrationRefAbsent();
  testLiteG2StepSignal();
  testContractEncoded();
  cleanup();
  if (failures > 0) { console.error(failures + ' failure(s)'); process.exit(1); }
  console.log('All resume-gate tests passed.');
}

main();
