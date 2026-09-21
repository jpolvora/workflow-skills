#!/usr/bin/env node
'use strict';

// Port of comment_issue.py (ws-spec-provider-github):
// Post a tracker comment on GitHub (comment-issue intent).
//
// Usage:
//   node comment_issue.cjs --id 1234 --body-file comment.md [--dry-run]
//   node comment_issue.cjs --id null --dry-run   # skipped (local tracker)

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// Managed runtime loads from its installed location: the upstream
// package / global skills tree (<skills>/ws-shared) or the project consumer
// hub (<repo>/.ws). Mirrors resolveConsumerContext runtimeSource precedence.
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
const { resolveRepoRoot } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function printHelp() {
  console.log(`Usage: node comment_issue.cjs --id <issue| null> [--body-file FILE | --body TEXT] [--repo-root DIR] [--dry-run]

Comment on GitHub issue (comment-issue)

Options:
  --id ID              Issue id or null
  --body-file FILE     Comment body file
  --body TEXT          Comment body inline
  --repo-root DIR      Consumer repo root
  --dry-run            Advisory mode; print the payload without posting`);
}

function parseArgs(argv) {
  const options = { id: null, bodyFile: null, body: null, repoRoot: null, dryRun: false };
  let hasId = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--id') {
      options.id = argv[++i];
      if (options.id === undefined) {
        console.error('argument --id: expected one argument');
        process.exit(2);
      }
      hasId = true;
    } else if (arg === '--body-file') {
      options.bodyFile = argv[++i];
      if (options.bodyFile === undefined) {
        console.error('argument --body-file: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--body') {
      options.body = argv[++i];
      if (options.body === undefined) {
        console.error('argument --body: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++i];
      if (options.repoRoot === undefined) {
        console.error('argument --repo-root: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--id=')) {
      options.id = arg.slice('--id='.length);
      hasId = true;
    } else if (arg.startsWith('--body-file=')) {
      options.bodyFile = arg.slice('--body-file='.length);
    } else if (arg.startsWith('--body=')) {
      options.body = arg.slice('--body='.length);
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!hasId) {
    console.error('argument --id is required');
    process.exit(2);
  }
  return options;
}

function validateAuth(repoRoot) {
  const proc = spawnSync('gh', ['auth', 'status'], { cwd: String(repoRoot), encoding: 'utf8' });
  if ((proc.status ?? 1) !== 0) {
    const msg = String(proc.stderr || proc.stdout || 'gh auth status failed').trim();
    console.error(msg);
    console.error('Fix: gh auth login (validate-auth)');
    return false;
  }
  return true;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const issueRaw = String(args.id).trim().toLowerCase();
  if (issueRaw === 'null' || issueRaw === 'none' || issueRaw === '') {
    console.log(JSON.stringify({ status: 'skipped', reason: 'no tracker id' }));
    return 0;
  }

  const issueId = Number(args.id);
  if (!Number.isInteger(issueId)) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'invalid tracker id' }));
    return 0;
  }

  let body = '';
  if (args.bodyFile) {
    body = fs.readFileSync(args.bodyFile, 'utf8');
  } else if (args.body !== null && args.body !== undefined) {
    body = args.body;
  } else {
    console.error('Missing --body-file or --body');
    return 1;
  }

  let repoRoot;
  try {
    repoRoot = resolveRepoRoot(args.repoRoot, { scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    process.exit(1);
  }

  if (args.dryRun) {
    console.log(JSON.stringify({ status: 'dry-run', issueId, body: body.trim() }));
    return 0;
  }

  if (!validateAuth(repoRoot)) {
    return 1;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-comment-'));
  const tmpPath = path.join(tmpDir, 'comment.md');
  try {
    fs.writeFileSync(tmpPath, body, 'utf8');
    const proc = spawnSync('gh', ['issue', 'comment', String(issueId), '--body-file', tmpPath], {
      cwd: String(repoRoot),
      encoding: 'utf8',
    });
    if ((proc.status ?? 1) !== 0) {
      console.error(proc.stderr || proc.stdout);
      return proc.status ?? 1;
    }
  } finally {
    try {
      fs.unlinkSync(tmpPath);
      fs.rmdirSync(tmpDir);
    } catch {
      // Ignore cleanup failures.
    }
  }

  console.log(JSON.stringify({ status: 'ok', issueId }));
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, validateAuth };
