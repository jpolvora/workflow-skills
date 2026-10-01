/**
 * us-476: `stale-parent-row` must be time-bounded by a child-terminal grace
 * window so a healthy child-close -> parent-propagate window reports `info`
 * (propagation pending) instead of a warning. Persistent cases (child terminal
 * beyond the grace window, terminal run, superseded run) keep warning severity,
 * and the finding carries both measured ages so the threshold can be tuned.
 * Run: node test/test-ws-monitor-us476.js
 *
 * Test names (referenced by the AC ledger):
 * - us-476 AC1 age-carrying message
 * - us-476 AC2 propagation pending
 * - us-476 AC3 beyond grace warns
 * - us-476 AC4 terminal run warns
 * - us-476 AC5 superseded run warns
 * - us-476 AC6 grace default and override
 * - us-476 AC7 non-terminal child no finding
 * - us-476 NS1 fresh child no warning
 * - us-476 NS2 old child still warns
 * - us-476 NS3 terminal run still warns
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');
const require = createRequire(import.meta.url);
const {
  detectStaleParentRows,
  classifyMultiSpecWorkflow,
  TRANSCRIPT_LIMITS,
} = require(script);
const tempRoots = [];

const NOW = Date.parse('2026-09-30T12:00:00Z');
const GRACE = 10 * 60 * 1000;
const isoAgo = (ms) => new Date(NOW - ms).toISOString();

function parentRun({ slug, rowUpdatedAgoMs = 0, runUpdatedAgoMs = 0, runId = 'ms-parent', status = 'active' } = {}) {
  return {
    workflowId: runId,
    status,
    statePath: `.agents/plans/ws-spec-multi/${runId}.state.md`,
    multiSpec: {
      runId,
      createdAt: isoAgo(60 * 60 * 1000),
      updatedAt: runUpdatedAgoMs === null ? null : isoAgo(runUpdatedAgoMs),
      items: [{ slug, status: 'in_progress', updatedAt: isoAgo(rowUpdatedAgoMs) }],
    },
  };
}

function terminalChild(slug, endedAgoMs) {
  return { workflowId: `${slug}-run`, slug, status: 'completed', multiSpec: null, endedAt: isoAgo(endedAgoMs) };
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env } });
}

function config(root) {
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify({ project: { name: 'us476-test', baseBranch: 'main' }, plans: { dir: '.agents/plans' }, verification: {}, defaults: { minVerifyScore: 9 } }),
  );
}

function multiState({ runId, status, createdAt, rows }) {
  const header = '| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |';
  const sep = '|---|------|----------|----------|--------|----------|-------|--------|-----------|';
  return `---\nworkflowType: ws-spec-multi\nrunId: ${runId}\nstatus: ${status}\nbaseBranch: main\ndryRun: false\ncreatedAt: "${createdAt}"\nupdatedAt: "${createdAt}"\nspecsDir: .agents/specs\n---\n\n# Multi-spec Runner — ${runId}\n\n${[header, sep, ...rows].join('\n')}\n`;
}

function childState({ workflowId, slug, endedAt }) {
  return JSON.stringify({
    stateVersion: 3,
    revision: 4,
    workflowId,
    slug,
    workflowType: 'standard',
    status: 'completed',
    currentStep: 8,
    completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    skippedSteps: [],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'completed', 4: 'completed', 5: 'completed', 6: 'completed', 7: 'completed', 8: 'completed' },
    endedAt,
  });
}

// AC1 + AC2: a child terminal inside the grace window while the run advances is
// propagation-pending info, and the message carries both measured ages.
{
  const workflow = parentRun({ slug: 'child-fresh', rowUpdatedAgoMs: 10 * 60000, runUpdatedAgoMs: 60000 });
  const findings = detectStaleParentRows(workflow, [workflow, terminalChild('child-fresh', 5 * 60000)], { graceMs: GRACE, nowMs: NOW });
  const finding = findings.find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'info') {
    throw new Error(`us-476 AC2: fresh child close must be info, got ${JSON.stringify(finding)}`);
  }
  if (!/child terminal for 5m/.test(finding.message)) {
    throw new Error(`us-476 AC1: message must carry child-terminal age, got ${JSON.stringify(finding.message)}`);
  }
  if (!/last row transition 10m ago/.test(finding.message)) {
    throw new Error(`us-476 AC1: message must carry last row-transition age, got ${JSON.stringify(finding.message)}`);
  }
  if (!/propagation pending/.test(finding.message)) {
    throw new Error(`us-476 AC2: info message must name propagation pending, got ${JSON.stringify(finding.message)}`);
  }
}

// AC3: child terminal beyond the grace window with no row transition stays a warning.
{
  const workflow = parentRun({ slug: 'child-stale', rowUpdatedAgoMs: 20 * 60000, runUpdatedAgoMs: 20 * 60000 });
  const findings = detectStaleParentRows(workflow, [workflow, terminalChild('child-stale', 20 * 60000)], { graceMs: GRACE, nowMs: NOW });
  const finding = findings.find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'warning') {
    throw new Error(`us-476 AC3: child terminal beyond grace must stay warning, got ${JSON.stringify(finding)}`);
  }
  if (!/beyond the grace window/.test(finding.message)) {
    throw new Error(`us-476 AC3: warning must name the grace window, got ${JSON.stringify(finding.message)}`);
  }
}

// AC6: the grace defaults to the configured stall window and is overridable.
{
  const workflow = parentRun({ slug: 'child-tune', rowUpdatedAgoMs: 20 * 60000, runUpdatedAgoMs: 20 * 60000 });
  const all = [workflow, terminalChild('child-tune', 20 * 60000)];
  if (TRANSCRIPT_LIMITS.stallWindowMs !== GRACE) {
    throw new Error(`us-476 AC6: unexpected default stall window ${TRANSCRIPT_LIMITS.stallWindowMs}`);
  }
  const defaulted = detectStaleParentRows(workflow, all, { nowMs: NOW }).find((f) => f.code === 'stale-parent-row');
  if (!defaulted || defaulted.severity !== 'warning') {
    throw new Error('us-476 AC6: default grace (stall window) must keep a 20m-old child a warning');
  }
  const widened = detectStaleParentRows(workflow, all, { graceMs: 30 * 60000, nowMs: NOW }).find((f) => f.code === 'stale-parent-row');
  if (!widened || widened.severity !== 'info') {
    throw new Error(`us-476 AC6: a widened grace override must downgrade to info, got ${JSON.stringify(widened)}`);
  }
  const narrowed = detectStaleParentRows(workflow, all, { graceMs: 60 * 1000, nowMs: NOW }).find((f) => f.code === 'stale-parent-row');
  if (!narrowed || narrowed.severity !== 'warning') {
    throw new Error(`us-476 AC6: a narrowed grace override must warn, got ${JSON.stringify(narrowed)}`);
  }
}

// AC2 boundary: a fresh child close with a run that is NOT advancing is not
// automatically propagation-pending.
{
  const workflow = parentRun({ slug: 'child-frozen', rowUpdatedAgoMs: 20 * 60000, runUpdatedAgoMs: 20 * 60000 });
  const findings = detectStaleParentRows(workflow, [workflow, terminalChild('child-frozen', 4 * 60000)], { graceMs: GRACE, nowMs: NOW });
  const finding = findings.find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'warning') {
    throw new Error(`us-476 AC2: non-advancing run must not be silently suppressed, got ${JSON.stringify(finding)}`);
  }
}

// AC7: an in_progress row whose child is not terminal adds no grace-based finding.
{
  const workflow = parentRun({ slug: 'no-child', rowUpdatedAgoMs: 60000, runUpdatedAgoMs: 60000 });
  const findings = detectStaleParentRows(workflow, [workflow], { graceMs: GRACE, nowMs: NOW });
  if (findings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-476 AC7: a non-terminal child must not produce a grace-based finding');
  }
}

// AC5: a newer active run claiming the same slug stays a warning.
{
  const older = parentRun({ slug: 'shared', runId: 'ms-old', rowUpdatedAgoMs: 60 * 60000 });
  older.multiSpec.createdAt = '2026-09-30T10:00:00Z';
  const newer = parentRun({ slug: 'shared', runId: 'ms-new', rowUpdatedAgoMs: 60 * 60000 });
  newer.multiSpec.createdAt = '2026-09-30T11:00:00Z';
  const finding = detectStaleParentRows(older, [older, newer], { graceMs: GRACE, nowMs: NOW }).find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'warning') {
    throw new Error(`us-476 AC5: superseded run must stay warning, got ${JSON.stringify(finding)}`);
  }
}

// AC4: a terminal run whose queue still holds non-terminal rows stays a warning.
{
  const findings = classifyMultiSpecWorkflow(
    {
      runId: 'ms-terminated',
      status: 'completed',
      items: [
        { slug: 'kept', status: 'shipped' },
        { slug: 'orphan', status: 'in_progress' },
      ],
    },
    '.agents/plans/ws-spec-multi/ms-terminated.state.md',
    '.',
  );
  const finding = findings.find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'warning') {
    throw new Error(`us-476 AC4: terminal run with a non-terminal row must stay warning, got ${JSON.stringify(finding)}`);
  }
}

// AC2 end-to-end: a fresh child close on a freshly written batch state reports info.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us476-e2e-'));
  tempRoots.push(root);
  config(root);
  const plans = path.join(root, '.agents', 'plans');
  const now = Date.now();
  write(
    path.join(plans, 'ws-spec-multi', 'ms-e2e.state.md'),
    multiState({
      runId: 'ms-e2e',
      status: 'active',
      createdAt: new Date(now - 60 * 60000).toISOString(),
      rows: [`| 1 | child-e2e | .agents/specs/child-e2e.spec.md | standard | in_progress | | | | ${new Date(now - 10 * 60000).toISOString()} |`],
    }),
  );
  write(
    path.join(plans, 'child-e2e', 'child-e2e-run.state.json'),
    childState({ workflowId: 'child-e2e-run', slug: 'child-e2e', endedAt: new Date(now - 5 * 60000).toISOString() }),
  );
  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const finding = report.findings.find((f) => f.code === 'stale-parent-row');
  if (!finding || finding.severity !== 'info' || !/propagation pending/.test(finding.message)) {
    throw new Error(`us-476 AC2 e2e: expected info propagation-pending finding, got ${JSON.stringify(finding)}`);
  }

  // AC6 end-to-end: narrowing the window to 1s turns the same fixture into a warning.
  const narrowed = JSON.parse(run(['--repo-root', root, '--json', '--stall-window', '1'], root).stdout);
  const narrowedFinding = narrowed.findings.find((f) => f.code === 'stale-parent-row');
  if (!narrowedFinding || narrowedFinding.severity !== 'warning') {
    throw new Error(`us-476 AC6 e2e: narrowed stall window must warn, got ${JSON.stringify(narrowedFinding)}`);
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('test-ws-monitor-us476: ok');
