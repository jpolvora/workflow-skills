#!/usr/bin/env node
'use strict';

// ws-spec-provider-github: open a new GitHub issue (create-issue intent).
//
// Usage:
//   node create_issue.cjs --title "..." --body-file issue.md [--label bug] [--dry-run]
//   node create_issue.cjs --title "..." --body "..." --dry-run
//
// The body is an actionable, anonymized defect report. Never include consumer
// repository names, local paths, hostnames, secrets, tracker ids, transcripts,
// or customer data.

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
    : path.join(os.homedir(), '.agents', 'skills');
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
  console.log(`Usage: node create_issue.cjs --title TITLE [--body-file FILE | --body TEXT] [--label NAME]... [--repo-root DIR] [--dry-run]

Open a new GitHub issue (create-issue)

Options:
  --title TITLE        Issue title (required)
  --body-file FILE     Issue body file
  --body TEXT          Issue body inline
  --label NAME         Label to apply (repeatable)
  --repo-root DIR      Consumer repo root
  --dry-run            Advisory mode; print the payload without creating`);
}

function parseArgs(argv) {
  const options = { title: null, bodyFile: null, body: null, labels: [], repoRoot: null, dryRun: false };
  let hasTitle = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[++i];
      if (value === undefined) {
        console.error(`argument ${arg}: expected one argument`);
        process.exit(2);
      }
      return value;
    };
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--title') {
      options.title = next();
      hasTitle = true;
    } else if (arg === '--body-file') options.bodyFile = next();
    else if (arg === '--body') options.body = next();
    else if (arg === '--label') options.labels.push(next());
    else if (arg === '--repo-root') options.repoRoot = next();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (key === '--title') {
        options.title = value;
        hasTitle = true;
      } else if (key === '--body-file') options.bodyFile = value;
      else if (key === '--body') options.body = value;
      else if (key === '--label') options.labels.push(value);
      else if (key === '--repo-root') options.repoRoot = value;
      else {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!hasTitle || !String(options.title || '').trim()) {
    console.error('argument --title is required');
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

  let body = '';
  if (args.bodyFile) {
    body = fs.readFileSync(args.bodyFile, 'utf8');
  } else if (args.body !== null && args.body !== undefined) {
    body = args.body;
  } else {
    console.error('Missing --body-file or --body');
    return 1;
  }

  const labels = args.labels.map((label) => String(label).trim()).filter(Boolean);

  if (args.dryRun) {
    console.log(JSON.stringify({
      status: 'dry-run',
      provider: 'github',
      title: args.title.trim(),
      labels,
      body: body.trim(),
    }));
    return 0;
  }

  let repoRoot;
  try {
    repoRoot = resolveRepoRoot(args.repoRoot, { scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    process.exit(1);
  }

  if (!validateAuth(repoRoot)) {
    return 1;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-create-'));
  const tmpPath = path.join(tmpDir, 'issue.md');
  try {
    fs.writeFileSync(tmpPath, body, 'utf8');
    const cliArgs = ['issue', 'create', '--title', args.title.trim(), '--body-file', tmpPath];
    for (const label of labels) {
      cliArgs.push('--label', label);
    }
    const proc = spawnSync('gh', cliArgs, { cwd: String(repoRoot), encoding: 'utf8' });
    if ((proc.status ?? 1) !== 0) {
      console.error(proc.stderr || proc.stdout);
      return proc.status ?? 1;
    }
    const url = String(proc.stdout || '').trim().split(/\s+/).filter(Boolean).pop() || null;
    const numberMatch = url ? url.match(/\/(\d+)\s*$/) : null;
    console.log(JSON.stringify({
      status: 'ok',
      provider: 'github',
      title: args.title.trim(),
      number: numberMatch ? Number(numberMatch[1]) : null,
      url,
    }));
    return 0;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
      fs.rmdirSync(tmpDir);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, validateAuth };
