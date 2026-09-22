/**
 * us-388: child-exit guard fail-closed contract (verify_child_artifacts.cjs).
 * Run: node test/test-verify-child-artifacts-us388.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const script = path.join(repoRoot, '.agents/skills/ws-spec-multi/scripts/verify_child_artifacts.cjs');
const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', env: { ...process.env } });
}

function plansDir(root) {
  return path.join(root, '.agents', 'plans');
}

const validChildState = {
  stateVersion: 3,
  workflowId: 'demo-20260922T080709Z',
  slug: 'demo',
  workflowType: 'standard',
  status: 'completed',
  currentStep: 9,
};

// AC5: state + step-01 present -> exits 0.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-ok-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'demo-20260922T080709Z.state.json'), JSON.stringify(validChildState));
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans, '--json'], root);
  if (result.status !== 0) throw new Error(`us-388 AC5: expected exit 0, got ${result.status}: ${result.stderr}`);
  const payload = JSON.parse(result.stdout);
  if (!payload.ok || payload.missing.length !== 0) {
    throw new Error(`us-388 AC5: expected ok with no missing, got ${result.stdout}`);
  }
}

// AC5: missing state and step-01 -> fail closed, naming both.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-missing-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  fs.mkdirSync(path.join(plans, 'demo'), { recursive: true });
  const result = run(['--slug', 'demo', '--plans-dir', plans, '--json'], root);
  if (result.status === 0) throw new Error('us-388 AC5: missing child artifacts must fail closed (non-zero)');
  const payload = JSON.parse(result.stdout);
  if (payload.ok !== false || payload.missing.sort().join(',') !== 'state,step-01') {
    throw new Error(`us-388 AC5: expected missing state,step-01, got ${result.stdout}`);
  }
  if (payload.checked.some((entry) => entry.present)) {
    throw new Error('us-388 AC5: absent artifacts must not be reported present');
  }
}

// AC2: an ad-hoc plan.md does not satisfy the step-01 contract name.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-adhoc-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'demo.state.json'), JSON.stringify({ workflowId: 'demo' }));
  write(path.join(plans, 'demo', 'plan.md'), '# ad-hoc, wrong name\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans], root);
  if (result.status === 0) throw new Error('us-388 AC2: an ad-hoc plan.md must not satisfy the step-01 contract');
}

// Empty files do not count as present.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-empty-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'demo.state.json'), '');
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans], root);
  if (result.status === 0) throw new Error('us-388 AC5: an empty state file must not count as present');
}

// AC5: an unparseable or identity-less state JSON is not valid machine state.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-badstate-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'demo.state.json'), '{ not valid json');
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans], root);
  if (result.status === 0) throw new Error('us-388 AC5: malformed state JSON must not satisfy the machine state requirement');
  const missingFields = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-fields-'));
  tempRoots.push(missingFields);
  const plans2 = plansDir(missingFields);
  write(path.join(plans2, 'demo', 'demo.state.json'), JSON.stringify({ workflowId: 'demo', status: 'completed' }));
  write(path.join(plans2, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result2 = run(['--slug', 'demo', '--plans-dir', plans2], missingFields);
  if (result2.status === 0) throw new Error('us-388 AC5: a state JSON missing required identity fields must not count');
}

// AC5: a valid state whose slug differs from the active item is not this child's state.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-foreign-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'other.state.json'), JSON.stringify({ ...validChildState, slug: 'somebody-else' }));
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans], root);
  if (result.status === 0) throw new Error('us-388 AC5: a state whose slug differs from the active item must not satisfy the guard');
}

// AC1/AC5: the `.state.md` render alone is not the machine SoT.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-render-'));
  tempRoots.push(root);
  const plans = plansDir(root);
  write(path.join(plans, 'demo', 'demo.state.md'), '# render only\n');
  write(path.join(plans, 'demo', 'step-01-demo.plan.md'), '# plan\n');
  const result = run(['--slug', 'demo', '--plans-dir', plans], root);
  if (result.status === 0) throw new Error('us-388 AC5: a .state.md render alone must not satisfy the machine state requirement');
}

// Unsafe slug and unknown --require fail closed without writing.
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'verify-child-us388-bad-'));
  tempRoots.push(root);
  const badSlug = run(['--slug', '..\\escape', '--plans-dir', plansDir(root)], root);
  if (badSlug.status === 0) throw new Error('us-388 AC5: unsafe slug must be refused');
  const reserved = run(['--slug', 'ws-spec-multi', '--plans-dir', plansDir(root)], root);
  if (reserved.status === 0) throw new Error('us-388 AC5: the reserved ws-spec-multi slug must be refused');
  const badReq = run(['--slug', 'demo', '--plans-dir', plansDir(root), '--require', 'bogus'], root);
  if (badReq.status === 0) throw new Error('us-388 AC5: unknown --require must be refused');
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-388 child-exit artifact guard ok');
