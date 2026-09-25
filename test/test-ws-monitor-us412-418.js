/**
 * us-412-418: ws-monitor accuracy — step-membership artifact expectations,
 * legacy terminal tolerance, transcript correlation windows, discovery budget.
 * Run: node test/test-ws-monitor-us412-418.js
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
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const {
  classifyWorkflow,
  expectedArtifacts,
  expectsStep,
  transcriptCorrelates,
  scanTranscriptRoots,
  resolveTranscriptSource,
} = require(script);

const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function makePlanDir(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us412-418-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', name);
  fs.mkdirSync(dir, { recursive: true });
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'us412-418-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
  return { root, dir };
}

function missingCrit(findings) {
  return findings.filter(
    (f) => f.severity === 'critical' && (f.code === 'missing-artifact' || f.code === 'missing-exec-artifact'),
  );
}

const NO_TELEMETRY = { events: [], errors: [] };

// Shape A (AC2): fix-PR-only run, completed, empty plan dir → zero criticals.
{
  const { root, dir } = makePlanDir('shape-a');
  const findings = classifyWorkflow(
    {
      slug: 'shape-a', workflowId: 'wf-shape-a', workflowType: 'standard',
      status: 'completed', currentStep: 9, completedSteps: [8, 9], skippedSteps: [],
    },
    dir, NO_TELEMETRY, 9, root,
  );
  assert.equal(missingCrit(findings).length, 0, `shape A must yield zero criticals, got: ${missingCrit(findings).map((f) => f.message).join('; ')}`);
  console.log('A fix-PR-only run stays quiet: ok');
}

// Shape B (AC3): terminal run with refined plan but no interview registry →
// zero criticals, info cites the companion evidence (grandfathered: empty skips).
{
  const { root, dir } = makePlanDir('shape-b');
  write(path.join(dir, 'step-02-shape-b.plan.refined.md'), 'refined\n');
  const findings = classifyWorkflow(
    {
      slug: 'shape-b', workflowId: 'wf-shape-b', workflowType: 'standard',
      status: 'completed', currentStep: 9,
      completedSteps: [0, 1, 2, 4, 5, 6, 7, 8, 9],
      skippedSteps: [{ step: 3, reason: 'dag-disabled', evidence: '' }],
    },
    dir, NO_TELEMETRY, 9, root,
  );
  assert.equal(missingCrit(findings).length, 0, `shape B must yield zero criticals, got: ${missingCrit(findings).map((f) => f.message).join('; ')}`);
  const interview = findings.find((f) => f.message.includes('step-02-shape-b.plan-interview.md'));
  assert.ok(interview, 'shape B still reports the interview-registry drift');
  assert.equal(interview.severity, 'info', 'shape B drift is info, not critical');
  assert.match(interview.message, /interview evidence/, 'shape B cites the refined companion as interview evidence');
  const grandfathered = classifyWorkflow(
    {
      slug: 'shape-b', workflowId: 'wf-shape-b', workflowType: 'standard',
      status: 'completed', currentStep: 9,
      completedSteps: [0, 1, 2, 4, 5, 6, 7, 8, 9], skippedSteps: [],
    },
    dir, NO_TELEMETRY, 9, root,
  );
  assert.equal(missingCrit(grandfathered).length, 0, 'shape B with empty skippedSteps is grandfathered too');
  console.log('B terminal interview drift tolerated with companion evidence: ok');
}

// Shape C (AC1): sparse completed steps + high watermark → never-ran steps silent.
{
  const { root, dir } = makePlanDir('shape-c');
  const names = expectedArtifacts(
    {
      slug: 'shape-c', workflowType: 'standard', status: 'completed',
      currentStep: 9, completedSteps: [0, 4, 5, 6, 7, 8, 9], skippedSteps: [],
    },
    dir, 9, root,
  ).map((a) => a.name);
  for (const banned of ['step-01-shape-c.plan.md', 'step-02-shape-c.plan-interview.md', 'step-02-shape-c.plan.refined.md', 'step-03-shape-c.plan.exec.md']) {
    assert.ok(!names.includes(banned), `shape C must not expect never-ran ${banned}`);
  }
  const findings = classifyWorkflow(
    {
      slug: 'shape-c', workflowId: 'wf-shape-c', workflowType: 'standard',
      status: 'completed', currentStep: 9, completedSteps: [0, 4, 5, 6, 7, 8, 9], skippedSteps: [],
    },
    dir, NO_TELEMETRY, 9, root,
  );
  assert.equal(missingCrit(findings).length, 0, 'shape C must yield zero criticals');
  console.log('C sparse steps expect membership only: ok');
}

// AC4: sequential legacy run — exec expectation follows membership, not the
// dag-disabled reason. Step 3 never ran → no exec expectation even with a high
// watermark and no skip record.
{
  const { root, dir } = makePlanDir('shape-ac4');
  const names = expectedArtifacts(
    { slug: 'shape-ac4', workflowType: 'standard', currentStep: 9, completedSteps: [0, 1, 2, 4, 5], skippedSteps: [] },
    dir, 9, root,
  ).map((a) => a.name);
  assert.ok(!names.includes('step-03-shape-ac4.plan.exec.md'), 'sequential legacy run without step 3 expects no exec artifact');
  const withCompletion = expectedArtifacts(
    { slug: 'shape-ac4', workflowType: 'standard', currentStep: 9, completedSteps: [0, 1, 2, 3, 4, 5], skippedSteps: [] },
    dir, 9, root,
  ).map((a) => a.name);
  assert.ok(withCompletion.includes('step-03-shape-ac4.plan.exec.md'), 'a truly completed step 3 still expects the exec artifact');
  console.log('AC4 exec expectation follows step-3 membership: ok');
}

// AC1 membership units: stepStatus-only signal, watermark fallback.
{
  const { root, dir } = makePlanDir('shape-membership');
  assert.equal(expectsStep({ completedSteps: [2], currentStep: 9 }, 2, 3), true, 'completedSteps membership');
  assert.equal(expectsStep({ completedSteps: [8, 9], currentStep: 9 }, 2, 3), false, 'absent step not expected');
  assert.equal(
    expectsStep({ stepStatus: { 2: 'completed' }, currentStep: 9 }, 2, 3),
    true,
    'stepStatus completed counts without completedSteps',
  );
  assert.equal(expectsStep({ currentStep: 6 }, 5, 6), true, 'watermark fallback when step lists are absent');
  assert.equal(expectsStep({ currentStep: 4 }, 5, 6), false, 'watermark fallback below the gate');
  const names = expectedArtifacts(
    { slug: 'shape-membership', workflowType: 'standard', stepStatus: { 2: 'completed' }, currentStep: 9 },
    dir, 9, root,
  ).map((a) => a.name);
  assert.ok(names.includes('step-02-shape-membership.plan-interview.md'), 'stepStatus-only signal expects interview artifacts');
  assert.ok(!names.includes('step-01-shape-membership.plan.md'), 'stepStatus-only signal expects nothing for other steps');
  console.log('AC1 membership units + watermark fallback: ok');
}

// AC5 / NEG3 guard: a genuinely live run past verification without artifacts
// still flags critical (no over-correction into silence).
{
  const { root, dir } = makePlanDir('shape-live');
  const findings = classifyWorkflow(
    {
      slug: 'shape-live', workflowId: 'wf-shape-live', workflowType: 'standard',
      status: 'active', currentStep: 6, completedSteps: [0, 1, 2, 3, 4, 5], skippedSteps: [],
    },
    dir, NO_TELEMETRY, 9, root,
  );
  const crit = missingCrit(findings);
  assert.ok(crit.length > 0, 'live run past verification without artifacts must still flag');
  assert.ok(crit.some((f) => f.message.includes('step-05-shape-live.plan.report.md')), 'live run flags the missing verify report');
  assert.ok(crit.every((f) => f.severity === 'critical'), 'live findings stay critical');
  // Same shape without step lists falls back to the watermark and still flags.
  const fallback = classifyWorkflow(
    { slug: 'shape-live', workflowId: 'wf-shape-live', workflowType: 'standard', status: 'active', currentStep: 6 },
    dir, NO_TELEMETRY, 9, root,
  );
  assert.ok(missingCrit(fallback).length > 0, 'watermark fallback still flags a live run with no step lists');
  console.log('AC5 live run still flags critical: ok');
}

// AC7: one shared predicate — scan-counted ⟺ resolve-available on the same tail.
{
  const file = path.join('sessions', '2026', '09', '24', 'abc123', 'session.jsonl');
  const tail = `${'x'.repeat(100 * 1024)}\nwf-tail us-live-tail worker activity\n${'y'.repeat(100 * 1024)}\n`;
  assert.ok(!tail.slice(-8000).includes('wf-tail'), 'fixture keeps the key outside the trailing 8 KB');
  assert.equal(transcriptCorrelates(file, tail, { workflowId: 'wf-tail', slug: 'us-live-tail' }), true, 'shared window correlates the key');
  assert.equal(transcriptCorrelates(file, tail, { workflowId: 'wf-tail', slug: 'us-other' }), false, 'predicate keeps AND semantics for both keys');
  assert.equal(transcriptCorrelates(file, 'nothing here', { workflowId: 'wf-tail', slug: 'us-live-tail' }), false, 'unrelated tail does not correlate');
  assert.equal(transcriptCorrelates(file, 'session abc123 resumed', { sessionId: 'abc123' }), true, 'session id is an alternative key');
  const source = resolveTranscriptSource(
    { slug: 'us-live-tail', workflowId: 'wf-tail' },
    [{ file, mtimeMs: Date.now(), tail }],
    true, repoRoot, { capped: true },
  );
  assert.equal(source.status, 'available', `scan-counted file resolves available even when capped: ${JSON.stringify(source)}`);
  console.log('AC7 shared correlation window: ok');
}

// AC6 (NEG2): time-pressured tick still reads the correlated session first.
// The stubbed clock exhausts the per-tick budget after the first read; the
// correlate-first order makes that first read the correlated recent session.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us412-418-tick-'));
  tempRoots.push(root);
  const floodDir = path.join(root, 'flood');
  const sessionDir = path.join(root, 'session-explicit');
  const oldMs = Date.now() - 24 * 60 * 60 * 1000;
  for (let index = 0; index < 5; index += 1) {
    const filler = path.join(floodDir, `filler-${String(index).padStart(3, '0')}.jsonl`);
    write(filler, 'unrelated filler history\n');
    fs.utimesSync(filler, new Date(oldMs), new Date(oldMs));
  }
  const sessionFile = path.join(sessionDir, 'session.jsonl');
  write(sessionFile, 'wf-tick us-live-tick recent worker activity\n');
  const realNow = Date.now;
  let calls = 0;
  Date.now = () => {
    calls += 1;
    return calls <= 2 ? 1000000 : 1000000 + 99999;
  };
  let scanned;
  try {
    scanned = scanTranscriptRoots(
      { repoRoot: root, config: {} },
      [floodDir, sessionDir],
      { workflowId: 'wf-tick', slug: 'us-live-tick' },
    );
  } finally {
    Date.now = realNow;
  }
  assert.equal(scanned.filesScanned, 1, `time-pressured tick reads the correlated session first (filesScanned=${scanned.filesScanned})`);
  assert.equal(scanned.capped, true, 'exhausted budget still reports capped honestly');
  const source = resolveTranscriptSource(
    { slug: 'us-live-tick', workflowId: 'wf-tick' },
    scanned.files, true, root, { capped: scanned.capped },
  );
  assert.equal(source.status, 'available', 'the counted session resolves available, never scan-capped');
  console.log('AC6 correlate-first read order under time pressure: ok');
}

// AC8 (issue shape): discovery on + explicit root + nested history; an idle
// correlated session raises worker-session-stall.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us412-418-stall-'));
  tempRoots.push(root);
  const plansDir = path.join(root, '.agents', 'plans', 'us-live-stallcombo');
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'us412-418-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
  write(
    path.join(plansDir, 'wf-us-live-stallcombo.state.json'),
    JSON.stringify({
      stateVersion: 3, revision: 5, workflowId: 'wf-live-stallcombo',
      slug: 'us-live-stallcombo', workflowType: 'standard', status: 'active',
      currentStep: 4, completedSteps: [0, 1, 2, 3], skippedSteps: [],
      stepStatus: { 3: 'completed', 4: 'active' },
    }),
  );
  for (const artifact of ['step-00-us-live-stallcombo.spec.md', 'step-01-us-live-stallcombo.plan.md']) {
    write(path.join(plansDir, artifact), 'artifact\n');
  }
  const oldMs = Date.now() - 48 * 60 * 60 * 1000;
  for (let day = 0; day < 3; day += 1) {
    for (let index = 0; index < 4; index += 1) {
      const filler = path.join(root, 'history', `2026-09-2${day}`, ` nest-${index}`, 'subagent', `filler-${index}.jsonl`);
      write(filler, 'unrelated nested history\n');
      fs.utimesSync(filler, new Date(oldMs), new Date(oldMs));
    }
  }
  const sessionDir = path.join(root, 'history', 'session-explicit');
  const sessionFile = path.join(sessionDir, 'session.jsonl');
  write(sessionFile, 'wf-live-stallcombo us-live-stallcombo worker activity\n');
  const idleMs = 65 * 60 * 1000;
  fs.utimesSync(sessionFile, new Date(Date.now() - idleMs), new Date(Date.now() - idleMs));
  const result = cp.spawnSync(
    process.execPath,
    [
      script, '--repo-root', root, '--slug', 'us-live-stallcombo',
      '--discover-host-transcripts', '--transcript-root', sessionDir,
      '--stall-window', '60', '--json',
    ],
    { cwd: root, encoding: 'utf8', env: { ...process.env, XDG_DATA_HOME: path.join(root, 'xdg-none') } },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.ok(report.transcript.filesScanned >= 1, `correlated session read (filesScanned=${report.transcript.filesScanned})`);
  const workflow = report.workflows.find((w) => w.slug === 'us-live-stallcombo');
  assert.equal(workflow.transcriptSource.status, 'available', JSON.stringify(workflow.transcriptSource));
  const stall = workflow.findings.find((f) => f.code === 'worker-session-stall');
  assert.ok(stall, 'idle correlated session on an active workflow raises worker-session-stall');
  assert.equal(stall.severity, 'warning');
  console.log('AC8 stall fires in the discovery+explicit-root shape: ok');
}

// AC10: the snapshot is strictly read-only (no state writes).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us412-418-ro-'));
  tempRoots.push(root);
  const plansDir = path.join(root, '.agents', 'plans', 'us-live-ro');
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'us412-418-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
  const stateFile = path.join(plansDir, 'wf-us-live-ro.state.json');
  write(
    stateFile,
    JSON.stringify({
      stateVersion: 3, revision: 1, workflowId: 'wf-live-ro', slug: 'us-live-ro',
      workflowType: 'standard', status: 'completed', currentStep: 9,
      completedSteps: [8, 9], skippedSteps: [],
    }),
  );
  const before = JSON.stringify({ state: fs.readFileSync(stateFile, 'utf8'), plans: fs.readdirSync(plansDir).sort() });
  const result = cp.spawnSync(process.execPath, [script, '--repo-root', root, '--json'], {
    cwd: root, encoding: 'utf8', env: process.env,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const after = JSON.stringify({ state: fs.readFileSync(stateFile, 'utf8'), plans: fs.readdirSync(plansDir).sort() });
  assert.equal(after, before, 'snapshot wrote nothing to the plan dir');
  console.log('AC10 snapshot stays read-only: ok');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-us412-418: ok');
