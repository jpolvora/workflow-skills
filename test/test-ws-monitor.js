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
const {
  parseArgs,
  classifyWorkflow,
  classifyMultiSpecWorkflow,
  parseMultiSpecTable,
  queryMemoryVault,
  resolveCandidateTranscriptRoots,
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
write(path.join(transcripts, 'agent.jsonl'), `wf-monitor ${slug}: ENOENT while loading build_dispatch_context; unsupported model id\n`);
write(path.join(transcripts, 'unrelated.jsonl'), 'unrelated-history: ENOENT while loading build_dispatch_context; unsupported model id\n');

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
const hybridFindings = report.findings.filter((finding) => finding.code === 'hybrid-path-resolution');
if (hybridFindings.some((finding) => finding.evidence.some((e) => e.includes('unrelated.jsonl')))) {
  throw new Error('monitor leaked unrelated transcript finding into scoped report');
}
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

const wfFilteredResult = run([
  '--repo-root',
  root,
  '--workflow-id',
  'wf-markdown',
  '--transcript-root',
  transcripts,
  '--json',
], root);
if (wfFilteredResult.status !== 0) {
  throw new Error(wfFilteredResult.stderr || wfFilteredResult.stdout);
}
const wfFilteredReport = JSON.parse(wfFilteredResult.stdout);
if (wfFilteredReport.findings.some((f) => f.code === 'hybrid-path-resolution')) {
  throw new Error('monitor reported transcript failure for unrelated workflow-id');
}

const wfMatchResult = run([
  '--repo-root',
  root,
  '--workflow-id',
  'wf-monitor',
  '--transcript-root',
  transcripts,
  '--json',
], root);
if (wfMatchResult.status !== 0) {
  throw new Error(wfMatchResult.stderr || wfMatchResult.stdout);
}
const wfMatchReport = JSON.parse(wfMatchResult.stdout);
if (!wfMatchReport.findings.some((f) => f.code === 'hybrid-path-resolution')) {
  throw new Error('monitor failed to detect transcript failure when filtering by matching workflow-id');
}

const combinedMismatchResult = run([
  '--repo-root',
  root,
  '--workflow-id',
  'wf-markdown',
  '--slug',
  slug,
  '--transcript-root',
  transcripts,
  '--json',
], root);
if (combinedMismatchResult.status !== 0) {
  throw new Error(combinedMismatchResult.stderr || combinedMismatchResult.stdout);
}
const combinedMismatchReport = JSON.parse(combinedMismatchResult.stdout);
if (combinedMismatchReport.findings.some((f) => f.code === 'hybrid-path-resolution')) {
  throw new Error('monitor leaked transcript when workflowId and slug did not both match');
}

// Test dispatch provenance: healthy embed-inline when no named binding
const healthyGenericFindings = classifyWorkflow(
  {
    slug: 'prov-healthy',
    currentStep: 4,
    verificationScore: 9,
    hostBinding: { subagentTool: 'Task', supportsNamedAgents: false },
    stepDispatches: [{ step: 4, agentType: 'generic:Task' }],
  },
  root,
  { events: [], errors: [] },
  9,
  root,
  { defaults: { specializedSubagents: { enabled: true } } },
);
if (healthyGenericFindings.some((f) => f.code === 'generic-dispatch')) {
  throw new Error('monitor incorrectly flagged generic-dispatch when host lacks named agent binding');
}

// Test dispatch provenance: warning when named binding exists but generic dispatch used
const warnGenericFindings = classifyWorkflow(
  {
    slug: 'prov-warn',
    currentStep: 4,
    verificationScore: 9,
    hostBinding: { subagentTool: 'Task', supportsNamedAgents: true },
    stepDispatches: [{ step: 4, agentType: 'generic:Task' }],
  },
  root,
  { events: [], errors: [] },
  9,
  root,
  { defaults: { specializedSubagents: { enabled: true } } },
);
if (!warnGenericFindings.some((f) => f.code === 'generic-dispatch')) {
  throw new Error('monitor failed to flag generic-dispatch when host has named agent binding');
}

// Test dispatch provenance: healthy when named dispatch is used
const namedFindings = classifyWorkflow(
  {
    slug: 'prov-named',
    currentStep: 4,
    verificationScore: 9,
    hostBinding: { subagentTool: 'Task', supportsNamedAgents: true },
    stepDispatches: [{ step: 4, agentType: 'named:ws-step-04-implement-tasks' }],
  },
  root,
  { events: [], errors: [] },
  9,
  root,
  { defaults: { specializedSubagents: { enabled: true } } },
);
if (namedFindings.some((f) => f.code === 'generic-dispatch')) {
  throw new Error('monitor incorrectly flagged generic-dispatch when named dispatch was used');
}
// Test parseMultiSpecTable helper
const sampleTable = `
| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |
|---|------|----------|----------|--------|----------|-------|--------|-----------|
| 1 | 01-first | .agents/specs/01.spec.md | lite | shipped | #101 | https://pr/101 | | 2026-09-11T12:00:00Z |
| 2 | 02-second | .agents/specs/02.spec.md | standard | in_progress | | | | 2026-09-11T12:30:00Z |
| 3 | 03-third | .agents/specs/03.spec.md | standard | failed | | | build failure | 2026-09-11T12:45:00Z |
`;
const parsedItems = parseMultiSpecTable(sampleTable);
if (parsedItems.length !== 3) {
  throw new Error(`expected 3 parsed multi-spec items, got ${parsedItems.length}`);
}
if (parsedItems[0].slug !== '01-first' || parsedItems[0].status !== 'shipped' || parsedItems[0].prNumber !== '#101') {
  throw new Error('parseMultiSpecTable parsed item 0 incorrectly');
}
if (parsedItems[1].slug !== '02-second' || parsedItems[1].status !== 'in_progress') {
  throw new Error('parseMultiSpecTable parsed item 1 incorrectly');
}
if (parsedItems[2].slug !== '03-third' || parsedItems[2].status !== 'failed' || parsedItems[2].reason !== 'build failure') {
  throw new Error('parseMultiSpecTable parsed item 2 incorrectly');
}

// Test classifyMultiSpecWorkflow findings
const multiSpecFindings = classifyMultiSpecWorkflow(
  {
    runId: 'ms-test',
    status: 'active',
    items: parsedItems,
  },
  'path/to/ms-test.state.md',
  root,
);
if (!multiSpecFindings.some((f) => f.code === 'multi-spec-failed-item' && f.message.includes('03-third'))) {
  throw new Error('classifyMultiSpecWorkflow failed to flag multi-spec-failed-item');
}

// Write multi-spec batch state file in root to test end-to-end snapshot discovery
const multiSpecDir = path.join(root, '.agents', 'plans', 'ws-spec-multi');
write(
  path.join(multiSpecDir, 'ms-20260911T120000Z.state.md'),
  `---
workflowType: ws-spec-multi
runId: ms-20260911T120000Z
status: active
baseBranch: main
dryRun: false
---

# Multi-spec Runner — ms-20260911T120000Z

| # | slug | specPath | flowMode | status | prNumber | prUrl | reason | updatedAt |
|---|------|----------|----------|--------|----------|-------|--------|-----------|
| 1 | multi-first | .agents/specs/multi-first.spec.md | lite | shipped | #42 | https://github.com/org/repo/pull/42 | | 2026-09-11T12:00:00Z |
| 2 | multi-second | .agents/specs/multi-second.spec.md | standard | in_progress | | | | 2026-09-11T12:30:00Z |
| 3 | multi-third | .agents/specs/multi-third.spec.md | standard | pending | | | | 2026-09-11T12:45:00Z |
`,
);

const multiSnapshotResult = run(['--repo-root', root, '--json'], root);
if (multiSnapshotResult.status !== 0) {
  throw new Error(multiSnapshotResult.stderr || multiSnapshotResult.stdout);
}
const multiReport = JSON.parse(multiSnapshotResult.stdout);
const msWf = multiReport.workflows.find((w) => w.pipeline === 'ws-spec-multi');
if (!msWf) {
  throw new Error('snapshot failed to discover ws-spec-multi batch state file');
}
if (!msWf.multiSpec || msWf.multiSpec.itemCount !== 3) {
  throw new Error(`expected multiSpec with 3 items, got ${JSON.stringify(msWf.multiSpec)}`);
}
if (msWf.multiSpec.activeItem?.slug !== 'multi-second') {
  throw new Error(`expected activeItem to be multi-second, got ${msWf.multiSpec.activeItem?.slug}`);
}
if (msWf.multiSpec.shippedCount !== 1 || msWf.multiSpec.pendingCount !== 1) {
  throw new Error('multiSpec shipped/pending count mismatch');
}

// Test memory vault query helper
const memContext = {
  repoRoot: root,
  sharedDir: path.join(root, '.agents', 'skills', 'ws-shared'),
  config: {
    specMemo: {
      enableMemoryFiles: true,
      enableSpecMemoIntegration: false,
    },
  },
};
write(path.join(memContext.sharedDir, 'memory', 'test-entry.md'), 'Active workflow note for ws-spec run\n');
const vaultResult = queryMemoryVault(memContext);
if (!vaultResult.enabled || vaultResult.backend !== 'local-memory-files') {
  throw new Error(`queryMemoryVault failed to detect local memory backend: ${JSON.stringify(vaultResult)}`);
}
if (vaultResult.records.length === 0) {
  throw new Error('queryMemoryVault failed to scan memory directory');
}

// Test workspace candidate transcript roots auto-discovery
const cursorTranscripts = path.join(root, '.cursor', 'transcripts');
write(path.join(cursorTranscripts, 'session.jsonl'), 'subagent fatal error in step 4\n');
const candidateRoots = resolveCandidateTranscriptRoots({ repoRoot: root, config: {} });
if (!candidateRoots.some((r) => r.includes('.cursor'))) {
  throw new Error('resolveCandidateTranscriptRoots failed to discover workspace .cursor/transcripts');
}

// Test subagent-error transcript finding
const subagentErrResult = run([
  '--repo-root',
  root,
  '--transcript-root',
  cursorTranscripts,
  '--json',
], root);
if (subagentErrResult.status !== 0) {
  throw new Error(subagentErrResult.stderr || subagentErrResult.stdout);
}
const subagentErrReport = JSON.parse(subagentErrResult.stdout);
if (!subagentErrReport.findings.some((f) => f.code === 'subagent-error')) {
  throw new Error('monitor failed to detect subagent-error signal in transcript');
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor: ok');


