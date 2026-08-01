/**
 * cleanup_workflow_git.py + Phase A/B doc-contract tests (AC2–AC10).
 * Run: node test/test-cleanup-workflow-git.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(
  REPO_ROOT,
  'src/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.py',
);
const PROTOCOL = path.join(
  REPO_ROOT,
  'src/skills/ws-spec-to-pr/protocols/artifact-cleanup.md',
);
const FAQ = path.join(REPO_ROOT, 'src/skills/ws-spec-to-pr/docs/faq.md');
const LITE_SKILL = path.join(REPO_ROOT, 'src/skills/ws-spec-to-pr-lite/SKILL.md');
const MULTI_PROTOCOL = path.join(REPO_ROOT, 'src/skills/ws-multi-spec/PROTOCOL.md');
const STEP_DISPATCH = path.join(REPO_ROOT, 'src/skills/ws-spec-to-pr/STEP-DISPATCH.md');
const ARTIFACTS = path.join(REPO_ROOT, 'src/skills/ws-spec-to-pr/ARTIFACTS.md');

const PYTHON = process.env.PYTHON || 'python';
const WID = 'cleanup-test-20260801T180000Z';
const OTHER = 'other-id-20260801T180000Z';
const PREFIX = `uswf/${WID}`;

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

function git(cwd, ...args) {
  return run('git', args, { cwd });
}

function runCleanup(repo, extraArgs = []) {
  return run(PYTHON, [SCRIPT, '--workflow-id', WID, '--repo', repo, ...extraArgs], {
    cwd: REPO_ROOT,
  });
}

function initTempGitRepo(prefix = 'cwg-') {
  const dir = mkTmp(prefix);
  const init = git(dir, 'init');
  if (init.status !== 0) {
    fail(`git init failed: ${init.stderr || init.stdout}`);
    return null;
  }
  // Default branch name stable across git versions
  git(dir, 'checkout', '-b', 'main');
  git(dir, 'config', 'user.email', 'cwg-test@example.com');
  git(dir, 'config', 'user.name', 'cwg-test');
  fs.writeFileSync(path.join(dir, 'README'), 'cleanup fixture\n', 'utf8');
  git(dir, 'add', 'README');
  const commit = git(dir, 'commit', '-m', 'init');
  if (commit.status !== 0) {
    fail(`commit failed: ${commit.stderr || commit.stdout}`);
    return null;
  }
  return dir;
}

function read(p) {
  return fs.readFileSync(p, 'utf8');
}

function testCleanupDeletesLocalTagsOnly() {
  console.log('\n--- testCleanupDeletesLocalTagsOnly ---');
  const repo = initTempGitRepo('cwg-tags-');
  if (!repo) return;
  const tag = `${PREFIX}/before-step-1`;
  const otherTag = `uswf/${OTHER}/before-step-1`;
  assert(git(repo, 'tag', tag).status === 0, `planted tag ${tag}`);
  assert(git(repo, 'tag', otherTag).status === 0, `planted unrelated tag ${otherTag}`);

  const r = runCleanup(repo);
  assert(r.status === 0, `cleanup exit 0 (got ${r.status}): ${(r.stdout || '') + (r.stderr || '')}`);
  assert((r.stdout || '').includes('CLEAN'), 'stdout contains CLEAN');
  assert(
    !git(repo, 'tag', '-l', `${PREFIX}/*`).stdout.trim(),
    'target tags deleted',
  );
  assert(
    git(repo, 'tag', '-l', `uswf/${OTHER}/*`).stdout.trim() === otherTag,
    'unrelated tags untouched',
  );
  assert(
    !(r.stdout || '').includes('push') && !(r.stderr || '').includes('push'),
    'no push language in output',
  );
}

function testCleanupRemovesWorktreesAndBranches() {
  console.log('\n--- testCleanupRemovesWorktreesAndBranches ---');
  const repo = initTempGitRepo('cwg-wt-');
  if (!repo) return;
  const branch = `${PREFIX}/step-4`;
  const wtPath = path.join(repo, 'wt-step-4');
  assert(git(repo, 'branch', branch).status === 0, `planted branch ${branch}`);
  const add = git(repo, 'worktree', 'add', wtPath, branch);
  assert(add.status === 0, `planted worktree: ${add.stderr || add.stdout}`);

  const r = runCleanup(repo);
  assert(r.status === 0, `cleanup exit 0 (got ${r.status}): ${(r.stdout || '') + (r.stderr || '')}`);
  const wtList = git(repo, 'worktree', 'list', '--porcelain').stdout || '';
  assert(!wtList.includes(wtPath.replace(/\\/g, '/')) && !wtList.includes('wt-step-4'), 'worktree removed');
  assert(
    !git(repo, 'branch', '--list', `${PREFIX}/*`).stdout.trim(),
    'namespace branches deleted',
  );
}

function testCleanupWarnsOnLeftovers() {
  console.log('\n--- testCleanupWarnsOnLeftovers ---');
  // Simulate leftover by planting a tag that cleanup cannot delete because we
  // monkey-patch via a branch checked out on HEAD named under namespace — instead:
  // create tag after dry verify by using stop policy mid-state is hard.
  // Practical approach: plant tag, run cleanup, then plant leftover and re-verify
  // by invoking script with a fake leftover: delete tags but leave a branch
  // checked out on main renamed — use branch that is HEAD.
  const repo = initTempGitRepo('cwg-warn-');
  if (!repo) return;
  const leftoverBranch = `${PREFIX}/stuck`;
  // Check out namespace branch on main checkout so -D is skipped
  assert(git(repo, 'checkout', '-b', leftoverBranch).status === 0, 'checkout leftover branch as HEAD');
  assert(git(repo, 'tag', `${PREFIX}/before-step-2`).status === 0, 'plant tag');

  const r = runCleanup(repo);
  assert(r.status === 2, `cleanup exit 2 for leftovers (got ${r.status}): ${(r.stdout || '') + (r.stderr || '')}`);
  assert((r.stdout || '').includes('WARN: leftover:'), 'WARN leftover printed');
  assert((r.stdout || '').includes(`branch:${leftoverBranch}`), 'leftover branch named');
  // Tag should still be deleted even when branch leftover remains
  assert(!git(repo, 'tag', '-l', `${PREFIX}/*`).stdout.trim(), 'tags still cleaned');
}

function testCleanupDryRunNoMutate() {
  console.log('\n--- testCleanupDryRunNoMutate ---');
  const repo = initTempGitRepo('cwg-dry-');
  if (!repo) return;
  const tag = `${PREFIX}/before-step-3`;
  const branch = `${PREFIX}/dry-branch`;
  assert(git(repo, 'tag', tag).status === 0, 'planted tag');
  assert(git(repo, 'branch', branch).status === 0, 'planted branch');

  const r = runCleanup(repo, ['--dry-run']);
  assert(r.status === 0, `dry-run exit 0 (got ${r.status})`);
  assert((r.stdout || '').includes('[DRY-RUN]'), 'dry-run prefix present');
  assert(git(repo, 'tag', '-l', tag).stdout.trim() === tag, 'tag intact after dry-run');
  assert(
    git(repo, 'branch', '--list', branch).stdout.includes(branch),
    'branch intact after dry-run',
  );
}

function testCleanupNamespaceIsolation() {
  console.log('\n--- testCleanupNamespaceIsolation ---');
  const repo = initTempGitRepo('cwg-ns-');
  if (!repo) return;
  const keepTag = `uswf/${OTHER}/before-step-1`;
  const keepBranch = 'user-feature-branch';
  const dropTag = `${PREFIX}/before-step-1`;
  assert(git(repo, 'tag', keepTag).status === 0, 'plant keep tag');
  assert(git(repo, 'tag', dropTag).status === 0, 'plant drop tag');
  assert(git(repo, 'branch', keepBranch).status === 0, 'plant user branch');
  assert(git(repo, 'branch', `${PREFIX}/tmp`).status === 0, 'plant drop branch');

  const r = runCleanup(repo);
  assert(r.status === 0, `cleanup exit 0 (got ${r.status})`);
  assert(git(repo, 'tag', '-l', keepTag).stdout.trim() === keepTag, 'other-id tag kept');
  assert(
    git(repo, 'branch', '--list', keepBranch).stdout.includes(keepBranch),
    'user branch kept',
  );
  assert(!git(repo, 'tag', '-l', `${PREFIX}/*`).stdout.trim(), 'target tags gone');
}

function testCleanupIgnoresCoincidentalWorkflowIdPath() {
  console.log('\n--- testCleanupIgnoresCoincidentalWorkflowIdPath ---');
  // AC6: a worktree path that merely contains the workflow-id string (not under
  // uswf/{id}) must not be removed when the branch is also outside the namespace.
  const repo = initTempGitRepo('cwg-coincidental-');
  if (!repo) return;
  const keepBranch = 'user-feature-branch';
  const wtPath = path.join(repo, 'plans', WID, 'worktrees', 'step-4');
  fs.mkdirSync(path.dirname(wtPath), { recursive: true });
  assert(git(repo, 'branch', keepBranch).status === 0, 'plant user branch');
  const add = git(repo, 'worktree', 'add', wtPath, keepBranch);
  assert(add.status === 0, `plant coincidental-path worktree: ${add.stderr || add.stdout}`);

  const r = runCleanup(repo);
  assert(r.status === 0, `cleanup exit 0 (got ${r.status}): ${(r.stdout || '') + (r.stderr || '')}`);
  const wtList = git(repo, 'worktree', 'list').stdout || '';
  assert(
    wtList.includes('step-4') || fs.existsSync(wtPath),
    'coincidental workflow-id path worktree left untouched',
  );
}

function testCleanupDirtyWorktreeForce() {
  console.log('\n--- testCleanupDirtyWorktreeForce ---');
  const repo = initTempGitRepo('cwg-dirty-force-');
  if (!repo) return;
  const branch = `${PREFIX}/dirty`;
  const wtPath = path.join(repo, 'wt-dirty');
  assert(git(repo, 'branch', branch).status === 0, 'plant branch');
  assert(git(repo, 'worktree', 'add', wtPath, branch).status === 0, 'add worktree');
  fs.writeFileSync(path.join(wtPath, 'dirty.txt'), 'uncommitted\n', 'utf8');

  const r = runCleanup(repo, ['--dirty-policy', 'force']);
  assert(r.status === 0, `force dirty cleanup exit 0 (got ${r.status}): ${(r.stdout || '') + (r.stderr || '')}`);
  assert((r.stdout || '').includes('DIRTY worktree'), 'logged dirty paths');
  const wtList = git(repo, 'worktree', 'list').stdout || '';
  assert(!wtList.includes('wt-dirty'), 'dirty worktree force-removed');
}

function testCleanupDirtyWorktreeStop() {
  console.log('\n--- testCleanupDirtyWorktreeStop ---');
  const repo = initTempGitRepo('cwg-dirty-stop-');
  if (!repo) return;
  const branch = `${PREFIX}/dirty-stop`;
  const wtPath = path.join(repo, 'wt-dirty-stop');
  assert(git(repo, 'branch', branch).status === 0, 'plant branch');
  assert(git(repo, 'worktree', 'add', wtPath, branch).status === 0, 'add worktree');
  fs.writeFileSync(path.join(wtPath, 'dirty.txt'), 'uncommitted\n', 'utf8');

  const r = runCleanup(repo, ['--dirty-policy', 'stop']);
  assert(r.status === 1, `stop dirty cleanup exit 1 (got ${r.status})`);
  const wtList = git(repo, 'worktree', 'list').stdout || '';
  assert(wtList.includes('wt-dirty-stop') || fs.existsSync(wtPath), 'worktree still registered (no half-remove)');
}

function testDocsReferenceSharedCleanupContract() {
  console.log('\n--- testDocsReferenceSharedCleanupContract ---');
  const protocol = read(PROTOCOL);
  const faq = read(FAQ);
  const lite = read(LITE_SKILL);
  const multi = read(MULTI_PROTOCOL);
  const dispatch = read(STEP_DISPATCH);
  const artifacts = read(ARTIFACTS);

  assert(
    protocol.includes('cleanup_workflow_git.py') && protocol.includes('Phase A'),
    'protocol references shared script + Phase A',
  );
  assert(
    protocol.includes('Phase B') && protocol.includes('Keep all'),
    'protocol documents Phase B / Keep all still Phase A',
  );
  assert(
    protocol.includes('failed') && protocol.includes('cancelled'),
    'protocol documents skip failed/cancelled',
  );
  assert(
    !protocol.includes('xargs -r'),
    'protocol no longer uses GNU xargs -r git pipelines',
  );
  assert(
    faq.includes('cleanup_workflow_git.py') && faq.includes('Keep all artifacts'),
    'FAQ documents mandatory git vs Keep all',
  );
  assert(
    lite.includes('cleanup_workflow_git.py') && lite.includes('artifact-cleanup.md'),
    'lite SKILL references shared script/protocol',
  );
  assert(
    multi.includes('cleanup_workflow_git.py') && multi.includes('runId'),
    'multi-spec documents child Phase A and runId not a target',
  );
  assert(
    dispatch.includes('Phase A') && dispatch.includes('cleanup_workflow_git.py'),
    'STEP-DISPATCH wires Phase A',
  );
  assert(
    artifacts.includes('mandatory Phase A') || artifacts.includes('Phase A git'),
    'ARTIFACTS mentions mandatory git + optional plan-dir',
  );
}

function testProtocolMandatoryVsOptionalSplit() {
  console.log('\n--- testProtocolMandatoryVsOptionalSplit ---');
  const protocol = read(PROTOCOL);
  assert(protocol.includes('mandatory'), 'protocol says Phase A mandatory');
  assert(
    /Phase B[\s\S]*optional|optional[\s\S]*Phase B/i.test(protocol),
    'protocol says Phase B optional',
  );
  assert(
    protocol.includes('status → completed') || protocol.includes('status→completed'),
    'protocol ties Phase A to completed',
  );
}

function testFaqDocumentsCleanupSplit() {
  console.log('\n--- testFaqDocumentsCleanupSplit ---');
  const faq = read(FAQ);
  assert(faq.includes('WARN: leftover'), 'FAQ mentions WARN leftovers');
  assert(faq.includes('--dirty-policy force') || faq.includes('dirty-policy force'), 'FAQ mentions dirty-policy force default');
  assert(faq.includes('Failed') || faq.includes('failed'), 'FAQ covers failed/cancelled manual re-run');
}

function main() {
  console.log('Running cleanup_workflow_git tests...');
  assert(fs.existsSync(SCRIPT), `script exists: ${SCRIPT}`);

  try {
    testCleanupDeletesLocalTagsOnly();
    testCleanupRemovesWorktreesAndBranches();
    testCleanupWarnsOnLeftovers();
    testCleanupDryRunNoMutate();
    testCleanupNamespaceIsolation();
    testCleanupIgnoresCoincidentalWorkflowIdPath();
    testCleanupDirtyWorktreeForce();
    testCleanupDirtyWorktreeStop();
    testDocsReferenceSharedCleanupContract();
    testProtocolMandatoryVsOptionalSplit();
    testFaqDocumentsCleanupSplit();
  } finally {
    cleanup();
  }

  console.log(`\nDone. failures=${failures}`);
  process.exit(failures > 0 ? 1 : 0);
}

main();
