/**
 * us-395: terminal-shape close in the state writer (telemetry-independent, idempotent).
 * Run: node test/test-terminal-close-us395.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const update = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args) {
  return cp.spawnSync(process.execPath, [update, ...args], { encoding: 'utf8', env: { ...process.env } });
}

function makeRoot(prefix, stateBody) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify({ plans: { dir: '.agents/plans' }, verification: {}, defaults: {}, fable: { auditVerdictsBlockShip: 'refuted' } }),
  );
  write(path.join(root, '.agents/plans/close/close.state.md'), stateBody);
  return root;
}

function readJson(root, rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

const TERMINAL_STATE = `---
stateVersion: 3
revision: 0
workflowId: wf-close
slug: close
workflowType: standard
status: active
currentStep: 8
completedSteps: [0,1,2,4,5,6,7]
skippedSteps:
  - { step: 3, reason: dag-disabled, evidence: "" }
stepStatus: { 0: completed, 1: completed, 2: completed, 3: skipped, 4: completed, 5: completed, 6: completed, 7: completed }
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`;

// AC1: the close step finishing `skipped` while steps 0..8 are all terminal
// still closes the run, with no telemetry file on disk.
{
  const root = makeRoot('ws-close-us395-', TERMINAL_STATE);
  const rel = '.agents/plans/close/close.state.md';
  const telemetryFile = path.join(root, '.agents/plans/close/telemetry.jsonl');
  if (fs.existsSync(telemetryFile)) throw new Error('us-395 AC1: fixture unexpectedly had a telemetry file');
  const result = run([
    'finish', rel, '--step', '8', '--status', 'skipped', '--reason', 'fix-pr-not-applicable',
    '--timestamp', '2026-09-22T13:00:00.000Z', '--repo-root', root,
  ]);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const json = readJson(root, rel.replace(/\.state\.md$/, '.state.json'));
  if (json.status !== 'completed') throw new Error(`us-395 AC1: skipped close step left status ${json.status}`);
  if (!json.endedAt) throw new Error('us-395 AC1: terminal-shape close did not set endedAt');
  if (json.shipStatus !== 'pending') throw new Error(`us-395 AC1: expected shipStatus pending, got ${json.shipStatus}`);

  // AC8: re-applying the same transition is idempotent — no status/endedAt regression.
  const before = fs.readFileSync(path.join(root, rel.replace(/\.state\.md$/, '.state.json')), 'utf8');
  const again = run([
    'finish', rel, '--step', '8', '--status', 'skipped', '--reason', 'fix-pr-not-applicable',
    '--timestamp', '2026-09-22T13:00:00.000Z', '--repo-root', root,
  ]);
  if (again.status !== 0) throw new Error(again.stderr || again.stdout);
  const afterJson = readJson(root, rel.replace(/\.state\.md$/, '.state.json'));
  if (afterJson.status !== 'completed') throw new Error('us-395 AC8: re-apply regressed status');
  if (afterJson.endedAt !== json.endedAt) throw new Error('us-395 AC8: re-apply rewrote endedAt');
  if (afterJson.completedSteps.length !== json.completedSteps.length) {
    throw new Error('us-395 AC8: re-apply changed completedSteps count');
  }
  if (!before) throw new Error('us-395 AC8: state file missing');
}

// AC1: a genuinely incomplete run is NOT closed by a finish.
{
  const incomplete = `---
stateVersion: 3
revision: 0
workflowId: wf-partial
slug: close
workflowType: standard
status: active
currentStep: 5
completedSteps: [0,1,2,4]
skippedSteps:
  - { step: 3, reason: dag-disabled, evidence: "" }
stepStatus: { 0: completed, 1: completed, 2: completed, 3: skipped, 4: completed }
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`;
  const root = makeRoot('ws-close-us395-partial-', incomplete);
  const rel = '.agents/plans/close/close.state.md';
  const result = run([
    'finish', rel, '--step', '5', '--status', 'completed', '--verification-score', '9',
    '--timestamp', '2026-09-22T13:00:00.000Z', '--repo-root', root,
  ]);
  // Step 5 completion may require an ac-ledger score; the invariant under test is
  // that the run does not close. A non-zero exit is acceptable here.
  const jsonFile = path.join(root, rel.replace(/\.state\.md$/, '.state.json'));
  if (fs.existsSync(jsonFile)) {
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    if (json.status === 'completed') throw new Error('us-395 AC1: incomplete run wrongly closed');
  }
}

// AC1: a run with a failed step is not terminal-shaped and must not close,
// even though the finish path also records the failed step in completedSteps.
{
  const failedState = `---
stateVersion: 3
revision: 0
workflowId: wf-failed
slug: close
workflowType: standard
status: active
currentStep: 8
completedSteps: [0,1,2,4,5,6,7]
skippedSteps:
  - { step: 3, reason: dag-disabled, evidence: "" }
stepStatus: { 0: completed, 1: completed, 2: completed, 3: skipped, 4: completed, 5: completed, 6: failed, 7: completed }
workflowManifest: {"created":[],"modified":[],"deleted":[]}
---
# State
`;
  const root = makeRoot('ws-close-us395-failed-', failedState);
  const rel = '.agents/plans/close/close.state.md';
  const result = run([
    'finish', rel, '--step', '8', '--status', 'skipped', '--reason', 'fix-pr-not-applicable',
    '--timestamp', '2026-09-22T13:00:00.000Z', '--repo-root', root,
  ]);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const json = readJson(root, rel.replace(/\.state\.md$/, '.state.json'));
  if (json.status === 'completed') throw new Error('us-395 AC1: a run with a failed step must not close');
}

// AC9: the new fixtures are registered in the harness-efficiency suite so
// `npm run test` and `test-harness-clean.js` exercise them.
{
  const suites = JSON.parse(fs.readFileSync(path.join(repoRoot, 'test/test-suites.json'), 'utf8'));
  const entries = (suites.harnessEfficiency || []).map((entry) => entry[0]);
  for (const name of ['test/test-ws-monitor-us395.js', 'test/test-terminal-close-us395.js']) {
    if (!entries.includes(name)) throw new Error(`us-395 AC9: ${name} not registered in test-suites.json`);
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-395 terminal-shape close ok');
