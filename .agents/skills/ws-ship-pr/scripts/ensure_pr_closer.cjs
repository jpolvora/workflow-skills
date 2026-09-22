#!/usr/bin/env node
'use strict';

// ensure_pr_closer.cjs (ws-ship-pr) — GitHub PR-body auto-close guard.
//
// Guarantees the PR body carries a closing keyword for the source tracker
// issue, so merging the PR closes the issue. GitHub is the only supported SCM
// for body-driven auto-close; other providers skip without writing.
//
// Idempotent: a body that already contains `Closes #N` (or Fixes/Resolves,
// case-insensitive) is left byte-identical.
//
// Usage:
//   node ensure_pr_closer.cjs --body-file {plansDir}/pr-body.md --id 1234 [--provider github] [--dry-run]
//   node ensure_pr_closer.cjs --body-file pr-body.md --id null                       # skipped
//   node ensure_pr_closer.cjs --body-file pr-body.md --id 1234 --provider azure-devops  # skipped

const fs = require('fs');
const path = require('path');

function printHelp() {
  console.log(`Usage: node ensure_pr_closer.cjs --body-file FILE --id <issue| null> [options]

Ensure the PR body carries a GitHub auto-close keyword (Closes #N) for the
source tracker issue. Idempotent; no-op for null ids and non-GitHub providers.

Options:
  --body-file FILE     PR body file (created when missing and a close applies)
  --id ID              Tracker issue id, or null/none for local specs
  --provider NAME      providers.scm value (default github)
  --dry-run            Print the planned change without writing
  --help, -h           Show this help`);
}

function parseArgs(argv) {
  const options = { bodyFile: null, id: 'null', provider: 'github', dryRun: false };
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
    } else if (arg === '--body-file') options.bodyFile = next();
    else if (arg === '--id') options.id = next();
    else if (arg === '--provider') options.provider = next();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--body-file=')) options.bodyFile = arg.slice('--body-file='.length);
    else if (arg.startsWith('--id=')) options.id = arg.slice('--id='.length);
    else if (arg.startsWith('--provider=')) options.provider = arg.slice('--provider='.length);
    else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!options.bodyFile) {
    console.error('argument --body-file is required');
    process.exit(2);
  }
  return options;
}

function closerPattern(issueId) {
  return new RegExp(
    `(?:^|\\n)\\s*(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s*:?\\s*#${issueId}\\b`,
    'i',
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const bodyFile = path.resolve(args.bodyFile);

  const provider = String(args.provider || 'github').trim().toLowerCase();
  const issueRaw = String(args.id).trim().toLowerCase();
  const issueId = issueRaw === 'null' || issueRaw === 'none' || issueRaw === ''
    ? null
    : Number(args.id);

  if (issueId === null || !Number.isInteger(issueId) || issueId <= 0) {
    console.log(JSON.stringify({ status: 'skipped', reason: 'no tracker id', provider }));
    return 0;
  }

  if (provider !== 'github') {
    console.log(JSON.stringify({
      status: 'skipped',
      reason: `provider ${provider} does not auto-close from the PR body`,
      provider,
    }));
    return 0;
  }

  const exists = fs.existsSync(bodyFile);
  const existing = exists ? fs.readFileSync(bodyFile, 'utf8') : '';

  if (closerPattern(issueId).test(existing)) {
    console.log(JSON.stringify({
      status: 'unchanged', provider, issueId, bodyFile, added: false, created: false,
    }));
    return 0;
  }

  const next = existing.trim() === ''
    ? `Closes #${issueId}\n`
    : `${existing.replace(/\s+$/, '')}\n\nCloses #${issueId}\n`;

  if (args.dryRun) {
    console.log(JSON.stringify({
      status: 'dry-run', provider, issueId, bodyFile, added: true, created: !exists, body: next,
    }));
    return 0;
  }

  fs.mkdirSync(path.dirname(bodyFile), { recursive: true });
  fs.writeFileSync(bodyFile, next, 'utf8');
  console.log(JSON.stringify({
    status: 'ok', provider, issueId, bodyFile, added: true, created: !exists,
  }));
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, closerPattern };
