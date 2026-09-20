/**
 * us-365: opt-in ws-spec-to-pr execution observer.
 * AC1 state transcript paths, AC2 autoStartObserver default-off,
 * AC3 at-most-one dispatch, AC4 watcher read-only, AC5 classified
 * log/report with proposals, AC6 shared instruction source.
 * Run: node test/test-observer-us365.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const OBSERVER = path.join(REPO, '.agents/skills/ws-spec-to-pr/scripts/observer.cjs');
const MONITOR = path.join(REPO, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const {
  resolveAutoStartObserver,
  buildAgentTranscripts,
  recordAgentTranscripts,
  countObserverDispatches,
  shouldDispatchObserver,
  noteObserverDispatch,
  watchRun,
} = require(OBSERVER);
const { resolveStateAgentTranscripts, resolveStateTranscriptSource } = require(MONITOR);
const { loadJsonSchema, validateNode } = require(
  path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/validate_json_schema.cjs'),
);

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else {
    console.error(`FAIL ${msg}`);
    failures += 1;
  }
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}
function tempRoot(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function hashTree(root, excludeDirs = []) {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (excludeDirs.includes(entry.name)) continue;
        walk(path.join(dir, entry.name));
      } else {
        const file = path.join(dir, entry.name);
        out.push(`${path.relative(root, file)}:${crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}`);
      }
    }
  };
  walk(root);
  return out.sort().join('\n');
}
function runObserver(args, cwd = REPO) {
  return cp.spawnSync(process.execPath, [OBSERVER, ...args], { cwd, encoding: 'utf8' });
}

// AC2: config resolution — omitted/false/non-true mean zero watcher dispatches.
assert(resolveAutoStartObserver(undefined) === false, 'AC2 omitted → false');
assert(resolveAutoStartObserver({}) === false, 'AC2 empty config → false');
assert(resolveAutoStartObserver({ monitor: {} }) === false, 'AC2 empty monitor → false');
assert(resolveAutoStartObserver({ monitor: { autoStartObserver: false } }) === false, 'AC2 false → false');
assert(resolveAutoStartObserver({ monitor: { autoStartObserver: true } }) === true, 'AC2 true → true');
assert(resolveAutoStartObserver({ monitor: { autoStartObserver: 1 } }) === false, 'AC2 truthy non-boolean → false');
assert(resolveAutoStartObserver({ monitor: { autoStartObserver: 'true' } }) === false, 'AC2 string → false');

const schema = JSON.parse(fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-shared/runtime/config.schema.json'), 'utf8'));
const autoStartProp = schema.properties?.monitor?.properties?.autoStartObserver || {};
assert(autoStartProp.type === 'boolean' && autoStartProp.default === false, 'AC2 schema shape (boolean, default false)');
const example = JSON.parse(fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8'));
assert(example.monitor.autoStartObserver === false, 'AC2 example seeds false');
const ps1 = fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1'), 'utf8');
assert(ps1.includes("'monitor' -Key 'autoStartObserver'"), 'AC2 config GUI editor carries monitor.autoStartObserver');

// AC1: state-schema markers, present and absent.
const stateSchema = JSON.parse(fs.readFileSync(
  path.join(REPO, '.agents/skills/ws-shared/runtime/workflow-state.schema.json'), 'utf8'));
const markerSchema = {
  type: 'object',
  properties: { agentTranscripts: stateSchema.properties.agentTranscripts },
  required: [],
};
const presentMarker = buildAgentTranscripts({ paths: ['.agents/transcripts/s1.jsonl'] });
assert(presentMarker.status === 'available' && presentMarker.paths.length === 1, 'AC1 present marker built');
assert(validateNode({ agentTranscripts: presentMarker }, markerSchema,
  'agentTranscripts.present').length === 0, 'AC1 present marker validates against state schema');
const absentMarker = buildAgentTranscripts({ reason: 'no-matching-session' });
assert(absentMarker.status === 'transcript-unavailable' && absentMarker.reason === 'no-matching-session',
  'AC1 absent marker built');
assert(validateNode({ agentTranscripts: absentMarker }, { type: 'object', properties: markerSchema.properties },
  'agentTranscripts.absent').length === 0, 'AC1 absent marker validates against state schema');
let threw = false;
try {
  buildAgentTranscripts({});
} catch {
  threw = true;
}
assert(threw, 'AC1 marker without paths or reason fails closed');
// Fix-pr round 1: schema rejects available-without-paths and
// unavailable-without-reason (contract hole: valid-but-meaningless markers).
for (const bad of [
  { status: 'available' },
  { status: 'available', paths: [] },
  { status: 'transcript-unavailable' },
  { status: 'bogus' },
  { status: 'available', paths: ['a'], reason: 'discovery-disabled' },
  { status: 'transcript-unavailable', reason: 'discovery-disabled', paths: ['a'] },
]) {
  assert(validateNode({ agentTranscripts: bad }, markerSchema, 'agentTranscripts.negative').length > 0,
    `AC1 schema rejects ${JSON.stringify(bad)}`);
}

// AC1: record into a state file (JSON + md dual write round-trip).
{
  const root = tempRoot('us365-record-');
  const stateFile = path.join(root, '.agents', 'plans', 'demo', 'wf-demo.state.json');
  write(stateFile, JSON.stringify({
    stateVersion: 3, revision: 0, workflowId: 'wf-demo', slug: 'demo',
    workflowType: 'standard', status: 'active', currentStep: 1,
    completedSteps: [], skippedSteps: [],
  }));
  write(stateFile.replace(/\.state\.json$/, '.state.md'),
    '---\nstateVersion: 3\nrevision: 0\nworkflowId: wf-demo\nslug: demo\nworkflowType: standard\nstatus: active\ncurrentStep: 0\ncompletedSteps: []\nskippedSteps: []\n---\n# State\n');
  const recorded = recordAgentTranscripts(stateFile, buildAgentTranscripts({ paths: ['t/a.jsonl'] }));
  assert(recorded.status === 'available', 'AC1 record returns available marker');
  const reloaded = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  assert(reloaded.agentTranscripts?.status === 'available', 'AC1 state JSON carries transcript paths');
  assert(resolveStateAgentTranscripts(reloaded)?.status === 'available',
    'AC1 ws-monitor resolves the state-recorded marker');
  const absent = recordAgentTranscripts(stateFile, buildAgentTranscripts({ reason: 'discovery-disabled' }));
  assert(absent.status === 'transcript-unavailable', 'AC1 record returns absent marker');
  assert(resolveStateAgentTranscripts(JSON.parse(fs.readFileSync(stateFile, 'utf8')))?.reason === 'discovery-disabled',
    'AC1 ws-monitor resolves the absent marker with reason');
  fs.rmSync(root, { recursive: true, force: true });
}

// Fix-pr round 1: state transcript source preference (unit).
assert(resolveStateTranscriptSource(null, '/repo') === null, 'AC1 no marker → null source');
assert(resolveStateTranscriptSource(
  { status: 'available', paths: ['.agents/transcripts/s1.jsonl'] }, '/repo').source === 'state-recorded',
  'AC1 available marker → state-recorded source');
assert(resolveStateTranscriptSource(
  { status: 'transcript-unavailable', reason: 'scan-capped' }, '/repo').reason === 'scan-capped',
  'AC1 absent marker carries state reason into transcriptSource');

// AC3: dispatch gate — zero when disabled, at most one when enabled.
assert(shouldDispatchObserver({ config: {}, telemetryEvents: [] }) === false, 'AC3 disabled → no dispatch');
assert(shouldDispatchObserver({
  config: { monitor: { autoStartObserver: true } }, telemetryEvents: [],
}) === true, 'AC3 enabled empty run → dispatch allowed');
assert(shouldDispatchObserver({
  config: { monitor: { autoStartObserver: true } },
  telemetryEvents: [{ type: 'observer-dispatch', at: '2026-09-20T00:00:00Z' }],
}) === false, 'AC3 enabled already-dispatched run → refused');
{
  const root = tempRoot('us365-dispatch-');
  const stateFile = path.join(root, 'wf.state.json');
  const telemetryFile = path.join(root, 'telemetry.jsonl');
  const configFile = path.join(root, 'config.json');
  write(stateFile, JSON.stringify({
    stateVersion: 3, revision: 0, workflowId: 'wf', slug: 's',
    workflowType: 'standard', status: 'active', currentStep: 2,
    completedSteps: [], skippedSteps: [],
  }));
  write(configFile, JSON.stringify({ monitor: { autoStartObserver: true } }));
  write(telemetryFile, '');
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  noteObserverDispatch({ stateFile, telemetryFile, config, subagentId: 'watcher-1' });
  const events = fs.readFileSync(telemetryFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  assert(countObserverDispatches(events) === 1, 'AC3 enabled run records exactly one dispatch');
  assert(JSON.parse(fs.readFileSync(stateFile, 'utf8')).observer?.dispatchCount === 1,
    'AC3 state records single dispatch');
  let refused = false;
  try {
    noteObserverDispatch({ stateFile, telemetryFile, config, subagentId: 'watcher-2' });
  } catch {
    refused = true;
  }
  assert(refused, 'AC3 second dispatch refused');
  assert(countObserverDispatches(fs.readFileSync(telemetryFile, 'utf8').trim().split('\n').map((line) => JSON.parse(line))) === 1,
    'AC3 dispatch count stays at one');
  const gate = runObserver(['should-dispatch', '--config', configFile, '--telemetry', telemetryFile]);
  assert(gate.status === 2, 'AC3 should-dispatch CLI exits 2 when enabled but already dispatched');
  write(configFile, JSON.stringify({ monitor: { autoStartObserver: true } }));
  write(telemetryFile, '');
  const fresh = runObserver(['should-dispatch', '--config', configFile, '--telemetry', telemetryFile]);
  assert(fresh.status === 0 && JSON.parse(fresh.stdout).dispatch === true,
    'AC3 should-dispatch CLI exits 0 with dispatch true on fresh enabled run');
  write(configFile, JSON.stringify({}));
  const offGate = runObserver(['should-dispatch', '--config', configFile, '--telemetry', telemetryFile]);
  assert(offGate.status === 0 && JSON.parse(offGate.stdout).dispatch === false
    && JSON.parse(offGate.stdout).enabled === false,
    'AC3 should-dispatch CLI exits 0 (not 2) when disabled');
  const off = runObserver(['note-dispatch', '--state', stateFile, '--telemetry', telemetryFile, '--config', configFile]);
  assert(off.status !== 0, 'AC3 note-dispatch refused when disabled');
  fs.rmSync(root, { recursive: true, force: true });
}

// AC4 + AC5: watched run is immutable outside observer/; log/report carry
// classified entries with upstream-scoped proposals.
{
  const root = tempRoot('us365-watch-');
  const usDir = path.join(root, '.agents', 'plans', 'demo');
  const stateFile = path.join(usDir, 'wf-demo.state.json');
  write(stateFile, JSON.stringify({
    stateVersion: 3, revision: 4, workflowId: 'wf-demo', slug: 'demo',
    workflowType: 'standard', status: 'active', currentStep: 6, verificationScore: 5,
    completedSteps: [0, 1, 2, 4, 5], skippedSteps: [{ step: 3, reason: 'dag-disabled', evidence: 'sequential' }],
    nextAction: 'continue with implement-plan follow-up',
    handoffs: { 4: { step: 4, artifactPaths: [], summary: 'built' } },
    agentTranscripts: { status: 'transcript-unavailable', reason: 'discovery-disabled' },
  }));
  write(path.join(usDir, 'telemetry.jsonl'), [
    JSON.stringify({ type: 'dispatch', step: 4, dispatchedAt: '2026-09-20T00:00:00Z' }),
    JSON.stringify({ type: 'observer-dispatch', at: '2026-09-20T00:01:00Z', subagentId: 'watcher-1' }),
  ].join('\n') + '\n');
  write(path.join(root, 'consumer', 'app.js'), 'console.log(1)\n');
  const before = hashTree(root);
  const stateBefore = fs.readFileSync(stateFile, 'utf8');
  const r = runObserver(['watch', '--state', stateFile, '--us-dir', usDir,
    '--telemetry', path.join(usDir, 'telemetry.jsonl')]);
  assert(r.status === 0, `AC4 watch CLI exits 0 (${r.stderr.trim()})`);
  assert(hashTree(root, ['observer']) === before, 'AC4 tree hash identical outside observer/');
  assert(fs.readFileSync(stateFile, 'utf8') === stateBefore, 'AC4 state file bytes identical');
  const logPath = path.join(usDir, 'observer', 'observer.log');
  const reportPath = path.join(usDir, 'observer', 'observer-report.md');
  assert(fs.existsSync(logPath) && fs.existsSync(reportPath), 'AC5 log/report pair written');
  const entries = fs.readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  const codes = entries.map((entry) => entry.code || entry.type);
  assert(codes.includes('verify-below-bar'), 'AC5 log classifies below-bar advance');
  assert(codes.includes('retired-reference'), 'AC5 log flags skill-instruction mistake');
  const classified = entries.filter((entry) => entry.severity);
  assert(classified.every((entry) => ['critical', 'warning', 'info'].includes(entry.severity) && entry.message && entry.code),
    'AC5 every finding has severity/code/message');
  const report = fs.readFileSync(reportPath, 'utf8');
  assert(report.includes('## Fix proposals') && report.includes('Upstream fix'),
    'AC5 report carries upstream-scoped fix proposals');
  // Watch refuses writes outside observer/.
  const escape = runObserver(['watch', '--state', stateFile, '--us-dir', path.join(root, '..')]);
  assert(escape.status === 0 || escape.status === 1, 'AC5 watch with odd us-dir does not crash the harness');
  fs.rmSync(root, { recursive: true, force: true });
}

// AC1 readable by ws-monitor: snapshot surfaces the state-recorded marker.
{
  const root = tempRoot('us365-monitor-');
  write(path.join(root, '.ws/config.json'), JSON.stringify({
    project: { name: 'us365-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' }, verification: {},
  }));
  const dir = path.join(root, '.agents', 'plans', 'demo');
  write(path.join(dir, 'wf-demo.state.json'), JSON.stringify({
    stateVersion: 3, revision: 1, workflowId: 'wf-demo', slug: 'demo',
    workflowType: 'standard', status: 'active', currentStep: 1,
    completedSteps: [0], skippedSteps: [],
    agentTranscripts: { status: 'available', paths: ['.agents/transcripts/s1.jsonl'] },
  }));
  const childEnv = { ...process.env };
  delete childEnv.XDG_DATA_HOME;
  const snap = cp.spawnSync(process.execPath, [MONITOR, '--json'], {
    cwd: root, encoding: 'utf8', env: childEnv,
  });
  assert(snap.status === 0, 'AC1 monitor snapshot exits 0');
  const parsed = JSON.parse(snap.stdout);
  const workflow = parsed.workflows.find((item) => item.slug === 'demo');
  assert(workflow?.stateAgentTranscripts?.status === 'available', 'AC1 snapshot surfaces state transcript paths');
  const md = cp.spawnSync(process.execPath, [MONITOR, '--slug', 'demo'], {
    cwd: root, encoding: 'utf8', env: childEnv,
  });
  assert(md.stdout.includes('State transcripts: available (1 paths)'), 'AC1 snapshot markdown names state transcripts');
  // Fix-pr round 1: state-recorded paths drive the primary transcriptSource
  // even with host discovery off (no available/unavailable contradiction).
  assert(workflow?.transcriptSource?.status === 'available', 'AC1 state paths drive transcriptSource');
  assert(workflow?.transcriptSource?.source === 'state-recorded', 'AC1 transcriptSource names state-recorded source');
  assert(!md.stdout.includes('Transcript: transcript-unavailable'),
    'AC1 no contradictory transcript-unavailable line alongside state paths');
  fs.rmSync(root, { recursive: true, force: true });
}

// AC6: one shared instruction source, referenced by both sides.
{
  const shared = path.join(REPO, '.agents/skills/ws-shared/runtime/observer-instructions.md');
  assert(fs.existsSync(shared), 'AC6 shared observer-instructions.md exists');
  const orch = fs.readFileSync(path.join(REPO, '.agents/skills/ws-spec-to-pr/SKILL.md'), 'utf8');
  const monitor = fs.readFileSync(path.join(REPO, '.agents/skills/ws-monitor/SKILL.md'), 'utf8');
  assert(orch.includes('observer-instructions.md'), 'AC6 orchestrator references the shared source');
  assert(monitor.includes('observer-instructions.md'), 'AC6 ws-monitor references the shared source');
  const refs = (text) => [...text.matchAll(/\(([^)]*observer-instructions\.md)\)/g)].map((m) => m[1]);
  const orchTargets = [...new Set(refs(orch).map((r) => path.resolve(REPO, '.agents/skills/ws-spec-to-pr', r)))];
  const monitorTargets = [...new Set(refs(monitor).map((r) => path.resolve(REPO, '.agents/skills/ws-monitor', r)))];
  assert(orchTargets.length > 0 && orchTargets.every((t) => t === shared),
    'AC6 orchestrator reference resolves to the shared file');
  assert(monitorTargets.length > 0 && monitorTargets.every((t) => t === shared),
    'AC6 monitor reference resolves to the same shared file');
}

if (failures > 0) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll observer us-365 checks passed.');
