/**
 * Step baton claim/release protocol (AC5, AC6, AC8; NS1, NS7).
 * Run: node test/test-step-baton-claim.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const baton = require('../.agents/skills/ws-shared/runtime/scripts/step_baton.cjs');
const workflowState = require('../.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function expectCode(fn, code, label) {
  let error = null;
  try {
    fn();
  } catch (caught) {
    error = caught;
  }
  if (!error) throw new Error(`${label}: expected throw with code ${code}, got success`);
  if (error.code !== code) throw new Error(`${label}: expected code ${code}, got ${error.code} (${error.message})`);
}

function freshState() {
  return {
    stateVersion: 3, revision: 4, workflowId: 'wf-claim', slug: 'claim-demo',
    workflowType: 'lite', status: 'active', currentStep: 4,
    completedSteps: [0, 1, 2, 3], skippedSteps: [], handoffs: {},
  };
}

const leaseFuture = new Date(Date.now() + 60000).toISOString();
const leasePast = new Date(Date.now() - 60000).toISOString();

// AC5: claim wins on equal revision + free lease (missing baton = unclaimed revision 0).
{
  const state = freshState();
  const claimed = baton.claimBaton(state, { step: 4, holder: 'runner-a', expectedRevision: 0, leaseUntil: leaseFuture });
  if (claimed.holder !== 'runner-a' || claimed.step !== 4 || claimed.revision !== 1 || !claimed.claimedAt || claimed.leaseUntil !== leaseFuture) {
    throw new Error(`claim shape mismatch: ${JSON.stringify(claimed)}`);
  }
  // AC5: held lease rejects the next claimant.
  expectCode(
    () => baton.claimBaton(state, { step: 4, holder: 'runner-b', expectedRevision: 1, leaseUntil: leaseFuture }),
    'BATON_LEASE_HELD',
    'held lease',
  );
}

// AC5: expired lease is re-claimable.
{
  const state = freshState();
  state.baton = { holder: 'runner-a', step: 4, claimedAt: leasePast, leaseUntil: leasePast, revision: 1 };
  const expiry = baton.expiryState(state, { now: Date.now() });
  if (!expiry.expired || expiry.holder !== 'runner-a' || expiry.step !== 4) throw new Error('expiryState missed the expired lease');
  const reclaimed = baton.claimBaton(state, { step: 4, holder: 'runner-b', expectedRevision: 1, leaseUntil: leaseFuture });
  if (reclaimed.holder !== 'runner-b' || reclaimed.revision !== 2) throw new Error('expired lease was not re-claimable');
}

// AC5: claim write lands in both .state.json and .state.md via the atomic dual-write path.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-dual-'));
  try {
    const usDir = path.join(root, '.agents/plans/claim-demo');
    const mdPath = path.join(usDir, 'wf-claim.state.md');
    write(mdPath, '---\nstateVersion: 3\nrevision: 4\nworkflowId: wf-claim\nslug: claim-demo\nworkflowType: lite\nstatus: active\ncurrentStep: 4\ncompletedSteps: [0, 1, 2, 3]\nskippedSteps: []\n---\nbody\n');
    const state = freshState();
    baton.claimBaton(state, { step: 4, holder: 'runner-a', expectedRevision: 0, leaseUntil: leaseFuture });
    state.revision += 1;
    workflowState.syncStateDualWrite(mdPath, state, { body: 'body\n', jsonText: null });
    const jsonBaton = JSON.parse(fs.readFileSync(path.join(usDir, 'wf-claim.state.json'), 'utf8')).baton;
    const mdBaton = workflowState.parseFrontmatter(fs.readFileSync(mdPath, 'utf8')).data.baton;
    for (const [label, value] of [['json', jsonBaton], ['md', mdBaton]]) {
      if (!value || value.holder !== 'runner-a' || value.revision !== 1) {
        throw new Error(`dual-write ${label} lost the baton: ${JSON.stringify(value)}`);
      }
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// NS7: claim for a non-current step is rejected even when the lease is free.
{
  const state = freshState();
  expectCode(
    () => baton.claimBaton(state, { step: 3, holder: 'runner-a', expectedRevision: 0, leaseUntil: leaseFuture }),
    'BATON_WRONG_STEP',
    'NS7 non-current step',
  );
}

// AC8 / NS1: concurrent claims serialize on the revision check; loser gets the
// named conflict and never spawns the step body for that attempt.
{
  const state = freshState();
  let spawns = 0;
  const spawnStepBody = () => {
    spawns += 1;
  };
  const winner = baton.claimBaton(state, { step: 4, holder: 'runner-a', expectedRevision: 0, leaseUntil: leaseFuture });
  if (winner.revision !== 1) throw new Error('first claimant should win revision 1');
  spawnStepBody();
  expectCode(
    () => baton.claimBaton(state, { step: 4, holder: 'runner-b', expectedRevision: 0, leaseUntil: leaseFuture }),
    'BATON_REVISION_CONFLICT',
    'NS1 stale revision loser',
  );
  if (spawns !== 1) throw new Error(`losing attempt must not execute the step body (spawns=${spawns})`);
  // Loser backs off, re-reads, and retries against the fresh revision.
  const wait = baton.computeBackoffMs(0);
  if (wait !== 100) throw new Error(`backoff attempt 0 must be 100ms, got ${wait}`);
  if (baton.computeBackoffMs(1) !== 200 || baton.computeBackoffMs(2) !== 400 || baton.computeBackoffMs(10) !== 2000) {
    throw new Error('backoff schedule mismatch');
  }
  expectCode(
    () => baton.claimBaton(state, { step: 4, holder: 'runner-b', expectedRevision: 1, leaseUntil: leaseFuture }),
    'BATON_LEASE_HELD',
    'loser retry still sees the live lease',
  );
  if (spawns !== 1) throw new Error('loser retry must not execute the step body either');
}

// AC8: lockdir serializes the critical section and releases in finally.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-lock-'));
  try {
    const usDir = path.join(root, 'us');
    const seen = baton.withBatonLock(usDir, () => (fs.existsSync(baton.lockDirFor(usDir)) ? 'locked' : 'unlocked'));
    if (seen !== 'locked') throw new Error('lockdir was not held inside withBatonLock');
    if (fs.existsSync(baton.lockDirFor(usDir))) throw new Error('lockdir was not released in finally');
    // Stale locks (dead pid + old mtime) expire instead of blocking.
    const lockDir = baton.lockDirFor(usDir);
    fs.mkdirSync(lockDir, { recursive: true });
    write(path.join(lockDir, 'lock.json'), JSON.stringify({ pid: 42424242, at: new Date(Date.now() - 120000).toISOString() }));
    const old = new Date(Date.now() - 120000);
    fs.utimesSync(lockDir, old, old);
    const afterStale = baton.withBatonLock(usDir, () => 'recovered', { staleMs: 1000 });
    if (afterStale !== 'recovered') throw new Error('stale lock was not recovered');
    // A live lock resolves to the named conflict after capped backoff.
    fs.mkdirSync(lockDir, { recursive: true });
    write(path.join(lockDir, 'lock.json'), JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
    expectCode(() => baton.withBatonLock(usDir, () => 'never', { retries: 0 }), 'BATON_REVISION_CONFLICT', 'busy lock');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// AC6 + BR8: finish writes the handoff, clears the holder, and advances
// currentStep in one atomic update; repeated finish is idempotent success.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-finish-'));
  try {
    write(path.join(root, '.ws/config.json'), JSON.stringify({
      project: { name: 'finish-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }));
    const usDir = path.join(root, '.agents/plans/finish-demo');
    const stateFile = path.join(usDir, 'wf-finish.state.json');
    write(stateFile, JSON.stringify({
      stateVersion: 3, revision: 4, workflowId: 'wf-finish', slug: 'finish-demo',
      workflowType: 'lite', status: 'active', currentStep: 3,
      completedSteps: [0, 1, 2], skippedSteps: [],
      baton: { holder: 'runner-a', step: 3, claimedAt: new Date(Date.now() - 1000).toISOString(), leaseUntil: leaseFuture, revision: 1 },
      handoffs: {},
    }));
    const updater = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
    const first = cp.spawnSync(process.execPath, [updater, 'finish', stateFile, '--step', '3', '--repo-root', root], { encoding: 'utf8' });
    if (first.status !== 0) throw new Error(`finish failed: ${first.stderr || first.stdout}`);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (!after.handoffs || !after.handoffs['3']) throw new Error('finish did not write the step handoff');
    if (after.baton.holder !== null || after.baton.leaseUntil !== null) throw new Error(`finish did not clear the holder: ${JSON.stringify(after.baton)}`);
    if (after.baton.revision !== 2 || after.baton.step !== 4) throw new Error(`finish baton revision/step mismatch: ${JSON.stringify(after.baton)}`);
    if (after.currentStep !== 4 || !after.completedSteps.includes(3)) throw new Error('finish did not advance currentStep');
    // Next claim allowed only for the new currentStep.
    expectCode(
      () => baton.claimBaton(structuredClone(after), { step: 3, holder: 'runner-a', expectedRevision: 2, leaseUntil: leaseFuture }),
      'BATON_WRONG_STEP',
      'claim for the released step',
    );
    const next = baton.claimBaton(structuredClone(after), { step: 4, holder: 'runner-a', expectedRevision: 2, leaseUntil: leaseFuture });
    if (next.revision !== 3) throw new Error('claim for the new currentStep should win');
    // BR8: repeated finish for the released step is success, not an error, with no double release.
    const second = cp.spawnSync(process.execPath, [updater, 'finish', stateFile, '--step', '3', '--repo-root', root], { encoding: 'utf8' });
    if (second.status !== 0) throw new Error(`repeated finish must succeed: ${second.stderr || second.stdout}`);
    const again = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (again.baton.revision !== 2 || again.baton.holder !== null) {
      throw new Error(`repeated finish must not release twice: ${JSON.stringify(again.baton)}`);
    }
    if (!again.handoffs['3'] || again.currentStep !== 4) throw new Error('repeated finish lost step state');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

// Legacy states without a baton stay untouched by finish (back-compat: unclaimed revision 0).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-legacy-'));
  try {
    write(path.join(root, '.ws/config.json'), JSON.stringify({
      project: { name: 'legacy-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }));
    const usDir = path.join(root, '.agents/plans/legacy-demo');
    const stateFile = path.join(usDir, 'wf-legacy.state.json');
    write(stateFile, JSON.stringify({
      stateVersion: 3, revision: 4, workflowId: 'wf-legacy', slug: 'legacy-demo',
      workflowType: 'lite', status: 'active', currentStep: 3,
      completedSteps: [0, 1, 2], skippedSteps: [], handoffs: {},
    }));
    const updater = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
    const result = cp.spawnSync(process.execPath, [updater, 'finish', stateFile, '--step', '3', '--repo-root', root], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(`legacy finish failed: ${result.stderr || result.stdout}`);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    if (after.baton !== undefined) throw new Error('legacy finish must not invent a baton record');
    const normalized = baton.normalizeBaton(structuredClone(after));
    if (normalized.holder !== null || normalized.revision !== 0) throw new Error('missing baton must read as unclaimed revision 0');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

console.log('PASS: test-step-baton-claim (AC5, AC6, AC8; NS1, NS7)');
