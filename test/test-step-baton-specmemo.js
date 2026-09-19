/**
 * Step baton spec-memo mirror on/off (AC17).
 * Run: node test/test-step-baton-specmemo.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function makeRepo({ integration }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-memo-'));
  const slug = 'memo-demo';
  const usDir = path.join(root, '.agents/plans', slug);
  const stateFile = path.join(usDir, 'wf-memo.state.json');
  const fixtures = path.join(repoRoot, 'test/fixtures/step-baton');
  const updater = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
  const callsFile = path.join(root, 'vault-calls.jsonl');
  write(path.join(root, '.agents/skills/ws-shared/config.json'), JSON.stringify({
    project: { name: 'memo-test', baseBranch: 'main' },
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
    specMemo: {
      enableMemoryFiles: true,
      enableSpecMemoIntegration: integration,
      mode: integration ? 'hybrid' : 'local',
      cli: `node ${fixtures}/specmemo-stub.cjs`,
    },
  }));
  write(stateFile, JSON.stringify({
    stateVersion: 3, revision: 4, workflowId: 'wf-memo', slug,
    workflowType: 'lite', status: 'active', currentStep: 4,
    completedSteps: [0, 1, 2, 3], skippedSteps: [],
    handoffs: {
      3: {
        step: 3, slug, workflowId: 'wf-memo', workflowType: 'lite', status: 'completed',
        artifactPaths: [], acRefs: [], summary: 'prior', nextAction: 'Run step 4',
        findings: { critical: 0, warning: 0, suggestion: 0, info: 0 },
      },
    },
  }, null, 2));
  return { root, usDir, stateFile, callsFile };
}

function run_repo(repo) {
  const result = cp.spawnSync(process.execPath, [
    path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs'),
    '--state', repo.stateFile, '--repo-root', repo.root,
  ], { encoding: 'utf8', timeout: 120000, env: { ...process.env, SPEC_MEMO_CALLS: repo.callsFile } });
  const state = JSON.parse(fs.readFileSync(repo.stateFile, 'utf8'));
  const telemetry = fs.existsSync(path.join(repo.usDir, 'telemetry.jsonl'))
    ? fs.readFileSync(path.join(repo.usDir, 'telemetry.jsonl'), 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line).type)
    : [];
  return { result, state, telemetry };
}

// Integration on: the released handoff summary is mirrored with nextSteps.
const onRepo = makeRepo({ integration: true });
try {
  const { result, state } = run_repo(onRepo);
  if (result.status !== 0) throw new Error(`mirror-on run should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (state.status !== 'completed') throw new Error('mirror-on run must complete');
  if (!fs.existsSync(onRepo.callsFile)) throw new Error('mirror-on run made zero vault calls');
  const calls = fs.readFileSync(onRepo.callsFile, 'utf8').split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line));
  if (calls.length !== 1) throw new Error(`expected exactly one vault call, got ${calls.length}`);
  const payload = JSON.parse(calls[0].stdin);
  if (payload.workflowId !== 'wf-memo' || payload.step !== 4 || !payload.summary) {
    throw new Error(`vault payload must mirror the handoff: ${calls[0].stdin}`);
  }
  if (!Array.isArray(payload.nextSteps) || payload.nextSteps.length !== 1) {
    throw new Error(`vault payload must carry nextSteps: ${calls[0].stdin}`);
  }
  if (!/append/.test(calls[0].argv.join(' '))) throw new Error('vault mirror must use the append path');
} finally {
  fs.rmSync(onRepo.root, { recursive: true, force: true });
}

// Integration off: identical run behavior with zero vault calls.
const offRepo = makeRepo({ integration: false });
try {
  const { result, state, telemetry } = run_repo(offRepo);
  if (result.status !== 0) throw new Error(`mirror-off run should exit 0, got ${result.status}: ${result.stderr || result.stdout}`);
  if (state.status !== 'completed' || !state.handoffs['4']) throw new Error('mirror-off run must complete identically');
  if (fs.existsSync(offRepo.callsFile)) throw new Error('mirror-off run must make zero vault calls');
  const batonTypes = telemetry.filter((type) => type !== 'finish');
  const expected = ['baton_claimed', 'runner_spawned', 'runner_exited', 'baton_released'];
  if (batonTypes.join(',') !== expected.join(',')) throw new Error(`mirror-off telemetry diverged: ${batonTypes.join(',')}`);
} finally {
  fs.rmSync(offRepo.root, { recursive: true, force: true });
}

console.log('PASS: test-step-baton-specmemo (AC17)');
