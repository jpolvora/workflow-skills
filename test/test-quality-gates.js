/**
 * Quality gates integration tests (AC1–AC7).
 * Run: node test/test-quality-gates.js
 *
 * Also chained after test-install.js via package.json `tests` script.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const VALIDATE = path.join(
  REPO_ROOT,
  'src/skills/ws-spec-to-pr/scripts/validate_state.py',
);
const UPDATE_STATE = path.join(
  REPO_ROOT,
  'src/skills/ws-spec-to-pr/scripts/update_state.py',
);
const CLASSIFY = path.join(
  REPO_ROOT,
  'src/skills/ws-classify-complexity/scripts/classify.cjs',
);
const PREPARE = path.join(
  REPO_ROOT,
  'src/skills/ws-ship-pr/PREPARE-CHECKLIST.md',
);
const CLASSIFY_SKILL = path.join(
  REPO_ROOT,
  'src/skills/ws-classify-complexity/SKILL.md',
);
const SETUP_MD = path.join(REPO_ROOT, 'src/skills/ws-shared/setup.md');
const CONFIG_EXAMPLE = path.join(
  REPO_ROOT,
  'src/skills/ws-shared/config.json.example',
);
const SHIP_SKILL = path.join(REPO_ROOT, 'src/skills/ws-ship-pr/SKILL.md');
const STEP_DISPATCH = path.join(
  REPO_ROOT,
  'src/skills/ws-spec-to-pr/STEP-DISPATCH.md',
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

function writeState(usDir, slug, workflowId, extraFm = '', opts = {}) {
  fs.mkdirSync(usDir, { recursive: true });
  const dryRun = opts.dryRun === true ? 'true' : 'false';
  const statePath = path.join(usDir, `${workflowId}.state.md`);
  const content = `---
workflowId: ${workflowId}
us: null
slug: ${slug}
status: active
currentStep: 0
dryRun: ${dryRun}
completedSteps: []
skippedSteps: []
workflowManifest:
  created: []
  artifacts: []
commits: []
telemetry:
  steps: []
  totalElapsedSec: 0
currentModel: test-model
${extraFm}---
# Spec-to-PR Workflow: ${slug}

## Telemetry log

## Gate history
`;
  fs.writeFileSync(statePath, content, 'utf8');
  return statePath;
}

function preAdvanceJson(statePath, stepN, opts = {}) {
  const r = runPython(VALIDATE, [statePath, '--pre-advance', String(stepN), '--json'], {
    env: opts.env,
  });
  let parsed = null;
  try {
    parsed = JSON.parse((r.stdout || '').trim() || '{}');
  } catch {
    parsed = { parseError: true, stdout: r.stdout, stderr: r.stderr };
  }
  return { status: r.status, result: parsed, stderr: r.stderr || '', stdout: r.stdout || '' };
}

/** Isolated git repo so checkpoint tests never tag the package worktree (W3). */
function initTempGitRepo() {
  const dir = mkTmp('qg-git-');
  const init = run('git', ['init'], { cwd: dir });
  if (init.status !== 0) {
    fail(`initTempGitRepo: git init failed: ${init.stderr || init.stdout}`);
    return null;
  }
  run('git', ['config', 'user.email', 'qg-test@example.com'], { cwd: dir });
  run('git', ['config', 'user.name', 'qg-test'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README'), 'qg checkpoint fixture\n', 'utf8');
  run('git', ['add', 'README'], { cwd: dir });
  const commit = run('git', ['commit', '-m', 'init'], { cwd: dir });
  if (commit.status !== 0) {
    fail(`initTempGitRepo: commit failed: ${commit.stderr || commit.stdout}`);
    return null;
  }
  return {
    cwd: dir,
    env: {
      GIT_DIR: path.join(dir, '.git'),
      GIT_WORK_TREE: dir,
    },
  };
}

function withGitTag(tag, fn, git = null) {
  const repo = git || initTempGitRepo();
  if (!repo) return;
  const env = { ...process.env, ...repo.env };
  const create = run('git', ['tag', tag], { env, cwd: repo.cwd });
  if (create.status !== 0) {
    fail(`could not create test tag ${tag}: ${create.stderr || create.stdout}`);
    return;
  }
  try {
    fn(repo);
  } finally {
    run('git', ['tag', '-d', tag], { env, cwd: repo.cwd });
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// ---------------------------------------------------------------------------
// AC1 — Fable PREPARE row
// ---------------------------------------------------------------------------

function testFableRowExists() {
  const text = read(PREPARE);
  const boardMatch = text.match(/\| 4 \| Security[\s\S]*?\| 5 \| Fable-judge[\s\S]*?\| 6 \| Consumer prepare/);
  assert(Boolean(boardMatch), 'testFableRowExists: board row 5 is Fable between 4 and consumer prepare');
  assert(
    /### 5\. Fable-judge audit verdict/.test(text),
    'testFableRowExists: checklist heading §5 Fable-judge',
  );
  assert(
    /### 6\. Consumer prepare/.test(text),
    'testFableRowExists: consumer prepare renumbered to §6',
  );
}

function testFableRefutedBlocks() {
  const prepare = read(PREPARE);
  const ship = read(SHIP_SKILL);
  assert(
    /REFUTED.*❌.*STOP/s.test(prepare) || /REFUTED` → ❌ and \*\*STOP\*\*/.test(prepare),
    'testFableRefutedBlocks: PREPARE maps REFUTED → ❌ STOP',
  );
  assert(
    /auditVerdictsBlockShip/.test(ship) && /REFUTED/.test(ship) && /never bypassed/i.test(ship),
    'testFableRefutedBlocks: ship skill keeps auditVerdictsBlockShip safety floor',
  );
}

// ---------------------------------------------------------------------------
// AC2 — Pre-advance CI
// ---------------------------------------------------------------------------

function testCheckpointTagMissing() {
  const slug = `qg-ckpt-miss-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-ckpt-miss-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: false });
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  const repo = initTempGitRepo();
  if (!repo) return;

  const { status, result } = preAdvanceJson(statePath, 1, { env: repo.env });
  const errors = (result && result.errors) || [];
  const hasTagErr = errors.some((e) => /checkpoint tag missing/i.test(String(e)));
  assert(status !== 0 && hasTagErr, 'testCheckpointTagMissing: missing tag → non-zero + error');
}

function testCheckpointTagValid() {
  const slug = `qg-ckpt-ok-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-ckpt-ok-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: false });
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  const tag = `uswf/${workflowId}/before-step-1`;

  withGitTag(tag, (repo) => {
    const { status, result } = preAdvanceJson(statePath, 1, { env: repo.env });
    const errors = (result && result.errors) || [];
    const tagErrs = errors.filter((e) => /checkpoint tag/i.test(String(e)));
    assert(
      status === 0 && tagErrs.length === 0,
      'testCheckpointTagValid: existing reachable tag passes checkpoint check',
    );
  });
}

function testCheckpointDryRunSoftPass() {
  const slug = `qg-ckpt-dry-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-ckpt-dry-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: true });
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  const repo = initTempGitRepo();
  if (!repo) return;

  const { status, result } = preAdvanceJson(statePath, 1, { env: repo.env });
  const errors = (result && result.errors) || [];
  const warnings = (result && result.warnings) || [];
  const tagErrs = errors.filter((e) => /checkpoint tag/i.test(String(e)));
  const softWarn = warnings.some((w) => /checkpoint tag missing/i.test(String(w)) && /soft-pass/i.test(String(w)));
  assert(
    status === 0 && result && result.ok === true && tagErrs.length === 0 && softWarn,
    'testCheckpointDryRunSoftPass: dryRun + missing tag + artifacts → exit 0 with warning',
  );
  assert(
    /soft-pass.*dryRun|dryRun.*soft-pass/i.test(read(STEP_DISPATCH)),
    'testCheckpointDryRunSoftPass: STEP-DISPATCH documents dry-run soft-pass for missing tags',
  );
}

function testArtifactsMissing() {
  const slug = `qg-art-miss-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-art-miss-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: false });
  const tag = `uswf/${workflowId}/before-step-1`;

  withGitTag(tag, (repo) => {
    const { status, result } = preAdvanceJson(statePath, 1, { env: repo.env });
    const errors = (result && result.errors) || [];
    const hasArt = errors.some((e) => /required artifact missing/i.test(String(e)));
    assert(status !== 0 && hasArt, 'testArtifactsMissing: missing spec fails pre-advance');
  });
}

function testArtifactsExist() {
  const slug = `qg-art-ok-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-art-ok-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: false });
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  const tag = `uswf/${workflowId}/before-step-1`;

  withGitTag(tag, (repo) => {
    const { status, result } = preAdvanceJson(statePath, 1, { env: repo.env });
    assert(
      status === 0 && result && result.ok === true,
      'testArtifactsExist: spec present → advance to step 1 OK',
    );
  });
}

