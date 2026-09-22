/**
 * us-385: ws-monitor pipeline-aware expected artifacts for lite runs.
 * Run: node test/test-ws-monitor-us385.js
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
const { classifyWorkflow, expectedArtifacts } = require(script);
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

function liteState(overrides = {}) {
  return {
    stateVersion: 3,
    revision: 1,
    workflowId: 'wf-lite-demo',
    slug: 'lite-demo',
    workflowType: 'lite',
    status: 'active',
    currentStep: 5,
    completedSteps: [0, 1, 2, 3, 4],
    skippedSteps: [],
    verificationScore: 9,
    stepStatus: { 4: 'completed' },
    ...overrides,
  };
}

const LITE_ARTIFACTS = [
  'step-00-lite-demo.spec.md',
  'step-01-lite-demo.plan.md',
  'step-06-lite-demo.review.md',
  'step-08-lite-demo.result.md',
];

const STANDARD_ONLY = [
  'step-02-lite-demo.plan-interview.md',
  'step-02-lite-demo.plan.refined.md',
  'step-03-lite-demo.plan.exec.md',
  'step-05-lite-demo.plan.report.md',
];

function makeRoot(withArtifacts = LITE_ARTIFACTS) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us385-'));
  tempRoots.push(root);
  const dir = path.join(root, '.agents', 'plans', 'lite-demo');
  write(
    path.join(root, '.ws/config.json'),
    JSON.stringify({
      project: { name: 'us385-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    }),
  );
  write(path.join(dir, 'wf-lite-demo.state.json'), JSON.stringify(liteState()));
  for (const artifact of withArtifacts) {
    write(path.join(dir, artifact), 'artifact\n');
  }
  return { root, dir };
}

// AC2: a green lite run at currentStep 5 with steps 0-4 completed yields zero
// missing-artifact and zero missing-exec-artifact findings.
{
  const { root, dir } = makeRoot();
  const findings = classifyWorkflow(liteState(), dir, { events: [], errors: [] }, 9, root);
  const missing = findings.filter((f) => f.code === 'missing-artifact' || f.code === 'missing-exec-artifact');
  if (missing.length !== 0) {
    throw new Error(`us-385 AC2: green lite run reported missing artifacts: ${missing.map((f) => f.message).join('; ')}`);
  }
}

// AC3 + AC5: the lite contract excludes the four standard-only names and
// expects only artifacts the lite pipeline actually writes.
{
  const { dir } = makeRoot([]);
  const names = expectedArtifacts(liteState(), dir, 9, dir).map((a) => a.name);
  for (const banned of STANDARD_ONLY) {
    if (names.includes(banned)) throw new Error(`us-385 AC3: lite contract expects standard-only ${banned}`);
  }
  const expected = new Set(LITE_ARTIFACTS);
  for (const name of names) {
    if (!expected.has(name)) throw new Error(`us-385 AC5: lite contract expects non-lite artifact ${name}`);
  }
}

// AC4: a lite run whose genuinely required artifact is absent still raises critical.
{
  const { root, dir } = makeRoot(LITE_ARTIFACTS.filter((a) => a !== 'step-01-lite-demo.plan.md'));
  const findings = classifyWorkflow(liteState(), dir, { events: [], errors: [] }, 9, root);
  const hit = findings.find((f) => f.severity === 'critical' && f.code === 'missing-artifact'
    && f.message.includes('step-01-lite-demo.plan.md'));
  if (!hit) throw new Error('us-385 AC4: absent lite step-01 plan did not raise critical missing-artifact');
}

// AC6: standard workflows produce the same findings as before the change.
{
  const { root, dir } = makeRoot([]);
  const standard = liteState({ workflowId: 'wf-standard-demo', workflowType: 'standard', currentStep: 6, completedSteps: [0, 1, 2, 3, 4, 5] });
  const findings = classifyWorkflow(standard, dir, { events: [], errors: [] }, 9, root);
  const codes = new Set(findings.map((f) => f.code));
  if (!codes.has('missing-artifact')) throw new Error('us-385 AC6: standard run lost its missing-artifact findings');
  if (!codes.has('missing-exec-artifact')) throw new Error('us-385 AC6: standard run lost its missing-exec-artifact finding');
  const names = findings.map((f) => f.message);
  for (const want of ['step-02-lite-demo.plan-interview.md', 'step-03-lite-demo.plan.exec.md', 'step-05-lite-demo.plan.report.md']) {
    if (!names.some((m) => m.includes(want))) throw new Error(`us-385 AC6: standard run no longer flags ${want}`);
  }
  // Unknown/legacy pipeline values keep the standard contract.
  const legacy = classifyWorkflow(
    liteState({ workflowId: 'wf-legacy-demo', workflowType: undefined, currentStep: 6, completedSteps: [0, 1, 2, 3, 4, 5] }),
    dir, { events: [], errors: [] }, 9, root,
  );
  if (!legacy.some((f) => f.code === 'missing-exec-artifact')) {
    throw new Error('us-385 AC6: unknown pipeline did not fall back to the standard contract');
  }
}

// AC7 + AC8: unfiltered CLI snapshot through close asserts zero missing
// findings for the lite slug, including the four listed criticals.
{
  const { root, dir } = makeRoot();
  write(
    path.join(dir, 'telemetry.jsonl'),
    [
      { type: 'dispatch', step: 2, pipeline: 'lite', packageVersion: '0.4.52', filesTouched: { created: ['src/lite.js'], modified: [], deleted: [] } },
      { type: 'finish', step: 2, pipeline: 'lite', packageVersion: '0.4.52', filesTouched: { created: ['src/lite.js'], modified: [], deleted: [] } },
      { type: 'finish', step: 4, pipeline: 'lite', packageVersion: '0.4.52', filesTouched: { created: ['step-08-lite-demo.result.md'], modified: [], deleted: [] } },
    ].map((e) => JSON.stringify(e)).join('\n').concat('\n'),
  );
  const result = run(['--repo-root', root, '--json'], root);
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  const missing = report.findings.filter((f) => f.code === 'missing-artifact' || f.code === 'missing-exec-artifact');
  if (missing.length !== 0) {
    throw new Error(`us-385 AC7/AC8: snapshot reported lite missing artifacts: ${missing.map((f) => f.message).join('; ')}`);
  }
  for (const banned of STANDARD_ONLY) {
    if (report.findings.some((f) => f.message.includes(banned))) {
      throw new Error(`us-385 AC7: snapshot still contains critical for ${banned}`);
    }
  }
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
console.log('us-385 monitor lite-contract ok');
