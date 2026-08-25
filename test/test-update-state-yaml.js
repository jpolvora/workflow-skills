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
  '.agents/skills/ws-spec-to-pr/scripts/update_state.cjs',
);
const UPDATE_LITE = path.join(
  REPO_ROOT,
  '.agents/skills/ws-spec-to-pr-lite/scripts/update_state.cjs',
);
const VALIDATE_STANDARD = path.join(
  REPO_ROOT,
  '.agents/skills/ws-spec-to-pr/scripts/validate_state.py',
);
const VALIDATE_LITE = path.join(
  REPO_ROOT,
  '.agents/skills/ws-spec-to-pr-lite/scripts/validate_state.py',
);

const PYTHON = process.env.PYTHON || 'python';
const NL = '\n';
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

function runNode(script, args, opts = {}) {
  return run(process.execPath, [script, ...args], opts);
}

function seedConsumer(dir) {
  fs.mkdirSync(path.join(dir, '.agents/skills/ws-shared'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.agents/skills/ws-shared/config.json'),
    JSON.stringify({ plans: { dir: '.agents/plans' }, fable: { auditVerdictsBlockShip: 'refuted' } }),
  );
}

function finishStep(script, root, stateRel, step) {
  const jsonl = path.posix.join(
    path.dirname(stateRel).replace(/\\/g, '/'),
    `telemetry/step-${String(step).padStart(2, '0')}.jsonl`,
  );
  const common = ['--repo-root', root, '--jsonl-out', jsonl];
  const dispatched = runNode(script, [
    'dispatch', stateRel, '--step', String(step),
    '--timestamp', `2026-08-21T20:00:${String(step).padStart(2, '0')}.000Z`,
    ...common,
  ]);
  if (dispatched.status !== 0) return dispatched;
  return runNode(script, [
    'finish', stateRel, '--step', String(step), '--status', 'completed',
    '--timestamp', `2026-08-21T20:01:${String(step).padStart(2, '0')}.000Z`,
    ...common,
  ]);
}

function writeLocFixture(dir) {
  seedConsumer(dir);
  const usDir = path.join(dir, '.agents/plans/us-202');
  fs.mkdirSync(usDir, { recursive: true });
  const stateRel = '.agents/plans/us-202/us-202-test.state.md';
  const statePath = path.join(dir, stateRel);
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
---
# Spec-to-PR Workflow: us-202

## Telemetry log

| Step | Label | Model | Elapsed | Tokens |
|------|-------|-------|---------|--------|

## Gate history
`;
  fs.writeFileSync(statePath, content, 'utf8');
  return { statePath, stateRel };
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
  const { statePath, stateRel } = writeLocFixture(dir);

  const r1 = finishStep(UPDATE_STANDARD, dir, stateRel, 1);
  assert(r1.status === 0, 'loc round-trip pass 1: exit 0');
  if (r1.status !== 0) {
    console.error(r1.stdout);
    console.error(r1.stderr);
  }

  let fm = extractFrontmatter(statePath);
  assertLocMapping(fm, 'pass 1');
  assertCompletedStepsContains(fm, [0, 1], 'pass 1');

  const r2 = finishStep(UPDATE_STANDARD, dir, stateRel, 2);
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
  const dir = mkTmp('ws-update-state-lite-loc-');
  const { statePath, stateRel } = writeLocFixture(dir);

  const r = finishStep(UPDATE_LITE, dir, stateRel, 1);
  assert(r.status === 0, 'lite loc fixture: exit 0');
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
  }

  const fm = extractFrontmatter(statePath);
  assertLocMapping(fm, 'lite pass 1');
}

function writeDuplicateCompletedStepsFixture(dir) {
  seedConsumer(dir);
  const usDir = path.join(dir, '.agents/plans/dup-steps');
  fs.mkdirSync(usDir, { recursive: true });
  const stateRel = '.agents/plans/dup-steps/dup-steps.state.md';
  const statePath = path.join(dir, stateRel);
  const content = `---
workflowId: dup-steps
us: us-202
slug: us-202
status: active
currentStep: 2
dryRun: true
completedSteps: [0, 1]
skippedSteps: []
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
  return { statePath, stateRel };
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
  const { statePath, stateRel } = writeDuplicateCompletedStepsFixture(dir);

  const rStd = finishStep(UPDATE_STANDARD, dir, stateRel, 2);
  assert(rStd.status === 0, 'duplicate union standard: exit 0');
  if (rStd.status !== 0) {
    console.error(rStd.stdout);
    console.error(rStd.stderr);
  }
  assertDuplicateUnion(statePath, 'standard', rStd.stderr);

  const dirLite = mkTmp('ws-update-state-dup-lite-');
  const lite = writeDuplicateCompletedStepsFixture(dirLite);
  const rLite = finishStep(UPDATE_LITE, dirLite, lite.stateRel, 2);
  assert(rLite.status === 0, 'duplicate union lite: exit 0');
  if (rLite.status !== 0) {
    console.error(rLite.stdout);
    console.error(rLite.stderr);
  }
  assertDuplicateUnion(lite.statePath, 'lite', rLite.stderr);
}

function writeStateVersionFixture(dir, stateVersionLine, label) {
  const statePath = path.join(dir, 'sv-' + label + '.state.md');
  const content =
    '---' + NL +
    'workflowId: sv-' + label + NL +
    'us: us' + NL +
    'slug: sv-' + label + NL +
    'status: active' + NL +
    'currentStep: 1' + NL +
    'revision: 0' + NL +
    (stateVersionLine ? stateVersionLine + NL : '') +
    'dryRun: true' + NL +
    'completedSteps: [0]' + NL +
    'skippedSteps: []' + NL +
    'workflowManifest:' + NL +
    '  created: []' + NL +
    '  artifacts: []' + NL +
    'commits: []' + NL +
    'telemetry:' + NL +
    '  steps: []' + NL +
    '  totalElapsedSec: 0' + NL +
    'currentModel: test-model' + NL +
    '---' + NL +
    '# Spec-to-PR Workflow: sv-' + label + NL +
    NL +
    '## Telemetry log' + NL +
    NL +
    '| Step | Label | Model | Elapsed | Tokens |' + NL +
    '|------|-------|-------|---------|--------|' + NL +
    NL +
    '## Gate history' + NL;
  fs.writeFileSync(statePath, content, 'utf8');
  return statePath;
}

function testStateVersionStampAndReject() {
  for (const [copy, script] of [
    ['standard', UPDATE_STANDARD],
    ['lite', UPDATE_LITE],
  ]) {
    const dir = mkTmp('ws-stateversion-stamp-');
    seedConsumer(dir);
    const usDir = path.join(dir, '.agents/plans', copy);
    fs.mkdirSync(usDir, { recursive: true });
    const stateRel = `.agents/plans/${copy}/sv-${copy}.state.md`;
    const statePath = writeStateVersionFixture(usDir, '', copy);
    fs.renameSync(statePath, path.join(dir, stateRel));
    const r = finishStep(script, dir, stateRel, 1);
    assert(r.status === 0, copy + ': update_state stamps stateVersion (exit 0)');
    if (r.status !== 0) {
      console.error(r.stdout);
      console.error(r.stderr);
    }
    const fm = extractFrontmatter(path.join(dir, stateRel));
    assert(/^stateVersion:\s*2\s*$/m.test(fm), copy + ': stateVersion: 2 stamped after first write');
  }

  for (const [copy, script] of [
    ['standard', UPDATE_STANDARD],
    ['lite', UPDATE_LITE],
  ]) {
    const dir = mkTmp('ws-stateversion-clamp-');
    seedConsumer(dir);
    const usDir = path.join(dir, '.agents/plans', copy);
    fs.mkdirSync(usDir, { recursive: true });
    const stateRel = `.agents/plans/${copy}/sv-clamp.state.md`;
    const statePath = writeStateVersionFixture(usDir, 'stateVersion: 7', copy);
    fs.renameSync(statePath, path.join(dir, stateRel));
    const r1 = finishStep(script, dir, stateRel, 1);
    if (r1.status !== 0) {
      console.error(r1.stdout);
      console.error(r1.stderr);
    }
    assert(r1.status === 0, copy + ': update_state clamps unknown stateVersion 7 (exit 0)');
    let fm = extractFrontmatter(path.join(dir, stateRel));
    assert(/^stateVersion:\s*2\s*$/m.test(fm), copy + ': unknown 7 clamped to stateVersion: 2');
    const r2 = finishStep(script, dir, stateRel, 2);
    assert(r2.status === 0, copy + ': retry after clamp still exit 0');
    fm = extractFrontmatter(path.join(dir, stateRel));
    assert(/^stateVersion:\s*2\s*$/m.test(fm), copy + ': retry keeps stateVersion: 2');
  }

  const dir = mkTmp('ws-stateversion-reject-');
  const cases = [
    { label: 'missing', line: '' },
    { label: 'older', line: 'stateVersion: 0' },
    { label: 'unknown', line: 'stateVersion: 7' },
    { label: 'nonint', line: 'stateVersion: "abc"' },
  ];
  for (const [validatorLabel, validatorScript] of [
    ['standard', VALIDATE_STANDARD],
    ['lite', VALIDATE_LITE],
  ]) {
    for (const c of cases) {
      const p = writeStateVersionFixture(dir, c.line, c.label + '-' + validatorLabel);
      const r = runPython(validatorScript, [p]);
      assert(
        r.status === 1,
        validatorLabel + ' ' + c.label + ': validate_state exits 1 (status=' + r.status + ')',
      );
      assert(
        /[Ss]tate[Vv]ersion/.test(r.stderr || ''),
        validatorLabel + ' ' + c.label + ': stderr mentions stateVersion',
      );
    }
  }

  const good = writeStateVersionFixture(dir, 'stateVersion: 2\nrevision: 0', 'good');
  const rGood = runPython(VALIDATE_STANDARD, [good]);
  assert(rGood.status === 0, 'current stateVersion: validate_state exits 0');

  const rGoodLite = runPython(VALIDATE_LITE, [good]);
  assert(rGoodLite.status === 0, 'lite current stateVersion: validate_state exits 0');

  const CJS_STATE = path.join(
    REPO_ROOT,
    '.agents/skills/ws-shared/scripts/workflow_state.cjs',
  );
  const cjsSrc = fs.readFileSync(CJS_STATE, 'utf8');
  const cjsM = cjsSrc.match(/^const STATE_VERSION = (\d+);/m);
  assert(cjsM, 'workflow_state.cjs STATE_VERSION found');
  const nodeVersion = parseInt(cjsM[1], 10);
  assert(nodeVersion === 2, 'Node STATE_VERSION is 2');
}

function stampArtifact(usDir, fileName, fields) {
  fs.writeFileSync(
    path.join(usDir, fileName),
    '---' + NL +
      'step: ' + fields.step + NL +
      'slug: ' + fields.slug + NL +
      'workflowId: ' + fields.workflowId + NL +
      'status: completed' + NL +
      'startedAt: 2026-08-21T20:00:00.000Z' + NL +
      'endedAt: 2026-08-21T20:00:05.000Z' + NL +
      'acRefs: []' + NL +
      '---' + NL +
      '# body' + NL,
    'utf8',
  );
}

function writeLedger(usDir, slug, workflowId) {
  fs.writeFileSync(
    path.join(usDir, 'ac-ledger.json'),
    JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      workflowId,
      slug,
      specPath: path.join('.agents/plans', slug, 'step-00-' + slug + '.spec.md').replace(/\\/g, '/'),
      planIndexPath: null,
      declaredGaps: [],
      aliasResults: [],
      testingSkip: null,
      acceptanceCriteria: [],
      scoreState: null,
    }),
  );
}