function testMonotonicityGap() {
  const slug = `qg-mono-gap-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-mono-gap-'), slug);
  const statePath = writeState(
    usDir,
    slug,
    workflowId,
    `completedSteps:\n  - 0\n  - 1\n  - 3\nskippedSteps: []\n`,
    { dryRun: false },
  );
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  fs.writeFileSync(path.join(usDir, `step-01-${slug}.plan.md`), '# plan\n', 'utf8');
  const tag = `uswf/${workflowId}/before-step-2`;

  withGitTag(tag, (repo) => {
    const { status, result } = preAdvanceJson(statePath, 2, { env: repo.env });
    const errors = (result && result.errors) || [];
    const hasGap = errors.some((e) => /gap at step 2/i.test(String(e)));
    assert(status !== 0 && hasGap, 'testMonotonicityGap: gap without skippedSteps fails');
  });
}

function testMonotonicityValid() {
  const slug = `qg-mono-ok-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-mono-ok-'), slug);
  const statePath = writeState(
    usDir,
    slug,
    workflowId,
    `completedSteps:\n  - 0\n  - 1\n  - 3\nskippedSteps:\n  - 2\n`,
    { dryRun: false },
  );
  fs.writeFileSync(path.join(usDir, `step-00-${slug}.spec.md`), '# spec\n', 'utf8');
  fs.writeFileSync(path.join(usDir, `step-01-${slug}.plan.md`), '# plan\n', 'utf8');
  const tag = `uswf/${workflowId}/before-step-2`;

  withGitTag(tag, (repo) => {
    const { status, result } = preAdvanceJson(statePath, 2, { env: repo.env });
    const errors = (result && result.errors) || [];
    const gapErrs = errors.filter((e) => /gap at step/i.test(String(e)));
    assert(
      status === 0 && gapErrs.length === 0,
      'testMonotonicityValid: skippedSteps fills gap',
    );
  });
}

