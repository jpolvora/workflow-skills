#!/usr/bin/env node
'use strict';

// Port of verify.sh (ws-ship-pr):
// Project-agnostic verification gate (build + tests; frontend when touched).
// Reads config.json for commands; falls back to env vars / sane defaults.

const fs = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

function sh(cmd, opts = {}) {
  const r = spawnSync(cmd, { shell: true, stdio: 'inherit', encoding: 'utf8', ...opts });
  return r.status ?? 1;
}

function gitTopLevel() {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('verify: not a git repository');
    process.exit(1);
  }
  return (r.stdout || '').trim();
}

function detectBase(scriptDir) {
  const det = path.join(scriptDir, 'detect-base-branch.cjs');
  if (process.env.SHIP_PR_BASE) return process.env.SHIP_PR_BASE;
  if (fs.existsSync(det)) {
    const r = spawnSync('node', [det], { encoding: 'utf8' });
    const out = (r.stdout || '').trim();
    if (r.status === 0 && out) return out;
  }
  // Fallback: master/main probe.
  for (const c of ['master', 'main']) {
    const r = spawnSync('git', ['show-ref', '--verify', '--quiet', `refs/heads/${c}`], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return 'main';
}

function frontendTouched(baseBranch) {
  const parts = [];
  for (const args of [['diff', '--name-only'], ['diff', '--cached', '--name-only'], ['diff', '--name-only', `${baseBranch}...HEAD`]]) {
    const r = spawnSync('git', args, { encoding: 'utf8' });
    if (r.status === 0 && r.stdout) parts.push(r.stdout);
  }
  return parts.join('\n').split('\n').some((l) => l.startsWith('web/'));
}

function readVerificationConfig(configFile) {
  // Node-native config read (replaces the python -c inline in verify.sh).
  const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const v = cfg.verification || {};
  const s = ((cfg.stack || {}).frontend) || {};
  return {
    backendBuild: v.backendBuild || '',
    backendTest: v.backendTest || '',
    frontendBuild: v.frontendBuild || '',
    frontendTest: v.frontendTest || '',
    frontendDir: String((s.sourceDir || 'web')).split('/')[0],
  };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node verify.cjs');
    process.exit(0);
  }
  const repoRoot = gitTopLevel();
  process.chdir(repoRoot);
  const scriptDir = __dirname;
  const configFile = path.join(repoRoot, '.ws', 'config.json');
  const baseBranch = detectBase(scriptDir);

  console.log(`==> verify (base: ${baseBranch})`);
  let backendBuild, backendTest, frontendBuild, frontendTest, frontendDir;
  if (fs.existsSync(configFile)) {
    ({ backendBuild, backendTest, frontendBuild, frontendTest, frontendDir } = readVerificationConfig(configFile));
    frontendDir = frontendDir || 'web';
  } else {
    console.log('==> No config.json found — using fallback commands');
    backendBuild = 'dotnet build';
    backendTest = 'dotnet test';
    frontendBuild = 'npm run build';
    frontendTest = 'npm test';
    frontendDir = 'web';
  }

  console.log(`==> ${backendBuild}`);
  if (sh(backendBuild) !== 0) process.exit(1);
  console.log(`==> ${backendTest}`);
  if (sh(backendTest) !== 0) process.exit(1);

  if (frontendTouched(baseBranch)) {
    console.log(`==> ${frontendDir}/ touched — ${frontendTest} + ${frontendBuild}`);
    try { execSync(frontendTest, { stdio: 'inherit', shell: true }); } catch { /* test best-effort, mirrors `|| true` */ }
    if (sh(frontendBuild) !== 0) process.exit(1);
  } else {
    console.log(`==> ${frontendDir}/ not touched — skipping frontend`);
  }

  const integrityGen = path.join(repoRoot, 'bin', 'generate-skill-integrity.js');
  if (fs.existsSync(integrityGen)) {
    console.log('==> node bin/generate-skill-integrity.js --check');
    if (sh(`node "${integrityGen}" --check`) !== 0) process.exit(1);
  }
  console.log('VERIFY_OK');
}

if (require.main === module) main();
module.exports = { main };
