/**
 * us-419: observer-log follow-ups — intra-root enumeration edge, dispatch-time
 * agentTranscripts marker, G2 plans-index hash staleness, compactOutputs no-op.
 * Run: node test/test-ws-us419-followups.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const monitorScript = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const hubScript = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/workflow_state.cjs');
const updateScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs');
const g2Script = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs');
const baselineScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs');
const { listTranscriptCandidates, scanTranscriptRoots } = require(monitorScript);
const { sha256, canonicalStateJson } = require(hubScript);

const tempRoots = [];
function temp(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function run(cmd, args, cwd) {
  return cp.spawnSync(cmd, args, { cwd, encoding: 'utf8' });
}
function writeConfig(root, monitor = {}) {
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'us419-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      monitor,
    }),
  );
}
const FRESH_STATE = `---
stateVersion: 3
revision: 0
workflowId: WF
slug: SLUG
workflowType: standard
status: active
currentStep: 0
completedSteps: []
skippedSteps: []
workflowManifest: {"created":[],"modified":[],"deleted":[]}
acTotal: 0
acImplemented: 0
---

# State
`;

// AC1: merged root where the path-correlated target sorts last (oldest mtime).
// Keyed enumeration collects it; keyless enumeration (previous behavior) misses it.
{
  const root = temp('ws-us419-ac1-');
  const merged = path.join(root, 'merged');
  fs.mkdirSync(merged, { recursive: true });
  const now = Date.now();
  for (let i = 0; i < 12; i += 1) {
    const filler = path.join(merged, `filler-${String(i).padStart(3, '0')}.jsonl`);
    write(filler, 'unrelated history\n');
    fs.utimesSync(filler, new Date(now - ((i + 1) * 3600000)), new Date(now - ((i + 1) * 3600000)));
  }
  const sub = path.join(merged, 'us-419');
  fs.mkdirSync(sub, { recursive: true });
  const target = path.join(sub, 'session.jsonl');
  write(target, 'wf-us419-trace us-419 worker activity\n');
  fs.utimesSync(target, new Date(now - 10 * 86400000), new Date(now - 10 * 86400000));
  fs.utimesSync(sub, new Date(now - 10 * 86400000), new Date(now - 10 * 86400000));

  const keys = ['wf-us419-trace', 'us-419'];
  const keyed = listTranscriptCandidates(merged, 2, keys);
  assert.ok(keyed.some((f) => f.includes('us-419')), 'keyed enumeration reaches the target sorting last');
  const legacy = listTranscriptCandidates(merged, 2);
  assert.ok(!legacy.some((f) => f.includes('us-419')), 'keyless enumeration misses the target (pre-fix behavior)');
  assert.deepStrictEqual(listTranscriptCandidates(merged, 2, []), legacy, 'empty keys keep the exact previous walk');
  const scanned = scanTranscriptRoots(
    { repoRoot: root, config: {} },
    [merged],
    { workflowId: 'wf-us419-trace', slug: 'us-419' },
  );
  assert.ok(scanned.filesScanned >= 1, `merged root with the correlated target last scans it (filesScanned=${scanned.filesScanned})`);
  console.log('AC1 intra-root enumeration reaches the correlated target: ok');
}

// AC2: dispatch records the marker once; explicit paths win; existing markers survive.
{
  const root = temp('ws-us419-ac2-');
  const dispatch = (wf, extraArgs = [], monitor = {}) => {
    writeConfig(root, monitor);
    const rel = `.agents/plans/${wf}/wf.state.md`;
    write(path.join(root, rel), FRESH_STATE.replace(/WF/g, wf).replace(/SLUG/g, wf));
    const r = run(process.execPath, [updateScript, 'dispatch', rel, '--step', '0', '--timestamp', '2026-09-25T03:00:00.000Z', '--repo-root', root, ...extraArgs], root);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    return JSON.parse(fs.readFileSync(path.join(root, `.agents/plans/${wf}/wf.state.json`), 'utf8')).agentTranscripts;
  };
  const absent = dispatch('sm-off');
  assert.equal(absent && absent.status, 'transcript-unavailable', 'dispatch without paths records the absent marker');
  assert.equal(absent.reason, 'discovery-disabled', 'disabled discovery names discovery-disabled');
  const available = dispatch('sm-paths', ['--transcript-paths', 'a/session.jsonl,b/other.jsonl']);
  assert.equal(available && available.status, 'available', 'known session paths record available');
  assert.deepStrictEqual(available.paths, ['a/session.jsonl', 'b/other.jsonl']);
  const capped = dispatch('sm-on', [], { discoverHostTranscripts: true });
  assert.equal(capped && capped.reason, 'no-matching-session', 'enabled discovery without a known session names no-matching-session');
  const rel = '.agents/plans/sm-paths/wf.state.md';
  const r = run(process.execPath, [updateScript, 'dispatch', rel, '--step', '1', '--timestamp', '2026-09-25T03:01:00.000Z', '--repo-root', root], root);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const kept = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/sm-paths/wf.state.json'), 'utf8')).agentTranscripts;
  assert.equal(kept && kept.status, 'available', 'a later dispatch never overwrites the recorded marker');
  console.log('AC2 dispatch-time marker default: ok');
}

// AC2b (fix-pr: reviewer WARNING): a transcript-unavailable state marker
// must not pin transcriptSource or suppress discovery. With discovery on
// and a correlated session present, the snapshot still resolves available.
{
  const root = temp('ws-us419-ac2b-');
  writeConfig(root, { discoverHostTranscripts: true });
  const plansDir = path.join(root, '.agents', 'plans', 'us-419-pin');
  write(
    path.join(plansDir, 'wf-us419-pin.state.json'),
    JSON.stringify({
      stateVersion: 3, revision: 5, workflowId: 'wf-us419-pin',
      slug: 'us-419-pin', workflowType: 'standard', status: 'active',
      currentStep: 4, completedSteps: [0, 1, 2, 3], skippedSteps: [],
      stepStatus: { 3: 'completed', 4: 'active' },
      agentTranscripts: { status: 'transcript-unavailable', reason: 'no-matching-session', recordedAt: '2026-09-25T03:00:00.000Z' },
    }),
  );
  for (const artifact of ['step-00-us-419-pin.spec.md', 'step-01-us-419-pin.plan.md']) {
    write(path.join(plansDir, artifact), 'artifact\n');
  }
  const sessionDir = path.join(root, 'session-explicit');
  write(path.join(sessionDir, 'session.jsonl'), 'wf-us419-pin us-419-pin worker activity\n');
  const result = cp.spawnSync(
    process.execPath,
    [
      monitorScript, '--repo-root', root, '--slug', 'us-419-pin',
      '--discover-host-transcripts', '--transcript-root', sessionDir, '--json',
    ],
    { cwd: root, encoding: 'utf8', env: { ...process.env, XDG_DATA_HOME: path.join(root, 'xdg-none') } },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const workflow = report.workflows.find((w) => w.slug === 'us-419-pin');
  assert.ok(workflow, 'pinned workflow present in snapshot');
  assert.equal(workflow.transcriptSource.status, 'available', `absent marker must not pin discovery: ${JSON.stringify(workflow.transcriptSource)}`);
  console.log('AC2b absent marker never pins discovery: ok');
}
// AC3: plans-index stateSha256 matches right after a G2 commit and a baseline refresh.
{
  const root = temp('ws-us419-ac3-');
  writeConfig(root);
  run('git', ['init', '-q'], root);
  run('git', ['config', 'user.email', 't@t.t'], root);
  run('git', ['config', 'user.name', 't'], root);
  run('git', ['config', 'commit.gpgsign', 'false'], root);
  write(path.join(root, 'product.txt'), 'v1\n');
  run('git', ['add', '-A'], root);
  run('git', ['commit', '-qm', 'init'], root);
  run('git', ['branch', '-M', 'main'], root);
  const rel = '.agents/plans/sm/wf.state.md';
  const stateObj = {
    stateVersion: 3, revision: 0, workflowId: 'wf-sm', slug: 'sm', workflowType: 'standard',
    status: 'active', currentStep: 5, completedSteps: [0, 1, 2, 3, 4], skippedSteps: [],
    workflowManifest: { created: ['product.txt'], modified: [], deleted: [] },
    acTotal: 0, acImplemented: 0,
  };
  write(path.join(root, '.agents/plans/sm/wf.state.json'), JSON.stringify(stateObj, null, 2));
  write(path.join(root, rel), '---\nstateVersion: 3\nworkflowId: wf-sm\nslug: sm\nworkflowType: standard\nstatus: active\ncurrentStep: 5\n---\n\n# State\n');
  write(path.join(root, 'product.txt'), 'v2\n');
  const g2 = run(process.execPath, [g2Script, '--state', rel, '--step', '5', '--message', 'feat(sm): verified implementation'], root);
  assert.equal(g2.status, 0, g2.stderr || g2.stdout);
  const afterCommit = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/sm/wf.state.json'), 'utf8'));
  const index = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/index.json'), 'utf8'));
  const row = index.workflows.find((w) => w.workflowId === 'wf-sm');
  assert.ok(row, 'G2 commit writes the plans-index row');
  assert.equal(row.stateSha256, sha256(canonicalStateJson(afterCommit)), 'index hash matches right after the G2 commit');
  write(path.join(root, 'other.txt'), 'x\n');
  run('git', ['add', '-A'], root);
  run('git', ['commit', '-qm', 'second'], root);
  const base = run(process.execPath, [baselineScript, '--state', '.agents/plans/sm/wf.state.json', '--base-ref', 'main', '--remote', 'origin', '--no-fetch'], root);
  assert.equal(base.status, 0, base.stderr || base.stdout);
  const afterBase = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/sm/wf.state.json'), 'utf8'));
  const index2 = JSON.parse(fs.readFileSync(path.join(root, '.agents/plans/index.json'), 'utf8'));
  const row2 = index2.workflows.find((w) => w.workflowId === 'wf-sm');
  assert.equal(row2.stateSha256, sha256(canonicalStateJson(afterBase)), 'index hash matches right after the baseline refresh');
  console.log('AC3 G2 index freshness: ok');
}

// AC4: a second finish updates the compact section (heading matched literally).
{
  const root = temp('ws-us419-ac4-');
  writeConfig(root);
  const rel = '.agents/plans/sm/wf.state.md';
  write(path.join(root, rel), FRESH_STATE.replace(/WF/g, 'wf-sm').replace(/SLUG/g, 'sm'));
  const step = (op, n, at) => {
    const r = run(process.execPath, [updateScript, op, rel, '--step', String(n), '--timestamp', at, '--repo-root', root], root);
    assert.equal(r.status, 0, r.stderr || r.stdout);
  };
  step('dispatch', 0, '2026-09-25T03:00:00.000Z');
  step('finish', 0, '2026-09-25T03:00:05.000Z');
  const section = (text) => (text.match(/## Step outputs \(compact\)[\s\S]*$/) || [''])[0];
  const first = section(fs.readFileSync(path.join(root, rel), 'utf8'));
  assert.ok(first.includes('- Step 0:'), 'first finish writes the compact section');
  step('dispatch', 1, '2026-09-25T03:01:00.000Z');
  step('finish', 1, '2026-09-25T03:01:05.000Z');
  const second = section(fs.readFileSync(path.join(root, rel), 'utf8'));
  assert.ok(second.includes('- Step 1:'), 'second finish updates the compact section');
  assert.notEqual(second, first, 'compact section content changes across finishes');
  console.log('AC4 compactOutputs second finish: ok');
}

// AC5: the test-sandbox LF rule exists and the sandbox tree is clean.
{
  const attributes = fs.readFileSync(path.join(repoRoot, '.gitattributes'), 'utf8');
  assert.ok(attributes.includes('test/.ws/** text eol=lf'), 'gitattributes pins LF for test/.ws fixtures');
  const status = run('git', ['status', '--porcelain=v1', '--', 'test/.ws/'], repoRoot);
  assert.equal(status.status, 0, status.stderr);
  // AC5 pins EOL dirtiness only: modified entries under test/.ws. Untracked
// `??` residue belongs to other suites running earlier in the same pass
// (e.g. the install suite seeds STACK.md) and must not fail this guard.
const modified = status.stdout.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("??"));
assert.deepStrictEqual(modified, [], `test/.ws has no EOL-dirty entries (got: ${modified.join(", ")})`);
  console.log('AC5 test-sandbox LF rule: ok');
}

// AC6: gate-history timestamps — no script rounding call site exists; the
// shared writer keeps exact second precision (millis stripped only).
{
  const source = fs.readFileSync(hubScript, 'utf8');
  assert.ok(source.includes('toISOString().replace'), 'exact-second timestamp writer present');
  assert.ok(!source.includes('setSeconds(0'), 'no minute-rounding call site');
  assert.ok(!source.includes('slice(0, 16)'), 'no timestamp truncation call site');
  console.log('AC6 exact write-time timestamps: ok');
}

// AC7: adjudicated classes unchanged — the monitor/observer/state suites stay green.
{
  for (const suite of ['test/test-ws-monitor-us412-418.js', 'test/test-observer-us365.js', 'test/test-workflow-state-contract.js']) {
    const r = run(process.execPath, [path.join(repoRoot, suite)], repoRoot);
    assert.equal(r.status, 0, `${suite} stays green: ${(r.stderr || r.stdout).slice(-300)}`);
  }
  console.log('AC7 adjudicated no-regression suites: ok');
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('test-ws-us419-followups: ok');
