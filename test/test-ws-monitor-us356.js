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
  resolveCandidateTranscriptRoots,
  resolveTranscriptSource,
  resolveMuseSessionsRoot,
  expandMuseSessionDirs,
  collapseHomePaths,
  correlationMatches,
  guessTranscriptAdapter,
  TRANSCRIPT_LIMITS,
} = require(script);

const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  // Scrub XDG_DATA_HOME so spawned discovery resolves the muse root under
  // the fixture hostHome (explicit unit coverage below asserts XDG honoring).
  const childEnv = { ...process.env };
  delete childEnv.XDG_DATA_HOME;
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: childEnv,
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
  if (!text.includes('Muse')) throw new Error('us-356 AC2: adapter table missing Muse');
  if (!text.includes('.gemini/antigravity-ide/brain')) {
    throw new Error('us-356 AC2: adapter table missing the Antigravity user-store path');
  }
  const skillDoc = fs.readFileSync(path.join(repoRoot, '.agents', 'skills', 'ws-monitor', 'SKILL.md'), 'utf8');
  if (!skillDoc.includes('~/.gemini/antigravity-ide/brain')) {
    throw new Error('us-356 AC2: SKILL.md Antigravity path drifts from the adapter');
  }
  for (const [label, doc] of [['adapter table', text], ['SKILL.md', skillDoc]]) {
    if (doc.includes('copy-then-read')) {
      throw new Error(`us-356 AC2: stale copy-then-read wording in ${label}`);
    }
  }
  // Adapter attribution: a bare session.jsonl filename never implies Muse;
  // only Muse store paths do. Legacy workspace layouts stay custom-root.
  if (guessTranscriptAdapter(path.join('repo', '.claude', 'sessions', 'us356-demo', 'session.jsonl')) !== 'custom-root') {
    throw new Error('us-356 AC2: legacy workspace session misattributed to muse');
  }
  if (guessTranscriptAdapter(path.join('home', 'tester', '.local', 'share', 'muse', 'sessions', '2026', '09', '19', 'abc', 'session.jsonl')) !== 'muse') {
    throw new Error('us-356 AC2: muse store session not attributed to muse');
  }
  // Default-root assertions must not see ambient XDG_DATA_HOME from the runner.
  const savedXdg = process.env.XDG_DATA_HOME;
  delete process.env.XDG_DATA_HOME;
  const adapters = getHostAdapters('win32', 'C:/Users/tester');
  const ids = adapters.map((a) => a.id).sort().join(',');
  if (ids !== 'antigravity,cursor,muse,opencode') {
    throw new Error(`us-356 AC2: unexpected adapter ids ${ids}`);
  }
  const linux = getHostAdapters('linux', '/home/tester');
  const cursorLinux = linux.find((a) => a.id === 'cursor').locations[0].path;
  if (cursorLinux !== '/home/tester/.config/Cursor/User/workspaceStorage') {
    throw new Error(`us-356 AC2: wrong linux cursor path ${cursorLinux}`);
  }
  const museLinux = linux.find((a) => a.id === 'muse').locations[0].path;
  if (museLinux !== '/home/tester/.local/share/muse/sessions') {
    throw new Error(`us-356 AC2: wrong linux muse path ${museLinux}`);
  }
  if (resolveMuseSessionsRoot('/home/tester') !== '/home/tester/.local/share/muse/sessions') {
    throw new Error('us-356 AC2: muse default root changed');
  }
  if (expandMuseSessionDirs(path.join(repoRoot, 'definitely-missing-dir')).length !== 0) {
    throw new Error('us-356 AC2: missing muse root must expand to zero dirs');
  }
  // Muse recency: opaque session ids select by session.jsonl mtime, not lex
  // order (s-00 is newest here despite sorting last by name).
  {
    const fakeMuse = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us356-muse-'));
    tempRoots.push(fakeMuse);
    const dayDir = path.join(fakeMuse, '2026', '09', '19');
    const now = Date.now();
    for (let i = 0; i < 55; i += 1) {
      const id = `s-${String(i).padStart(2, '0')}`;
      const sessionJsonl = path.join(dayDir, id, 'session.jsonl');
      write(sessionJsonl, `session ${id}\n`);
      const mtime = new Date(now - i * 1000);
      fs.utimesSync(sessionJsonl, mtime, mtime);
    }
    const picked = expandMuseSessionDirs(fakeMuse);
    if (picked.length !== 50) {
      throw new Error(`us-356 AC2: muse slice must hold 50 sessions, got ${picked.length}`);
    }
    if (!picked.some((d) => d.endsWith(`${path.sep}s-00`))) {
      throw new Error('us-356 AC2: muse slice must keep the newest session despite lex order');
    }
    if (picked.some((d) => d.endsWith(`${path.sep}s-54`))) {
      throw new Error('us-356 AC2: muse slice must drop the oldest session');
    }
  }
  // XDG is honored only for the real OS home; an explicit hostHome override
  // anchors muse discovery under itself even with ambient XDG_DATA_HOME.
  const osPosix = String(os.homedir()).replace(/\\/g, '/');
  try {
    process.env.XDG_DATA_HOME = '/data/xdg';
    if (resolveMuseSessionsRoot(osPosix) !== '/data/xdg/muse/sessions') {
      throw new Error('us-356 AC2: XDG_DATA_HOME not honored for the OS home');
    }
    const anchored = getHostAdapters('linux', '/srv/ci-agent-home').find((a) => a.id === 'muse').locations[0].path;
    if (anchored !== '/srv/ci-agent-home/.local/share/muse/sessions') {
      throw new Error(`us-356 AC2: hostHome override lost to XDG (${anchored})`);
    }
  } finally {
    if (savedXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = savedXdg;
  }
  if (TRANSCRIPT_LIMITS.maxBytesPerFile !== 262144) throw new Error('us-356 AC6: per-file cap changed');
}

