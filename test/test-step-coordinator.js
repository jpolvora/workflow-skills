/**
 * Step baton coordinator run loop (AC7, AC9-AC14; NS2, NS3, NS5, NS6).
 * Run: node test/test-step-coordinator.js
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const coordinator = require('../.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs');

const COORDINATOR = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs');
const LITE_UPDATER = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
const FIXTURES = path.join(repoRoot, 'test/fixtures/step-baton');
const tempRoots = [];
process.on('exit', () => {
  for (const root of tempRoots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function handoffFor(step, slug, workflowId) {
  return {
    step, slug, workflowId, workflowType: 'lite', status: 'completed',
    artifactPaths: [], acRefs: [], summary: `Fixture handoff ${step}`,
    nextAction: `Run step ${step + 1}`,
    findings: { critical: 0, warning: 0, suggestion: 0, info: 0 },
  };
}

function makeRepo({ currentStep, completedSteps, stepRunners, runners, stepBaton, baton, slug = 'coord-demo' }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-coord-'));
  tempRoots.push(root);
  const usDir = path.join(root, '.agents/plans', slug);
  const stateFile = path.join(usDir, 'wf-coord.state.json');
  const receiptsFile = path.join(root, 'worker-receipts.jsonl');
  const runnersResolved = {};
  for (const [id, runner] of Object.entries(runners)) {
    runnersResolved[id] = {
      ...runner,
      command: runner.command
        .replaceAll('FIXTURE_DIR', FIXTURES)
        .replaceAll('STATE_PATH', stateFile)
        .replaceAll('UPDATER_PATH', LITE_UPDATER)
        .replaceAll('RECEIPT_PATH', receiptsFile),
    };
  }
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'coord-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: { autoMode: true, minVerifyScore: 9, stepRunners, runners: runnersResolved, stepBaton: stepBaton || { pollIntervalSeconds: 30, maxAttempts: 2 } },
  }));
  const handoffs = {};
  for (const step of completedSteps) handoffs[String(step)] = handoffFor(step, slug, 'wf-coord');
  const state = {
    stateVersion: 3, revision: 4, workflowId: 'wf-coord', slug,
    workflowType: 'lite', status: 'active', currentStep,
    completedSteps: [...completedSteps], skippedSteps: [], handoffs,
  };
  if (baton !== undefined) state.baton = baton;
  write(stateFile, JSON.stringify(state, null, 2));
  // Seed the lite step-3 review artifact so multi-turn runs verify (lite never emits plan.exec).
  write(path.join(usDir, `step-06-${slug}.review.md`), 'review fixture\n');
  // Seed the lite step-4 close result so close-step runs verify (lite close emits step-08).
  write(path.join(usDir, `step-08-${slug}.result.md`), 'result fixture\n');
  return { root, usDir, stateFile, slug, receiptsFile };
}

function runCoordinator(repo, extraArgs = [], timeoutMs = 120000) {
  return cp.spawnSync(process.execPath, [COORDINATOR, '--state', repo.stateFile, '--repo-root', repo.root, ...extraArgs], {
    encoding: 'utf8',
    timeout: timeoutMs,
  });
}

function readState(repo) {
  return JSON.parse(fs.readFileSync(repo.stateFile, 'utf8'));
}

function readTelemetry(repo) {
  const file = path.join(repo.usDir, 'telemetry.jsonl');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
}

function workerCommand(fixture, timeoutSeconds = 60) {
  return {
    command: `node FIXTURE_DIR/${fixture} --prompt "{prompt}" --cwd "{cwd}" --slug {slug} --step {step} --state "STATE_PATH" --updater "UPDATER_PATH" --receipt "RECEIPT_PATH"`,
    timeoutSeconds,
    env: {},
  };
}

// AC9: single-turn loop to terminal status (lite close step 4).
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
  });
  const result = runCoordinator(repo);
  if (result.status !== 0) throw new Error(`AC9 single-turn should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  const state = readState(repo);
  if (state.status !== 'completed' || !state.handoffs['4']) throw new Error('AC9 single-turn did not reach terminal status');
  const events = readTelemetry(repo).map((event) => event.type);
  for (const type of ['baton_claimed', 'runner_spawned', 'runner_exited', 'baton_released']) {
    if (!events.includes(type)) throw new Error(`AC9 telemetry missing ${type}: ${events.join(',')}`);
  }
  if (!/auto-gate-apply/.test(result.stdout || '')) throw new Error('AC11 autoMode should auto-apply index 0 with a log line');
  // AC13: worker received sparse pointers + baton envelope; prompt delivered as file path.
  if (!fs.existsSync(path.join(repo.usDir, '.runtime', 'step-4-dispatch-prompt.md'))) throw new Error('AC13 prompt file was not written');
  if (!fs.existsSync(repo.receiptsFile)) throw new Error('AC13 worker receipt was not written');
  const receipt = JSON.parse(fs.readFileSync(repo.receiptsFile, 'utf8').split('\n').filter(Boolean)[0]);
  if (receipt.envelope.step !== 4 || receipt.envelope.holder !== 'runner-a' || receipt.envelope.attempt !== 1 || !receipt.envelope.leaseUntil) {
    throw new Error(`AC13 envelope mismatch: ${JSON.stringify(receipt.envelope)}`);
  }
  if (!receipt.hasSpecPointer || !receipt.hasPlanIndexPointer || !receipt.hasLedgerPointer || !receipt.hasPriorHandoff) {
    throw new Error(`AC13 sparse pointers incomplete: ${JSON.stringify(receipt)}`);
  }
}

// AC9: multi-turn loop across steps 3-4 to terminal status.
{
  const repo = makeRepo({
    currentStep: 3, completedSteps: [0, 1, 2],
    stepRunners: { 3: 'runner-a', 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
  });
  const result = runCoordinator(repo);
  if (result.status !== 0) throw new Error(`AC9 multi-turn should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  const state = readState(repo);
  if (state.status !== 'completed' || !state.handoffs['3'] || !state.handoffs['4']) throw new Error('AC9 multi-turn did not finish both steps');
  const spawns = readTelemetry(repo).filter((event) => event.type === 'runner_spawned');
  if (spawns.length !== 2) throw new Error(`AC9 multi-turn should spawn once per turn, got ${spawns.length}`);
}

// NS2 / AC12 / AC14: clean exit without finish is a failed attempt, never success.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-no-finish.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 2) throw new Error(`NS2 should exit 2 (blocked), got ${result.status}: ${result.stderr || result.stdout}`);
  const state = readState(repo);
  if (state.status !== 'blocked' || state.currentStep !== 4 || state.handoffs['4']) {
    throw new Error('NS2 must leave the step unadvanced and block the run');
  }
  if (/baton_released/.test(readTelemetry(repo).map((event) => event.type).join(','))) {
    throw new Error('NS2 must not emit a release for an unadvanced step');
  }
}

// AC12: exit 0 with the step contract unmet (expected artifact missing) fails the attempt.
{
  const repo = makeRepo({
    currentStep: 1, completedSteps: [0],
    stepRunners: { 1: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 2) throw new Error(`AC12 artifact check should exit 2, got ${result.status}: ${result.stderr || result.stdout}`);
  const state = readState(repo);
  if (state.status !== 'blocked') throw new Error('AC12 artifact gap must block the run for an operator');
}

// AC14 / NS3: timeout kills the spawn, records the cause, and applies the retry policy.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-hang.cjs', 1) },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const started = Date.now();
  const result = runCoordinator(repo);
  const elapsed = Date.now() - started;
  if (result.status !== 2) throw new Error(`NS3 should exit 2 (blocked), got ${result.status}: ${result.stderr || result.stdout}`);
  if (elapsed > 30000) throw new Error(`NS3 took too long (${elapsed}ms); the hung worker was not reaped`);
  const exits = readTelemetry(repo).filter((event) => event.type === 'runner_exited');
  if (exits.length !== 1 || exits[0].cause !== 'timeout') throw new Error(`NS3 must record one timeout exit, got ${JSON.stringify(exits)}`);
  if (fs.existsSync(path.join(repo.usDir, '.runtime', 'baton.lock'))) throw new Error('NS3 must not leave a stale baton lock');
  const state = readState(repo);
  if (state.status !== 'blocked' || state.handoffs['4']) throw new Error('NS3 must leave the step unadvanced');
}

// AC14: non-zero exit applies the retry policy instead of advancing.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-nonzero.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 2) throw new Error(`nonzero exit should exit 2, got ${result.status}: ${result.stderr || result.stdout}`);
  const exits = readTelemetry(repo).filter((event) => event.type === 'runner_exited');
  if (exits.length !== 1 || exits[0].exitCode !== 3 || exits[0].cause !== 'nonzero-exit') {
    throw new Error(`nonzero exit telemetry mismatch: ${JSON.stringify(exits)}`);
  }
}

// NS5 / AC11: gate-shaped worker output is a protocol violation with no advance.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-gate-emit.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 2) throw new Error(`NS5 should exit 2 (blocked), got ${result.status}: ${result.stderr || result.stdout}`);
  if (!/WORKER_GATE_VIOLATION/.test(`${result.stdout || ''}${result.stderr || ''}`)) throw new Error('NS5 must log the protocol violation');
  const exits = readTelemetry(repo).filter((event) => event.type === 'runner_exited');
  if (exits.length !== 1 || exits[0].cause !== 'gate-violation') throw new Error(`NS5 telemetry mismatch: ${JSON.stringify(exits)}`);
  const state = readState(repo);
  if (state.handoffs['4'] || state.currentStep !== 4) throw new Error('NS5 must leave the step unadvanced');
}

// AC11: gate helpers are pure and chunk to at most 3 options.
{
  const pages = coordinator.chunkGateOptions(['a', 'b', 'c', 'd', 'e'], 3);
  if (pages.length !== 2 || pages[0].length !== 3 || pages[1].length !== 2) throw new Error('gate options must chunk to pages of at most 3');
  const prompt = coordinator.formatGatePrompt('Gate', ['Next', 'More options...'], 0, 1);
  if (!prompt.includes('(Recommended)')) throw new Error('gate prompt must mark the recommended option');
  const auto = coordinator.resolveGateChoice({ autoMode: true, isTTY: true, options: ['Next', 'More'] });
  if (auto.index !== 0 || !auto.auto) throw new Error('autoMode must apply index 0');
  const nonTTY = coordinator.resolveGateChoice({ autoMode: false, isTTY: false, options: ['Next', 'More'] });
  if (nonTTY.index !== 0 || !nonTTY.nonTTY) throw new Error('non-TTY gates must default to index 0');
  const picked = coordinator.resolveGateChoice({ autoMode: false, isTTY: true, options: ['Next', 'More'], input: '2' });
  if (picked.index !== 1) throw new Error('TTY gate input was not honored');
}

// AC7: expired lease is re-claimable with an expiry log; success resets the counter.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
    baton: { holder: 'runner-a', step: 4, claimedAt: new Date(Date.now() - 120000).toISOString(), leaseUntil: new Date(Date.now() - 60000).toISOString(), revision: 0 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 0) throw new Error(`AC7 expiry recovery should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (!/lease expired/.test(result.stdout || '')) throw new Error('AC7 must log the expiry with holder, step, and attempt');
  const expiries = readTelemetry(repo).filter((event) => event.type === 'baton_lease_expired');
  if (expiries.length !== 1 || expiries[0].holder !== 'runner-a' || expiries[0].step !== 4 || expiries[0].attempt !== 1) {
    throw new Error(`AC7 expiry telemetry mismatch: ${JSON.stringify(expiries)}`);
  }
  if (readState(repo).status !== 'completed') throw new Error('AC7 recovery must complete the run');
}

// AC7: second consecutive failure blocks the run and stops the coordinator.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-no-finish.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 2 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 2) throw new Error(`AC7 maxAttempts should exit 2, got ${result.status}: ${result.stderr || result.stdout}`);
  const state = readState(repo);
  if (state.status !== 'blocked') throw new Error('AC7 must move the workflow to blocked after maxAttempts');
  const spawns = readTelemetry(repo).filter((event) => event.type === 'runner_spawned');
  if (spawns.length !== 2 || spawns[1].attempt !== 2) throw new Error(`AC7 must retry once with attempt+1, got ${JSON.stringify(spawns)}`);
}

// AC7: the consecutive-failure counter resets on advance (per-step counters).
{
  const repo = makeRepo({
    currentStep: 3, completedSteps: [0, 1, 2],
    stepRunners: { 3: 'runner-a', 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-flaky.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 2 },
  });
  const result = runCoordinator(repo);
  if (result.status !== 0) throw new Error(`AC7 reset should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (readState(repo).status !== 'completed') throw new Error('AC7 reset must complete the run');
}

// NS6: out-of-band revision jump stops the run instead of overwriting the edit.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-bump-revision.cjs') },
  });
  const result = runCoordinator(repo);
  if (result.status !== 4) throw new Error(`NS6 should exit 4 (changed-underfoot), got ${result.status}: ${result.stderr || result.stdout}`);
  if (!/STATE_CHANGED_UNDERFOOT/.test(`${result.stdout || ''}${result.stderr || ''}`)) throw new Error('NS6 must report the named error');
}

// Revision guard derives its allowance from the turn's op events: a worker that
// emits dispatch (+1) then finish (+1) lands at +3 over the pre-claim revision
// and must advance (fixed +2 window would abort with exit 4).
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-dispatch-finish.cjs') },
  });
  const result = runCoordinator(repo);
  if (result.status !== 0) throw new Error(`dispatch+finish should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (/STATE_CHANGED_UNDERFOOT/.test(`${result.stdout || ''}${result.stderr || ''}`)) throw new Error('dispatch+finish must not trip the underfoot guard');
  const state = readState(repo);
  if (state.status !== 'completed' || !state.handoffs['4']) throw new Error('dispatch+finish did not reach terminal status');
  const opTypes = readTelemetry(repo).map((event) => event.type).filter((type) => type === 'dispatch' || type === 'finish');
  if (opTypes.length !== 2) throw new Error(`dispatch+finish must record exactly 2 op events, got ${opTypes.join(',')}`);
}

// countWorkerOps counts only post-baseline op events and skips malformed lines.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-ops-'));
  tempRoots.push(dir);
  const file = path.join(dir, 'telemetry.jsonl');
  const lines = [
    '{"type":"baton_claimed"}',
    '{"type":"dispatch"}',
    '{"type":"runner_spawned"}',
    'NOT-JSON{{{',
    '{"type":"dispatch"}',
    '{"type":"runner_exited"}',
    '{"type":"finish"}',
    '{"type":"gate-bypass"}',
    '{"type":"baton_released"}',
  ];
  write(file, `${lines.join('\n')}\n`);
  if (coordinator.countTelemetryLines(file) !== lines.length) throw new Error('countTelemetryLines must count non-empty lines');
  if (coordinator.countTelemetryLines(path.join(dir, 'missing.jsonl')) !== 0) throw new Error('countTelemetryLines must return 0 for a missing file');
  if (coordinator.countWorkerOps(file, 3) !== 3) throw new Error('countWorkerOps must count post-baseline dispatch/finish/gate-bypass only');
  if (coordinator.countWorkerOps(file, 0) !== 4) throw new Error('countWorkerOps with baseline 0 must include the pre-spawn dispatch');
  if (coordinator.countWorkerOps(path.join(dir, 'missing.jsonl'), 0) !== 0) throw new Error('countWorkerOps must return 0 for a missing file');
}

// AC10: unmapped steps are never spawned; the coordinator only observes.
{
  const repo = makeRepo({
    currentStep: 3, completedSteps: [0, 1, 2],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
  });
  const result = runCoordinator(repo, ['--once']);
  if (result.status !== 0) throw new Error(`AC10 unmapped --once should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (!/unmapped/.test(result.stdout || '')) throw new Error('AC10 must log the single-host fallback wait');
  const spawns = readTelemetry(repo).filter((event) => event.type === 'runner_spawned');
  if (spawns.length !== 0) throw new Error('AC10 must not spawn workers for unmapped steps');
}

// AC10: the configured poll interval is honored while waiting.
{
  const repo = makeRepo({
    currentStep: 3, completedSteps: [0, 1, 2],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
    stepBaton: { pollIntervalSeconds: 5, maxAttempts: 2 },
  });
  const started = Date.now();
  const result = runCoordinator(repo, ['--max-turns', '1']);
  const elapsed = Date.now() - started;
  if (result.status !== 2) throw new Error(`AC10 poll wait should end on max-turns, got ${result.status}: ${result.stderr || result.stdout}`);
  if (elapsed < 4500) throw new Error(`AC10 poll interval was not honored (elapsed ${elapsed}ms, expected >= 4500ms)`);
}

// Release ownership: a non-owner release is a no-op; the owner release clears.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-ok.cjs') },
    baton: { holder: 'runner-b', step: 4, claimedAt: new Date().toISOString(), leaseUntil: new Date(Date.now() + 600000).toISOString(), revision: 7 },
  });
  const mdPath = path.join(repo.usDir, 'wf-coord.state.md');
  coordinator.releaseOwnBaton(mdPath, repo.stateFile, 'runner-a');
  let state = JSON.parse(fs.readFileSync(repo.stateFile, 'utf8'));
  if (state.baton.holder !== 'runner-b') throw new Error('non-owner release must not clear the holder');
  if (state.baton.revision !== 7) throw new Error('non-owner release must not bump the revision');
  coordinator.releaseOwnBaton(mdPath, repo.stateFile, 'runner-b');
  state = JSON.parse(fs.readFileSync(repo.stateFile, 'utf8'));
  if (state.baton.holder !== null) throw new Error('owner release must clear the holder');
  if (state.baton.revision !== 8) throw new Error('owner release must bump the revision');
}

// Failure reported via finish --status failed must not count as advancement.
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-failed-finish.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo, ['--once']);
  if (result.status !== 2) throw new Error(`failed finish should exit 2 (blocked), got ${result.status}: ${result.stderr || result.stdout}`);
  if (!/WORKER_NO_FINISH/.test(result.stdout || '')) throw new Error('failed finish must log WORKER_NO_FINISH');
  const state = readState(repo);
  if (state.status !== 'blocked') throw new Error('failed finish must block the run for an operator');
  if (state.handoffs['4']?.status !== 'failed') throw new Error('failed handoff status must be preserved in state');
  if (/baton_released/.test(readTelemetry(repo).map((event) => event.type).join(','))) {
    throw new Error('failed finish must not emit a release for an unadvanced step');
  }
}

// verifyAdvancement: lite step 3 expects the review artifact, not plan.exec.
{
  const repo = makeRepo({ currentStep: 3, completedSteps: [0, 1, 2], stepRunners: {}, runners: {} });
  const check = coordinator.verifyAdvancement({
    usDir: repo.usDir, slug: repo.slug, pipeline: 'lite', step: 3, beforeCurrentStep: 3,
    afterState: { currentStep: 4, completedSteps: [0, 1, 2, 3], handoffs: { 3: handoffFor(3, repo.slug, 'wf-coord') } },
  });
  if (!check.advanced) throw new Error(`lite step 3 with the review artifact must advance: ${check.detail}`);
}

// verifyAdvancement: lite step 4 expects the step-08 close result (shared name with standard).
{
  const repo = makeRepo({ currentStep: 4, completedSteps: [0, 1, 2, 3], stepRunners: {}, runners: {} });
  const base = { usDir: repo.usDir, slug: repo.slug, pipeline: 'lite', step: 4, beforeCurrentStep: 4 };
  const present = coordinator.verifyAdvancement({
    ...base,
    afterState: { currentStep: 5, completedSteps: [0, 1, 2, 3, 4], handoffs: { 4: handoffFor(4, repo.slug, 'wf-coord') } },
  });
  if (!present.advanced) throw new Error(`lite step 4 with the close result must advance: ${present.detail}`);
  fs.rmSync(path.join(repo.usDir, `step-08-${repo.slug}.result.md`));
  const absent = coordinator.verifyAdvancement({
    ...base,
    afterState: { currentStep: 5, completedSteps: [0, 1, 2, 3, 4], handoffs: { 4: handoffFor(4, repo.slug, 'wf-coord') } },
  });
  if (absent.advanced || absent.reason !== 'missing-artifact') {
    throw new Error(`lite step 4 without the close result must not advance: ${JSON.stringify(absent)}`);
  }
}

// verifyAdvancement: failed handoffs never advance; reason-gated skips still do.
{
  const repo = makeRepo({ currentStep: 4, completedSteps: [0, 1, 2, 3], stepRunners: {}, runners: {} });
  const base = { usDir: repo.usDir, slug: repo.slug, pipeline: 'lite', step: 4, beforeCurrentStep: 4 };
  const failed = handoffFor(4, repo.slug, 'wf-coord');
  failed.status = 'failed';
  const denied = coordinator.verifyAdvancement({ ...base, afterState: { currentStep: 5, completedSteps: [0, 1, 2, 3, 4], handoffs: { 4: failed } } });
  if (denied.advanced || denied.reason !== 'missing-finish' || !/failed/.test(denied.detail)) {
    throw new Error(`failed handoff must not advance: ${JSON.stringify(denied)}`);
  }
  const skipped = handoffFor(4, repo.slug, 'wf-coord');
  skipped.status = 'skipped';
  const allowed = coordinator.verifyAdvancement({ ...base, afterState: { currentStep: 5, completedSteps: [0, 1, 2, 3, 4], handoffs: { 4: skipped } } });
  if (!allowed.advanced) throw new Error(`skipped handoff must still advance: ${allowed.detail}`);
}

// verifyAdvancement: reason-gated skips waive the artifact exactly when pre-advance does.
{
  const repo = makeRepo({ currentStep: 3, completedSteps: [0, 1, 2], stepRunners: {}, runners: {} });
  const skipped = handoffFor(3, repo.slug, 'wf-coord');
  skipped.status = 'skipped';
  const waived = coordinator.verifyAdvancement({
    usDir: repo.usDir, slug: repo.slug, pipeline: 'standard', step: 3, beforeCurrentStep: 3,
    afterState: {
      slug: repo.slug, workflowId: 'wf-coord', currentStep: 4, completedSteps: [0, 1, 2, 3],
      skippedSteps: [{ step: 3, reason: 'dag-disabled', evidence: 'enableDag false' }],
      handoffs: { 3: skipped },
    },
  });
  if (!waived.advanced) throw new Error(`dag-disabled skip must waive plan.exec: ${waived.detail}`);
  // interview-not-required (step 2) is waived too — same class beyond the reported anchors.
  const skipped2 = handoffFor(2, repo.slug, 'wf-coord');
  skipped2.status = 'skipped';
  const waived2 = coordinator.verifyAdvancement({
    usDir: repo.usDir, slug: repo.slug, pipeline: 'standard', step: 2, beforeCurrentStep: 2,
    afterState: {
      slug: repo.slug, workflowId: 'wf-coord', currentStep: 3, completedSteps: [0, 1, 2],
      skippedSteps: [{ step: 2, reason: 'interview-not-required', evidence: '' }],
      handoffs: { 2: skipped2 },
    },
  });
  if (!waived2.advanced) throw new Error(`interview-not-required skip must waive step-02 artifacts: ${waived2.detail}`);
  // Negative control: a skipped step with no canonical waiver still demands its artifact.
  const repo5 = makeRepo({ currentStep: 5, completedSteps: [0, 1, 2, 3, 4], stepRunners: {}, runners: {} });
  const skipped5 = handoffFor(5, repo5.slug, 'wf-coord');
  skipped5.status = 'skipped';
  const demanded = coordinator.verifyAdvancement({
    usDir: repo5.usDir, slug: repo5.slug, pipeline: 'standard', step: 5, beforeCurrentStep: 5,
    afterState: {
      slug: repo5.slug, workflowId: 'wf-coord', currentStep: 6, completedSteps: [0, 1, 2, 3, 4, 5],
      skippedSteps: [{ step: 5, reason: 'dag-disabled', evidence: '' }],
      handoffs: { 5: skipped5 },
    },
  });
  if (demanded.advanced || demanded.reason !== 'missing-artifact') {
    throw new Error(`unwaived skip must still demand its artifact: ${JSON.stringify(demanded)}`);
  }
}

function assertIndexFresh(repo) {
  const indexFile = path.join(repo.root, '.agents/plans/index.json');
  if (!fs.existsSync(indexFile)) throw new Error('coordinator writes must refresh the plans index row');
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  const row = (index.workflows || []).find((item) => item.workflowId === 'wf-coord');
  if (!row) throw new Error('plans index must contain the coordinator workflow row');
  const jsonText = fs.readFileSync(repo.stateFile, 'utf8');
  const digest = crypto.createHash('sha256').update(jsonText).digest('hex');
  if (row.stateSha256 !== digest) throw new Error(`index row hash must match state bytes (row ${row.stateSha256} vs bytes ${digest})`);
}

// releaseOwnBaton with index sync keeps the plans index row hash fresh (hermetic case).
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3], stepRunners: {}, runners: {},
    baton: { holder: 'runner-a', step: 4, claimedAt: new Date().toISOString(), leaseUntil: new Date(Date.now() + 600000).toISOString(), revision: 7 },
  });
  const mdPath = path.join(repo.usDir, 'wf-coord.state.md');
  coordinator.releaseOwnBaton(mdPath, repo.stateFile, 'runner-a', {
    context: { repoRoot: repo.root, config: { plans: { dir: '.agents/plans' } } },
    pipeline: 'lite', maxStep: 5,
  });
  assertIndexFresh(repo);
}

// Blocked runs leave a fresh index row (persist path is the last writer).
{
  const repo = makeRepo({
    currentStep: 4, completedSteps: [0, 1, 2, 3],
    stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': workerCommand('worker-failed-finish.cjs') },
    stepBaton: { pollIntervalSeconds: 30, maxAttempts: 1 },
  });
  const result = runCoordinator(repo, ['--once']);
  if (result.status !== 2) throw new Error(`failed finish should exit 2 (blocked), got ${result.status}: ${result.stderr || result.stdout}`);
  assertIndexFresh(repo);
}

console.log('PASS: test-step-coordinator (AC7, AC9-AC14; NS2, NS3, NS5, NS6)');
