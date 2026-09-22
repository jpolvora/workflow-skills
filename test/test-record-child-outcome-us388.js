/**
 * us-388: executable guarded queue transition (record_child_outcome.cjs).
 * Run: node test/test-record-child-outcome-us388.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-spec-multi/scripts/record_child_outcome.cjs');
const tempRoots = [];

const HEADER = '| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |';
const SEP = '|---|------|----------|----------|--------|----------|-------|--------|-----------|';

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env } });
}

function runState(runId, rows, updatedAt = '2026-09-22T08:07:09Z') {
  return `---
workflowType: ws-spec-multi
runId: ${runId}
status: active
baseBranch: main
dryRun: false
createdAt: "2026-09-22T08:07:09Z"
updatedAt: "${updatedAt}"
specsDir: .agents/specs
---

# Multi-spec Runner — ${runId}

${[HEADER, SEP, ...rows].join('\n')}
`;
}

function validChildState(slug) {
  return {
    stateVersion: 3,
    workflowId: `${slug}-20260922T080709Z`,
    slug,
    workflowType: 'standard',
    status: 'completed',
    currentStep: 9,
  };
}

function setupRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'record-child-us388-'));
  tempRoots.push(root);
  return root;
}

// AC5: shipped with valid child state + step-01 records the row and advances updatedAt.
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  write(runFile, runState('ms-us388', ['| 1 | demo | .agents/specs/demo.spec.md | standard | in_progress | | | | 2026-09-22T08:07:09Z |']));
  write(path.join(plans, 'demo', 'demo-20260922T080709Z.state.json'), JSON.stringify(validChildState('demo')));
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--run', runFile, '--slug', 'demo', '--status', 'shipped', '--pr-number', '400', '--pr-url', 'https://pr/400', '--json', '--timestamp', '2026-09-22T17:30:00Z'], root);
  if (result.status !== 0) throw new Error(`us-388 AC5: expected exit 0, got ${result.status}: ${result.stderr}`);
  const text = fs.readFileSync(runFile, 'utf8');
  if (!text.includes('| demo |') || !text.includes('| shipped |') || !text.includes('https://pr/400')) {
    throw new Error(`us-388 AC5: row not transitioned: ${text}`);
  }
  if (!text.includes('updatedAt: "2026-09-22T17:30:00Z"')) {
    throw new Error('us-388 AC5: run frontmatter updatedAt did not advance');
  }
  // Idempotent no-op re-run.
  const again = run(['--run', runFile, '--slug', 'demo', '--status', 'shipped', '--json'], root);
  if (again.status !== 0) throw new Error('us-388 AC5: idempotent shipped re-run must succeed');
  if (!JSON.parse(again.stdout).noop) throw new Error('us-388 AC5: shipped re-run must be a no-op');
}

// AC5: shipped without child artifacts fails closed and does NOT write.
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  const original = runState('ms-us388', ['| 1 | demo | .agents/specs/demo.spec.md | standard | in_progress | | | | 2026-09-22T08:07:09Z |']);
  write(runFile, original);
  fs.mkdirSync(path.join(plans, 'demo'), { recursive: true });
  const result = run(['--run', runFile, '--slug', 'demo', '--status', 'shipped', '--json'], root);
  if (result.status === 0) throw new Error('us-388 AC5: shipped without child state must fail closed');
  const payload = JSON.parse(result.stdout);
  if (payload.ok !== false || !payload.error.includes('child artifact')) {
    throw new Error(`us-388 AC5: expected a surfaced child-artifact reason, got ${result.stdout}`);
  }
  if (fs.readFileSync(runFile, 'utf8') !== original) {
    throw new Error('us-388 AC5: a refused shipped transition must not modify the run state');
  }
}

// AC5: shipped with a still-active child state fails closed (completed required).
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  const original = runState('ms-us388', ['| 1 | demo | .agents/specs/demo.spec.md | standard | in_progress | | | | 2026-09-22T08:07:09Z |']);
  write(runFile, original);
  write(path.join(plans, 'demo', 'demo-20260922T080709Z.state.json'), JSON.stringify({ ...validChildState('demo'), status: 'active' }));
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--run', runFile, '--slug', 'demo', '--status', 'shipped', '--json'], root);
  if (result.status === 0) throw new Error('us-388 AC5: shipped with an active child state must fail closed');
  if (fs.readFileSync(runFile, 'utf8') !== original) throw new Error('us-388 AC5: a refused shipped transition must not modify the run state');
}

// AC8/AC5: skipped does not require child artifacts and still transitions in place.
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  write(runFile, runState('ms-us388', ['| 1 | demo | .agents/specs/demo.spec.md | standard | pending | | | | 2026-09-22T08:07:09Z |']));
  const result = run(['--run', runFile, '--slug', 'demo', '--status', 'skipped', '--reason', 'already-implemented', '--json'], root);
  if (result.status !== 0) throw new Error(`us-388 AC8: skipped must not require child artifacts: ${result.stderr}`);
  const text = fs.readFileSync(runFile, 'utf8');
  if (!text.includes('| skipped |') || !text.includes('already-implemented')) {
    throw new Error('us-388 AC8: skipped row not recorded');
  }
}

// Duplicate guard and terminal regression are fail-closed.
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  write(runFile, runState('ms-us388', [
    '| 1 | demo | .agents/specs/demo.spec.md | standard | pending | | | | 2026-09-22T08:07:09Z |',
    '| 2 | demo | .agents/specs/demo.spec.md | standard | pending | | | | 2026-09-22T08:07:09Z |',
  ]));
  const dup = run(['--run', runFile, '--slug', 'demo', '--status', 'skipped', '--json'], root);
  if (dup.status === 0) throw new Error('us-388 AC5: duplicate rows must fail closed');

  const runFile2 = path.join(plans, 'ws-spec-multi', 'ms-us388b.state.md');
  write(runFile2, runState('ms-us388b', ['| 1 | demo | .agents/specs/demo.spec.md | standard | shipped | 1 | u | merged | 2026-09-22T08:09:00Z |']));
  const regress = run(['--run', runFile2, '--slug', 'demo', '--status', 'failed', '--json'], root);
  if (regress.status === 0) throw new Error('us-388 AC5: terminal-status regression must fail closed');
}

// The reserved batch-directory slug is refused (the guard must not inspect the parent run dir).
{
  const root = setupRoot();
  const plans = path.join(root, '.agents', 'plans');
  const runFile = path.join(plans, 'ws-spec-multi', 'ms-us388.state.md');
  write(runFile, runState('ms-us388', ['| 1 | ws-spec-multi | .agents/specs/x.spec.md | standard | pending | | | | 2026-09-22T08:07:09Z |']));
  const reserved = run(['--run', runFile, '--slug', 'ws-spec-multi', '--status', 'skipped', '--json'], root);
  if (reserved.status === 0) throw new Error('us-388 AC5: the reserved ws-spec-multi slug must be refused');
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-388 guarded queue transition ok');
