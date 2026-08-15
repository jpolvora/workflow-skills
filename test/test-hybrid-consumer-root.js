/**
 * Hybrid/global consumer-root resolver tests (us-211).
 * Run: node test/test-hybrid-consumer-root.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const GLOBAL_SKILLS = path.join(REPO_ROOT, '.agents', 'skills');
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
    env: {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      WORKFLOW_SKILLS_GLOBAL_DIR: GLOBAL_SKILLS,
      ...(opts.env || {}),
    },
  });
}

function writeConsumerHub(consumerRoot, overrides = {}) {
  const shared = path.join(consumerRoot, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  const config = {
    dagThresholds: {
      maxImplementationSteps: 99,
      maxExpectedFiles: 99,
      maxLayers: 99,
    },
    plans: {
      dir: '.agents/consumer-plans',
      specsDir: '.agents/specs',
    },
    ...overrides,
  };
  fs.writeFileSync(
    path.join(shared, 'config.json'),
    JSON.stringify(config, null, 2),
    'utf8',
  );
  return shared;
}

function testSelfLearningCompileTargetsConsumer() {
  console.log('\n--- testSelfLearningCompileTargetsConsumer ---');
  const consumer = mkTmp('ws-hybrid-consumer-');
  const shared = writeConsumerHub(consumer);
  const memoryDir = path.join(shared, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(
    path.join(memoryDir, '2026-08-15-hybrid-trap.md'),
    '### [2026-08-15] hybrid consumer memory probe\n\n- **Trap avoided:** global MEMORY\n- **Solution:** cwd hub wins\n',
    'utf8',
  );

  const script = path.join(
    GLOBAL_SKILLS,
    'ws-self-learning',
    'scripts',
    'self_learning.py',
  );
  const result = run(PYTHON, [script, '--compile'], { cwd: consumer });
  assert(result.status === 0, `self_learning --compile exit 0 (${result.stderr || result.stdout})`);

  const memoryPath = path.join(shared, 'MEMORY.md');
  assert(fs.existsSync(memoryPath), 'MEMORY.md written under consumer ws-shared');
  const content = fs.readFileSync(memoryPath, 'utf8');
  assert(
    content.includes('hybrid consumer memory probe'),
    'compiled MEMORY contains consumer memory entry',
  );
  assert(
    !fs.existsSync(path.join(GLOBAL_SKILLS, 'ws-shared', 'MEMORY.md')) ||
      !fs.readFileSync(path.join(GLOBAL_SKILLS, 'ws-shared', 'MEMORY.md'), 'utf8').includes(
        'hybrid consumer memory probe',
      ),
    'global hub MEMORY not updated by consumer compile',
  );
}

function testClassifyUsesConsumerThresholds() {
  console.log('\n--- testClassifyUsesConsumerThresholds ---');
  const consumer = mkTmp('ws-hybrid-classify-');
  writeConsumerHub(consumer);
  const specDir = path.join(consumer, '.agents', 'plans', 'us-hybrid');
  fs.mkdirSync(specDir, { recursive: true });
  const specPath = path.join(specDir, 'step-00-us-hybrid.spec.md');
  fs.writeFileSync(
    specPath,
    `---
slug: us-hybrid
title: Hybrid threshold probe
---
# Spec
## Summary
Small change.
`,
    'utf8',
  );

  const script = path.join(
    GLOBAL_SKILLS,
    'ws-classify-complexity',
    'scripts',
    'classify.cjs',
  );
  const outDir = path.join(specDir);
  const result = run(
    'node',
    [script, specPath, '--output-dir', outDir],
    { cwd: consumer },
  );
  assert(result.status === 0, `classify.cjs exit 0 (${result.stderr || result.stdout})`);

  let parsed;
  try {
    const start = result.stdout.indexOf('{');
    const end = result.stdout.lastIndexOf('}');
    parsed = JSON.parse(result.stdout.slice(start, end + 1));
  } catch {
    parsed = null;
  }
  assert(parsed && parsed.thresholds, 'classify stdout includes thresholds JSON');
  assert(
    parsed?.thresholds?.maxImplementationSteps === 99,
    'classify reads consumer dagThresholds (maxImplementationSteps=99)',
  );
}

function scaffoldProjectLocalSelfLearning(projectRoot) {
  const skillScripts = path.join(
    projectRoot,
    '.agents',
    'skills',
    'ws-self-learning',
    'scripts',
  );
  const sharedScripts = path.join(
    projectRoot,
    '.agents',
    'skills',
    'ws-shared',
    'scripts',
  );
  fs.mkdirSync(skillScripts, { recursive: true });
  fs.mkdirSync(sharedScripts, { recursive: true });
  fs.copyFileSync(
    path.join(GLOBAL_SKILLS, 'ws-shared', 'scripts', 'resolve_consumer_root.py'),
    path.join(sharedScripts, 'resolve_consumer_root.py'),
  );
  fs.copyFileSync(
    path.join(GLOBAL_SKILLS, 'ws-self-learning', 'scripts', 'self_learning.py'),
    path.join(skillScripts, 'self_learning.py'),
  );
  return path.join(skillScripts, 'self_learning.py');
}

function seedMemoryProbe(sharedDir, marker) {
  const memoryDir = path.join(sharedDir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.writeFileSync(
    path.join(memoryDir, '2026-08-15-hybrid-trap.md'),
    `### [2026-08-15] ${marker}\n\n- **Trap avoided:** global MEMORY\n- **Solution:** consumer hub wins\n`,
    'utf8',
  );
}

function testRepoRootOverrideWins() {
  console.log('\n--- testRepoRootOverrideWins ---');
  const globalScript = path.join(
    GLOBAL_SKILLS,
    'ws-self-learning',
    'scripts',
    'self_learning.py',
  );

  const consumer = mkTmp('ws-hybrid-override-');
  const shared = writeConsumerHub(consumer);
  seedMemoryProbe(shared, 'repo-root override no-hub cwd');

  const noHubCwd = mkTmp('ws-hybrid-nohub-cwd-');
  const noHubResult = run(
    PYTHON,
    [globalScript, '--compile', '--repo-root', consumer],
    { cwd: noHubCwd },
  );
  assert(
    noHubResult.status === 0,
    `--repo-root wins when cwd has no hub (${noHubResult.stderr || noHubResult.stdout})`,
  );
  const noHubMemory = fs.readFileSync(path.join(shared, 'MEMORY.md'), 'utf8');
  assert(
    noHubMemory.includes('repo-root override no-hub cwd'),
    'compile with --repo-root writes consumer hub when cwd lacks hub',
  );

  const cwdConsumer = mkTmp('ws-hybrid-cwd-hub-');
  const cwdShared = writeConsumerHub(cwdConsumer);
  seedMemoryProbe(cwdShared, 'cwd hub marker should not win');

  const targetConsumer = mkTmp('ws-hybrid-target-');
  const targetShared = writeConsumerHub(targetConsumer);
  seedMemoryProbe(targetShared, 'repo-root override beats cwd hub');

  const hubResult = run(
    PYTHON,
    [globalScript, '--compile', '--repo-root', targetConsumer],
    { cwd: cwdConsumer },
  );
  assert(
    hubResult.status === 0,
    `--repo-root wins when cwd also has hub (${hubResult.stderr || hubResult.stdout})`,
  );
  const targetMemory = fs.readFileSync(path.join(targetShared, 'MEMORY.md'), 'utf8');
  assert(
    targetMemory.includes('repo-root override beats cwd hub'),
    'compile with --repo-root writes target hub, not cwd hub',
  );
  assert(
    !fs.existsSync(path.join(cwdShared, 'MEMORY.md')) ||
      !fs.readFileSync(path.join(cwdShared, 'MEMORY.md'), 'utf8').includes(
        'repo-root override beats cwd hub',
      ),
    'cwd hub MEMORY not updated when --repo-root points elsewhere',
  );
}

function testProjectLocalScriptParents4Resolves() {
  console.log('\n--- testProjectLocalScriptParents4Resolves ---');
  const projectRoot = mkTmp('ws-hybrid-project-local-');
  const shared = writeConsumerHub(projectRoot);
  seedMemoryProbe(shared, 'project-local parents4 probe');

  const localScript = scaffoldProjectLocalSelfLearning(projectRoot);
  const foreignCwd = mkTmp('ws-hybrid-foreign-cwd-');

  const result = run(PYTHON, [localScript, '--compile'], { cwd: foreignCwd });
  assert(
    result.status === 0,
    `project-local script --compile exit 0 (${result.stderr || result.stdout})`,
  );

  const memoryPath = path.join(shared, 'MEMORY.md');
  assert(fs.existsSync(memoryPath), 'MEMORY.md written under project-local hub');
  const content = fs.readFileSync(memoryPath, 'utf8');
  assert(
    content.includes('project-local parents4 probe'),
    'project-local script resolves parents[4] hub, not foreign cwd',
  );
  assert(
    !fs.existsSync(path.join(foreignCwd, '.agents', 'skills', 'ws-shared', 'MEMORY.md')),
    'foreign cwd hub not created or updated by project-local script',
  );
}

function testValidateStateResolvesConsumerPlansDir() {
  console.log('\n--- testValidateStateResolvesConsumerPlansDir ---');
  const consumer = mkTmp('ws-hybrid-validate-');
  writeConsumerHub(consumer);
  const plansDir = path.join(consumer, '.agents', 'consumer-plans', 'us-hybrid');
  fs.mkdirSync(plansDir, { recursive: true });
  const statePath = path.join(plansDir, 'us-hybrid-test.state.md');
  fs.writeFileSync(
    statePath,
    `---
workflowId: us-hybrid-test
us: us-hybrid
slug: us-hybrid
status: in_progress
currentStep: 1
completedSteps: [0]
dryRun: true
workflowManifest:
  created: []
  modified: []
  deleted: []
  artifacts: []
commits: []
---
`,
    'utf8',
  );

  const script = path.join(
    GLOBAL_SKILLS,
    'ws-spec-to-pr-lite',
    'scripts',
    'validate_state.py',
  );
  const result = run(PYTHON, [script, 'us-hybrid-test', '--json'], { cwd: consumer });
  assert(result.status === 0, `validate_state exit 0 (${result.stderr || result.stdout})`);

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    parsed = null;
  }
  assert(parsed && parsed.state, 'validate_state returns JSON state path');
  const resolved = path.resolve(consumer, parsed.state);
  assert(
    resolved.replace(/\\/g, '/').includes('.agents/consumer-plans/'),
    'validate_state resolves plans.dir from consumer hub (not global/home)',
  );
}

function main() {
  testSelfLearningCompileTargetsConsumer();
  testRepoRootOverrideWins();
  testProjectLocalScriptParents4Resolves();
  testClassifyUsesConsumerThresholds();
  testValidateStateResolvesConsumerPlansDir();
  cleanup();
  if (failures > 0) {
    console.error(`\n${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nAll hybrid consumer-root tests passed.');
}

main();
