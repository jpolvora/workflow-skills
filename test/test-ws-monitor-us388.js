/**
 * us-388: multi-spec child-state expectation model + missing-child-state finding.
 * Run: node test/test-ws-monitor-us388.js
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
  expectedChildArtifacts,
  classifyMultiSpecWorkflow,
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
      project: { name: 'us388-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
}

function multiState({ runId, status, createdAt, rows }) {
  const header = '| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |';
  const sep = '|---|------|----------|----------|--------|----------|-------|--------|-----------|';
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

${[header, sep, ...rows].join('\n')}
`;
}

// AC6: expectedChildArtifacts covers only advanced rows; pending/skipped stay out.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us388-exp-'));
  tempRoots.push(dir);
  const items = [
    { slug: 'shipped-one', status: 'shipped' },
    { slug: 'live-two', status: 'in_progress' },
    { slug: 'failed-three', status: 'failed' },
    { slug: 'queued-four', status: 'pending' },
    { slug: 'skipped-five', status: 'skipped' },
  ];
  const expected = expectedChildArtifacts(items, path.join(dir, '.agents/plans'), dir);
  const slugs = expected.map((item) => item.slug).sort();
  if (expected.length !== 3 || slugs.join(',') !== 'failed-three,live-two,shipped-one') {
    throw new Error(`us-388 AC6: expected advanced items only, got ${slugs.join(',')}`);
  }
  if (!expected.every((item) => item.kind === 'child-state' && item.present === false)) {
    throw new Error('us-388 AC6: expected child-state entries with present=false when no state exists');
  }
}

// AC6: presence is a directory scan of a valid machine SoT `*.state.json`
// (workflow id is not the slug); a `.state.md` render or an invalid JSON is not enough.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us388-present-'));
  tempRoots.push(dir);
  const plans = path.join(dir, '.agents/plans');
  const validState = { stateVersion: 3, workflowId: 'live-two-20260922T080709Z', slug: 'live-two', workflowType: 'standard', status: 'active', currentStep: 4 };
  write(path.join(plans, 'live-two', 'live-two-20260922T080709Z.state.json'), JSON.stringify(validState));
  write(path.join(plans, 'render-only', 'render-only.state.md'), '# state render only\n');
  write(path.join(plans, 'broken-json', 'broken-json.state.json'), '{ not valid json');
  write(path.join(plans, 'wrong-shape', 'wrong-shape.state.json'), JSON.stringify({ hello: 'world' }));
  const expected = expectedChildArtifacts(
    [
      { slug: 'live-two', status: 'in_progress' },
      { slug: 'render-only', status: 'shipped' },
      { slug: 'broken-json', status: 'shipped' },
      { slug: 'wrong-shape', status: 'shipped' },
    ],
    plans,
    dir,
  );
  const bySlug = Object.fromEntries(expected.map((item) => [item.slug, item]));
  if (!bySlug['live-two'].present) {
    throw new Error('us-388 AC6: a valid child state must be detected by directory scan of *.state.json');
  }
  if (bySlug['render-only'].present) {
    throw new Error('us-388 AC6: a .state.md render alone must NOT count as child state (machine SoT is required)');
  }
  if (bySlug['broken-json'].present || bySlug['wrong-shape'].present) {
    throw new Error('us-388 AC6: an unparseable or identity-less .state.json must NOT count as child state');
  }
}

// AC6: the reserved batch directory alias must not mask a missing child state.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us388-reserved-'));
  tempRoots.push(dir);
  const plans = path.join(dir, '.agents/plans');
  write(path.join(plans, 'ws-spec-multi', 'ms-20260922T080709Z.state.json'), JSON.stringify({ workflowType: 'ws-spec-multi' }));
  const expected = expectedChildArtifacts([{ slug: 'ws-spec-multi', status: 'shipped' }], plans, dir);
  if (expected.length !== 0) {
    throw new Error('us-388 AC6: the reserved ws-spec-multi slug must not be treated as a child plan dir');
  }
}

// AC6: classifyMultiSpecWorkflow emits missing-child-state for absent entries.
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us388-cls-'));
  tempRoots.push(dir);
  const items = [{ slug: 'a', status: 'shipped' }, { slug: 'b', status: 'in_progress' }];
  const findings = classifyMultiSpecWorkflow(
    { runId: 'ms-us388', status: 'active', items },
    path.join(dir, 'ms-us388.state.md'),
    dir,
    expectedChildArtifacts(items, path.join(dir, '.agents/plans'), dir),
  );
  const hits = findings.filter((f) => f.code === 'missing-child-state');
  if (hits.length !== 2 || !hits.every((f) => f.severity === 'warning')) {
    throw new Error(`us-388 AC6: expected 2 missing-child-state findings, got ${hits.length}`);
  }
  // No parallel detector: stale-parent-row must not be emitted just for an absent child.
  if (findings.some((f) => f.code === 'stale-parent-row')) {
    throw new Error('us-388 AC6: missing-child-state must not overlap stale-parent-row');
  }
}

// AC6 end-to-end snapshot: multi-spec expectedArtifacts is populated and the
// finding fires for an advanced item with no child state while staying silent
// for an item whose child state exists.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us388-snap-'));
  tempRoots.push(root);
  config(root);
  const plans = path.join(root, '.agents', 'plans');
  write(
    path.join(plans, 'ws-spec-multi', 'ms-us388.state.md'),
    multiState({
      runId: 'ms-us388',
      status: 'active',
      createdAt: '2026-09-22T08:07:09Z',
      rows: [
        '| 1 | child-ok | .agents/specs/child-ok.spec.md | standard | shipped | 9 | u | merged | 2026-09-22T09:00:00Z |',
        '| 2 | child-missing | .agents/specs/child-missing.spec.md | standard | in_progress | | | | 2026-09-22T09:05:00Z |',
        '| 3 | queued | .agents/specs/queued.spec.md | standard | pending | | | | 2026-09-22T09:05:00Z |',
      ],
    }),
  );
  write(path.join(plans, 'child-ok', 'child-ok-20260922T080709Z.state.json'), JSON.stringify({
    stateVersion: 3,
    workflowId: 'child-ok-20260922T080709Z',
    slug: 'child-ok',
    workflowType: 'standard',
    status: 'completed',
    currentStep: 9,
    completedSteps: [0, 1, 2, 4, 5, 6, 7, 8, 9],
    stepStatus: { 0: 'completed', 1: 'completed', 2: 'completed', 3: 'skipped', 4: 'completed', 5: 'completed', 6: 'completed', 7: 'completed', 8: 'completed', 9: 'completed' },
    endedAt: '2026-09-22T10:00:00Z',
  }));

  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const msWf = report.workflows.find((w) => w.pipeline === 'ws-spec-multi');
  if (!msWf) throw new Error('us-388 AC6: multi-spec workflow missing from snapshot');
  if (!Array.isArray(msWf.expectedArtifacts) || msWf.expectedArtifacts.length !== 2) {
    throw new Error(`us-388 AC6: multi-spec expectedArtifacts must be populated, got ${JSON.stringify(msWf.expectedArtifacts)}`);
  }
  const hits = report.findings.filter((f) => f.code === 'missing-child-state');
  if (hits.length !== 1 || !hits[0].message.includes('child-missing')) {
    throw new Error(`us-388 AC6: expected one missing-child-state for child-missing, got ${JSON.stringify(hits)}`);
  }
  if (hits.some((f) => f.message.includes('child-ok'))) {
    throw new Error('us-388 AC6: a child with state must not be flagged');
  }
  if (report.findings.some((f) => f.code === 'missing-child-state' && f.message.includes('queued'))) {
    throw new Error('us-388 AC6: a pending item must not be flagged');
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-388 monitor multi-spec child-state expectations ok');
