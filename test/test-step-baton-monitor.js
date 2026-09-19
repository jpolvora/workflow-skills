/**
 * Step baton monitor snapshot fields (AC16).
 * Run: node test/test-step-baton-monitor.js
 */
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const SNAPSHOT = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function hashTree(root) {
  const entries = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else entries.push(`${path.relative(root, full)}:${crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex')}`);
    }
  };
  walk(root);
  return entries.sort().join('\n');
}

function runSnapshot(root, extra = []) {
  return cp.spawnSync(process.execPath, [SNAPSHOT, '--repo-root', root, '--json', ...extra], { encoding: 'utf8' });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'baton-monitor-'));
try {
  const slug = 'monitor-baton';
  const usDir = path.join(root, '.agents/plans', slug);
  const leaseUntil = new Date(Date.now() + 60000).toISOString();
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    project: { name: 'monitor-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: { minVerifyScore: 9, stepRunners: { 4: 'runner-a' }, runners: { 'runner-a': { command: 'x', timeoutSeconds: 1 } } },
  }));
  write(path.join(usDir, 'wf-mon.state.json'), JSON.stringify({
    stateVersion: 3, revision: 6, workflowId: 'wf-mon', slug,
    workflowType: 'lite', status: 'active', currentStep: 4,
    completedSteps: [0, 1, 2, 3], skippedSteps: [],
    baton: { holder: 'runner-a', step: 4, claimedAt: new Date().toISOString(), leaseUntil, revision: 2 },
    handoffs: {},
  }));
  write(path.join(usDir, 'telemetry.jsonl'), '');
  for (const artifact of [`step-00-${slug}.spec.md`, `step-01-${slug}.plan.md`]) {
    write(path.join(usDir, artifact), 'artifact\n');
  }
  // Legacy state without a baton record.
  const legacyDir = path.join(root, '.agents/plans/legacy-mon');
  write(path.join(legacyDir, 'wf-legacy.state.json'), JSON.stringify({
    stateVersion: 3, revision: 2, workflowId: 'wf-legacy', slug: 'legacy-mon',
    workflowType: 'lite', status: 'active', currentStep: 1,
    completedSteps: [0], skippedSteps: [], handoffs: {},
  }));

  const before = hashTree(root);
  const result = runSnapshot(root);
  if (result.status !== 0) throw new Error(`snapshot failed: ${result.stderr || result.stdout}`);
  const after = hashTree(root);
  if (before !== after) throw new Error('monitor snapshot must preserve its read-only contract (tree changed)');

  const report = JSON.parse(result.stdout);
  const workflow = report.workflows.find((item) => item.workflowId === 'wf-mon');
  if (!workflow) throw new Error('snapshot missed the baton workflow');
  if (workflow.baton.holder !== 'runner-a' || workflow.baton.step !== 4 || workflow.baton.leaseUntil !== leaseUntil || workflow.baton.revision !== 2) {
    throw new Error(`snapshot baton mismatch: ${JSON.stringify(workflow.baton)}`);
  }
  if (workflow.mappedRunner !== 'runner-a') throw new Error(`mappedRunner mismatch: ${workflow.mappedRunner}`);
  const legacy = report.workflows.find((item) => item.workflowId === 'wf-legacy');
  if (!legacy || legacy.baton.holder !== null || legacy.baton.revision !== 0) {
    throw new Error(`legacy snapshot baton mismatch: ${JSON.stringify(legacy && legacy.baton)}`);
  }
  if (legacy.mappedRunner !== null) throw new Error('unmapped legacy step should report a null runner');

  // AC16: holder, lease, and mapped runner derive from the state file alone —
  // a full coordinator turn creates no baton side-channel files.
  const coordSlug = 'coord-sidechannel';
  const coordDir = path.join(root, '.agents/plans', coordSlug);
  const coordState = path.join(coordDir, 'wf-side.state.json');
  const fixtures = path.join(repoRoot, 'test/fixtures/step-baton');
  const updater = path.join(repoRoot, '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs');
  const config = JSON.parse(fs.readFileSync(path.join(root, '.ws/config.json'), 'utf8'));
  config.defaults.autoMode = true;
  config.defaults.stepRunners['3'] = 'runner-a';
  write(path.join(root, '.ws/config.json'), JSON.stringify(config));
  write(coordState, JSON.stringify({
    stateVersion: 3, revision: 4, workflowId: 'wf-side', slug: coordSlug,
    workflowType: 'lite', status: 'active', currentStep: 3,
    completedSteps: [0, 1, 2], skippedSteps: [],
    handoffs: {
      2: {
        step: 2, slug: coordSlug, workflowId: 'wf-side', workflowType: 'lite', status: 'completed',
        artifactPaths: [], acRefs: [], summary: 'prior', nextAction: 'Run step 3',
        findings: { critical: 0, warning: 0, suggestion: 0, info: 0 },
      },
    },
  }, null, 2));
  write(path.join(coordDir, `step-06-${coordSlug}.review.md`), 'review fixture\n');
  // Seed the canonical pre-advance inputs the coordinator gate requires
  // (presence-only for lite next <= 5; real runs carry a full ledger/index).
  write(path.join(coordDir, 'ac-ledger.json'), '{}\n');
  write(path.join(coordDir, 'plan.index.json'), '{}\n');
  config.defaults.runners['runner-a'] = {
    command: `node ${fixtures}/worker-ok.cjs --prompt "{prompt}" --cwd "{cwd}" --slug {slug} --step {step} --state "${coordState}" --updater "${updater}" --receipt "${path.join(root, 'worker-receipts.jsonl')}"`,
    timeoutSeconds: 60,
    env: {},
  };
  write(path.join(root, '.ws/config.json'), JSON.stringify(config));
  const coord = cp.spawnSync(process.execPath, [
    path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs'),
    '--state', coordState, '--repo-root', root, '--once',
  ], { encoding: 'utf8', timeout: 120000 });
  if (coord.status !== 0) throw new Error(`side-channel run should exit 0, got ${coord.status}: ${coord.stderr || coord.stdout}`);
  const sideChannels = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'baton.lock') sideChannels.push(full);
        else walk(full);
      } else if (/baton/i.test(entry.name)) sideChannels.push(full);
    }
  };
  walk(coordDir);
  if (sideChannels.length) throw new Error(`baton side-channel files must not exist: ${sideChannels.join(', ')}`);
  const settled = JSON.parse(fs.readFileSync(coordState, 'utf8'));
  if (!settled.baton || settled.baton.holder !== null) throw new Error('released baton must be derivable from the state file alone');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('PASS: test-step-baton-monitor (AC16)');
