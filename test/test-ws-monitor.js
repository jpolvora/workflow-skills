/**
 * ws-monitor snapshot contract.
 * Run: node test/test-ws-monitor.js
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
const { parseArgs, classifyWorkflow } = require(script);
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

const importProbe = cp.spawnSync(
  process.execPath,
  ['-e', `require(${JSON.stringify(script)}); process.stdout.write('import-ok\\n');`],
  { cwd: repoRoot, encoding: 'utf8', env: { ...process.env } },
);
if (importProbe.status !== 0 || importProbe.stdout.trim() !== 'import-ok') {
  throw new Error(`monitor import has side effects: ${importProbe.stderr || importProbe.stdout}`);
}

function assertMissingValue(args) {
  let error = null;
  try {
    parseArgs(args);
  } catch (caught) {
    error = caught;
  }
  if (!error || error.message !== `${args[0]} requires a value`) {
    throw new Error(`expected ${args[0]} to reject a missing value`);
  }
}

for (const args of [
  ['--iterations'],
  ['--iterations', '--json'],
  ['--interval'],
  ['--transcript-root'],
  ['--repo-root'],
  ['--slug'],
  ['--workflow-id'],
  ['--report'],
]) {
  assertMissingValue(args);
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-'));
tempRoots.push(root);
const slug = 'monitor-demo';
const workflowDir = path.join(root, '.agents', 'plans', slug);
write(
  path.join(root, '.agents/skills/ws-shared/config.json'),
  JSON.stringify({
    project: { name: 'monitor-test', baseBranch: 'main' },
    plans: { dir: '.agents/plans' },
    verification: {},
    defaults: { minVerifyScore: 9 },
  }),
);
write(
  path.join(workflowDir, 'wf-monitor.state.json'),
  JSON.stringify({
    stateVersion: 3,
    revision: 2,
    workflowId: 'wf-monitor',
    slug,
    workflowType: 'standard',
    status: 'active',
    currentStep: 6,
    completedSteps: [0, 1, 2, 3, 4, 5],
    skippedSteps: [],
    verificationScore: 7,
    stepStatus: { '5': 'completed' },
  }),
);
write(
  path.join(workflowDir, 'telemetry.jsonl'),
  `${JSON.stringify({
    type: 'finish',
    step: 4,
    packageVersion: 'unknown',
    filesTouched: { created: [], modified: [], deleted: [] },
  })}\n`,
);
const markdownSlug = 'markdown-demo';
const markdownWorkflowDir = path.join(root, '.agents', 'plans', markdownSlug);
write(
  path.join(markdownWorkflowDir, 'wf-markdown.state.md'),
  `---
stateVersion: 3
revision: 2
workflowId: wf-markdown
slug: ${markdownSlug}
workflowType: standard
status: active
currentStep: 6
completedSteps:
  - 0
  - 1
  - 2
  - 3
  - 4
  - 5
skippedSteps:
  - {step: 2, reason: interview-not-required}
verificationScore: 9
stepStatus: {5: completed}
---
`,
);
for (const artifact of [
  `step-00-${markdownSlug}.spec.md`,
  `step-01-${markdownSlug}.plan.md`,
  `step-03-${markdownSlug}.plan.exec.md`,
  `step-05-${markdownSlug}.plan.report.md`,
]) {
  write(path.join(markdownWorkflowDir, artifact), 'artifact\n');
}
const emptySlug = 'empty-demo';
const emptyWorkflowDir = path.join(root, '.agents', 'plans', emptySlug);
write(
  path.join(emptyWorkflowDir, 'wf-empty.state.json'),
  JSON.stringify({
    stateVersion: 3,
    revision: 1,
    workflowId: 'wf-empty',
    slug: emptySlug,
    workflowType: 'standard',
    status: 'active',
    currentStep: 1,
    completedSteps: [0],
    skippedSteps: [],
    verificationScore: 9,
  }),
);
write(path.join(emptyWorkflowDir, `step-00-${emptySlug}.spec.md`), '');
const transcripts = path.join(root, 'transcripts');
write(path.join(transcripts, 'agent.jsonl'), 'ENOENT while loading build_dispatch_context; unsupported model id\n');

const unboundedWatch = run(['--repo-root', root, '--watch', '--json'], root);
if (unboundedWatch.status === 0 || !unboundedWatch.stderr.includes('--watch requires --iterations <count>')) {
  throw new Error('monitor did not reject unbounded watch mode');
}
for (const [flag, value] of [
  ['--iterations', '0'],
  ['--iterations', 'not-a-number'],
  ['--interval', '0'],
  ['--interval', 'not-a-number'],
]) {
  const invalidNumeric = run(
    [
      '--repo-root',
      root,
      '--watch',
      ...(flag === '--interval' ? ['--iterations', '1'] : []),
      flag,
      value,
      '--json',
    ],
    root,
  );
  if (invalidNumeric.status === 0 || !invalidNumeric.stderr.includes(`${flag} requires a positive integer`)) {
    throw new Error(`monitor did not reject invalid ${flag} value`);
  }
}

const result = run([
  '--repo-root',
  root,
  '--slug',
  slug,
  '--transcript-root',
  transcripts,
  '--report',
  '.agents/plans/monitor-demo/workflow-monitor.report.md',
  '--json',
], root);
if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  process.exit(1);
}
const report = JSON.parse(result.stdout);
const codes = new Set(report.findings.map((finding) => finding.code));
if (!codes.has('missing-artifact')) throw new Error('monitor did not detect missing artifacts');
if (!codes.has('step-drift')) throw new Error('monitor did not detect Step 5 score drift');
if (!codes.has('empty-files-touched')) throw new Error('monitor did not detect empty filesTouched');
if (!codes.has('hybrid-path-resolution')) throw new Error('monitor did not scan transcript path failures');
if (!codes.has('model-fallback')) throw new Error('monitor did not scan rejected models');
const expectedPaths = report.workflows
  .find((workflow) => workflow.slug === slug)
  .expectedArtifacts.map((artifact) => artifact.path.replaceAll('\\', '/'));
if (!expectedPaths.includes(`.agents/plans/${slug}/step-00-${slug}.spec.md`)) {
  throw new Error('monitor did not report expected artifact paths from repository root');
}
if (
  report.findings
    .filter((finding) => finding.code === 'missing-artifact')
    .some((finding) => finding.message.includes('scoreAndRefine'))
) {
  throw new Error('monitor duplicated the score gate as a missing artifact');
}
const scoreDrift = report.findings.find((finding) => finding.code === 'step-drift');
if (!scoreDrift?.evidence.includes(`.agents/plans/${slug}`)) {
  throw new Error('monitor did not report score drift evidence from repository root');
}
const markdownResult = run(['--repo-root', root, '--slug', markdownSlug, '--json'], root);
if (markdownResult.status !== 0) {
  throw new Error(markdownResult.stderr || markdownResult.stdout);
}
const markdownReport = JSON.parse(markdownResult.stdout);
const markdownWorkflow = markdownReport.workflows.find((workflow) => workflow.slug === markdownSlug);
if (!markdownWorkflow || !markdownWorkflow.completedSteps.includes(5)) {
  throw new Error('monitor did not parse multiline markdown state frontmatter');
}
if (markdownWorkflow.findings.some((finding) => finding.code === 'missing-artifact')) {
  throw new Error('monitor reported false missing artifacts for markdown state');
}
const emptyResult = run(['--repo-root', root, '--slug', emptySlug, '--json'], root);
if (emptyResult.status !== 0) {
  throw new Error(emptyResult.stderr || emptyResult.stdout);
}
const emptyReport = JSON.parse(emptyResult.stdout);
if (!emptyReport.findings.some((finding) => finding.code === 'missing-artifact')) {
  throw new Error('monitor treated an empty artifact as present');
}
const legacyFindings = classifyWorkflow(
  { slug: 'legacy-demo', currentStep: 0, verificationScore: 9 },
  root,
  {
    events: [{ type: 'finish', step: 4, filesTouched: ['src/legacy.js'] }],
    errors: [],
  },
  9,
  root,
);
if (legacyFindings.some((finding) => finding.code === 'empty-files-touched')) {
  throw new Error('monitor warned on non-empty legacy filesTouched array');
}
if (!fs.existsSync(path.join(root, '.agents/plans/monitor-demo/workflow-monitor.report.md'))) {
  throw new Error('monitor did not write the explicit report path');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor: ok');
