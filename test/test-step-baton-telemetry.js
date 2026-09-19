/**
 * Step baton telemetry events (AC15).
 * Run: node test/test-step-baton-telemetry.js
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
const { loadJsonSchema, validateNode } = require('../.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-telemetry-'));
try {
  const slug = 'telemetry-demo';
  const usDir = path.join(root, '.agents/plans', slug);
  const stateFile = path.join(usDir, 'wf-telemetry.state.json');
  const fixtures = path.join(repoRoot, 'test/fixtures/step-baton');
  const updater = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'telemetry-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: {
      autoMode: true,
      minVerifyScore: 9,
      stepRunners: { 4: 'runner-a' },
      runners: {
        'runner-a': {
          command: `node ${fixtures}/worker-ok.cjs --prompt "{prompt}" --cwd "{cwd}" --slug {slug} --step {step} --state "${stateFile}" --updater "${updater}" --receipt "${path.join(root, 'worker-receipts.jsonl')}"`,
          timeoutSeconds: 60,
          env: {},
        },
      },
      stepBaton: { pollIntervalSeconds: 30, maxAttempts: 2 },
    },
  }));
  write(stateFile, JSON.stringify({
    stateVersion: 3, revision: 4, workflowId: 'wf-telemetry', slug,
    workflowType: 'lite', status: 'active', currentStep: 4,
    completedSteps: [0, 1, 2, 3], skippedSteps: [],
    baton: { holder: 'runner-a', step: 4, claimedAt: new Date(Date.now() - 120000).toISOString(), leaseUntil: new Date(Date.now() - 60000).toISOString(), revision: 0 },
    handoffs: {
      3: {
        step: 3, slug, workflowId: 'wf-telemetry', workflowType: 'lite', status: 'completed',
        artifactPaths: [], acRefs: [], summary: 'prior', nextAction: 'Run step 4',
        findings: { critical: 0, warning: 0, suggestion: 0, info: 0 },
      },
    },
  }, null, 2));
  // Seed the lite step-4 close result (lite close emits step-08).
  write(path.join(usDir, `step-08-${slug}.result.md`), 'result fixture\n');
  // Seed the canonical pre-advance inputs the coordinator gate requires
  // (presence-only for lite next <= 5; real runs carry a full ledger/index).
  write(path.join(usDir, 'ac-ledger.json'), '{}\n');
  write(path.join(usDir, 'plan.index.json'), '{}\n');

  const result = cp.spawnSync(process.execPath, [
    path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs'),
    '--state', stateFile, '--repo-root', root,
  ], { encoding: 'utf8', timeout: 120000 });
  if (result.status !== 0) throw new Error(`telemetry run should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);

  const telemetryFile = path.join(usDir, 'telemetry.jsonl');
  if (!fs.existsSync(telemetryFile)) throw new Error('telemetry.jsonl was not written');
  const lines = fs.readFileSync(telemetryFile, 'utf8').split('\n').filter((line) => line.trim());
  const schema = loadJsonSchema(path.join(repoRoot, '.agents/skills/ws-shared/runtime/telemetry.schema.json'), 'telemetry schema');
  const byType = {};
  for (const line of lines) {
    const event = JSON.parse(line);
    const errors = validateNode(event, schema, 'telemetry');
    if (errors.length) throw new Error(`telemetry line failed schema: ${errors.join('; ')} :: ${line}`);
    byType[event.type] = event;
    for (const field of ['schemaVersion', 'timestamp', 'workflowId', 'pipeline', 'packageVersion', 'step', 'model', 'retries', 'reviewRounds', 'refineRounds', 'skipReason', 'acTotal', 'acImplemented']) {
      if (event[field] === undefined) throw new Error(`full-envelope field missing: ${field} in ${event.type}`);
    }
    if (event.workflowId !== 'wf-telemetry' || event.pipeline !== 'lite' || event.step !== 4) {
      throw new Error(`run context mismatch in ${event.type}: ${line}`);
    }
  }
  for (const type of ['baton_lease_expired', 'baton_claimed', 'runner_spawned', 'runner_exited', 'baton_released']) {
    const event = byType[type];
    if (!event) throw new Error(`missing telemetry event: ${type}`);
    if (event.holder !== 'runner-a') throw new Error(`${type} must carry the holder`);
    if (event.attempt !== 1) throw new Error(`${type} must carry attempt 1`);
  }
  if (byType.runner_exited.exitCode !== 0) throw new Error('runner_exited must carry the exit code');
  if (byType.baton_lease_expired.cause !== 'lease-expired') throw new Error('expiry must carry its cause');
  if (!byType.finish) throw new Error('worker finish event is missing from the shared stream');
  const order = lines.map((line) => JSON.parse(line).type).filter((type) => type !== 'finish');
  const expected = ['baton_lease_expired', 'baton_claimed', 'runner_spawned', 'runner_exited', 'baton_released'];
  if (order.join(',') !== expected.join(',')) throw new Error(`event order mismatch: ${order.join(',')}`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('PASS: test-step-baton-telemetry (AC15)');