function testPreAdvanceHS5() {
  const slug = `qg-hs5-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-hs5-'), slug);
  const statePath = writeState(usDir, slug, workflowId, '', { dryRun: false });
  const repo = initTempGitRepo();
  if (!repo) return;
  const r = runPython(VALIDATE, [statePath, '--pre-advance', '1'], { env: repo.env });
  assert(
    r.status !== 0,
    'testPreAdvanceHS5: pre-advance failure exits non-zero (HS-5 / no dispatch)',
  );
  assert(
    /omit.*pre-advance|skipQualityGates|--skip-gates/i.test(read(STEP_DISPATCH)),
    'testPreAdvanceHS5: STEP-DISPATCH documents skip of pre-advance under skipQualityGates',
  );
}

// ---------------------------------------------------------------------------
// AC3 — Classifier
// ---------------------------------------------------------------------------

function writeMiniSpec(dir, slug, body) {
  const specPath = path.join(dir, `step-00-${slug}.spec.md`);
  fs.writeFileSync(
    specPath,
    `---\nslug: ${slug}\ntitle: QG Test Spec\n---\n\n# QG Test Spec\n\n${body}\n`,
    'utf8',
  );
  return specPath;
}

function testClassifyOutput() {
  const dir = mkTmp('qg-classify-out-');
  const slug = 'qg-classify-lite';
  const specPath = writeMiniSpec(
    dir,
    slug,
    `## Overview\nSimple change.\n\n## Acceptance Criteria\n- AC1: one file\n\nTouch \`bin/cli.js\` only.\n`,
  );
  const r = run(process.execPath, [CLASSIFY, specPath, '--output-dir', dir]);
  const outPath = path.join(dir, `step-00-${slug}.classify.md`);
  assert(r.status === 0, 'testClassifyOutput: classify.cjs exits 0');
  assert(fs.existsSync(outPath), 'testClassifyOutput: writes classify.md');
  const md = read(outPath);
  assert(
    /recommendedPipeline:\s*(lite|standard)/.test(md),
    'testClassifyOutput: frontmatter has recommendedPipeline',
  );
  assert(/## Metrics/.test(md) && /## Threshold comparison/.test(md), 'testClassifyOutput: metrics + thresholds sections');
}

function testClassifyThresholds() {
  const dir = mkTmp('qg-classify-thr-');
  const slug = 'qg-classify-heavy';
  const paths = Array.from({ length: 12 }, (_, i) => `\`.agents/skills/ws-fake/file-${i}.js\``).join(
    '\n',
  );
  const acs = Array.from({ length: 8 }, (_, i) => `- AC${i + 1}: requirement ${i + 1}`).join('\n');
  const specPath = writeMiniSpec(
    dir,
    slug,
    `## Overview\nLarge change.\n\n### Layer: skills\n### Layer: cli\n### Layer: tests\n\n## Acceptance Criteria\n${acs}\n\nFiles:\n${paths}\n`,
  );
  const r = run(process.execPath, [CLASSIFY, specPath, '--output-dir', dir]);
  const out = JSON.parse(
    (r.stdout || '')
      .split('\n')
      .filter((l) => l.trim().startsWith('{'))
      .join('\n')
      .match(/\{[\s\S]*\}/)?.[0] || '{}',
  );
  assert(r.status === 0, 'testClassifyThresholds: exits 0');
  assert(
    out.recommendedPipeline === 'standard' || /recommendedPipeline:\s*standard/.test(read(path.join(dir, `step-00-${slug}.classify.md`))),
    'testClassifyThresholds: over-threshold metrics recommend standard',
  );
}

function testClassifyOverride() {
  const skill = read(CLASSIFY_SKILL);
  assert(
    /Accept recommendation/.test(skill) &&
      /Override to standard/.test(skill) &&
      /Override to lite/.test(skill),
    'testClassifyOverride: SKILL gate options Accept / Override standard / Override lite',
  );
}

// ---------------------------------------------------------------------------
// AC4 — JSONL dual-write
// ---------------------------------------------------------------------------

function testJsonlFieldsLazyDirNoPiiDualWrite() {
  const slug = `qg-jsonl-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-jsonl-'), slug);
  const statePath = writeState(usDir, slug, workflowId);
  const jsonlPath = path.join(usDir, 'telemetry', 'step-00.jsonl');

  assert(!fs.existsSync(path.join(usDir, 'telemetry')), 'testJsonl*: telemetry/ absent before update');

  const r = runPython(UPDATE_STATE, [
    statePath,
    '--step',
    '0',
    '--status',
    'completed',
    '--elapsed',
    '12',
    '--tokens',
    '100:50',
    '--model',
    'test-model',
    '--label',
    'Spec',
    '--gate-choice',
    'advance',
    '--verification-score',
    '8',
    '--fable-verdict',
    'VERIFIED',
    '--errors',
    'leak:user@example.com,ok',
    '--jsonl-out',
    jsonlPath,
  ]);

  assert(r.status === 0, `testJsonl*: update_state exits 0 (${r.stderr || r.stdout || ''})`);
  assert(fs.existsSync(jsonlPath), 'testJsonlLazyDir: creates telemetry/ and jsonl');

  const line = read(jsonlPath).trim().split(/\r?\n/)[0];
  const rec = JSON.parse(line);
  const required = [
    'timestamp',
    'step',
    'label',
    'elapsedSec',
    'promptTokens',
    'completionTokens',
    'filesTouched',
    'model',
    'verificationScore',
    'fableVerdict',
    'gateDecision',
    'errors',
    'bypassed',
  ];
  const missing = required.filter((k) => !(k in rec));
  assert(missing.length === 0, `testJsonlFields: schema keys present (${missing.join(',') || 'all'})`);
  assert(rec.step === 0 && rec.elapsedSec === 12, 'testJsonlFields: step/elapsed values');
  assert(rec.bypassed === false, 'testJsonlFields: bypassed false by default');
  assert(
    Array.isArray(rec.errors) && rec.errors.some((e) => /\[REDACTED\]/.test(String(e))),
    'testJsonlNoPii: email / secret-like content redacted in errors',
  );
  assert(!/@example\.com/.test(line), 'testJsonlNoPii: raw email not written to JSONL');

  const stateAfter = read(statePath);
  assert(
    /telemetry:/.test(stateAfter) && /elapsedSec:\s*12/.test(stateAfter),
    'testJsonlDualWrite: state.md telemetry updated alongside JSONL',
  );
}

// ---------------------------------------------------------------------------
// AC5 — skip-gates / bypass
// ---------------------------------------------------------------------------

function testSkipGatesFlagConfigBanner() {
  const setup = read(SETUP_MD);
  const example = JSON.parse(read(CONFIG_EXAMPLE));
  const ship = read(SHIP_SKILL);

  assert(
    /skip-gates/.test(setup) && /skipQualityGates:\s*true/.test(setup),
    'testSkipGatesFlag: setup.md parses skip-gates → skipQualityGates',
  );
  assert(
    example.invariants && example.invariants.skipQualityGates === false,
    'testSkipGatesConfig: config.json.example invariants.skipQualityGates false',
  );
  assert(
    /\[GATES BYPASSED\]/.test(ship),
    'testSkipGatesBanner: ship skill documents [GATES BYPASSED] banner',
  );
  assert(
    /gate-bypass/.test(read(STEP_DISPATCH)),
    'testSkipGatesBypassTelemetry: STEP-DISPATCH documents gate-bypass JSONL event',
  );
}

function testBypassSafetyFloor() {
  const ship = read(SHIP_SKILL);
  const prepare = read(PREPARE);
  assert(
    /Safety floor \(never bypassed\)/.test(ship) &&
      /auditVerdictsBlockShip/.test(ship) &&
      /REFUTED/.test(ship),
    'testBypassSafetyFloor: skipQualityGates never bypasses REFUTED + auditVerdictsBlockShip',
  );
  assert(
    /REFUTED still ❌ STOP|REFUTED` still ❌ STOP|do not weaken that gate/i.test(ship + prepare),
    'testBypassSafetyFloor: PREPARE/ship keep REFUTED STOP under bypass',
  );
}