// Antigravity recency: the bounded root slice keeps the newest conversations.
{
  const fakeAG = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us356-aghome-'));
  tempRoots.push(fakeAG);
  const brain = path.join(fakeAG, '.gemini', 'antigravity-ide', 'brain');
  const now = Date.now();
  for (let i = 0; i < 12; i += 1) {
    const logsDir = path.join(brain, `convo-${String(i).padStart(2, '0')}`, '.system_generated', 'logs');
    write(path.join(logsDir, 'transcript.jsonl'), `convo ${i}\n`);
    const mtime = new Date(now - (11 - i) * 60_000);
    fs.utimesSync(logsDir, mtime, mtime);
  }
  const agRoots = resolveCandidateTranscriptRoots(
    { repoRoot: fakeAG, config: { monitor: { hostHome: fakeAG, discoverHostTranscripts: true } } },
    [],
    {},
  );
  const convoRoots = agRoots.filter((r) => r.includes('convo-'));
  if (convoRoots.length !== 10) {
    throw new Error(`us-356: antigravity root slice must hold 10 convos, got ${convoRoots.length}`);
  }
  if (!convoRoots.some((r) => r.includes('convo-11'))) {
    throw new Error('us-356: antigravity slice must keep the newest conversation');
  }
  if (convoRoots.some((r) => r.includes('convo-00') || r.includes('convo-01'))) {
    throw new Error('us-356: antigravity slice must drop the two oldest conversations');
  }
}

// AC1 + AC3 + stall: one root with a discoverable session, one lonely workflow.
const { root, fakeHome } = makeRoot();
const slug = 'us356-demo';
const workflowId = 'wf-us356';
makeWorkflow(root, slug, workflowId);
makeWorkflow(root, 'us356-lonely', 'wf-us356-lonely');
const museSessionsDir = path.join(fakeHome, '.local', 'share', 'muse', 'sessions', '2026', '09', '19');
const sessionFile = path.join(museSessionsDir, slug, 'session.jsonl');
write(sessionFile, `${workflowId} ${slug} recent worker activity line\nturn_ended before workflow handoff\n`);
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

