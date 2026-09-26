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

// Broad staging forms: `git add -A`, `git add --all`, `git add .`, bare
// `git add -u` (without the allowed `--` path separator), and directory-wide
// adds. Terminals accept end-of-string, whitespace, or a shell separator.
const BROAD_STAGING = [
  /git add -A(?:\s|$|;|&|\|)/,
  /git add --all(?:\s|$|;|&|\|)/,
  /git add \.\.?(?:\/|[\s;|&]|$)/,
  /git add -u(?!\s*--)(?:\s|$|;|&|\|)/,
  /git add (?!-|-- )[\w~][^\s`]*\/(?:\s|$|;|&|\|)/,
];

const DESTRUCTIVE = [
  /git reset --hard/,
  /git checkout -- \.(?:\s|$|;|&|\|)/,
  /git restore \.(?:\s|$)/,
  /git clean -fd/,
  /git stash(?!\s+(?:list|show)\b)(?:\s|$)/,
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

// Regression (PR #433 review): the broad-staging detectors must catch the
// whole-tree forms even when terminated by a shell separator or EOL, and add
// `git add --all`, while leaving path-scoped forms allowed.
const BROAD_SAMPLES = [
  'git add -A',
  'git add -A;',
  'git add --all',
  'git add .',
  'git add .;',
  'git add . && git commit',
  'git add ./',
  'git add ..',
  'git add ./*',
  'git add -u',
  'git add -u || true',
  'git add src/',
];
for (const sample of BROAD_SAMPLES) {
  assert.ok(
    BROAD_STAGING.some((pattern) => pattern.test(sample)),
    `detects whole-tree staging: ${sample}`,
  );
}
for (const allowed of ['git add -u -- deleted.txt', 'git add -- own.txt', 'git add .gitignore', 'git add src/Program.cs', 'git add src/app.js']) {
  assert.ok(
    !BROAD_STAGING.some((pattern) => pattern.test(allowed)),
    `path-scoped form stays allowed: ${allowed}`,
  );
}
// Regression (PR #433): destructive matchers must not over-reach on read-only forms.
for (const sample of ['git stash', 'git stash push', 'git stash pop', 'git reset --hard', 'git clean -fd']) {
  assert.ok(
    DESTRUCTIVE.some((pattern) => pattern.test(sample)),
    `detects destructive verb: ${sample}`,
  );
}
for (const allowed of ['git stash list', 'git stash show', 'git status', 'git restore --staged src/app.js']) {
  assert.ok(
    !DESTRUCTIVE.some((pattern) => pattern.test(allowed)),
    `read-only/allowed form stays allowed: ${allowed}`,
  );
}

// Regression (PR #433): the fence scanner must see indented fenced blocks,
// which is how most shipped skill recipes are nested under list items.
{
  const checker = path.join(repoRoot, '.agents', 'skills', 'ws-check-harness', 'scripts', 'check_git_ownership.cjs');
  const scanDir = temp('ws-git-ownership-indent-');
  const skillDir = path.join(scanDir, '.agents', 'skills', 'ws-demo');
  fs.mkdirSync(path.join(skillDir, 'scripts'), { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, 'SKILL.md'),
    '1. Step:\n\n   ```bash\n   git add . && git commit -m x\n   ```\n',
    'utf8',
  );
  const scan = cp.spawnSync(process.execPath, [checker, '--repo-root', scanDir, '--json'], { encoding: 'utf8' });
  const payload = JSON.parse(scan.stdout);
  assert.ok(payload.findings.length >= 1, 'indented fenced recipe is scanned for broad staging');
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

// 5. AC3: compatibility-matrix cross-check (0138).
// Every installed ws-* skill appears exactly once in the §5 matrix; every
// skill a tree-wide scan flags as git-mutating carries that class; curated
// known mutators/writers (narrative recipes the literal scan cannot see)
// carry theirs. Absent rows fail: new skills must add a matrix row.
const MATRIX = (() => {
  const text = fs.readFileSync(path.join(repoRoot, SELF), 'utf8');
  const section = text.split('## 5. Workflow compatibility matrix')[1] || '';
  const rows = new Map();
  for (const match of section.matchAll(/\| `(ws-[a-z0-9-]+)` \| ([^|]+) \|/g)) {
    const id = match[1];
    assert.ok(!rows.has(id), `matrix lists ${id} once`);
    rows.set(id, match[2].trim().split(/\s*,\s*/));
  }
  return rows;
})();
const installedSkills = fs.readdirSync(path.join(repoRoot, '.agents', 'skills'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith('ws-'))
  .map((entry) => entry.name);
for (const id of installedSkills) {
  assert.ok(MATRIX.has(id), `matrix classifies installed skill ${id}`);
}
assert.strictEqual(MATRIX.size, installedSkills.length, 'matrix has no stale rows');

const GIT_FLOOR = [
  /git add --/, /git commit/, /git push(?! --dry-run)/, /git checkout -b/,
  /git checkout (?!--|-[a-z]+\b)[A-Za-z0-9_./-]+/, /git mv/, /git rebase/, /git merge/,
  /git apply/, /git worktree (add|remove)/, /git tag/,
  /git branch (?!--|-?[a-z]*l\b|--list\b|-a\b)[A-Za-z0-9_./-]+/, /git rm /,
];
const FLOOR_EXEMPT = new Set(['check_git_ownership.cjs', 'check_workflows.cjs']);
function skillScanText(skillId) {
  const texts = [];
  const stack = [path.join(repoRoot, '.agents', 'skills', skillId)];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { stack.push(full); continue; }
      if (FLOOR_EXEMPT.has(entry.name)) continue;
      const body = fs.readFileSync(full, 'utf8');
      if (entry.name.endsWith('.md')) {
        for (const match of body.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) texts.push(match[1]);
      } else if (/\.(cjs|js)$/.test(entry.name)) {
        texts.push(body.split(/\r?\n/).filter((line) => !/^\s*(\/\/|\*|#)/.test(line)).join('\n'));
      }
    }
  }
  return texts.join('\n');
}
for (const id of installedSkills) {
  const text = skillScanText(id);
  if (GIT_FLOOR.some((re) => re.test(text))) {
    assert.ok(
      MATRIX.get(id).includes('git-mutating'),
      `matrix classes scanned git-mutating skill ${id} as git-mutating`,
    );
  }
}
const KNOWN_GIT = [
  'ws-shared', 'ws-spec-to-pr', 'ws-spec-to-pr-lite', 'ws-spec-multi',
  'ws-fix-pr', 'ws-goal-fix-pr', 'ws-ship-pr', 'ws-spec-organizer', 'ws-testing',
];
for (const id of KNOWN_GIT) {
  assert.ok(MATRIX.get(id).includes('git-mutating'), `matrix classes known mutator ${id} as git-mutating`);
}
const KNOWN_SHARED = [
  'ws-spec-index', 'ws-spec-write', 'ws-spec-update', 'ws-spec-organizer',
  'ws-spec-archive', 'ws-spec-manager', 'ws-spec-from-provider',
  'ws-spec-provider-github', 'ws-spec-provider-azure-devops', 'ws-spec-provider-local',
  'ws-spec-memo', 'ws-wiki', 'ws-self-learning', 'ws-changelog', 'ws-cleanup', 'ws-spec-multi',
];
for (const id of KNOWN_SHARED) {
  assert.ok(
    MATRIX.get(id).includes('shared-artifact-writing'),
    `matrix classes known writer ${id} as shared-artifact-writing`,
  );
}

// 6. AC7: every orchestrator surface documents the baseline-advancement
// recipe (refresh_baseline invocation + fetch + rebase-or-merge-forward).
const ORCH_SURFACES = {
  standard: [
    '.agents/skills/ws-spec-to-pr/SKILL.md',
    '.agents/skills/ws-spec-to-pr/PROTOCOLS.md',
  ],
  lite: ['.agents/skills/ws-spec-to-pr-lite/SKILL.md'],
  multi: [
    '.agents/skills/ws-spec-multi/SKILL.md',
    '.agents/skills/ws-spec-multi/PROTOCOL.md',
  ],
  'fix-pr': ['.agents/skills/ws-fix-pr/SKILL.md'],
  'goal-fix-pr': ['.agents/skills/ws-goal-fix-pr/SKILL.md'],
  'ship-pr': ['.agents/skills/ws-ship-pr/SKILL.md'],
};
for (const [name, files] of Object.entries(ORCH_SURFACES)) {
  const surface = files.map((rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')).join('\n');
  assert.ok(surface.includes('refresh_baseline.cjs'), `${name} documents the refresh_baseline invocation`);
  assert.ok(/git fetch/.test(surface), `${name} documents fetch reintegration`);
  assert.ok(/git rebase|merge-forward/.test(surface), `${name} documents rebase-or-merge-forward reintegration`);
}

console.log('git-ownership contract OK');
