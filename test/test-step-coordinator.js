/**
 * Step baton coordinator run loop (AC7, AC9-AC14; NS2, NS3, NS5, NS6).
 * Run: node test/test-step-coordinator.js
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
  // Seed the shared artifact-table entry for step 3 so multi-turn runs verify.
  write(path.join(usDir, `step-03-${slug}.plan.exec.md`), 'exec plan fixture\n');
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

console.log('PASS: test-step-coordinator (AC7, AC9-AC14; NS2, NS3, NS5, NS6)');
