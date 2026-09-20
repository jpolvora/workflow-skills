#!/usr/bin/env node
'use strict';

// Port of run_sabotage.py (ws-testing):
// Regression sabotage helper: invert fix, expect test failure, restore bytes.
//
// Usage:
//   node run_sabotage.cjs --test "npm run test-x" --paths file.js --invert-patch invert.patch
//
// Restore failure -> git restore --source=HEAD -- <paths>; exit 1.
// Restore success is proven against the pre-invert snapshot only (not HEAD-clean).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [packaged];
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
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  // Deprecated last resort: read-only legacy consumer-hub copies. Nothing
  // writes managed runtime into .ws (it holds only local config files).
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', '.ws', 'runtime', 'scripts'));
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

function printHelp() {
  console.log('Usage: node run_sabotage.cjs --test "<cmd>" --paths <f...> --invert-patch <file> [--repo-root DIR] [--simulate-restore-failure]');
}

function parseArgs(argv) {
  const o = { test: null, paths: [], invertPatch: null, repoRoot: null, simulateRestoreFailure: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    else if (a === '--test') { o.test = argv[++i]; if (o.test === undefined) { console.error('argument --test: expected one argument'); process.exit(2); } }
    else if (a === '--paths') {
      o.paths = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) o.paths.push(argv[++i]);
      if (o.paths.length === 0) { console.error('argument --paths: expected at least one argument'); process.exit(2); }
    }
    else if (a === '--invert-patch') { o.invertPatch = argv[++i]; if (o.invertPatch === undefined) { console.error('argument --invert-patch: expected one argument'); process.exit(2); } }
    else if (a === '--repo-root') { o.repoRoot = argv[++i]; if (o.repoRoot === undefined) { console.error('argument --repo-root: expected one argument'); process.exit(2); } }
    else if (a === '--simulate-restore-failure') o.simulateRestoreFailure = true;
    else if (a.startsWith('--test=')) o.test = a.slice(7);
    else if (a.startsWith('--invert-patch=')) o.invertPatch = a.slice(16);
    else if (a.startsWith('--repo-root=')) o.repoRoot = a.slice(12);
    else { console.error(`unknown argument: ${a}`); process.exit(2); }
  }
  if (!o.test) { console.error('argument --test is required'); process.exit(2); }
  if (!o.paths.length) { console.error('argument --paths is required'); process.exit(2); }
  if (!o.invertPatch) { console.error('argument --invert-patch is required'); process.exit(2); }
  return o;
}

function applyPatch(repoRoot, patchFile) {
  const proc = spawnSync('git', ['apply', '--ignore-whitespace', '--whitespace=nowarn', String(patchFile)], { cwd: String(repoRoot), encoding: 'utf8' });
  if (proc.status !== 0) throw new Error((proc.stderr || proc.stdout || 'git apply failed').trim());
}

function isTracked(repoRoot, relPath) {
  const proc = spawnSync('git', ['ls-files', '--error-unmatch', relPath], { cwd: String(repoRoot), encoding: 'utf8' });
  return proc.status === 0;
}

function snapshotRestored(absPaths, snapshots) {
  for (const p of absPaths) {
    let cur;
    try { cur = fs.readFileSync(p); } catch { return false; }
    if (Buffer.compare(cur, snapshots.get(p)) !== 0) return false;
  }
  return true;
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
  const repoRoot = path.resolve(resolveRepoRoot(args.repoRoot, { scriptFile: __filename }));
  const absPaths = args.paths.map((p) => path.resolve(repoRoot, p));
  const relPaths = [];
  for (const p of absPaths) {
    try {
      relPaths.push(toRepoRelative(repoRoot, p));
    } catch {
      emit({ status: 'failed', reason: 'path-outside-repository', path: String(p) });
      process.exit(1);
    }
  }
  const aliases = configuredTestAliases(repoRoot);
  const matchingAlias = Object.keys(aliases).find((n) => aliases[n] === args.test);
  if (!matchingAlias) {
    emit({ status: 'failed', reason: 'test-command-not-configured-alias', configuredAliases: Object.keys(aliases).sort() });
    process.exit(1);
  }
  const snapshots = new Map();
  for (let i = 0; i < absPaths.length; i += 1) {
    const p = absPaths[i];
    const rel = relPaths[i];
    let st = null;
    try { st = fs.statSync(p); } catch { st = null; }
    if (!st || !st.isFile()) { emit({ status: 'failed', reason: 'missing-path', path: rel }); process.exit(1); }
    if (!isTracked(repoRoot, rel)) { emit({ status: 'failed', reason: 'path-not-tracked', path: rel }); process.exit(1); }
    snapshots.set(p, fs.readFileSync(p));
  }
  const patchFile = path.resolve(args.invertPatch);
  try {
    if (!fs.statSync(patchFile).isFile()) throw new Error('missing');
  } catch {
    emit({ status: 'failed', reason: 'missing-invert-patch' });
    process.exit(1);
  }

  let exitCode = 0;
  let reason = 'test-failed-as-expected';
  let testExitCode = null;
  try {
    applyPatch(repoRoot, patchFile);
    const unchanged = [];
    for (let i = 0; i < absPaths.length; i += 1) {
      const p = absPaths[i];
      if (Buffer.compare(fs.readFileSync(p), snapshots.get(p)) === 0) unchanged.push(relPaths[i]);
    }
    if (unchanged.length > 0) {
      reason = 'invert-did-not-change-every-path';
      exitCode = 1;
      return exitCode;
    }
    const proc = spawnSync(args.test, { shell: true, cwd: String(repoRoot), encoding: 'utf8' });
    testExitCode = proc.status;
    if (proc.status === 0) {
      reason = 'test-passed-with-inverted-code';
      exitCode = 1;
    }
  } catch (err) {
    reason = `invert-apply-failed: ${err && err.message ? err.message : err}`;
    exitCode = 1;
  } finally {
    for (const [p, content] of snapshots) fs.writeFileSync(p, content);
    if (args.simulateRestoreFailure && absPaths.length > 0) fs.writeFileSync(absPaths[0], Buffer.from('CORRUPT'));
    const restored = snapshotRestored(absPaths, snapshots);
    if (!restored) {
      for (const [p, content] of snapshots) fs.writeFileSync(p, content);
      reason = args.simulateRestoreFailure ? 'restore-failure-simulated' : 'restore-byte-mismatch';
      exitCode = 1;
    }
    emit({
      status: exitCode === 0 ? 'passed' : 'failed',
      reason,
      testAlias: matchingAlias,
      testExitCode,
      paths: relPaths,
      restored: snapshotRestored(absPaths, snapshots),
    });
  }
  return exitCode;
}

if (require.main === module) process.exit(main());
module.exports = { main };
