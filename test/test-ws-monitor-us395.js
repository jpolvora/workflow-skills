/**
 * us-395: terminal-state and stale-parent-row monitor findings.
 * Run: node test/test-ws-monitor-us395.js
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
  classifyWorkflow,
  classifyMultiSpecWorkflow,
  terminalShape,
  deriveTerminalStatus,
  detectStaleParentRows,
  parseMultiSpecTable,
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

function config(root) {
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify({
      project: { name: 'us395-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
}

function terminalState(overrides = {}) {
  return {
    stateVersion: 3,
    revision: 5,
    workflowId: 'wf-terminal',
    slug: 'terminal-demo',
    workflowType: 'standard',
    status: 'active',
    currentStep: 9,
    completedSteps: [0, 1, 2, 4, 5, 6, 7, 8, 9],
    skippedSteps: [{ step: 3, reason: 'dag-disabled', evidence: '' }],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'skipped', 4: 'completed', 5: 'completed', 6: 'completed', 7: 'completed', 8: 'completed', 9: 'completed' },
    endedAt: null,
    ...overrides,
  };
}

function multiTable(rows) {
  const header = '| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |';
  const sep = '|---|------|----------|----------|--------|----------|-------|--------|-----------|';
  return [header, sep, ...rows].join('\n');
}

function multiState({ runId, status, createdAt, rows }) {
  return `---
workflowType: ws-spec-multi
runId: ${runId}
status: ${status}
baseBranch: main
dryRun: false
createdAt: "${createdAt}"
updatedAt: "${createdAt}"
specsDir: .agents/specs
---

# Multi-spec Runner — ${runId}

${multiTable(rows)}
`;
}

// AC7/AC2: terminalShape + deriveTerminalStatus detect a fully-terminal active run.
{
  const state = terminalState();
  if (!terminalShape(state)) throw new Error('us-395 AC7: terminalShape missed an all-terminal run');
  const derived = deriveTerminalStatus(state);
  if (!derived || derived.status !== 'completed' || derived.reportedStatus !== 'active') {
    throw new Error(`us-395 AC7: deriveTerminalStatus returned ${JSON.stringify(derived)}`);
  }
  const live = terminalState({ endedAt: '2026-09-22T13:00:00Z' });
  if (deriveTerminalStatus(live)) throw new Error('us-395 AC7: endedAt run must not be derived terminal');
  const incomplete = terminalState({ currentStep: 6, completedSteps: [0, 1, 2, 4, 5], stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 4: 'completed', 5: 'completed' } });
  if (deriveTerminalStatus(incomplete)) throw new Error('us-395 AC2: incomplete run wrongly derived terminal');
  // A step recorded in completedSteps but failed in stepStatus is not terminal.
  const failedStep = terminalState({ stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'skipped', 4: 'failed', 5: 'completed', 6: 'completed', 7: 'completed', 8: 'completed', 9: 'completed' } });
  if (terminalShape(failedStep)) throw new Error('us-395 AC2: a failed step must not count as terminal');
  if (deriveTerminalStatus(failedStep)) throw new Error('us-395 AC2: a failed run must not be derived terminal');
}

// AC7: classifyWorkflow emits terminal-run-active with the raw status in the message.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us395-term-'));
  tempRoots.push(dir);
  const findings = classifyWorkflow(terminalState(), dir, { events: [], errors: [] }, 9, dir);
  const hit = findings.find((f) => f.code === 'terminal-run-active');
  if (!hit || hit.severity !== 'warning' || !hit.message.includes('active')) {
    throw new Error('us-395 AC7: terminal-run-active not emitted for a terminal-shaped active run');
  }
}

// AC6: a terminal multi run with non-terminal rows emits stale-parent-row.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us395-phantom-'));
  tempRoots.push(dir);
  const findings = classifyMultiSpecWorkflow(
    {
      runId: 'ms-phantom',
      status: 'completed',
      items: [
        { slug: 'a', specPath: '.agents/specs/a.spec.md', status: 'shipped' },
        { slug: 'b', specPath: '.agents/specs/b.spec.md', status: 'pending' },
      ],
    },
    path.join(dir, 'ms-phantom.state.md'),
    dir,
  );
  if (!findings.some((f) => f.code === 'stale-parent-row' && f.message.includes('b'))) {
    throw new Error('us-395 AC6: stale-parent-row not emitted for a terminal run with phantom rows');
  }
}

// AC5: detectStaleParentRows flags an in_progress row whose child workflow is terminal.
{
  const workflow = {
    workflowId: 'ms-parent',
    status: 'active',
    statePath: '.agents/plans/ws-spec-multi/ms-parent.state.md',
    multiSpec: { createdAt: '2026-09-22T08:00:00Z', items: [{ slug: 'child-done', status: 'in_progress', updatedAt: '2026-09-22T08:05:00Z' }] },
  };
  const all = [workflow, { workflowId: 'child-done-1', slug: 'child-done', status: 'completed', multiSpec: null, endedAt: '2026-09-22T09:00:00Z' }];
  const findings = detectStaleParentRows(workflow, all);
  if (!findings.some((f) => f.code === 'stale-parent-row' && f.message.includes('child-done'))) {
    throw new Error('us-395 AC5: stale-parent-row not emitted for a completed child / in_progress parent row');
  }
  // A historical terminal run of the same slug (closed before the row went
  // in_progress) must not flag a healthy current row.
  const historical = [workflow, { workflowId: 'child-done-old', slug: 'child-done', status: 'completed', multiSpec: null, endedAt: '2026-08-01T00:00:00Z' }];
  if (detectStaleParentRows(workflow, historical).some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 AC5: historical child falsely flagged as the current row child');
  }
  // A derived-terminal-shape child (status completed, endedAt null) is still a
  // closed child; its last write is the close reference.
  const derivedChild = [workflow, { workflowId: 'child-done-d', slug: 'child-done', status: 'completed', statusSource: 'derived-terminal-shape', endedAt: null, updatedAt: '2026-09-22T09:00:00Z', multiSpec: null }];
  if (!detectStaleParentRows(workflow, derivedChild).some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 AC5: derived-terminal child not detected');
  }
}

// AC3: detectStaleParentRows flags the superseded run when a newer active run claims the same slug.
{
  const older = {
    workflowId: 'ms-old',
    status: 'active',
    statePath: '.agents/plans/ws-spec-multi/ms-old.state.md',
    multiSpec: { createdAt: '2026-09-19T23:16:39Z', items: [{ slug: 'shared-item', status: 'in_progress' }] },
  };
  const newer = {
    workflowId: 'ms-new',
    status: 'active',
    statePath: '.agents/plans/ws-spec-multi/ms-new.state.md',
    multiSpec: { createdAt: '2026-09-19T23:25:56Z', items: [{ slug: 'shared-item', status: 'in_progress' }] },
  };
  const olderFindings = detectStaleParentRows(older, [older, newer]);
  const newerFindings = detectStaleParentRows(newer, [older, newer]);
  if (!olderFindings.some((f) => f.code === 'stale-parent-row' && f.message.includes('shared-item'))) {
    throw new Error('us-395 AC3: older superseded run not flagged');
  }
  if (newerFindings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 AC3: newer active run wrongly flagged as stale');
  }

  // Equal/missing createdAt must not flag two valid runs against each other:
  // the tie-break is the timestamp-ordered run id.
  const tieA = {
    workflowId: 'ms-20260919T231639Z',
    status: 'active',
    statePath: '.agents/plans/ws-spec-multi/a.state.md',
    multiSpec: { createdAt: null, items: [{ slug: 'tie-item', status: 'in_progress' }] },
  };
  const tieB = {
    workflowId: 'ms-20260919T232556Z',
    status: 'active',
    statePath: '.agents/plans/ws-spec-multi/b.state.md',
    multiSpec: { createdAt: null, items: [{ slug: 'tie-item', status: 'in_progress' }] },
  };
  const tieAFindings = detectStaleParentRows(tieA, [tieA, tieB]);
  const tieBFindings = detectStaleParentRows(tieB, [tieA, tieB]);
  if (!tieAFindings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 AC3: lower run id must be flagged on an equal/missing createdAt tie');
  }
  if (tieBFindings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 AC3: higher run id must not be flagged on a tie');
  }
}

// AC4: a finished queue table parses to exactly one row per item (no synthesized
// rows, no stale duplicate pending rows inflating the count).
{
  const table = multiTable([
    '| 1 | a | .agents/specs/a.spec.md | standard | shipped | 1 | u | merged | 2026-09-22T03:00:00Z |',
    '| 2 | b | .agents/specs/b.spec.md | standard | shipped | 2 | u | merged | 2026-09-22T03:10:00Z |',
  ]);
  const items = parseMultiSpecTable(table);
  if (items.length !== 2 || new Set(items.map((i) => i.slug)).size !== 2) {
    throw new Error('us-395 AC4: queue table must hold exactly one row per item');
  }
}

// AC2 + AC6 end-to-end snapshot: terminal-shaped run is not active; fixtures raise the codes.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us395-snap-'));
  tempRoots.push(root);
  config(root);
  const plans = path.join(root, '.agents', 'plans');
  write(path.join(plans, 'terminal-demo', 'wf-terminal.state.json'), JSON.stringify(terminalState()));
  write(
    path.join(plans, 'ws-spec-multi', 'ms-phantom.state.md'),
    multiState({
      runId: 'ms-phantom',
      status: 'completed',
      createdAt: '2026-09-22T02:28:01Z',
      rows: [
        '| 1 | a | .agents/specs/a.spec.md | standard | shipped | 1 | u | merged | 2026-09-22T03:00:00Z |',
        '| 2 | b | .agents/specs/b.spec.md | standard | pending | | | | 2026-09-22T02:28:01Z |',
      ],
    }),
  );
  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const terminalWf = report.workflows.find((w) => w.workflowId === 'wf-terminal');
  if (!terminalWf) throw new Error('us-395 AC2: terminal workflow missing from snapshot');
  if (terminalWf.status === 'active') {
    throw new Error(`us-395 AC2: terminal-shaped run reported ${terminalWf.status}`);
  }
  if (report.activeCount !== 0) throw new Error(`us-395 AC2: activeCount ${report.activeCount} should be 0`);
  const codes = new Set(report.findings.map((f) => f.code));
  if (!codes.has('terminal-run-active')) throw new Error('us-395 AC7: snapshot missing terminal-run-active');
  if (!codes.has('stale-parent-row')) throw new Error('us-395 AC6: snapshot missing stale-parent-row');
}

// Healthy active multi run with a terminal child in the same root stays clean of stale-parent-row
// only when the row is not in_progress on a terminal child.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us395-clean-'));
  tempRoots.push(root);
  config(root);
  const plans = path.join(root, '.agents', 'plans');
  write(
    path.join(plans, 'ws-spec-multi', 'ms-live.state.md'),
    multiState({
      runId: 'ms-live',
      status: 'active',
      createdAt: '2026-09-22T08:07:09Z',
      rows: [
        '| 1 | shipped-one | .agents/specs/shipped-one.spec.md | standard | shipped | 9 | u | merged | 2026-09-22T09:00:00Z |',
        '| 2 | live-two | .agents/specs/live-two.spec.md | standard | in_progress | | | | 2026-09-22T09:05:00Z |',
        '| 3 | queued-three | .agents/specs/queued-three.spec.md | standard | pending | | | | 2026-09-22T09:05:00Z |',
      ],
    }),
  );
  write(
    path.join(plans, 'live-two', 'wf-live-two.state.json'),
    JSON.stringify({
      stateVersion: 3,
      revision: 2,
      workflowId: 'wf-live-two',
      slug: 'live-two',
      workflowType: 'standard',
      status: 'active',
      currentStep: 4,
      completedSteps: [0, 1, 2, 3],
      skippedSteps: [],
      stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'completed', 4: 'active' },
      endedAt: null,
    }),
  );
  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  if (report.findings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-395 false-positive: healthy active run flagged stale-parent-row');
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-395 monitor terminal/stale-parent findings ok');
