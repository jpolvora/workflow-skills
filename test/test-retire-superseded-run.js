/**
 * us-395 AC3: deterministic supersede retirement for ws-spec-multi runs.
 * Run: node test/test-retire-superseded-run.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-spec-multi/scripts/retire_superseded_run.cjs');
const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env } });
}

function stateBody({ runId, status, createdAt, supersedesRunId }) {
  return `---
workflowType: ws-spec-multi
runId: ${runId}
status: ${status}
baseBranch: main
dryRun: false
createdAt: "${createdAt}"
updatedAt: "${createdAt}"
specsDir: .agents/specs
totalItems: 1
supersedesRunId: ${supersedesRunId === undefined ? 'null' : supersedesRunId}
---

# Multi-spec Runner — ${runId}

| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |
|---|------|----------|----------|--------|----------|-------|--------|-----------|
| 1 | shared-item | .agents/specs/shared-item.spec.md | standard | in_progress | | | | ${createdAt} |
`;
}

function field(text, name) {
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const match = block && block[1].match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
}

// AC3: a superseding run retires the exact run it names.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-old.state.md'), stateBody({ runId: 'ms-old', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-new.state.md'), stateBody({ runId: 'ms-new', status: 'active', createdAt: '2026-09-19T23:25:56Z', supersedesRunId: 'ms-old' }));

  const result = run(['--run', path.join(dir, 'ms-new.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--timestamp', '2026-09-22T16:00:00Z', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  if (payload.noop || !payload.updated.some((p) => p.endsWith('ms-old.state.md'))) {
    throw new Error(`us-395 AC3: retirement payload unexpected: ${result.stdout}`);
  }
  const oldText = fs.readFileSync(path.join(dir, 'ms-old.state.md'), 'utf8');
  const newText = fs.readFileSync(path.join(dir, 'ms-new.state.md'), 'utf8');
  if (field(oldText, 'status') !== 'cancelled') throw new Error(`us-395 AC3: old run status ${field(oldText, 'status')}`);
  if (field(oldText, 'updatedAt') !== '2026-09-22T16:00:00Z') throw new Error('us-395 AC3: old run updatedAt did not advance');
  if (field(newText, 'status') !== 'active') throw new Error('us-395 AC3: superseding run must stay active');

  // AC8-style idempotency: re-run is a no-op.
  const again = run(['--run', path.join(dir, 'ms-new.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--json'], root);
  if (again.status !== 0) throw new Error(again.stderr || again.stdout);
  if (!JSON.parse(again.stdout).noop) throw new Error('us-395 AC3: re-run should be a no-op');
}

// Fail closed: a named run that cannot be resolved.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-fail-'));
  tempRoots.push(root);
  write(path.join(root, '.agents', 'plans', 'ws-spec-multi', 'ms-only.state.md'), stateBody({ runId: 'ms-only', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  const result = run(['--supersedes', 'ms-missing', '--plans-dir', path.join(root, '.agents', 'plans'), '--json'], root);
  if (result.status === 0) throw new Error('us-395 AC3: unresolved superseded run must fail closed');
}

// No supersede relationship → fail closed (nothing to retire).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-none-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-plain.state.md'), stateBody({ runId: 'ms-plain', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  const result = run(['--run', path.join(dir, 'ms-plain.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--json'], root);
  if (result.status === 0) throw new Error('us-395 AC3: a run without supersedesRunId must fail closed');
}

// Path traversal in supersedesRunId is rejected before any write.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-trav-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-safe.state.md'), stateBody({ runId: 'ms-safe', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  const escapeTarget = path.join(root, '.agents', 'plans', 'escape.state.md');
  write(escapeTarget, stateBody({ runId: 'escape', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  const result = run(['--supersedes', '../../escape', '--plans-dir', path.join(root, '.agents', 'plans'), '--json'], root);
  if (result.status === 0) throw new Error('us-395 AC3: path traversal must be rejected');
  if (field(fs.readFileSync(escapeTarget, 'utf8'), 'status') !== 'active') {
    throw new Error('us-395 AC3: traversal target must not be modified');
  }
}

// Retirement is a single canonical Markdown write: no JSON mirror is created.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-single-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-single.state.md'), stateBody({ runId: 'ms-single', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-newer2.state.md'), stateBody({ runId: 'ms-newer2', status: 'active', createdAt: '2026-09-19T23:25:56Z', supersedesRunId: 'ms-single' }));
  const result = run(['--run', path.join(dir, 'ms-newer2.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--timestamp', '2026-09-22T16:10:00Z', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (fs.existsSync(path.join(dir, 'ms-single.state.json'))) {
    throw new Error('us-395 AC3: helper must not create a JSON mirror (Markdown is canonical)');
  }
  if (field(fs.readFileSync(path.join(dir, 'ms-single.state.md'), 'utf8'), 'status') !== 'cancelled') {
    throw new Error('us-395 AC3: canonical Markdown was not retired');
  }
}

// A non-active (paused) run is not retired silently.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-paused-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-paused.state.md'), stateBody({ runId: 'ms-paused', status: 'paused', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-super.state.md'), stateBody({ runId: 'ms-super', status: 'active', createdAt: '2026-09-19T23:25:56Z', supersedesRunId: 'ms-paused' }));
  const result = run(['--run', path.join(dir, 'ms-super.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--timestamp', '2026-09-22T16:20:00Z', '--json'], root);
  if (result.status === 0) throw new Error('us-395 AC3: a paused run must not be silently retired');
  if (field(fs.readFileSync(path.join(dir, 'ms-paused.state.md'), 'utf8'), 'status') !== 'paused') {
    throw new Error('us-395 AC3: paused run status must be unchanged');
  }
}

// A non-advancing timestamp fails closed (never moves updatedAt backwards).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-ts-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-ts.state.md'), stateBody({ runId: 'ms-ts', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-ts-new.state.md'), stateBody({ runId: 'ms-ts-new', status: 'active', createdAt: '2026-09-19T23:25:56Z', supersedesRunId: 'ms-ts' }));
  const result = run(['--run', path.join(dir, 'ms-ts-new.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--timestamp', '2026-01-01T00:00:00Z', '--json'], root);
  if (result.status === 0) throw new Error('us-395 AC3: a backwards timestamp must fail closed');
  if (field(fs.readFileSync(path.join(dir, 'ms-ts.state.md'), 'utf8'), 'status') !== 'active') {
    throw new Error('us-395 AC3: run must be unchanged on a rejected timestamp');
  }
}

// A same-second timestamp still advances updatedAt (never fails on equal).
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-same-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
  write(path.join(dir, 'ms-same.state.md'), stateBody({ runId: 'ms-same', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-same-new.state.md'), stateBody({ runId: 'ms-same-new', status: 'active', createdAt: '2026-09-19T23:16:39Z', supersedesRunId: 'ms-same' }));
  const result = run(['--run', path.join(dir, 'ms-same-new.state.md'), '--plans-dir', path.join(root, '.agents', 'plans'), '--timestamp', '2026-09-19T23:16:39Z', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const text = fs.readFileSync(path.join(dir, 'ms-same.state.md'), 'utf8');
  if (field(text, 'status') !== 'cancelled') throw new Error('us-395 AC3: same-second retirement did not retire');
  if (field(text, 'updatedAt') !== '2026-09-19T23:16:40Z') {
    throw new Error(`us-395 AC3: same-second updatedAt not advanced: ${field(text, 'updatedAt')}`);
  }
}

// A custom plans.dir is honored from the run path alone (no --plans-dir), the
// documented invocation form.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-retire-us395-custom-'));
  tempRoots.push(root);
  const customPlans = path.join(root, 'custom-plans');
  const dir = path.join(customPlans, 'ws-spec-multi');
  write(path.join(dir, 'ms-custom.state.md'), stateBody({ runId: 'ms-custom', status: 'active', createdAt: '2026-09-19T23:16:39Z' }));
  write(path.join(dir, 'ms-custom-new.state.md'), stateBody({ runId: 'ms-custom-new', status: 'active', createdAt: '2026-09-19T23:25:56Z', supersedesRunId: 'ms-custom' }));
  const result = run(['--run', path.join(dir, 'ms-custom-new.state.md'), '--timestamp', '2026-09-22T17:00:00Z', '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  if (field(fs.readFileSync(path.join(dir, 'ms-custom.state.md'), 'utf8'), 'status') !== 'cancelled') {
    throw new Error('us-395 AC3: custom plans dir not honored from --run');
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-395 supersede retirement ok');
