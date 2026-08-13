/**
 * update_state YAML serializer/parser regression tests (us-202 AC1–AC5).
 * Run: node test/test-update-state-yaml.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const UPDATE_STANDARD = path.join(
  REPO_ROOT,
  '.agents/skills/ws-spec-to-pr/scripts/update_state.py',
);
const UPDATE_LITE = path.join(
  REPO_ROOT,
  '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.py',
);

const PYTHON = process.env.PYTHON || 'python';
const tmpRoots = [];
let failures = 0;

function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

function cleanup() {
  for (const dir of tmpRoots) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

function run(cmd, args, opts = {}) {
  return cp.spawnSync(cmd, args, {
    cwd: opts.cwd || REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', ...(opts.env || {}) },
  });
}

function runPython(script, args, opts = {}) {
  return run(PYTHON, [script, ...args], opts);
}

function writeLocFixture(dir, extraFmLines = '') {
  const statePath = path.join(dir, 'us-202-test.state.md');
  const content = `---
workflowId: us-202-test
us: us-202
slug: us-202
status: active
currentStep: 1
dryRun: true
completedSteps: [0]
skippedSteps: []
workflowManifest:
  created: []
  artifacts: []
commits: []
telemetry:
  loc:
    baseline: 2404
  steps: []
  totalElapsedSec: 0
currentModel: test-model
${extraFmLines}---
# Spec-to-PR Workflow: us-202

## Telemetry log

| Step | Label | Model | Elapsed | Tokens |
|------|-------|-------|---------|--------|

## Gate history
`;
  fs.writeFileSync(statePath, content, 'utf8');
  return statePath;
}

function extractFrontmatter(statePath) {
  const text = fs.readFileSync(statePath, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return m ? m[1] : '';
}

function assertCompletedStepsContains(fm, steps, label) {
  const inline = fm.match(/^completedSteps:\s*\[([^\]]*)\]/m);
  if (inline) {
    const nums = inline[1].split(',').map((s) => parseInt(s.trim(), 10));
    for (const n of steps) {
      assert(nums.includes(n), `${label}: inline completedSteps includes ${n}`);
    }
    return;
  }
  const blockMatch = fm.match(/^completedSteps:\s*\r?\n((?:\s+-\s+\d+\s*\r?\n)+)/m);
  assert(blockMatch, `${label}: completedSteps present as inline or block list`);
  if (!blockMatch) return;
  const nums = [...blockMatch[1].matchAll(/-\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
  for (const n of steps) {
    assert(nums.includes(n), `${label}: block completedSteps includes ${n}`);
  }
}

function assertLocMapping(fm, label) {
  assert(!/\{'baseline'/m.test(fm), `${label}: no Python repr single-quote dict`);
  assert(!/"{'baseline'/m.test(fm), `${label}: no quoted Python repr dict`);
  const flow = fm.match(/^\s*loc:\s*(\{[^}\n]+\})/m);
  const block = fm.match(/^\s*loc:\s*\r?\n\s+baseline:\s*(\d+)/m);
  assert(flow || block, `${label}: loc remains a mapping with baseline`);
  if (flow) {
    assert(/baseline:\s*2404/.test(flow[1]), `${label}: flow-map baseline is 2404`);
  }
  if (block) {
    assert(block[1] === '2404', `${label}: block baseline is 2404`);
  }
}

function testLocNestedMappingRoundTrip() {
  const dir = mkTmp('ws-update-state-loc-');
  const statePath = writeLocFixture(dir);

  const r1 = runPython(UPDATE_STANDARD, [statePath, '--step', '1', '--elapsed', '1']);
  assert(r1.status === 0, 'loc round-trip pass 1: exit 0');
  if (r1.status !== 0) {
    console.error(r1.stdout);
    console.error(r1.stderr);
  }

  let fm = extractFrontmatter(statePath);
  assertLocMapping(fm, 'pass 1');
  assertCompletedStepsContains(fm, [0, 1], 'pass 1');

  const r2 = runPython(UPDATE_STANDARD, [statePath, '--step', '2', '--elapsed', '1']);
  assert(r2.status === 0, 'loc round-trip pass 2: exit 0');
  if (r2.status !== 0) {
    console.error(r2.stdout);
    console.error(r2.stderr);
  }

  fm = extractFrontmatter(statePath);
  assertLocMapping(fm, 'pass 2');
  assertCompletedStepsContains(fm, [0, 1, 2], 'pass 2');
}

function testLiteSerializerMirrorsNestedDictFix() {
  const liteSrc = fs.readFileSync(UPDATE_LITE, 'utf8');
  assert(
    /elif isinstance\(subv, dict\):[\s\S]*?lines\.append\(f"  \{subk\}: \{format_inline_dict\(subv\)\}"\)/.test(
      liteSrc,
    ),
    'lite serialize_yaml nested-dict branch uses format_inline_dict(subv)',
  );
  // AC1/AC2: format_val must never str() a dict in either copy.
  for (const [label, src] of [
    ['standard', fs.readFileSync(UPDATE_STANDARD, 'utf8')],
    ['lite', liteSrc],
  ]) {
    assert(
      /if isinstance\(v, dict\):[\s\S]*?return format_inline_dict\(v\)/.test(src),
      `${label} format_val has dict -> format_inline_dict branch`,
    );
  }

  const dir = mkTmp('ws-update-state-lite-loc-');
  const statePath = writeLocFixture(dir);

  const r = runPython(UPDATE_LITE, [statePath, '--step', '1', '--elapsed', '1']);
  assert(r.status === 0, 'lite loc fixture: exit 0');
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
  }

  const fm = extractFrontmatter(statePath);
  assertLocMapping(fm, 'lite pass 1');
}

function writeDuplicateCompletedStepsFixture(dir) {
  const statePath = path.join(dir, 'dup-steps.state.md');
  const content = `---
workflowId: dup-steps
us: us-202
slug: us-202
status: active
currentStep: 2
dryRun: true
completedSteps: [0, 1]
skippedSteps: []
completedSteps: [0]
workflowManifest:
  created: []
  artifacts: []
commits: []
telemetry:
  steps: []
  totalElapsedSec: 0
currentModel: test-model
---
# Spec-to-PR Workflow: dup-steps

## Telemetry log

| Step | Label | Model | Elapsed | Tokens |
|------|-------|-------|---------|--------|

## Gate history
`;
  fs.writeFileSync(statePath, content, 'utf8');
  return statePath;
}

function assertDuplicateUnion(statePath, label, stderr) {
  const fm = extractFrontmatter(statePath);
  const keyMatches = fm.match(/^completedSteps:/gm);
  assert(keyMatches && keyMatches.length === 1, `${label}: single completedSteps key after write`);
  assertCompletedStepsContains(fm, [0, 1, 2], label);
  const inlineGap = fm.match(/^completedSteps:\s*\[0,\s*2\]/m);
  const blockSection = fm.match(/^completedSteps:\s*\r?\n((?:\s+-\s+\d+\s*\r?\n)+)/m);
  let blockGap = false;
  if (blockSection) {
    const nums = [...blockSection[1].matchAll(/-\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
    blockGap = nums.length === 2 && nums.includes(0) && nums.includes(2) && !nums.includes(1);
  }
  assert(!inlineGap && !blockGap, `${label}: not [0, 2] gap`);
  if (stderr && /duplicate completedSteps/i.test(stderr)) {
    ok(`${label}: stderr warns about duplicate completedSteps`);
  }
}

function testDuplicateCompletedStepsUnion() {
  const dir = mkTmp('ws-update-state-dup-');
  const statePath = writeDuplicateCompletedStepsFixture(dir);

  const rStd = runPython(UPDATE_STANDARD, [statePath, '--step', '2', '--elapsed', '1']);
  assert(rStd.status === 0, 'duplicate union standard: exit 0');
  if (rStd.status !== 0) {
    console.error(rStd.stdout);
    console.error(rStd.stderr);
  }
  assertDuplicateUnion(statePath, 'standard', rStd.stderr);

  const dirLite = mkTmp('ws-update-state-dup-lite-');
  const litePath = writeDuplicateCompletedStepsFixture(dirLite);
  const rLite = runPython(UPDATE_LITE, [litePath, '--step', '2', '--elapsed', '1']);
  assert(rLite.status === 0, 'duplicate union lite: exit 0');
  if (rLite.status !== 0) {
    console.error(rLite.stdout);
    console.error(rLite.stderr);
  }
  assertDuplicateUnion(litePath, 'lite', rLite.stderr);
}

function main() {
  console.log('test-update-state-yaml.js\n');
  testLocNestedMappingRoundTrip();
  testLiteSerializerMirrorsNestedDictFix();
  testDuplicateCompletedStepsUnion();

  cleanup();

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll update_state YAML tests passed.');
}

main();
