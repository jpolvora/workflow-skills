/**
 * Round-2 refine coverage (spec code-review-round-2-fixes, verify round 1 gaps).
 * Negative scenarios NS2/NS3/NS4/NS5/NS8/NS9 plus mapped tests for
 * AC3/AC6/AC12/AC13/AC15. Temp fixtures only; never mutates the working tree.
 * Run: node test/test-code-review-round-2.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { buildWikiSite, resolveWikiBranch } from '../bin/build-wiki-site.js';
import { compareCodepoint } from '../bin/skill-integrity-lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const nodeOs = require('os');

const coordinator = require('../.agents/skills/ws-spec-to-pr/scripts/step_coordinator.cjs');
const memConflict = require('../.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs');
const cleanupGit = require('../.agents/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs');
const monitor = require('../.agents/skills/ws-monitor/scripts/monitor_snapshot.cjs');

const SCANNER = path.join(repoRoot, '.agents/skills/ws-secrets-leak-review/scripts/secrets_scanner.cjs');
const VERIFY = path.join(repoRoot, '.agents/skills/ws-ship-pr/scripts/verify.cjs');
const UNIQUE_RT = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/check_unique_runtime.cjs');
const MEM_CONFLICT = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs');
const CLI = path.join(repoRoot, 'bin/cli.js');

const tempRoots = [];
process.on('exit', () => {
  for (const root of tempRoots) {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function temp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf8');
  return file;
}

function git(dir, args, env) {
  return cp.spawnSync('git', args, {
    cwd: dir, encoding: 'utf8', env: { ...process.env, ...(env || {}) },
  });
}

function initRepo(dir, branch) {
  let r = git(dir, ['init', '-b', branch]);
  assert.strictEqual(r.status, 0, `git init failed: ${r.stderr}`);
  git(dir, ['config', 'user.email', 'round2@test.local']);
  git(dir, ['config', 'user.name', 'round2']);
}

function seedWiki(wikiDir) {
  write(path.join(wikiDir, 'index.wiki.md'), '# Wiki Home\n\nBody.\n');
  write(
    path.join(wikiDir, 'harness', 'sample.md'),
    '# Sample Feature\n\n## Feature Overview\nOverview text.\n\n## Business Rules\nRules.\n',
  );
}

// ---------- NS2: coordinator cancel/unmatched input resolves to EXIT_BLOCKED ----------
{
  assert.strictEqual(coordinator.EXIT_BLOCKED, 2, 'EXIT_BLOCKED is exit code 2');
  for (const input of ['cancel', 'Cancel', 'CANCEL', 'quit', 'stop', 'abort', 'exit', 'no', 'blocked']) {
    const r = coordinator.resolveGateChoice({ autoMode: false, isTTY: true, options: ['Next', 'More'], input });
    assert.strictEqual(r.index, -1, `cancel word "${input}" must not resolve to index 0`);
    assert.ok(r.blocked, `cancel word "${input}" must set blocked`);
    assert.notStrictEqual(r.index, 0, `cancel word "${input}" must never pick index 0`);
  }
  const unmatched = coordinator.resolveGateChoice({ autoMode: false, isTTY: true, options: ['Next', 'More'], input: 'zzz-no-such-option' });
  assert.strictEqual(unmatched.index, -1, 'unmatched token must not resolve to index 0');
  assert.ok(unmatched.blocked, 'unmatched token must set blocked');
  assert.strictEqual(unmatched.cancelled, false, 'unmatched token is not an explicit cancel');
  // Defaults unchanged: autoMode / non-TTY / empty TTY still take the recommended default.
  assert.strictEqual(coordinator.resolveGateChoice({ autoMode: true, isTTY: true, options: ['Next', 'More'] }).index, 0, 'autoMode keeps index 0');
  assert.strictEqual(coordinator.resolveGateChoice({ autoMode: false, isTTY: false, options: ['Next', 'More'] }).index, 0, 'non-TTY keeps index 0');
  assert.strictEqual(coordinator.resolveGateChoice({ autoMode: false, isTTY: true, options: ['Next', 'More'], input: '' }).index, 0, 'empty TTY input keeps index 0');
  assert.strictEqual(coordinator.resolveGateChoice({ autoMode: false, isTTY: true, options: ['Next', 'More'], input: '2' }).index, 1, 'numeric TTY input honored');
  console.log('ok NS2: cancel/unmatched gate input -> EXIT_BLOCKED, defaults unchanged');
}

// ---------- NS3: develop-only fixture repo makes verify.cjs refuse ----------
{
  const dir = temp('verify-develop-only-');
  initRepo(dir, 'develop');
  write(path.join(dir, 'a.txt'), 'x\n');
  git(dir, ['add', 'a.txt']);
  const committed = git(dir, ['commit', '-m', 'init']);
  assert.strictEqual(committed.status, 0, `fixture commit failed: ${committed.stderr}`);
  const branches = git(dir, ['branch', '--list', 'master', 'main']);
  assert.strictEqual(branches.stdout.trim(), '', 'fixture must have neither master nor main');
  const env = { ...process.env };
  delete env.SHIP_PR_BASE;
  const res = cp.spawnSync(process.execPath, [VERIFY], { cwd: dir, encoding: 'utf8', env });
  assert.notStrictEqual(res.status, 0, 'verify.cjs must refuse a develop-only repo instead of diffing a guessed base');
  assert.match(`${res.stderr || ''}`, /refusing|no base branch/i, 'refusal names the missing base');
  console.log('ok NS3: develop-only repo refused by verify.cjs');
}

// ---------- NS4: temp global-only skills root with .py reports a finding ----------
{
  const consumer = temp('ws-consumer-');
  const globalRoot = temp('ws-global-');
  write(path.join(globalRoot, 'ws-demo/scripts/legacy.py'), 'print(1)\n');
  const res = cp.spawnSync(process.execPath, [UNIQUE_RT, '--json', '--repo-root', consumer], {
    cwd: repoRoot, encoding: 'utf8', env: { ...process.env, WORKFLOW_SKILLS_GLOBAL_DIR: globalRoot },
  });
  assert.strictEqual(res.status, 1, `global-only .py fixture must fail the gate: ${res.stderr || res.stdout}`);
  const payload = JSON.parse(res.stdout);
  assert.strictEqual(payload.ok, false, 'payload ok must be false');
  assert.ok(payload.findingCount >= 1, 'global-only .py fixture must report at least one finding');
  console.log('ok NS4: temp WORKFLOW_SKILLS_GLOBAL_DIR with .py reports a finding');
}

// ---------- NS5 + AC6: ~ expands via os.homedir, fail-closed with no home ----------
{
  const home = nodeOs.homedir();
  const expanded = memConflict.expandHome('~/.agents/MEMORY.md');
  assert.ok(expanded.startsWith(home), `~ must expand under os.homedir() (got ${expanded})`);
  assert.ok(expanded.length > home.length, '~ expansion must not collapse to the home root itself');
  assert.ok(!expanded.startsWith('~/') && !expanded.startsWith('~\\'), '~ prefix must be consumed');
  assert.strictEqual(memConflict.expandHome('/abs/path'), '/abs/path', 'absolute path passes through');
  assert.strictEqual(memConflict.expandHome('rel/path'), 'rel/path', 'relative path passes through');
  const realHomedir = nodeOs.homedir;
  try {
    nodeOs.homedir = () => { throw new Error('no home'); };
    assert.throws(() => memConflict.expandHome('~/x'), /no home directory|cannot expand ~/i, 'throwing homedir must fail closed');
    nodeOs.homedir = () => '';
    assert.throws(() => memConflict.expandHome('~/x'), /no home directory|cannot expand ~/i, 'empty homedir must fail closed');
  } finally {
    nodeOs.homedir = realHomedir;
  }
  assert.strictEqual(memConflict.expandHome('~/x'), path.join(home, 'x'), 'homedir restored after patch');
  // CLI level: HOME/USERPROFILE-redirected run resolves memory under that home.
  const fakeHome = temp('fake-home-');
  const plan = write(path.join(temp('mem-plan-'), 'plan.md'), '# plan\n\nBody.\n');
  const res = cp.spawnSync(process.execPath, [MEM_CONFLICT, plan, '--memory', '~/.agents/MEMORY.md', '--json'], {
    cwd: repoRoot, encoding: 'utf8',
    env: { ...process.env, HOME: fakeHome, USERPROFILE: fakeHome },
  });
  assert.strictEqual(res.status, 0, `missing memory is a skip, not an error: ${res.stderr}`);
  const payload = JSON.parse(res.stdout);
  assert.strictEqual(payload.memory_missing, true, 'absent memory reports memory_missing');
  assert.ok(String(payload.memory_path).startsWith(fakeHome), `memory path must resolve under the redirected home (got ${payload.memory_path})`);
  console.log('ok NS5/AC6: ~ expands via os.homedir with fail-closed, CLI honors HOME/USERPROFILE');
}

// ---------- NS8 + AC12: update --unknown-flag fails closed naming the flag ----------
{
  const dir = temp('cli-update-');
  const res = cp.spawnSync(process.execPath, [CLI, 'update', '--unknown-flag'], {
    cwd: dir, encoding: 'utf8',
  });
  assert.strictEqual(res.status, 1, `update --unknown-flag must exit 1, got ${res.status}: ${res.stdout}`);
  assert.match(`${res.stderr || ''}`, /Unknown update argument: --unknown-flag/, 'error names the offending flag');
  // AC12: retire path quarantines managed hub content instead of deleting it.
  const cliSrc = fs.readFileSync(CLI, 'utf8');
  const retireFn = cliSrc.slice(
    cliSrc.indexOf('function retireProjectHubManagedContent'),
    cliSrc.indexOf('function assertNotSelfOverwrite'),
  );
  assert.ok(retireFn.length > 100, 'retire function located');
  assert.match(retireFn, /quarantineStaleHubPath/, 'retire quarantines stale hub paths');
  assert.ok(!/rmSync|unlinkSync|rmdirSync/.test(retireFn), 'retire never deletes outright');
  assert.match(retireFn, /if \(isGlobalScope\) return;/, 'retire skips global scope');
  console.log('ok NS8/AC12: unknown update flag fails closed; retire quarantines');
}

// ---------- NS9 + AC14: staged +++ header alone is no hit; rg failure is not clean ----------
{
  // Header-only: a staged file whose NAME looks secret but whose content is
  // clean must not report a hit (the +++ b/<path> header is not an added line).
  const dir = temp('scan-staged-');
  initRepo(dir, 'main');
  const secretName = ['AKIA', 'ABCDEFGHIJ123456'].join('') + '.txt';
  write(path.join(dir, secretName), 'clean content, no secrets here\n');
  git(dir, ['add', '.']);
  const staged = cp.spawnSync(process.execPath, [SCANNER], {
    cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_STAGED_ONLY: '1' },
  });
  assert.strictEqual(staged.status, 0, `header-only staged diff must be clean: ${staged.stdout}${staged.stderr}`);
  assert.match(staged.stdout, /No leaks detected/, 'header-only staged diff reports no leaks');
  assert.ok(!/HIGH/.test(staged.stdout), 'header-only staged diff reports no HIGH section');

  // rg failure: a broken rg on PATH must surface, never report clean.
  const broken = temp('scan-rgfail-');
  initRepo(broken, 'main');
  write(path.join(broken, 'a.txt'), 'hello\n');
  git(broken, ['add', '.']);
  git(broken, ['commit', '-m', 'init']);
  // Force the real rg to fail via its config file (portable: no PATH shadowing).
  const rgCfg = write(path.join(temp('rg-cfg-'), 'config'), '--bogus-flag-xyz\n');
  const res = cp.spawnSync(process.execPath, [SCANNER], {
    cwd: broken, encoding: 'utf8',
    env: { ...process.env, RIPGREP_CONFIG_PATH: rgCfg },
  });
  assert.notStrictEqual(res.status, 0, 'rg failure must not exit 0');
  assert.match(`${res.stderr || ''}${res.stdout || ''}`, /rg (exited|failed)/i, 'rg failure is surfaced');
  assert.ok(!/No leaks detected/.test(res.stdout || ''), 'rg failure must not report clean');
  console.log('ok NS9/AC14: staged +++ header alone is clean; rg failure surfaces');
}

// ---------- AC3: spec-memo mirror keeps spaced --cwd intact, stderr in reason ----------
{
  const fakeDir = temp('memo-fake-');
  const fakeLog = path.join(fakeDir, 'argv.json');
  const fake = write(
    path.join(fakeDir, 'fake-memo.cjs'),
    `'use strict';
const fs = require('fs');
fs.writeFileSync(process.env.MEMO_FAKE_LOG, JSON.stringify(process.argv.slice(2)));
console.error('boom-stderr-marker');
process.exitCode = 3;
`,
  );
  const spaced = fs.mkdtempSync(path.join(os.tmpdir(), 'memo spaced-'));
  tempRoots.push(spaced);
  process.env.MEMO_FAKE_LOG = fakeLog;
  const config = { enableSpecMemoIntegration: true, specMemo: { cli: `node ${fake}` } };
  const r = coordinator.mirrorSpecMemo({
    config,
    repoRoot: spaced,
    handoff: { workflowId: 'w', slug: 's', step: 5, summary: 'x', nextAction: 'y' },
    envelope: { holder: 'runner-a' },
  });
  assert.strictEqual(r.mirrored, false, 'failing memo CLI must not report mirrored');
  assert.match(r.reason, /cli-exit-3/, 'reason carries the CLI exit status');
  assert.match(r.reason, /boom-stderr-marker/, 'reason carries the child stderr');
  delete process.env.MEMO_FAKE_LOG;
  const argv = JSON.parse(fs.readFileSync(fakeLog, 'utf8'));
  assert.strictEqual(argv[argv.indexOf('--cwd') + 1], spaced, 'spaced --cwd arrives as one intact argv element');
  console.log('ok AC3: spaced --cwd intact, child stderr in failure reason');
}

// ---------- AC13: drain-safe exits, win32-only case-fold, cross-drive user ----------
{
  for (const rel of [
    '.agents/skills/ws-testing/scripts/run_sabotage.cjs',
    '.agents/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs',
    '.agents/skills/ws-spec-to-pr/scripts/check_memory_conflict.cjs',
  ]) {
    const src = fs.readFileSync(path.join(repoRoot, rel), 'utf8');
    assert.ok(!/process\.exit\(/.test(src), `${rel} drains via exitCode, never process.exit (`);
  }
  assert.strictEqual(cleanupGit.samePath('/a/b', '/a/b'), true, 'samePath identical paths match');
  assert.strictEqual(cleanupGit.samePath('/a/b', '/a/c'), false, 'samePath distinct paths differ');
  const foldSrc = fs.readFileSync(
    path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/cleanup_workflow_git.cjs'), 'utf8',
  );
  assert.match(foldSrc, /process\.platform === 'win32' \? path\.resolve\(p\)\.toLowerCase\(\)/, 'case-fold is win32-gated');
  assert.strictEqual(monitor.classifyLocation(repoRoot, path.join(repoRoot, 'sub/file.md')), 'workspace', 'in-repo path is workspace');
  assert.strictEqual(monitor.classifyLocation(repoRoot, path.join(repoRoot, '..', 'outside.md')), 'user', 'escaping path is user');
  assert.strictEqual(
    monitor.classifyLocation(repoRoot, path.resolve(path.parse(repoRoot).root, 'outside-repo.md')),
    'user',
    'outside-root absolute path is user',
  );
  console.log('ok AC13: exitCode drain, win32-only fold, outside-root classifies user');
}

// ---------- AC15: bump tarball ref, wiki branch links, ordering, gitignore, CI ----------
{
  // Ordering uses codepoint comparison (locale-independent).
  assert.strictEqual(compareCodepoint('a', 'b'), -1, 'codepoint a < b');
  assert.strictEqual(compareCodepoint('b', 'a'), 1, 'codepoint b > a');
  assert.strictEqual(compareCodepoint('a', 'a'), 0, 'codepoint equal');
  assert.deepStrictEqual(
    ['b', 'A', 'a', 'B', '10', '2'].sort(compareCodepoint),
    ['10', '2', 'A', 'B', 'a', 'b'],
    'sort is codepoint order, not locale order',
  );
  for (const [x, y] of [['Z', 'a'], ['_', '0'], ['-', 'A']]) {
    assert.strictEqual(Math.sign(compareCodepoint(x, y)), x < y ? -1 : 1, `codepoint sign matches < for ${x}/${y}`);
  }

  // --bump syncs the consumer-fixture tarball reference.
  const buildSrc = fs.readFileSync(path.join(repoRoot, 'bin/build-site.js'), 'utf8');
  assert.ok(buildSrc.includes("path.join(root, 'test', 'package.json')"), '--bump knows test/package.json');
  assert.ok(buildSrc.includes('file:../workflow-skills-'), '--bump syncs the file: tarball ref');
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const testPkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'test/package.json'), 'utf8'));
  assert.strictEqual(
    testPkg.dependencies['workflow-skills'],
    `file:../workflow-skills-${pkg.version}.tgz`,
    'fixture tarball ref tracks package.json version',
  );

  // Wiki branch links are parameterized; deployed builds point at main.
  assert.strictEqual(resolveWikiBranch({}), 'main', 'default wiki branch is main');
  assert.strictEqual(resolveWikiBranch({ wikiBranch: 'develop' }), 'develop', 'explicit branch wins');
  process.env.WORKFLOW_SKILLS_WIKI_BRANCH = 'release';
  try {
    assert.strictEqual(resolveWikiBranch({}), 'release', 'env branch override wins over default');
  } finally {
    delete process.env.WORKFLOW_SKILLS_WIKI_BRANCH;
  }
  const wikiDir = temp('wiki-branch-');
  const outMain = temp('wiki-out-main-');
  seedWiki(wikiDir);
  buildWikiSite({ repoRoot, wikiDir, outDir: outMain, check: false });
  const mainHtml = fs.readFileSync(path.join(outMain, 'harness/sample.html'), 'utf8');
  assert.ok(mainHtml.includes('/blob/main/'), 'deployed wiki links point at main');
  assert.ok(!mainHtml.includes('/blob/develop/'), 'deployed wiki links do not point at develop');
  const outDev = temp('wiki-out-dev-');
  buildWikiSite({ repoRoot, wikiDir, outDir: outDev, check: false, wikiBranch: 'develop' });
  const devHtml = fs.readFileSync(path.join(outDev, 'harness/sample.html'), 'utf8');
  assert.ok(devHtml.includes('/blob/develop/'), 'explicit wikiBranch is honored');

  // .gitignore files match the real report name.
  const rootIgnore = fs.readFileSync(path.join(repoRoot, '.gitignore'), 'utf8').split(/\r?\n/);
  assert.ok(rootIgnore.includes('ws-check-workflows-report.md'), 'root .gitignore matches the report');
  assert.ok(!rootIgnore.includes('check-workflows-report.md'), 'stale report name is gone');
  const hubIgnore = fs.readFileSync(
    path.join(repoRoot, '.agents/skills/ws-shared/templates/hub.gitignore'), 'utf8',
  ).split(/\r?\n/);
  assert.ok(hubIgnore.includes('ws-check-workflows-report.md'), 'hub template matches the report');

  // CI pull_request trigger includes develop.
  const ci = fs.readFileSync(path.join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
  const pr = ci.match(/pull_request:\s*\n\s*branches:\s*\[([^\]]+)\]/);
  assert.ok(pr, 'CI has a pull_request branch list');
  assert.ok(pr[1].includes('main') && pr[1].includes('develop'), 'CI pull_request covers main and develop');
  console.log('ok AC15: tarball ref, wiki branch, ordering, gitignore, CI trigger');
}

console.log('test-code-review-round-2: ok');
