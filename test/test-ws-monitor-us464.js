/**
 * us-464: slug-scoped ws-monitor discovery must select on the state-derived slug,
 * independent of the plan folder name and the state-file layout (slug-named
 * folder, canonical runId folder, legacy flat file).
 * Run: node test/test-ws-monitor-us464.js
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
const { stateDerivedSlug, stateFileMatchesSlug } = require(script);
const tempRoots = [];

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env },
  });
}

function config(root) {
  writeJson(
    path.join(root, '.ws/config.json'),
    {
      project: { name: 'us464-test', baseBranch: 'main' },
      plans: { dir: '.agents/plans' },
      verification: {},
      defaults: { minVerifyScore: 9 },
    },
  );
}

function multiStateMarkdown(runId) {
  return `---
workflowType: ws-spec-multi
runId: ${runId}
status: completed
baseBranch: main
dryRun: false
createdAt: "2026-09-29T00:00:00Z"
updatedAt: "2026-09-29T00:00:00Z"
specsDir: .agents/specs
---

# Multi-spec Runner — ${runId}
`;
}

// A canonical ws-spec-multi batch state carries no `slug`; the workflow record
// reports the fallback `ws-spec-multi`.
function canonicalState(runId) {
  return {
    stateVersion: 3,
    revision: 1,
    workflowId: runId,
    runId,
    workflowType: 'ws-spec-multi',
    status: 'completed',
    currentStep: 8,
    completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    skippedSteps: [],
  };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-monitor-us464-'));
tempRoots.push(root);
config(root);
const plans = path.join(root, '.agents', 'plans');

// AC3: canonical runId-folder batch layout, no slug frontmatter.
const canonicalRunId = 'ms-20260929T185153Z';
writeJson(path.join(plans, canonicalRunId, `${canonicalRunId}.state.json`), canonicalState(canonicalRunId));

// AC5: legacy flat batch state under the slug-named `ws-spec-multi/` folder.
const legacyRunId = 'ms-20260927T130013Z';
write(path.join(plans, 'ws-spec-multi', `${legacyRunId}.state.md`), multiStateMarkdown(legacyRunId));

// AC4: a standard run stored under a slug-named folder, selected by its own slug.
const slugRun = 'us-700';
writeJson(
  path.join(plans, slugRun, `${slugRun}-20260929T000000Z.state.json`),
  {
    stateVersion: 3,
    revision: 1,
    workflowId: `${slugRun}-20260929T000000Z`,
    slug: slugRun,
    us: 700,
    workflowType: 'standard',
    status: 'completed',
    currentStep: 8,
    completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
    skippedSteps: [],
    verificationScore: 10,
  },
);

// AC2: a standard run whose folder name is NOT its slug; only the state slug matches.
const movedState = {
  stateVersion: 3,
  revision: 1,
  workflowId: 'us-701-20260929T000000Z',
  slug: 'us-701',
  us: 701,
  workflowType: 'standard',
  status: 'completed',
  currentStep: 8,
  completedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  skippedSteps: [],
  verificationScore: 10,
};
writeJson(path.join(plans, 'renamed-folder-xyz', 'us-701-20260929T000000Z.state.json'), movedState);

function snapshot(args) {
  const result = run(['--repo-root', root, ...args, '--json'], root);
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }
  return JSON.parse(result.stdout);
}

// Unit: derived slug mirrors the record derivation.
if (stateDerivedSlug(canonicalState(canonicalRunId), path.join(plans, canonicalRunId, `${canonicalRunId}.state.json`)) !== 'ws-spec-multi') {
  throw new Error('stateDerivedSlug must report ws-spec-multi for a canonical batch state without a slug');
}
if (stateDerivedSlug(movedState, path.join(plans, 'renamed-folder-xyz', 'us-701-20260929T000000Z.state.json')) !== 'us-701') {
  throw new Error('stateDerivedSlug must prefer the state slug over the folder name');
}
if (!stateFileMatchesSlug(canonicalState(canonicalRunId), path.join(plans, canonicalRunId, `${canonicalRunId}.state.json`), 'ws-spec-multi')) {
  throw new Error('stateFileMatchesSlug must select the canonical batch state by derived slug');
}

// AC1/AC3/AC5: `--slug ws-spec-multi` selects both the canonical and legacy batch runs.
// testSlugSelectsCanonicalRunIdRun testSlugSelectsCanonicalLayout testSlugSelectsLegacyFlatFile
const multiScoped = snapshot(['--slug', 'ws-spec-multi']);
if (multiScoped.workflowCount !== 2) {
  throw new Error(`expected 2 ws-spec-multi runs under --slug ws-spec-multi, got ${multiScoped.workflowCount}`);
}
const scopedStatePaths = multiScoped.workflows.map((w) => w.statePath.replaceAll('\\', '/'));
if (!scopedStatePaths.includes(`.agents/plans/${canonicalRunId}/${canonicalRunId}.state.json`)) {
  throw new Error('slug-scoped scan dropped the canonical runId-foldered batch state');
}
if (!scopedStatePaths.includes(`.agents/plans/ws-spec-multi/${legacyRunId}.state.md`)) {
  throw new Error('slug-scoped scan dropped the legacy flat batch state');
}

// AC4/AC2: slug-named folder and folder-name-independent standard runs are selected by state slug.
// testSlugSelectsSlugNamedFolder testSlugIndependentOfFolderName
const slugNamed = snapshot(['--slug', slugRun]);
if (slugNamed.workflowCount !== 1 || slugNamed.workflows[0].slug !== slugRun) {
  throw new Error(`expected the slug-named-folder run selected by --slug ${slugRun}`);
}
const moved = snapshot(['--slug', 'us-701']);
if (moved.workflowCount !== 1 || moved.workflows[0].slug !== 'us-701') {
  throw new Error('slug scope must follow the state slug, not the plan folder name');
}

// AC6: `--workflow-id` returns the matching run regardless of any slug filter.
// testWorkflowIdBypassesSlugFilter
const byId = snapshot(['--workflow-id', canonicalRunId, '--slug', 'totally-unrelated']);
if (byId.workflowCount !== 1 || byId.workflows[0].workflowId !== canonicalRunId) {
  throw new Error('--workflow-id must return the matching run regardless of a slug filter');
}
const byIdPlain = snapshot(['--workflow-id', canonicalRunId]);
if (byIdPlain.workflowCount !== 1) {
  throw new Error('--workflow-id alone must return the canonical run');
}

// AC7: an unmatched slug returns zero, never the unfiltered set.
// testUnmatchedSlugReturnsZero
const unmatched = snapshot(['--slug', 'ghost-does-not-exist']);
if (unmatched.workflowCount !== 0) {
  throw new Error(`unmatched slug must return workflowCount 0, got ${unmatched.workflowCount}`);
}
const unfiltered = snapshot([]);
if (unfiltered.workflowCount < 4) {
  throw new Error(`unfiltered scan should still see every run, got ${unfiltered.workflowCount}`);
}

for (const directory of tempRoots) fs.rmSync(directory, { recursive: true, force: true });
console.log('test-ws-monitor-us464: ok');
