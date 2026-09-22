/**
 * us-401 ownership-scoped git contract — regression test (AC7).
 *
 * Asserts:
 *  1. Every workflow commit recipe stages only explicit paths (no broad
 *     staging form in any executable recipe block of the contract surface).
 *  2. No shipped executable recipe authorizes a destructive whole-tree verb.
 *  3. The canonical contract is referenced by the orchestrators (AC6).
 *  4. refresh_baseline.cjs: idempotent refresh, foreign-path STOP, and
 *     byte-identical foreign paths (AC3/AC4/AC5).
 *
 * Scope guard (spec Notes): the forbidden-verb scan covers executable recipes
 * only — fenced command blocks in the touched docs plus .cjs sources — never
 * narrative prose that documents the forbidden list.
 */
import cp from 'child_process';
import utils from './harness-test-utils.cjs';

const { assert, fs, path, repoRoot, temp, run, write } = utils;

const DOCS = [
  '.agents/skills/ws-shared/runtime/git-ownership.md',
  '.agents/skills/ws-shared/runtime/setup.md',
  '.agents/skills/ws-shared/runtime/gates.md',
  '.agents/skills/ws-shared/runtime/tools.md',
  '.agents/skills/ws-spec-to-pr/PROTOCOLS.md',
  '.agents/skills/ws-fix-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr-lite/SKILL.md',
  '.agents/skills/ws-spec-multi/PROTOCOL.md',
];

const SCRIPTS = [
  '.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs',
  '.agents/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs',
  '.agents/skills/ws-spec-to-pr/scripts/commit_g2_code.cjs',
];

function fencedBlocks(markdown) {
  const blocks = [];
  const re = /```[^\n]*\n([\s\S]*?)```/g;
  let match;
  while ((match = re.exec(markdown)) !== null) blocks.push(match[1]);
  return blocks;
}