function writeArtifactFixture(dir, slug) {
  const usDir = path.join(dir, slug);
  fs.mkdirSync(usDir, { recursive: true });
  const statePath = path.join(usDir, slug + '.state.md');
  const content = '---' + NL +
    'workflowId: ' + slug + NL +
    'us: ' + slug + NL +
    'slug: ' + slug + NL +
    'status: active' + NL +
    'currentStep: 0' + NL +
    'stateVersion: 2' + NL +
    'revision: 0' + NL +
    'dryRun: true' + NL +
    'completedSteps: [0]' + NL +
    'skippedSteps: []' + NL +
    'workflowManifest:' + NL +
    '  created: []' + NL +
    '  artifacts: []' + NL +
    'commits: []' + NL +
    'telemetry:' + NL +
    '  steps: []' + NL +
    '  totalElapsedSec: 0' + NL +
    'currentModel: test-model' + NL +
    '---' + NL +
    '# Spec-to-PR Workflow: ' + slug + NL +
    NL +
    '## Telemetry log' + NL +
    NL +
    '| Step | Label | Model | Elapsed | Tokens |' + NL +
    '|------|-------|-------|---------|--------|' + NL +
    NL +
    '## Gate history' + NL;
  fs.writeFileSync(statePath, content, 'utf8');
  return { usDir, statePath };
}