function testSkipGatesBypassedJsonlField() {
  const slug = `qg-bypass-${Date.now()}`;
  const workflowId = `${slug}-wf`;
  const usDir = path.join(mkTmp('qg-bypass-'), slug);
  const statePath = writeState(usDir, slug, workflowId);
  const jsonlPath = path.join(usDir, 'telemetry', 'step-00.jsonl');

  const r = runPython(UPDATE_STATE, [
    statePath,
    '--step',
    '0',
    '--status',
    'completed',
    '--elapsed',
    '3',
    '--jsonl-out',
    jsonlPath,
    '--bypassed',
  ]);
  assert(r.status === 0, 'testSkipGatesBypassTelemetry: update_state --bypassed exits 0');
  const lines = read(jsonlPath)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  const stepRec = lines.find((rec) => rec.bypassed === true && rec.type !== 'gate-bypass');
  const typed = lines.find((rec) => rec.type === 'gate-bypass');
  assert(Boolean(stepRec), 'testSkipGatesBypassTelemetry: JSONL records bypassed true');
  assert(
    typed &&
      typed.gate === 'quality-gates' &&
      typed.reason === 'skip-gates' &&
      typed.timestamp,
    'testSkipGatesBypassTelemetry: emits typed gate-bypass JSONL event',
  );

  const agg = require('../bin/generate-telemetry-aggregate.cjs');
  const acc = agg.createAccumulator();
  for (const rec of lines) agg.ingestJsonlRecord(acc, rec);
  const out = agg.finalizeAggregate(acc);
  assert(
    out.gateBypassCount === 1,
    'testSkipGatesBypassTelemetry: aggregate counts typed + bypassed once (dedupe)',
  );
}

