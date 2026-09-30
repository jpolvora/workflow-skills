#!/usr/bin/env node
'use strict';

// Fresh-verify fault injection (ws-fresh-verify, Step 3):
// One caller-authored invert patch per AC on a scratch worktree created and
// removed inside the call. Records the red signal (failing test name plus
// exit code). Vocabulary mirrors ws-testing run_sabotage.cjs; the cycle is
// self-contained because the red-signal name needs captured test output.
//
// Usage:
//   node run_fresh_injection.cjs --ac ACn --test "<cmd>" --paths <f...> --invert-patch <file> --worktree-dir <dir> [--fail-pattern <regex>] [--repo-root DIR] [--simulate-restore-failure]
//
// Exit 0: red observed, bytes restored, worktree removed. Exit 2: usage
// error. Exit 1: any other failure (nothing proceeds to a fix dispatch).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(packaged);
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const { resolveConsumerContext, resolveRepoRoot, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

// First hit wins; capture group 1 (or the full match) names the failing test.
const DEFAULT_FAIL_PATTERNS = [
  /^\s*(?:FAIL|✕|×)[:\s]+(.+?)\s*$/m,
  /^\s*not ok \d+\s+(.+?)\s*$/m,
  /AssertionError(?:\[ERR_ASSERTION\]|:)?\s*([^\n]+)?/,
  /Error:\s*([^\n]+)/,
];

function printHelp() {
  console.log('Usage: node run_fresh_injection.cjs --ac <ACn> --test "<cmd>" --paths <f...> --invert-patch <file> --worktree-dir <dir> [--fail-pattern <regex>] [--repo-root DIR] [--simulate-restore-failure]');
}

function parseArgs(argv) {
  const o = { ac: null, test: null, paths: [], invertPatch: null, worktreeDir: null, failPattern: null, repoRoot: null, simulateRestoreFailure: false };
  const fail = (msg) => { console.error(msg); process.exitCode = 2; return null; };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exitCode = 0; return null; }
    else if (a === '--ac') { o.ac = argv[++i]; if (o.ac === undefined) return fail('argument --ac: expected one argument'); }
    else if (a === '--test') { o.test = argv[++i]; if (o.test === undefined) return fail('argument --test: expected one argument'); }
    else if (a === '--paths') {
      o.paths = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) o.paths.push(argv[++i]);
      if (o.paths.length === 0) return fail('argument --paths: expected at least one argument');
    }
    else if (a === '--invert-patch') { o.invertPatch = argv[++i]; if (o.invertPatch === undefined) return fail('argument --invert-patch: expected one argument'); }
    else if (a === '--worktree-dir') { o.worktreeDir = argv[++i]; if (o.worktreeDir === undefined) return fail('argument --worktree-dir: expected one argument'); }
    else if (a === '--fail-pattern') { o.failPattern = argv[++i]; if (o.failPattern === undefined) return fail('argument --fail-pattern: expected one argument'); }
    else if (a === '--repo-root') { o.repoRoot = argv[++i]; if (o.repoRoot === undefined) return fail('argument --repo-root: expected one argument'); }
    else if (a === '--simulate-restore-failure') o.simulateRestoreFailure = true;
    else if (a.startsWith('--ac=')) o.ac = a.slice(5);
    else if (a.startsWith('--test=')) o.test = a.slice(7);
    else if (a.startsWith('--invert-patch=')) o.invertPatch = a.slice(15);
    else if (a.startsWith('--worktree-dir=')) o.worktreeDir = a.slice(15);
    else if (a.startsWith('--fail-pattern=')) o.failPattern = a.slice(15);
    else if (a.startsWith('--repo-root=')) o.repoRoot = a.slice(12);
    else return fail(`unknown argument: ${a}`);
  }
  if (!o.ac) return fail('argument --ac is required');
  if (!o.test) return fail('argument --test is required');
  if (!o.paths.length) return fail('argument --paths is required');
  if (!o.invertPatch) return fail('argument --invert-patch is required');
  if (!o.worktreeDir) return fail('argument --worktree-dir is required');
  if (o.failPattern !== null) {
    try {
      new RegExp(o.failPattern, 'm');
    } catch {
      return fail('argument --fail-pattern: invalid regular expression');
    }
  }
  return o;
}