// Config-only opt-in: monitor.discoverHostTranscripts enables host-store reads
// without the CLI flag.
{
  const configFile = path.join(root, '.ws', 'config.json');
  const baseConfig = {
    project: { name: 'us356-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: { minVerifyScore: 9 },
  };
  write(configFile, JSON.stringify({ ...baseConfig, monitor: { hostHome: fakeHome, discoverHostTranscripts: true } }));
  const result = run(['--repo-root', root, '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  if (report.transcript.hostStoreReads < 1) {
    throw new Error('us-356: config discoverHostTranscripts must enable host-store reads without the CLI flag');
  }
  const workflow = report.workflows.find((w) => w.slug === slug);
  if (workflow?.transcriptSource?.status !== 'available' || workflow.transcriptSource.adapter !== 'muse') {
    throw new Error(`us-356: config-only discovery must report the muse source, got ${JSON.stringify(workflow?.transcriptSource)}`);
  }
  write(configFile, JSON.stringify({ ...baseConfig, monitor: { hostHome: fakeHome } }));
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
  if (workflow.transcriptSource.adapter !== 'muse' || workflow.transcriptSource.locationClass !== 'user') {
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

// Prefix-collision guard: the short id wf-us356 must not correlate the
// longer sibling session wf-us356-lonely (boundary-aware matching).
{
  if (!correlationMatches('wf-us356 us356-demo recent activity', 'wf-us356')) {
    throw new Error('us-356 AC1: boundary matcher missed an exact key');
  }
  if (correlationMatches('wf-us356-lonely us356-lonely recent activity', 'wf-us356')) {
    throw new Error('us-356 AC1: short id must not match inside a longer sibling id');
  }
  if (!correlationMatches(path.join(museSessionsDir, 'us356-lonely', 'session.jsonl'), 'us356-lonely')) {
    throw new Error('us-356 AC1: boundary matcher missed a path-segment key');
  }
  const lonelySession = path.join(museSessionsDir, 'us356-lonely', 'session.jsonl');
  write(lonelySession, 'wf-us356-lonely us356-lonely recent worker activity line\n');
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const demo = report.workflows.find((w) => w.slug === slug);
  if (!demo?.findings.some((f) => f.code === 'worker-session-stall')) {
    throw new Error('us-356 AC1: demo session misattributed to the fresh lonely session (stall missing)');
  }
  const lonelyUnscoped = report.workflows.find((w) => w.slug === 'us356-lonely');
  if (lonelyUnscoped?.transcriptSource?.status !== 'available') {
    throw new Error(`us-356 AC1: lonely session must correlate to its own workflow, got ${JSON.stringify(lonelyUnscoped?.transcriptSource)}`);
  }
  if (lonelyUnscoped?.findings.some((f) => f.code === 'worker-session-stall')) {
    throw new Error('us-356 AC1: lonely workflow wrongly stalled on the idle demo session');
  }
}

// AC4: strictly read-only against live stores (in-place read-only tails;
// SQLite stores are never copied, locked, or modified).
{
  const dbFile = path.join(museSessionsDir, `${slug}-live`, 'state.vscdb');
  const walFile = `${dbFile}-wal`;
  write(dbFile, 'sqlite-format-3-binary-payload');
  write(walFile, `wal-frame-payload ${workflowId} ${slug}\nfatal error WALONLY-BOOM-159753 wal-only-marker-line\n`);
  // Large store created before the entries snapshot so later runs also cover
  // multi-megabyte in-place tails.
  const bigDb = path.join(museSessionsDir, `${slug}-live`, 'big-store.vscdb');
  fs.writeFileSync(bigDb, Buffer.alloc(2 * 1024 * 1024, 7));
  write(`${bigDb}-wal`, `wal tail ${workflowId} ${slug} big-wal-marker\n`);
  const beforeDb = sha256(dbFile);
  const beforeWal = sha256(walFile);
  const beforeEntries = fs.readdirSync(path.dirname(dbFile)).sort().join(',');
  const read = readBoundedTailText(dbFile, 64);
  if (read.text === null || read.reason) throw new Error(`us-356 AC4: copy-then-read failed: ${read.reason}`);
  // SQLite sidecars co-copy with the primary and are never read standalone.
  const walSkip = readBoundedTailText(walFile, 64);
  if (walSkip.text !== null || walSkip.reason !== 'wal-sidecar-skipped') {
    throw new Error(`us-356 AC4: standalone -wal read not skipped (${walSkip.reason})`);
  }
  const shmSkip = readBoundedTailText(`${dbFile}-shm`, 64);
  if (shmSkip.text !== null || shmSkip.reason !== 'wal-sidecar-skipped') {
    throw new Error(`us-356 AC4: standalone -shm read not skipped (${shmSkip.reason})`);
  }
  // WAL-merged tails: sidecar-only content stays visible without SQLite.
  const merged = readBoundedTailText(dbFile, 4096);
  if (!merged.text.includes('wal-only-marker-line')) {
    throw new Error('us-356 AC4: WAL-only content invisible to tail read');
  }
  // Bounded SQLite handling: tail reads never copy the store, however large.
  const fsMod = require('fs');
  const origCopy = fsMod.copyFileSync;
  let copies = 0;
  fsMod.copyFileSync = (...args) => { copies += 1; return origCopy(...args); };
  try {
    const bigRead = readBoundedTailText(bigDb, 4096);
    if (copies !== 0) throw new Error(`us-356 AC4: sqlite tail read copied the store (${copies} copies)`);
    if (!bigRead.text.includes('big-wal-marker')) {
      throw new Error('us-356 AC4: large-store WAL tail invisible');
    }
    if (!(bigRead.bytesRead <= 3 * 4096)) {
      throw new Error(`us-356 AC4: unbounded sqlite tail (${bigRead.bytesRead} bytes)`);
    }
  } finally {
    fsMod.copyFileSync = origCopy;
  }
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (sha256(dbFile) !== beforeDb || sha256(walFile) !== beforeWal) {
    throw new Error('us-356 AC4: monitor modified the live store');
  }
  const afterEntries = fs.readdirSync(path.dirname(dbFile)).sort().join(',');
  if (afterEntries !== beforeEntries) throw new Error('us-356 AC4: monitor left files beside the live store');
  const ac4Report = JSON.parse(result.stdout);
  if (!ac4Report.findings.some((f) => f.code === 'subagent-error')) {
    throw new Error('us-356 AC4: WAL-only error invisible to scan');
  }
  const direct = resolveTranscriptSource({ slug, workflowId }, [], true, root);
  if (direct.reason !== 'no-matching-session') throw new Error('us-356 AC1: empty scan must report no-matching-session');
  const disabled = resolveTranscriptSource({ slug, workflowId }, [{ file: sessionFile, mtimeMs: Date.now(), tail: slug }], false, root);
  if (disabled.reason !== 'discovery-disabled') throw new Error('us-356 AC3: gated resolver must not report available');
  const cappedSource = resolveTranscriptSource({ slug, workflowId }, [], true, root, { capped: true });
  if (cappedSource.reason !== 'scan-capped') {
    throw new Error(`us-356: capped scan must report scan-capped, got ${cappedSource.reason}`);
  }
  const missSource = resolveTranscriptSource({ slug, workflowId }, [], true, root);
  if (missSource.reason !== 'no-matching-session') {
    throw new Error(`us-356: uncapped miss must stay no-matching-session, got ${missSource.reason}`);
  }
}

// AC5: secrets and host-private paths are sanitized before reporting.
{
  const secret = 'sk-PLANTED-us356-abcdef123456';
  const bearer = 'Bearer PLANTED-us356-bearer-token-xyz';
  const redacted = sanitizeTranscriptText(`call with ${secret} and ${bearer} plus api_key: hunter2value`);
  if (redacted.includes('PLANTED')) throw new Error('us-356 AC5: sanitizer leaked a planted secret');
  if (!redacted.includes('[REDACTED]')) throw new Error('us-356 AC5: sanitizer produced no redaction marker');
  const collapsed = sanitizeReportPath(path.join(museSessionsDir, slug, 'x.jsonl'), fakeHome);
  if (collapsed.includes(fakeHome)) throw new Error('us-356 AC5: host-private path leaked in evidence');
  const collapsedDefault = sanitizeTranscriptText(`saw ${fakeHome}/sessions/y.jsonl`, fakeHome);
  if (collapsedDefault.includes(fakeHome)) throw new Error('us-356 AC5: host-private path leaked in transcript text');
  // Dual-home contract: with a hostHome override active, divergent OS-home
  // substrings collapse alongside the configured home.
  const dualText = sanitizeTranscriptText(`trail ${os.homedir()}/work/x plus ${fakeHome}/sessions/y`, fakeHome);
  if (dualText.includes(os.homedir()) || dualText.includes(fakeHome)) {
    throw new Error('us-356 AC5: dual-home collapse leaked in transcript text');
  }
  const dualPath = sanitizeReportPath(path.join(os.homedir(), 'work', 'x.jsonl'), fakeHome);
  if (dualPath.includes(os.homedir()) || dualPath.includes(fakeHome)) {
    throw new Error('us-356 AC5: dual-home collapse leaked in evidence path');
  }
  // Longest prefix first: a short home that is a string prefix of the longer
  // one must not split it (parent dir of the real OS home is always shorter).
  const osh = os.homedir();
  const parent = path.dirname(osh);
  if (parent !== osh) {
    const nested = collapseHomePaths(`${osh}/work/nested.jsonl`, parent);
    if (nested.includes(path.basename(osh))) {
      throw new Error('us-356 AC5: longest home prefix must collapse first');
    }
  }
  write(path.join(museSessionsDir, `${slug}-secret`, 'session.jsonl'), `${slug} ${workflowId} leaked ${secret}\n`);
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--slug', slug, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (result.stdout.includes('PLANTED')) throw new Error('us-356 AC5: planted secret leaked into snapshot output');
  // AC5 end-to-end: paths discovered via monitor.hostHome stay anonymized in
  // snapshot output (roots + finding evidence), not just in unit-called helpers.
  const ac5Report = JSON.parse(result.stdout);
  for (const r of ac5Report.transcript.roots || []) {
    if (r.includes(fakeHome)) throw new Error('us-356 AC5: hostHome path leaked into transcript.roots');
  }
  let evidenceSeen = 0;
  for (const f of ac5Report.findings || []) {
    for (const e of f.evidence || []) {
      evidenceSeen += 1;
      if (e.includes(fakeHome)) throw new Error('us-356 AC5: hostHome path leaked into finding evidence');
    }
  }
  if (evidenceSeen < 1) throw new Error('us-356 AC5: expected at least one evidence path in this run');
}

// AC6: per-tick cost stays bounded (tail-only reads on a large fixture).
{
  // Inside the demo session dir so the slug filter still matches on a path
  // boundary (a sibling dir like `${slug}-big` would no longer correlate).
  const big = path.join(museSessionsDir, slug, 'big-history.jsonl');
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

// scan-capped reason: a bounded scan that stops early with zero candidates
// reports scan-capped, not no-matching-session.
{
  fs.rmSync(path.join(museSessionsDir, 'us356-lonely'), { recursive: true, force: true });
  const loadDir = path.join(museSessionsDir, 'load-probe');
  for (let i = 0; i < 210; i += 1) {
    write(path.join(loadDir, `filler-${i}.jsonl`), 'filler line\n');
  }
  const result = run(['--repo-root', root, '--discover-host-transcripts', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  if (report.transcript.capped !== true) {
    throw new Error('us-356 AC6: expected the file-count cap to trigger');
  }
  const lonelyCapped = report.workflows.find((w) => w.slug === 'us356-lonely');
  if (lonelyCapped?.transcriptSource?.reason !== 'scan-capped') {
    throw new Error(`us-356: capped scan with zero candidates must report scan-capped, got ${JSON.stringify(lonelyCapped?.transcriptSource)}`);
  }
  const demoStill = report.workflows.find((w) => w.slug === slug);
  if (demoStill?.transcriptSource?.status !== 'available') {
    throw new Error('us-356: capped scan must still correlate the scanned demo session');
  }
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-us356: ok');