// AC6 reproducible-artifact invariant: pre-advance validate_state exits non-zero
// when a required artifact for step N is missing (fail closed).
function testArtifactReproducibilityPreAdvance() {
  const slug = 'us-ac6';
  const step = 2; // advance to step 2 requires step-00 spec + step-01 plan
  const dir = mkTmp('ws-artifact-repro-');
  const { usDir, statePath } = writeArtifactFixture(dir, slug);

  // No artifacts created yet -> pre-advance 2 must fail.
  const rMiss = runPython(VALIDATE_STANDARD, [statePath, '--pre-advance', String(step)]);
  assert(
    rMiss.status !== 0,
    'AC6: pre-advance ' + step + ' exits non-zero when required artifact missing (status=' + rMiss.status + ')',
  );
  const missBlob = (rMiss.stderr || '') + (rMiss.stdout || '');
  assert(
    /artifact missing/i.test(missBlob) || /ac-ledger\.json is required/i.test(missBlob),
    'AC6: stderr/stdout names the missing artifact or ledger',
  );

  writeLedger(usDir, slug, slug);
  stampArtifact(usDir, 'step-00-' + slug + '.spec.md', { step: 0, slug, workflowId: slug });
  stampArtifact(usDir, 'step-01-' + slug + '.plan.md', { step: 1, slug, workflowId: slug });
  const rOk = runPython(VALIDATE_STANDARD, [statePath, '--pre-advance', String(step)]);
  assert(
    rOk.status === 0,
    'AC6: pre-advance ' + step + ' exits 0 when required artifacts present (status=' + rOk.status + ' stderr=' + (rOk.stderr || '') + ')',
  );
}