function isTracked(repoRoot, relPath) {
  const proc = spawnSync('git', ['ls-files', '--error-unmatch', relPath], { cwd: String(repoRoot), encoding: 'utf8' });
  return proc.status === 0;
}

function extractFailingTest(output, customPattern) {
  const patterns = [];
  if (customPattern) {
    try {
      patterns.push(new RegExp(customPattern, 'm'));
    } catch {
      return null;
    }
  }
  patterns.push(...DEFAULT_FAIL_PATTERNS);
  for (const pattern of patterns) {
    const match = pattern.exec(output || '');
    if (match) {
      const name = String(match[1] !== undefined && match[1] !== '' ? match[1] : match[0]).trim().split('\n')[0].trim();
      if (name) return name.slice(0, 200);
    }
  }
  return null;
}

function configuredTestAliases(repoRoot) {
  const ctx = resolveConsumerContext({ repoRoot, scriptFile: __filename });
  const cfg = (ctx && ctx.config) || {};
  const verification = cfg.verification || {};
  const out = {};
  for (const [name, value] of Object.entries(verification)) {
    if (name.endsWith('Test') && typeof value === 'string' && value.trim()) out[name] = value;
  }
  return out;
}

function emit(payload) {
  console.log(JSON.stringify(payload, Object.keys(payload).sort()));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args) return process.exitCode || 0;
  const failOut = (reason, extra) => {
    emit({ ac: args.ac, failingTest: null, paths: [], reason, redObserved: false, restored: true, status: 'failed', testAlias: null, testExitCode: null, worktreeRemoved: true, ...(extra || {}) });
    process.exitCode = 1;
    return 1;
  };
  const repoRoot = path.resolve(resolveRepoRoot(args.repoRoot, { scriptFile: __filename }));
  const relPaths = [];
  for (const p of args.paths) {
    try {
      relPaths.push(toRepoRelative(repoRoot, path.resolve(repoRoot, p)));
    } catch {
      return failOut('path-outside-repository', { path: String(p) });
    }
  }
  const aliases = configuredTestAliases(repoRoot);
  const matchingAlias = Object.keys(aliases).find((n) => aliases[n] === args.test);
  if (!matchingAlias) {
    return failOut('test-command-not-configured-alias', { configuredAliases: Object.keys(aliases).sort() });
  }
  for (const rel of relPaths) {
    let st = null;
    try { st = fs.statSync(path.join(repoRoot, rel)); } catch { st = null; }
    if (!st || !st.isFile()) return failOut('missing-path', { path: rel, paths: relPaths });
    if (!isTracked(repoRoot, rel)) return failOut('path-not-tracked', { path: rel, paths: relPaths });
  }
  const patchFile = path.resolve(args.invertPatch);
  try {
    if (!fs.statSync(patchFile).isFile()) throw new Error('missing');
  } catch {
    return failOut('missing-invert-patch', { paths: relPaths });
  }
  const worktreeDir = path.resolve(args.worktreeDir);
  if (fs.existsSync(worktreeDir)) return failOut('worktree-dir-exists', { paths: relPaths, path: String(args.worktreeDir) });
  const dirtyCheck = spawnSync('git', ['status', '--porcelain', '--', ...relPaths], { cwd: String(repoRoot), encoding: 'utf8' });
  if (dirtyCheck.status === 0 && (dirtyCheck.stdout || '').trim() !== '') {
    return failOut('paths-dirty-vs-head', { paths: relPaths, dirty: (dirtyCheck.stdout || '').trim().split('\n').map((line) => line.trim()) });
  }

  let exitCode = 0;
  let reason = 'test-failed-as-expected';
  let testExitCode = null;
  let failingTest = null;
  let restored = true;
  let worktreeRemoved = false;
  let worktreeAdded = false;
  const snapshots = new Map();
  try {
    const added = spawnSync('git', ['worktree', 'add', '--detach', worktreeDir, 'HEAD'], { cwd: String(repoRoot), encoding: 'utf8' });
    if (added.status !== 0) {
      reason = `worktree-add-failed: ${(added.stderr || added.stdout || '').trim().split('\n')[0] || 'git worktree add failed'}`;
      exitCode = 1;
      return exitCode;
    }
    worktreeAdded = true;
    const wtPaths = relPaths.map((rel) => path.join(worktreeDir, rel));
    for (const p of wtPaths) snapshots.set(p, fs.readFileSync(p));
    const applied = spawnSync('git', ['apply', '--ignore-whitespace', '--whitespace=nowarn', String(patchFile)], { cwd: String(worktreeDir), encoding: 'utf8' });
    if (applied.status !== 0) {
      reason = `invert-apply-failed: ${((applied.stderr || applied.stdout || '').trim().split('\n')[0]) || 'git apply failed'}`;
      exitCode = 1;
      return exitCode;
    }
    const unchanged = [];
    for (let i = 0; i < wtPaths.length; i += 1) {
      if (Buffer.compare(fs.readFileSync(wtPaths[i]), snapshots.get(wtPaths[i])) === 0) unchanged.push(relPaths[i]);
    }
    if (unchanged.length > 0) {
      reason = 'invert-did-not-change-every-path';
      exitCode = 1;
      return exitCode;
    }
    const proc = spawnSync(args.test, { shell: true, cwd: String(worktreeDir), encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    testExitCode = proc.status;
    if (testExitCode === null || testExitCode === undefined) {
      reason = 'test-execution-failed';
      exitCode = 1;
      return exitCode;
    }
    if (proc.status === 0) {
      reason = 'test-passed-with-inverted-code';
      exitCode = 1;
    } else {
      failingTest = extractFailingTest(`${proc.stdout || ''}\n${proc.stderr || ''}`, args.failPattern);
      if (!failingTest) {
        reason = 'red-signal-unparseable';
        exitCode = 1;
      }
    }
  } finally {
    for (const [p, content] of snapshots) {
      try { fs.writeFileSync(p, content); } catch { restored = false; }
    }
    if (args.simulateRestoreFailure && snapshots.size > 0) {
      fs.writeFileSync([...snapshots.keys()][0], Buffer.from('CORRUPT'));
    }
    for (const [p, content] of snapshots) {
      let cur;
      try { cur = fs.readFileSync(p); } catch { cur = null; }
      if (!cur || Buffer.compare(cur, content) !== 0) { restored = false; break; }
    }
    if (!restored) {
      reason = args.simulateRestoreFailure ? 'restore-failure-simulated' : 'restore-byte-mismatch';
      exitCode = 1;
    }
    if (worktreeAdded) {
      const removed = spawnSync('git', ['worktree', 'remove', '--force', worktreeDir], { cwd: String(repoRoot), encoding: 'utf8' });
      worktreeRemoved = removed.status === 0 && !fs.existsSync(worktreeDir);
      if (!worktreeRemoved) {
        reason = 'worktree-remove-failed';
        exitCode = 1;
      }
    } else {
      worktreeRemoved = true;
    }
    emit({
      ac: args.ac,
      failingTest,
      paths: relPaths,
      reason,
      redObserved: testExitCode !== null && testExitCode !== 0 && failingTest !== null,
      restored,
      status: exitCode === 0 ? 'passed' : 'failed',
      testAlias: matchingAlias,
      testExitCode,
      worktreeRemoved,
    });
  }
  return exitCode;
}

if (require.main === module) process.exitCode = main();
module.exports = { main };
