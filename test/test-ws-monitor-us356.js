/**
 * us-356: host adapters for transcript/session discovery (ws-monitor).
 * Run: node test/test-ws-monitor-us356.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const {
  getHostAdapters,
  sanitizeTranscriptText,
  sanitizeReportPath,
  readBoundedTailText,
  resolveTranscriptSource,
  TRANSCRIPT_LIMITS,
} = require(script);

const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us356-'));
  tempRoots.push(root);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us356-home-'));
  tempRoots.push(fakeHome);
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify({
      project: { name: 'us356-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
      monitor: { hostHome: fakeHome },
    }),
  );
  return { root, fakeHome };
}

function makeWorkflow(root, slug, workflowId) {
  const dir = path.join(root, '.agents', 'plans', slug);
  write(
    path.join(dir, `wf-${slug}.state.json`),
    JSON.stringify({
      stateVersion: 3,
      revision: 1,
      workflowId,
      slug,
      workflowType: 'standard',
      status: 'active',
      currentStep: 4,
      completedSteps: [0, 1, 2, 3],
      skippedSteps: [],
      verificationScore: 9,
      stepStatus: { 3: 'completed' },
    }),
  );
  for (const artifact of [`step-00-${slug}.spec.md`, `step-01-${slug}.plan.md`, `step-03-${slug}.plan.exec.md`]) {
    write(path.join(dir, artifact), 'artifact\n');
  }
  return dir;
}

// AC2: per-host, per-OS adapter table is documented.
{
  const doc = path.join(repoRoot, '.agents', 'skills', 'ws-monitor', 'references', 'host-adapters.md');
  if (!fs.existsSync(doc)) throw new Error('us-356: references/host-adapters.md is missing');
  const text = fs.readFileSync(doc, 'utf8');
  for (const token of ['Cursor', 'OpenCode', 'Antigravity', 'Windows', 'Linux', 'macOS']) {
    if (!text.includes(token)) throw new Error(`us-356 AC2: adapter table missing ${token}`);
  }
  if (!text.toLowerCase().includes('claude')) throw new Error('us-356 AC2: adapter table missing Claude');
  const adapters = getHostAdapters('win32', 'C:/Users/tester');
  const ids = adapters.map((a) => a.id).sort().join(',');
  if (ids !== 'antigravity,claude-code,cursor,opencode') {
    throw new Error(`us-356 AC2: unexpected adapter ids ${ids}`);
  }
  const linux = getHostAdapters('linux', '/home/tester');
  const cursorLinux = linux.find((a) => a.id === 'cursor').locations[0].path;
  if (cursorLinux !== '/home/tester/.config/Cursor/User/workspaceStorage') {
    throw new Error(`us-356 AC2: wrong linux cursor path ${cursorLinux}`);
  }
  if (TRANSCRIPT_LIMITS.maxBytesPerFile !== 262144) throw new Error('us-356 AC6: per-file cap changed');
}

// AC1 + AC3 + stall: one root with a discoverable session, one lonely workflow.
const { root, fakeHome } = makeRoot();
const slug = 'us356-demo';
const workflowId = 'wf-us356';
makeWorkflow(root, slug, workflowId);
makeWorkflow(root, 'us356-lonely', 'wf-us356-lonely');
const sessionFile = path.join(fakeHome, '.claude', 'sessions', `${slug}.jsonl`);
write(sessionFile, `${workflowId} ${slug} recent worker activity line\n`);
fs.utimesSync(sessionFile, new Date(Date.now() - 3600_000), new Date(Date.now() - 3600_000));

// AC3: default runs perform zero host-store reads; sources stay disabled.
{
  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  if (report.transcript.hostStoreReads !== 0) {
    throw new Error(`us-356 AC3: default run touched the host store (${report.transcript.hostStoreReads} reads)`);
  }
  for (const workflow of report.workflows) {
    if (workflow.transcriptSource?.status !== 'transcript-unavailable' || workflow.transcriptSource?.reason !== 'discovery-disabled') {
      throw new Error(`us-356 AC3: expected discovery-disabled source, got ${JSON.stringify(workflow.transcriptSource)}`);
    }
  }
}

// AC1: opt-in discovery reports adapter + location class, or unavailable + reason.
{
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const workflow = report.workflows.find((w) => w.slug === slug);
  if (!workflow) throw new Error('us-356 AC1: workflow missing from scoped snapshot');
  if (workflow.transcriptSource?.status !== 'available') {
    throw new Error(`us-356 AC1: expected available source, got ${JSON.stringify(workflow.transcriptSource)}`);
  }
  if (workflow.transcriptSource.adapter !== 'claude-code' || workflow.transcriptSource.locationClass !== 'user') {
    throw new Error(`us-356 AC1: wrong source detail ${JSON.stringify(workflow.transcriptSource)}`);
  }
  if (report.transcript.hostStoreReads < 1) throw new Error('us-356 AC1: expected host-store reads with the flag');
  if (!report.findings.some((f) => f.code === 'worker-session-stall')) {
    throw new Error('us-356: expected worker-session-stall for the idle session on an active workflow');
  }
  const lonely = run(['--repo-root', root, '--discover-host-transcripts', '--slug', 'us356-lonely', '--json'], root);
  if (lonely.status !== 0) throw new Error(lonely.stderr || lonely.stdout);
  const lonelyWorkflow = JSON.parse(lonely.stdout).workflows.find((w) => w.slug === 'us356-lonely');
  if (lonelyWorkflow?.transcriptSource?.status !== 'transcript-unavailable' || lonelyWorkflow?.transcriptSource?.reason !== 'no-matching-session') {
    throw new Error(`us-356 AC1: expected no-matching-session, got ${JSON.stringify(lonelyWorkflow?.transcriptSource)}`);
  }
}

// AC4: strictly read-only against live stores (WAL-safe copy-then-read).
{
  const dbFile = path.join(fakeHome, '.claude', 'sessions', 'state.vscdb');
  const walFile = `${dbFile}-wal`;
  write(dbFile, 'sqlite-format-3-binary-payload');
  write(walFile, 'wal-frame-payload');
  const beforeDb = sha256(dbFile);
  const beforeWal = sha256(walFile);
  const beforeEntries = fs.readdirSync(path.dirname(dbFile)).sort().join(',');
  const read = readBoundedTailText(dbFile, 64);
  if (read.text === null || read.reason) throw new Error(`us-356 AC4: copy-then-read failed: ${read.reason}`);
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (sha256(dbFile) !== beforeDb || sha256(walFile) !== beforeWal) {
    throw new Error('us-356 AC4: monitor modified the live store');
  }
  const afterEntries = fs.readdirSync(path.dirname(dbFile)).sort().join(',');
  if (afterEntries !== beforeEntries) throw new Error('us-356 AC4: monitor left files beside the live store');
  const direct = resolveTranscriptSource({ slug, workflowId }, [], true, root);
  if (direct.reason !== 'no-matching-session') throw new Error('us-356 AC1: empty scan must report no-matching-session');
  const disabled = resolveTranscriptSource({ slug, workflowId }, [{ file: sessionFile, mtimeMs: Date.now(), tail: slug }], false, root);
  if (disabled.reason !== 'discovery-disabled') throw new Error('us-356 AC3: gated resolver must not report available');
}

// AC5: secrets and host-private paths are sanitized before reporting.
{
  const secret = 'sk-PLANTED-us356-abcdef123456';
  const bearer = 'Bearer PLANTED-us356-bearer-token-xyz';
  const redacted = sanitizeTranscriptText(`call with ${secret} and ${bearer} plus api_key: hunter2value`);
  if (redacted.includes('PLANTED')) throw new Error('us-356 AC5: sanitizer leaked a planted secret');
  if (!redacted.includes('[REDACTED]')) throw new Error('us-356 AC5: sanitizer produced no redaction marker');
  const collapsed = sanitizeReportPath(path.join(fakeHome, '.claude', 'sessions', 'x.jsonl'), fakeHome);
  if (collapsed.includes('fakehome')) throw new Error('us-356 AC5: host-private path leaked in evidence');
  write(path.join(fakeHome, '.claude', 'sessions', `${slug}-secret.jsonl`), `${slug} ${workflowId} leaked ${secret}\n`);
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (result.stdout.includes('PLANTED')) throw new Error('us-356 AC5: planted secret leaked into snapshot output');
}

// AC6: per-tick cost stays bounded (tail-only reads on a large fixture).
{
  const big = path.join(fakeHome, '.claude', 'sessions', 'big-history.jsonl');
  fs.writeFileSync(big, `${'x'.repeat(999)}\n`.repeat(20 * 1024));
  const started = Date.now();
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  const wallMs = Date.now() - started;
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  if (!(report.transcript.bytesRead <= TRANSCRIPT_LIMITS.maxTotalBytes)) {
    throw new Error(`us-356 AC6: unbounded read (${report.transcript.bytesRead} bytes)`);
  }
  if (wallMs > 30000) throw new Error(`us-356 AC6: snapshot took ${wallMs}ms on a 20MB fixture`);
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-us356: ok');