// ---------------------------------------------------------------------------
// AC6 — Pass 1 / score distribution
// ---------------------------------------------------------------------------

function testClassifierPass1Scores() {
  const dir = mkTmp('qg-pass1-');
  const slug = 'qg-pass1-deferred';
  const specPath = writeMiniSpec(
    dir,
    slug,
    `## Overview\nTiny.\n\n## Acceptance Criteria\n- AC1: done\n`,
  );
  const r = run(process.execPath, [CLASSIFY, specPath, '--output-dir', dir]);
  const md = read(path.join(dir, `step-00-${slug}.classify.md`));
  assert(r.status === 0, 'testClassifierPass1Scores: classify without scores exits 0');
  assert(
    /deferred \(Pass 1 scores unavailable/i.test(md) ||
      /not applicable \(`scoreAndRefine` disabled/i.test(md),
    'testClassifierPass1Scores: deferred or N/A when no --score-analysis',
  );
}

function testScoreDistributionImpact() {
  const dir = mkTmp('qg-score-dist-');
  const slug = 'qg-score-flip';
  const specPath = writeMiniSpec(
    dir,
    slug,
    `## Overview\nBorderline lite.\n\n## Acceptance Criteria\n- AC1: a\n- AC2: b\n- AC3: c\n\nFiles: \`a.js\` \`b.js\`\n`,
  );
  const analysisPath = path.join(dir, `step-05-${slug}.score-analysis.md`);
  fs.writeFileSync(
    analysisPath,
    `# Score analysis\n\n| Task | Score |\n|------|-------|\n| T1 | 4 |\n| T2 | 5 |\n| T3 | 9 |\n| T4 | 3 |\n`,
    'utf8',
  );
  const r = run(process.execPath, [
    CLASSIFY,
    specPath,
    '--output-dir',
    dir,
    '--score-analysis',
    analysisPath,
  ]);
  const md = read(path.join(dir, `step-00-${slug}.classify.md`));
  assert(r.status === 0, 'testScoreDistributionImpact: classify with scores exits 0');
  assert(
    /Pass 1 score distribution/.test(md) && /Variance/.test(md),
    'testScoreDistributionImpact: distribution table present',
  );
  assert(
    /recommendedPipeline:\s*standard/.test(md) ||
      /bias toward standard/i.test(md) ||
      /high variance/i.test(md),
    'testScoreDistributionImpact: high variance / low scores bias standard',
  );
}

// ---------------------------------------------------------------------------
// AC7 — Aggregate
// ---------------------------------------------------------------------------

function testAggregateFieldsRetroactiveIdempotent() {
  const agg = require('../bin/generate-telemetry-aggregate.cjs');
  const plansDir = mkTmp('qg-agg-');
  const wfDir = path.join(plansDir, 'qg-agg-demo');
  fs.mkdirSync(wfDir, { recursive: true });
  fs.writeFileSync(
    path.join(wfDir, 'qg-agg-demo.state.md'),
    `---
workflowId: qg-agg-demo
status: completed
currentStep: 9
us: null
telemetry:
  totalElapsedSec: 100
  steps:
    - { N: 5, verificationScore: 8, fableVerdict: VERIFIED }
    - { N: 6, verificationScore: 7, fableVerdict: REFUTED }
---
# demo
`,
    'utf8',
  );
  const telDir = path.join(wfDir, 'telemetry');
  fs.mkdirSync(telDir, { recursive: true });
  fs.writeFileSync(
    path.join(telDir, 'bypass.jsonl'),
    `${JSON.stringify({ type: 'gate-bypass', gate: 'pre-advance', reason: 'skip-gates', timestamp: '2026-07-28T00:00:00Z' })}\n`,
    'utf8',
  );

  const acc = agg.createAccumulator();
  agg.ingestStateFile(acc, path.join(wfDir, 'qg-agg-demo.state.md'));
  const jsonlLine = read(path.join(telDir, 'bypass.jsonl')).trim();
  agg.ingestJsonlRecord(acc, JSON.parse(jsonlLine));

  const first = agg.finalizeAggregate(acc);
  const second = agg.finalizeAggregate(acc);

  const required = [
    'totalWorkflows',
    'completedWorkflows',
    'averageElapsedSec',
    'averageVerificationScore',
    'fableVerdictDistribution',
    'gateBypassCount',
    'errorTypeDistribution',
  ];
  const missing = required.filter((k) => !(k in first));
  assert(missing.length === 0, `testAggregateFields: keys present (${missing.join(',') || 'all'})`);
  assert(first.totalWorkflows === 1 && first.completedWorkflows === 1, 'testAggregateRetroactive: counts completed state');
  assert(first.gateBypassCount === 1, 'testAggregateRetroactive: merges gate-bypass JSONL');
  assert(
    first.fableVerdictDistribution && typeof first.fableVerdictDistribution === 'object',
    'testAggregateFields: fableVerdictDistribution is a map',
  );
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    'testAggregateIdempotent: finalizeAggregate stable for same accumulator',
  );

  // Second full ingest cycle (simulate regenerate) stays stable
  const acc2 = agg.createAccumulator();
  agg.ingestStateFile(acc2, path.join(wfDir, 'qg-agg-demo.state.md'));
  agg.ingestJsonlRecord(acc2, JSON.parse(jsonlLine));
  const regenerated = agg.finalizeAggregate(acc2);
  assert(
    JSON.stringify(regenerated) === JSON.stringify(first),
    'testAggregateIdempotent: full re-ingest reproduces aggregate',
  );

  // W2 — same scores in state + JSONL must not double-count
  const plansDir2 = mkTmp('qg-agg-dedupe-');
  const wfDir2 = path.join(plansDir2, 'qg-dedupe');
  fs.mkdirSync(path.join(wfDir2, 'telemetry'), { recursive: true });
  fs.writeFileSync(
    path.join(wfDir2, 'qg-dedupe.state.md'),
    `---
workflowId: qg-dedupe
status: completed
us: null
telemetry:
  totalElapsedSec: 50
  steps:
    - { N: 5, verificationScore: 8, fableVerdict: VERIFIED }
---
# dedupe
`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(wfDir2, 'telemetry', 'step-05.jsonl'),
    `${JSON.stringify({
      timestamp: '2026-07-28T01:00:00Z',
      step: 5,
      verificationScore: 8,
      fableVerdict: 'VERIFIED',
      bypassed: false,
    })}\n`,
    'utf8',
  );
  const acc3 = agg.createAccumulator();
  agg.ingestStateFile(acc3, path.join(wfDir2, 'qg-dedupe.state.md'));
  agg.ingestJsonlFiles(acc3, plansDir2);
  const deduped = agg.finalizeAggregate(acc3);
  assert(
    deduped.averageVerificationScore === 8 &&
      deduped.fableVerdictDistribution.VERIFIED === 1,
    'testAggregateNoDoubleCount: state+JSONL same score counts once',
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

console.log('============================================================');
console.log('  Quality Gates — Integration Test Suite (T16)');
console.log('============================================================');

try {
  console.log('\n[AC1] Fable PREPARE board');
  testFableRowExists();
  testFableRefutedBlocks();

  console.log('\n[AC2] Pre-advance CI validation');
  testCheckpointTagMissing();
  testCheckpointTagValid();
  testCheckpointDryRunSoftPass();
  testArtifactsMissing();
  testArtifactsExist();
  testMonotonicityGap();
  testMonotonicityValid();
  testPreAdvanceHS5();

  console.log('\n[AC3] Complexity classifier');
  testClassifyOutput();
  testClassifyThresholds();
  testClassifyOverride();

  console.log('\n[AC4] JSONL telemetry');
  testJsonlFieldsLazyDirNoPiiDualWrite();

  console.log('\n[AC5] Gate bypass');
  testSkipGatesFlagConfigBanner();
  testBypassSafetyFloor();
  testSkipGatesBypassedJsonlField();

  console.log('\n[AC6] scoreAndRefine / Pass 1');
  testClassifierPass1Scores();
  testScoreDistributionImpact();

  console.log('\n[AC7] Aggregate telemetry');
  testAggregateFieldsRetroactiveIdempotent();
} finally {
  cleanup();
}

console.log('\n------------------------------------------------------------');
if (failures > 0) {
  console.error(`FAILED: ${failures} assertion(s)`);
  process.exit(1);
}
console.log('All quality-gates tests passed.');
process.exit(0);