function writeInlineCommitFixture(dir, commitsYaml, dryRun, label) {
  const statePath = path.join(dir, 'commits-' + label + '.state.md');
  const content =
    '---' + NL +
    'workflowId: commits-' + label + NL +
    'us: us' + NL +
    'slug: commits-' + label + NL +
    'status: active' + NL +
    'currentStep: 5' + NL +
    'stateVersion: 2' + NL +
    'revision: 0' + NL +
    'dryRun: ' + (dryRun ? 'true' : 'false') + NL +
    'completedSteps: [0, 1, 2, 3, 4, 5]' + NL +
    'skippedSteps: []' + NL +
    'workflowManifest:' + NL +
    '  created: []' + NL +
    '  artifacts: []' + NL +
    'commits:' + NL +
    commitsYaml +
    'telemetry:' + NL +
    '  steps: []' + NL +
    '  totalElapsedSec: 0' + NL +
    'currentModel: test-model' + NL +
    '---' + NL +
    '# Spec-to-PR Workflow: commits-' + label + NL;
  fs.writeFileSync(statePath, content, 'utf8');
  return statePath;
}

function parseValidateJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function testInlineDictCommitShaScan() {
  const inlineYaml =
    '  - { sha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", step: 5, message: "product" }' + NL +
    '  - { sha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", step: 6, message: "review-fix" }' + NL;
  const blockYaml =
    '  - sha: cccccccccccccccccccccccccccccccccccccccc' + NL +
    '    step: 5' + NL +
    '    message: product' + NL;

  for (const [validatorLabel, validatorScript] of [
    ['standard', VALIDATE_STANDARD],
    ['lite', VALIDATE_LITE],
  ]) {
    const dir = mkTmp('ws-inline-sha-');
    const inlinePath = writeInlineCommitFixture(dir, inlineYaml, true, validatorLabel + '-inline');
    const rInline = runPython(validatorScript, [inlinePath, '--json']);
    assert(rInline.status === 0, validatorLabel + ' inline-dict sha scan: exit 0');
    const inlineJson = parseValidateJson(rInline.stdout);
    assert(!!inlineJson, validatorLabel + ' inline-dict sha scan: --json parses');
    assert(!!inlineJson && inlineJson.ok === true, validatorLabel + ' inline-dict sha scan: --json ok');
    assert(typeof inlineJson.state === 'string', validatorLabel + ' inline-dict sha scan: returns state path');

    const blockPath = writeInlineCommitFixture(dir, blockYaml, true, validatorLabel + '-block');
    const rBlock = runPython(validatorScript, [blockPath, '--json']);
    assert(rBlock.status === 0, validatorLabel + ' block sha scan: exit 0');
    const blockJson = parseValidateJson(rBlock.stdout);
    assert(!!blockJson && blockJson.ok === true, validatorLabel + ' block sha scan: --json ok');
  }

  const head = run('git', ['rev-parse', 'HEAD']);
  const realSha = (head.stdout || '').trim();
  assert(/^[0-9a-f]{7,40}$/.test(realSha), 'HEAD sha available for git_commit_exists check');
  if (/^[0-9a-f]{7,40}$/.test(realSha)) {
    const dir = mkTmp('ws-inline-sha-git-');
    const goodYaml =
      '  - { sha: "' + realSha + '", step: 5, message: "product" }' + NL;
    const goodPath = writeInlineCommitFixture(dir, goodYaml, false, 'git-good');
    const rGood = runPython(VALIDATE_STANDARD, [goodPath, '--json']);
    assert(rGood.status === 0, 'inline-dict existing SHA: validate_state exits 0');

    const badYaml =
      '  - { sha: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef", step: 5, message: "forged" }' + NL;
    const badPath = writeInlineCommitFixture(dir, badYaml, false, 'git-bad');
    const rBad = runPython(VALIDATE_STANDARD, [badPath, '--json']);
    assert(rBad.status === 0, 'inline-dict forged SHA: Node SoT does not git-cat commits (hygiene only)');
  }
}


function main() {
  console.log('test-update-state-yaml.js\n');
  testLocNestedMappingRoundTrip();
  testLiteSerializerMirrorsNestedDictFix();
  testDuplicateCompletedStepsUnion();
  testStateVersionStampAndReject();
  testArtifactReproducibilityPreAdvance();
  testInlineDictCommitShaScan();

  cleanup();

  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll update_state YAML tests passed.');
}

main();
