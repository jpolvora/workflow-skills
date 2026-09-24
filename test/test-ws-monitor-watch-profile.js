/**
 * ws-monitor default watch profile: session-id correlation, --follow-transcript
 * alias, --stall-window override, stalled-workflow (hung) detection, stopwatch,
 * and --open-issue enriched defect proposal.
 * Run: node test/test-ws-monitor-watch-profile.js
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
  resolveScmProvider,
  buildIssueProposal,
  defectContractFor,
  DEFECT_CONTRACTS,
} = require(script);

const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function makeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-profile-'));
  tempRoots.push(root);
  const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-profile-home-'));
  tempRoots.push(fakeHome);
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'profile-test', baseBranch: 'main', repoUrl: 'https://github.com/example/repo' },
      plans: { dir: '.agents/plans' },
      providers: { active: 'local', scm: 'github' },
      verification: {},
      defaults: { minVerifyScore: 9 },
      monitor: { hostHome: fakeHome },
    }),
  );
  return { root, fakeHome };
}

function makeWorkflow(root, slug, workflowId, state = {}) {
  const dir = path.join(root, '.agents', 'plans', slug);
  const file = path.join(dir, `wf-${slug}.state.json`);
  write(
    file,
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
  return { dir, file };
}

function age(file, minutesAgo) {
  const when = new Date(Date.now() - minutesAgo * 60_000);
  fs.utimesSync(file, when, when);
}

function run(args, cwd) {
  const childEnv = { ...process.env };
  delete childEnv.XDG_DATA_HOME;
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: childEnv, timeout: 30_000 });
}

// P1 - resolveScmProvider maps config to a provider or null (no silent guess).
{
  assert.equal(resolveScmProvider({ providers: { scm: 'github' } }), 'github');
  assert.equal(resolveScmProvider({ providers: { scm: 'azure-devops' } }), 'azure-devops');
  assert.equal(resolveScmProvider({ providers: { active: 'azure-devops' } }), 'azure-devops');
  assert.equal(resolveScmProvider({ project: { repoUrl: 'https://dev.azure.com/o/p' } }), 'azure-devops');
  assert.equal(resolveScmProvider({ project: { repoUrl: 'https://github.com/o/p' } }), 'github');
  assert.equal(resolveScmProvider({}), null);
  console.log('P1 resolveScmProvider maps config to a provider: ok');
}

// P2 - --session-id correlates a transcript that carries only the session id.
{
  const { root } = makeRoot();
  const slug = 'us-wp-session';
  makeWorkflow(root, slug, 'wf-wp-session');
  const sessionId = 'ses-wp-session-0001';
  const sessionRoot = path.join(root, 'sessions');
  write(path.join(sessionRoot, 'session.jsonl'), `worker line for ${sessionId} only\n`);
  const result = run([
    '--repo-root', root, '--slug', slug, '--session-id', sessionId,
    '--follow-transcript', '--transcript-root', sessionRoot, '--json',
  ], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.sessionId, sessionId, 'report echoes the session id');
  const workflow = report.workflows.find((item) => item.slug === slug);
  assert.equal(workflow.transcriptSource.status, 'available', JSON.stringify(workflow.transcriptSource));
  console.log('P2 --session-id correlates the session: ok');
}

// P3 - --stall-window overrides the liveness threshold.
{
  const { root, fakeHome } = makeRoot();
  const slug = 'us-wp-window';
  makeWorkflow(root, slug, 'wf-wp-window');
  const sessionFile = path.join(fakeHome, '.local', 'share', 'muse', 'sessions', '2026', '09', '24', 'sess-window', 'session.jsonl');
  write(sessionFile, `wf-wp-window ${slug} worker activity\n`);
  age(sessionFile, 20);
  write(
    path.join(root, '.ws', 'config.json'),
    JSON.stringify({
      project: { name: 'profile-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
      monitor: { hostHome: fakeHome, discoverHostTranscripts: true },
    }),
  );
  const dflt = run(['--repo-root', root, '--slug', slug, '--json'], root);
  const dfltWf = JSON.parse(dflt.stdout).workflows.find((item) => item.slug === slug);
  assert.ok(dfltWf.findings.some((f) => f.code === 'worker-session-stall'), '20m idle exceeds the 10m default window');
  const wide = run(['--repo-root', root, '--slug', slug, '--stall-window', '3600', '--json'], root);
  const wideWf = JSON.parse(wide.stdout).workflows.find((item) => item.slug === slug);
  assert.ok(!wideWf.findings.some((f) => f.code === 'worker-session-stall'), 'a 1h window suppresses the 20m stall');
  console.log('P3 --stall-window overrides the threshold: ok');
}

// P4 - a hung active workflow with no session raises stalled-workflow + stopwatch.
{
  const { root } = makeRoot();
  const slug = 'us-wp-hung';
  const { file } = makeWorkflow(root, slug, 'wf-wp-hung');
  age(file, 20);
  const result = run(['--repo-root', root, '--slug', slug, '--json'], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const workflow = JSON.parse(result.stdout).workflows.find((item) => item.slug === slug);
  assert.ok(workflow.findings.some((f) => f.code === 'stalled-workflow'), 'hung workflow raises stalled-workflow');
  assert.ok(workflow.stopwatch && workflow.stopwatch.stalled, 'stopwatch marks the workflow stalled');
  assert.equal(workflow.stopwatch.source, 'state-telemetry');
  console.log('P4 hung workflow raises stalled-workflow + stopwatch: ok');
}

// P5 - --open-issue proposes an enriched, anonymized defect issue + writes the body.
{
  const { root } = makeRoot();
  const slug = 'us-wp-issue';
  const { file } = makeWorkflow(root, slug, 'wf-wp-issue');
  age(file, 20);
  const result = run([
    '--repo-root', root, '--slug', slug, '--session-id', 'ses-wp-issue', '--agent', 'opencode',
    '--open-issue', '--json',
  ], root);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.agent, 'opencode');
  assert.ok(report.issueProposal, 'issueProposal is present when actionable findings exist');
  assert.equal(report.issueProposal.provider, 'github');
  assert.ok(report.issueProposal.codes.includes('stalled-workflow'), JSON.stringify(report.issueProposal.codes));
  assert.ok(/Workflow defect report/.test(report.issueProposal.body));
  assert.ok(/Suspected contract to update/.test(report.issueProposal.body));
  assert.ok(report.issueProposal.bodyPath, 'body file path is reported');
  const bodyFile = path.resolve(root, report.issueProposal.bodyPath);
  assert.ok(fs.existsSync(bodyFile), 'issue body file is written');
  assert.ok(/Anonymized|anonymized/.test(fs.readFileSync(bodyFile, 'utf8')));
  console.log('P5 --open-issue proposes + writes an enriched defect issue: ok');
}

// P6 - no actionable findings -> no proposal; --dry-run marks the proposal.
{
  const { root } = makeRoot();
  const clean = run(['--repo-root', root, '--slug', 'us-wp-missing', '--open-issue', '--json'], root);
  assert.equal(clean.status, 0, clean.stderr || clean.stdout);
  assert.equal(JSON.parse(clean.stdout).issueProposal, null, 'no findings -> no proposal');
  console.log('P6 no findings -> no proposal: ok');
}

// P7 - buildIssueProposal unit: provider, codes, contract mapping, dryRun.
{
  const actionable = [
    { severity: 'critical', code: 'missing-artifact', message: 'm', evidence: ['a'] },
    { severity: 'info', code: 'multi-spec-idle', message: 'i', evidence: [] },
  ];
  const proposal = buildIssueProposal(
    { config: { providers: { scm: 'azure-devops' }, project: { name: 'p' } } },
    [{ slug: 's' }],
    actionable,
    { openIssue: true, dryRun: true, slug: 's' },
  );
  assert.equal(proposal.provider, 'azure-devops');
  assert.deepEqual(proposal.codes, ['missing-artifact'], 'info findings are excluded');
  assert.equal(proposal.dryRun, true);
  assert.ok(DEFECT_CONTRACTS['missing-artifact'], 'defect contract map covers missing-artifact');
  assert.ok(defectContractFor('unknown-code').contract, 'unknown code falls back to a generic contract');
  console.log('P7 buildIssueProposal unit contract: ok');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-watch-profile: ok');
