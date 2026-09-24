/**
 * us-412/us-413: ws-monitor discovery budget, shared correlation window,
 * honest scan-capped, pause-vs-stall, and --until-terminal (M1-M9).
 * Run: node test/test-ws-monitor-liveness.js
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
const { scanTranscriptRoots, resolveTranscriptSource, TRANSCRIPT_LIMITS } = require(script);

const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-liveness-'));
  tempRoots.push(root);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-liveness-home-'));
  tempRoots.push(fakeHome);
  writeConfig(root, fakeHome, {});
  return { root, fakeHome };
}

function writeConfig(root, fakeHome, monitor) {
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'liveness-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
      monitor: { hostHome: fakeHome, ...monitor },
    }),
  );
}

function makeWorkflow(root, slug, workflowId, state = {}) {
  const dir = path.join(root, '.agents', 'plans', slug);
  write(
    path.join(dir, `wf-${slug}.state.json`),
    JSON.stringify({
      stateVersion: 3,
      revision: 5,
      workflowId,
      slug,
      workflowType: 'standard',
      status: 'active',
      currentStep: 4,
      completedSteps: [0, 1, 2, 3],
      skippedSteps: [],
      stepStatus: { 3: 'completed', 4: 'active' },
      ...state,
    }, null, 2),
  );
  return dir;
}

function writeMuseSession(fakeHome, dirName, content, mtimeMs) {
  const file = path.join(fakeHome, '.local', 'share', 'muse', 'sessions', '2026', '09', '24', dirName, 'session.jsonl');
  write(file, content);
  if (mtimeMs !== undefined) fs.utimesSync(file, new Date(mtimeMs), new Date(mtimeMs));
  return file;
}

function run(args, cwd, options = {}) {
  const childEnv = { ...process.env };
  delete childEnv.XDG_DATA_HOME;
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: childEnv,
    timeout: options.timeout,
  });
}

function writeFlood(root, dirName, count) {
  const dir = path.join(root, 'flood', dirName);
  for (let index = 0; index < count; index += 1) {
    write(path.join(dir, `filler-${String(index).padStart(3, '0')}.jsonl`), 'unrelated filler line\n');
  }
  return dir;
}

// M1 - AC10/AC11/NS1: 61 unrelated roots (>200 files) precede the correlated
// session root; the per-root reservation + correlation-first ordering still
// read the target session.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-mon';
  const workflowId = 'wf-live-mon';
  makeWorkflow(root, slug, workflowId);
  const floodRoots = [];
  for (let index = 0; index < 61; index += 1) {
    floodRoots.push(writeFlood(root, `root-${String(index).padStart(2, '0')}`, 4));
  }
  writeMuseSession(fakeHome, 'session-target', `${workflowId} ${slug} recent worker activity line\n`, Date.now() - 60_000);
  writeConfig(root, fakeHome, { discoverHostTranscripts: true, transcriptRoots: floodRoots });
  const result = run(['--repo-root', root, '--slug', slug, '--json'], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.ok(report.transcript.roots.length >= 62, `expected >= 62 candidate roots, got ${report.transcript.roots.length}`);
  assert.ok(report.transcript.filesScanned >= 1, `correlated session must be read despite the flood (filesScanned=${report.transcript.filesScanned})`);
  const workflow = report.workflows.find((item) => item.slug === slug);
  assert.equal(workflow.transcriptSource.status, 'available', JSON.stringify(workflow.transcriptSource));
  assert.equal(typeof report.transcript.capped, 'boolean', 'capped is reported honestly');
  console.log('M1 unrelated-root flood still reads the correlated session: ok');
}

// M2 - AC12/NS2: the key sits between the 8 KB and 256 KB tail; scan and
// resolve share one window, so the file the scan counted resolves available.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-tail';
  const workflowId = 'wf-live-tail';
  makeWorkflow(root, slug, workflowId);
  const tailRoot = path.join(root, 'tail-root');
  const text = `${'a'.repeat(100 * 1024)}\n${workflowId} ${slug}\n${'b'.repeat(100 * 1024)}\n`;
  const sessionFile = path.join(tailRoot, 'session.jsonl');
  write(sessionFile, text);
  assert.ok(!text.slice(-8000).includes(workflowId), 'fixture keeps the key outside the trailing 8 KB');
  const result = run([
    '--repo-root', root, '--slug', slug, '--workflow-id', workflowId,
    '--discover-host-transcripts', '--transcript-root', tailRoot, '--json',
  ], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.transcript.filesScanned, 1, 'scan counts the correlated window');
  const workflow = report.workflows.find((item) => item.slug === slug);
  assert.equal(workflow.transcriptSource.status, 'available', JSON.stringify(workflow.transcriptSource));
  const scan = scanTranscriptRoots({ repoRoot: root, config: {} }, [tailRoot], { workflowId, slug });
  assert.equal(scan.filesScanned, 1, 'unit scan counts the file');
  const source = resolveTranscriptSource({ slug, workflowId }, scan.files, true, root, { capped: scan.capped });
  assert.equal(source.status, 'available', 'unit resolve matches the scanned window');
  console.log('M2 workflow id between 8KB and 256KB resolves available: ok');
}

// M3 - AC13: reason vocabulary is honest. scan-capped only when the scan
// stopped before reading a matching file; a scanned match stays available.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-m3';
  const workflowId = 'wf-live-m3';
  makeWorkflow(root, slug, workflowId);
  makeWorkflow(root, 'us-live-ghost', 'wf-live-ghost');
  const floodRoot = writeFlood(root, 'scan-flood', 210);
  const sessionRoot = path.join(root, 'session-root');
  write(path.join(sessionRoot, 'session.jsonl'), `${workflowId} ${slug} correlated session\n`);
  const result = run([
    '--repo-root', root, '--slug', slug, '--workflow-id', workflowId,
    '--discover-host-transcripts',
    '--transcript-root', floodRoot, '--transcript-root', sessionRoot, '--json',
  ], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.transcript.capped, true, 'truncated root slice reports capped honestly');
  const scanned = report.workflows.find((item) => item.slug === slug);
  assert.equal(scanned.transcriptSource.status, 'available', 'scanned match resolves available');
  const ghostRun = run([
    '--repo-root', root, '--slug', 'us-live-ghost', '--workflow-id', 'wf-live-ghost',
    '--discover-host-transcripts',
    '--transcript-root', floodRoot, '--transcript-root', sessionRoot, '--json',
  ], root);
  assert.equal(ghostRun.status, 0, ghostRun.stderr || ghostRun.stdout);
  const ghost = JSON.parse(ghostRun.stdout).workflows.find((item) => item.slug === 'us-live-ghost');
  assert.equal(ghost.transcriptSource.status, 'transcript-unavailable');
  assert.equal(ghost.transcriptSource.reason, 'scan-capped', 'zero candidates in a capped scan report scan-capped');
  assert.equal(
    resolveTranscriptSource({ slug, workflowId }, [], false, root).reason,
    'discovery-disabled',
    'discovery-disabled vocabulary unchanged',
  );
  assert.equal(
    resolveTranscriptSource({ slug, workflowId }, [], true, root).reason,
    'no-matching-session',
    'uncapped miss stays no-matching-session',
  );
  console.log('M3 scan-capped only when the matching file was not read: ok');
}

// M4 - AC14: an idle available session on an active workflow raises the stall.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-stall';
  const workflowId = 'wf-live-stall';
  makeWorkflow(root, slug, workflowId);
  writeMuseSession(fakeHome, 'session-stall', `${workflowId} ${slug} worker activity\n`, Date.now() - 20 * 60_000);
  writeConfig(root, fakeHome, { discoverHostTranscripts: true });
  const result = run(['--repo-root', root, '--slug', slug, '--json'], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const workflow = JSON.parse(result.stdout).workflows.find((item) => item.slug === slug);
  const stall = workflow.findings.find((item) => item.code === 'worker-session-stall');
  assert.ok(stall, 'idle available session on an active workflow raises worker-session-stall');
  assert.equal(stall.severity, 'warning');
  assert.ok(20 * 60_000 > TRANSCRIPT_LIMITS.stallWindowMs, 'fixture idle exceeds the stall window');
  console.log('M4 worker-session-stall fires for an idle available session: ok');
}

// M5 - AC15/NS3: a turn-boundary pause suppresses the stall and reports the
// pause; once the marker is cleared, stall detection resumes.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-paused';
  const workflowId = 'wf-live-paused';
  const turnPause = {
    step: 4,
    reason: 'host turn ended mid-step',
    at: new Date(Date.now() - 30 * 60_000).toISOString(),
    nextAction: 'Finish step 4',
  };
  const stateDir = makeWorkflow(root, slug, workflowId, { turnPause });
  writeMuseSession(fakeHome, 'session-paused', `${workflowId} ${slug} worker activity\n`, Date.now() - 20 * 60_000);
  writeConfig(root, fakeHome, { discoverHostTranscripts: true });
  const result = run(['--repo-root', root, '--slug', slug, '--json'], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const workflow = JSON.parse(result.stdout).workflows.find((item) => item.slug === slug);
  assert.ok(!workflow.findings.some((item) => item.code === 'worker-session-stall'), 'pause suppresses the stall warning');
  const paused = workflow.findings.find((item) => item.code === 'worker-session-paused');
  assert.ok(paused, 'pause is reported instead');
  assert.equal(paused.severity, 'info');
  assert.equal(workflow.turnPause.step, 4, 'turnPause is surfaced on the workflow record');
  // finish clears the marker; stall detection resumes.
  const stateFile = path.join(stateDir, `wf-${slug}.state.json`);
  const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  delete state.turnPause;
  write(stateFile, JSON.stringify(state, null, 2));
  const resumed = run(['--repo-root', root, '--slug', slug, '--json'], root);
  assert.equal(resumed.status, 0, resumed.stderr || resumed.stdout);
  const resumedWorkflow = JSON.parse(resumed.stdout).workflows.find((item) => item.slug === slug);
  assert.ok(resumedWorkflow.findings.some((item) => item.code === 'worker-session-stall'), 'stall resumes after the pause marker is cleared');
  assert.ok(!resumedWorkflow.findings.some((item) => item.code === 'worker-session-paused'));
  console.log('M5 pause marker suppresses stall and reports pause: ok');
}

// M6 - AC16/NS4: --until-terminal usage errors fire before any scan.
{
  const { root } = makeRoot();
  const both = run(['--repo-root', root, '--watch', '--until-terminal', '--iterations', '2', '--json'], root);
  assert.notEqual(both.status, 0, '--until-terminal + --iterations exits non-zero');
  assert.ok(/mutually exclusive/i.test(both.stderr), `usage error message expected, got: ${both.stderr}`);
  assert.ok(!both.stdout.includes('"workflows"'), 'no snapshot output on a usage error');
  const withoutWatch = run(['--repo-root', root, '--until-terminal', '--json'], root);
  assert.notEqual(withoutWatch.status, 0, '--until-terminal without --watch exits non-zero');
  assert.ok(/requires --watch/i.test(withoutWatch.stderr), `usage error message expected, got: ${withoutWatch.stderr}`);
  console.log('M6 --until-terminal usage errors: ok');
}

// M7 - AC16/G5: --watch --until-terminal exits on a terminal workflow and
// keeps waiting while the scoped workflow is blocked.
{
  const { root } = makeRoot();
  makeWorkflow(root, 'us-live-done', 'wf-live-done', { status: 'completed', endedAt: '2026-09-24T00:00:00.000Z' });
  const started = Date.now();
  const done = run(['--repo-root', root, '--slug', 'us-live-done', '--watch', '--interval', '1', '--until-terminal', '--json'], root, { timeout: 30_000 });
  assert.equal(done.status, 0, done.stderr || done.stdout);
  assert.ok(Date.now() - started < 20_000, 'terminal workflow exits promptly');
  const { root: root2 } = makeRoot();
  makeWorkflow(root2, 'us-live-blocked', 'wf-live-blocked', { status: 'blocked' });
  const blocked = run(['--repo-root', root2, '--slug', 'us-live-blocked', '--watch', '--interval', '1', '--until-terminal', '--json'], root2, { timeout: 8_000 });
  assert.notEqual(blocked.status, 0, 'a blocked workflow does not exit the watch');
  assert.ok(blocked.error, 'blocked watch was still running at the timeout');
  console.log('M7 --watch --until-terminal exits on terminal workflow: ok');
}

// M8 - AC17: docs cover pause vs stall and the shared correlation window.
{
  const monitor = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-monitor/SKILL.md'), 'utf8');
  const observer = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/observer-instructions.md'), 'utf8');
  for (const [label, text] of [['ws-monitor/SKILL.md', monitor], ['observer-instructions.md', observer]]) {
    assert.ok(text.includes('worker-session-paused'), `${label} documents worker-session-paused`);
    assert.ok(text.includes('worker-session-stall'), `${label} documents worker-session-stall`);
    assert.ok(/shared correlation window/i.test(text), `${label} names the shared correlation window`);
  }
  console.log('M8 docs cover pause vs stall and shared correlation window: ok');
}

// M9 - AC10/AC11/G6: a truncated root slice reports capped while the
// correlated session still resolves available.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-live-slice';
  const workflowId = 'wf-live-slice';
  makeWorkflow(root, slug, workflowId);
  writeConfig(root, fakeHome, {});
  const floodRoot = writeFlood(root, 'slice-flood', 210);
  const sessionRoot = path.join(root, 'slice-session');
  write(path.join(sessionRoot, 'session.jsonl'), `${workflowId} ${slug} correlated session\n`);
  const result = run([
    '--repo-root', root, '--slug', slug, '--workflow-id', workflowId,
    '--discover-host-transcripts',
    '--transcript-root', floodRoot, '--transcript-root', sessionRoot, '--json',
  ], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.transcript.capped, true, 'per-root slice truncation reports capped');
  assert.ok(report.transcript.filesScanned >= 1, 'the correlated session was still read');
  const workflow = report.workflows.find((item) => item.slug === slug);
  assert.equal(workflow.transcriptSource.status, 'available');
  console.log('M9 per-root slice truncation reports capped honestly: ok');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-liveness: ok');