// Broad staging forms: `git add -A`, `git add .`, bare `git add -u`
// (without the allowed `--` path separator), and directory-wide adds.
const BROAD_STAGING = [
  /git add -A/,
  /git add \.(?:\s|$)/,
  /git add -u(?! --)(?:\s|$)/,
  /git add (?!-|-- )[\w~][^\s`]*\//,
];

const DESTRUCTIVE = [
  /git reset --hard/,
  /git checkout -- \./,
  /git restore \.(?:\s|$)/,
  /git clean -fd/,
  /git stash(?:\s|$)/,
  /git push (?:--force|-f)\b/,
];

// 1 + 2. Executable recipes across the contract surface.
const recipeText = DOCS
  .map((rel) => fencedBlocks(fs.readFileSync(path.join(repoRoot, rel), 'utf8')).join('\n'))
  .join('\n');
const scriptText = SCRIPTS
  .map((rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8'))
  .join('\n');

for (const pattern of BROAD_STAGING) {
  assert.ok(!pattern.test(recipeText), `broad staging in a recipe block: ${pattern}`);
  assert.ok(!pattern.test(scriptText), `broad staging in a helper source: ${pattern}`);
}
for (const pattern of DESTRUCTIVE) {
  assert.ok(!pattern.test(recipeText), `destructive verb in a recipe block: ${pattern}`);
  assert.ok(!pattern.test(scriptText), `destructive verb in a helper source: ${pattern}`);
}

// The retired stash-all bootstrap recipe must be gone.
const setup = fs.readFileSync(path.join(repoRoot, '.agents/skills/ws-shared/runtime/setup.md'), 'utf8');
assert.ok(!/Stash then continue/.test(setup), 'stash-all gate option removed');
assert.ok(!/git stash push/.test(setup), 'no stash-all call site in setup.md');

// 3. AC6: canonical contract referenced by every orchestrator surface.
const SELF = '.agents/skills/ws-shared/runtime/git-ownership.md';
for (const rel of DOCS.filter((doc) => doc !== SELF)) {
  const body = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
  assert.ok(body.includes('git-ownership.md'), `${rel} references the canonical contract`);
}
const canon = fs.readFileSync(path.join(repoRoot, SELF), 'utf8');
assert.ok(canon.includes('forbidden') && canon.includes('baseline'),
  'canonical contract documents the forbidden verbs and baseline advancement');

// AC5: baseline fields declared in the state schema.
const schema = JSON.parse(fs.readFileSync(
  path.join(repoRoot, '.agents/skills/ws-shared/runtime/workflow-state.schema.json'), 'utf8'));
assert.ok(schema.properties.baselineCommit, 'schema declares baselineCommit');
assert.ok(schema.properties.baselineSourceRef, 'schema declares baselineSourceRef');

// 4. Behavioral: refresh_baseline.cjs in a temp git repo.
const refresh = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/refresh_baseline.cjs');
const work = temp('ws-git-ownership-');
function git(args, cwd = work) {
  const result = cp.spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, `git ${args.join(' ')}: ${result.stderr}`);
  return (result.stdout || '').trim();
}
git(['init', '-q']);
git(['config', 'user.email', 'test@example.com']);
git(['config', 'user.name', 'test']);
git(['checkout', '-q', '-b', 'base']);
write(path.join(work, 'own.txt'), 'own v1\n');
write(path.join(work, 'foreign.txt'), 'foreign v1\n');
git(['add', '--', 'own.txt', 'foreign.txt']);
git(['commit', '-qm', 'initial']);
const baseline = git(['rev-parse', 'HEAD']);

const stateRel = 'wf.state.json';
write(path.join(work, stateRel), JSON.stringify({
  stateVersion: 3,
  revision: 0,
  workflowId: 'wf',
  slug: 'demo',
  workflowType: 'standard',
  status: 'active',
  currentStep: 4,
  completedSteps: [0, 1, 2, 3],
  skippedSteps: [],
  baselineCommit: baseline,
  baselineSourceRef: 'base (local tip)',
  preExistingDirty: ['foreign.txt'],
  workflowManifest: { created: [], modified: ['own.txt'], deleted: [] },
}));

// Another writer's uncommitted dirt sits on the foreign path while an
// unrelated path advances upstream → refresh succeeds, foreign bytes identical.
write(path.join(work, 'foreign.txt'), 'foreign local dirt\n');
write(path.join(work, 'unrelated.txt'), 'new upstream file\n');
git(['add', '--', 'unrelated.txt']);
git(['commit', '-qm', 'upstream unrelated change']);
const tip = git(['rev-parse', 'base']);
const refreshed = run(refresh, ['--state', stateRel, '--base-ref', 'base', '--no-fetch', '--repo', work]);
assert.strictEqual(refreshed.status, 0, `refresh succeeds: ${refreshed.stderr}`);
const payload = JSON.parse(refreshed.stdout);
assert.strictEqual(payload.baselineCommit, tip, 'baseline advances to the new tip');
assert.strictEqual(payload.baselineSourceRef, 'base', 'source ref recorded');
assert.strictEqual(
  JSON.parse(fs.readFileSync(path.join(work, stateRel), 'utf8')).baselineCommit,
  tip,
  'state persists the new baseline',
);
assert.strictEqual(fs.readFileSync(path.join(work, 'foreign.txt'), 'utf8'), 'foreign local dirt\n',
  'foreign dirty path stays byte-identical');

// No new upstream commits → idempotent no-op (no state churn).
const rerun = run(refresh, ['--state', stateRel, '--base-ref', 'base', '--no-fetch', '--repo', work]);
assert.strictEqual(rerun.status, 0, `idempotent refresh: ${rerun.stderr}`);
assert.strictEqual(JSON.parse(rerun.stdout).unchanged, true, 'second refresh is a no-op');

// Foreign path changes upstream → STOP (exit 2), state untouched.
write(path.join(work, 'foreign.txt'), 'foreign v2 upstream\n');
git(['add', '--', 'foreign.txt']);
git(['commit', '-qm', 'upstream foreign change']);
const before = fs.readFileSync(path.join(work, stateRel), 'utf8');
const stopped = run(refresh, ['--state', stateRel, '--base-ref', 'base', '--no-fetch', '--repo', work]);
assert.strictEqual(stopped.status, 2, `foreign overlap STOPs: ${stopped.stderr}${stopped.stdout}`);
assert.ok(JSON.parse(stopped.stdout).overlapping.includes('foreign.txt'), 'overlap names foreign.txt');
assert.strictEqual(fs.readFileSync(path.join(work, stateRel), 'utf8'), before, 'STOP leaves state untouched');

// Remote-qualified base ref → reintegrate uses short branch name, not origin/origin/base.
git(['update-ref', 'refs/remotes/origin/base', git(['rev-parse', 'base'], work)]);
write(path.join(work, stateRel), JSON.stringify({
  stateVersion: 3,
  revision: 0,
  workflowId: 'wf',
  slug: 'demo',
  workflowType: 'standard',
  status: 'active',
  currentStep: 4,
  completedSteps: [0, 1, 2, 3],
  skippedSteps: [],
  baselineCommit: baseline,
  baselineSourceRef: 'origin/base',
  preExistingDirty: [],
  workflowManifest: { created: [], modified: ['own.txt'], deleted: [] },
}));
const remoteTip = git(['rev-parse', 'origin/base'], work);
const remoteRefresh = run(refresh, ['--state', stateRel, '--base-ref', 'origin/base', '--no-fetch', '--repo', work]);
assert.strictEqual(remoteRefresh.status, 0, `remote-qualified refresh: ${remoteRefresh.stderr}`);
const remotePayload = JSON.parse(remoteRefresh.stdout);
assert.strictEqual(
  remotePayload.reintegrate,
  `git fetch origin base && git rebase ${remoteTip}`,
  'reintegrate strips remote prefix from base ref',
);

// Rewritten base (non-ancestor tip) → hard failure, state untouched.
git(['checkout', '-q', 'base']);
git(['checkout', '--orphan', 'rewritten', '-q']);
write(path.join(work, 'orphan.txt'), 'orphan\n');
git(['add', '--', 'orphan.txt']);
git(['commit', '-qm', 'orphan root']);
const rewrittenTip = git(['rev-parse', 'HEAD'], work);
git(['update-ref', 'refs/remotes/origin/rewritten', rewrittenTip]);
const beforeRewrite = fs.readFileSync(path.join(work, stateRel), 'utf8');
const regressed = run(refresh, ['--state', stateRel, '--base-ref', 'origin/rewritten', '--no-fetch', '--repo', work]);
assert.strictEqual(regressed.status, 1, `non-ancestor base fails: ${regressed.stderr}`);
assert.match(regressed.stderr, /did not advance from baseline/, 'reports non-forward base movement');
assert.strictEqual(fs.readFileSync(path.join(work, stateRel), 'utf8'), beforeRewrite, 'non-ancestor failure leaves state untouched');

console.log('git-ownership contract OK');
