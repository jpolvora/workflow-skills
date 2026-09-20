#!/usr/bin/env node
'use strict';

// Port of detect-base-branch.sh (ws-ship-pr):
// Print the production default branch: master or main.

const { spawnSync } = require('child_process');

function git(args, opts = {}) {
  return spawnSync('git', args, { encoding: 'utf8', ...opts });
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node detect-base-branch.cjs');
    process.exit(0);
  }
  // Prefer gh default branch when available.
  const gh = spawnSync('gh', ['repo', 'view', '--json', 'defaultBranchRef', '-q', '.defaultBranchRef.name'], { encoding: 'utf8' });
  const branch = (gh.stdout || '').trim();
  if (gh.status === 0 && branch) {
    console.log(branch);
    process.exit(0);
  }
  let repoRoot = null;
  try {
    const r = git(['rev-parse', '--show-toplevel']);
    repoRoot = (r.stdout || '').trim() || process.cwd();
  } catch { repoRoot = process.cwd(); }
  for (const candidate of ['master', 'main']) {
    const local = git(['show-ref', '--verify', '--quiet', `refs/heads/${candidate}`], { cwd: repoRoot });
    if (local.status === 0) { console.log(candidate); process.exit(0); }
    const remote = git(['show-ref', '--verify', '--quiet', `refs/remotes/origin/${candidate}`], { cwd: repoRoot });
    if (remote.status === 0) { console.log(candidate); process.exit(0); }
  }
  console.error('ship-pr: could not detect master or main default branch');
  process.exit(1);
}

if (require.main === module) main();
module.exports = { main };
