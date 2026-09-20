#!/usr/bin/env node
'use strict';

// Port of sweep_prior_work.py (ws-spec-provider-github):
// Prior-work sweep for GitHub: search PRs and recent commits.
//
// Usage:
//   node sweep_prior_work.cjs --keywords auth login [--issue 1234] [--files path/a path/b]
//   node sweep_prior_work.cjs --dry-run --keywords test
//
// stdout: JSON with repo-relative paths only. validate-auth first.

const path = require('path');
const { spawnSync } = require('child_process');

// Managed runtime loads from its installed location: the upstream
// package / global skills tree (<skills>/ws-shared) or the project consumer
// hub (<repo>/.ws). Mirrors resolveConsumerContext runtimeSource precedence.
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
const { resolveRepoRoot, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function printHelp() {
  console.log(`Usage: node sweep_prior_work.cjs [--issue N] [--keywords WORD ...] [--files PATH ...] [--repo-root DIR] [--dry-run]

Sweep prior work on GitHub (PR search + git log)

Options:
  --issue N          Tracker issue number (optional)
  --keywords WORD    Keyword variants for PR search
  --files PATH       Paths for git log (optional)
  --repo-root DIR    Consumer repo root
  --dry-run          Advisory mode; skip remote when auth missing`);
}

function parseArgs(argv) {
  const options = { issue: null, keywords: [], files: [], repoRoot: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--issue') {
      const raw = argv[++i];
      if (raw === undefined) {
        console.error('argument --issue: expected one argument');
        process.exit(2);
      }
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --issue: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.issue = value;
    } else if (arg === '--keywords') {
      options.keywords = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        options.keywords.push(argv[++i]);
      }
    } else if (arg === '--files') {
      options.files = [];
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        options.files.push(argv[++i]);
      }
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++i];
      if (options.repoRoot === undefined) {
        console.error('argument --repo-root: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--issue=')) {
      const raw = arg.slice('--issue='.length);
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --issue: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.issue = value;
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

function runGh(args, repoRoot) {
  try {
    const proc = spawnSync('gh', args, { cwd: String(repoRoot), encoding: 'utf8' });
    if (proc.error) {
      return { code: 1, out: '', err: String(proc.error.message || proc.error) };
    }
    return { code: proc.status ?? 1, out: proc.stdout || '', err: proc.stderr || '' };
  } catch (error) {
    return { code: 1, out: '', err: String((error && error.message) || error) };
  }
}

function validateAuth(repoRoot, dryRun) {
  const { code, out, err } = runGh(['auth', 'status'], repoRoot);
  if (code === 0) {
    return { ok: true, message: '' };
  }
  const msg = String(err || out || 'gh auth status failed').trim();
  if (dryRun) {
    return { ok: false, message: msg };
  }
  console.error(msg);
  console.error('Fix: gh auth login (or set GH_TOKEN / GITHUB_TOKEN)');
  return { ok: false, message: msg };
}

function searchPrs(repoRoot, query, dryRun, authOk) {
  if (dryRun && !authOk) {
    return [];
  }
  const { code, out } = runGh(
    ['pr', 'list', '--search', query, '--state', 'all', '--json', 'number,title,state,url,headRefName'],
    repoRoot,
  );
  if (code !== 0) {
    return [];
  }
  let rows;
  try {
    rows = JSON.parse(out || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows.map((row) => ({
    number: row.number,
    pullRequestId: row.number,
    title: row.title,
    state: row.state,
    status: row.state,
    url: row.url,
    headRefName: row.headRefName,
    sourceRefName: row.headRefName,
    searchQuery: query,
  }));
}

function gitLog(repoRoot, files) {
  if (!files || files.length === 0) {
    return [];
  }
  const relFiles = files.map((f) => toRepoRelative(String(repoRoot), f, { allowOutside: true }));
  let proc;
  try {
    proc = spawnSync('git', ['log', '--oneline', '-20', '--', ...relFiles], {
      cwd: String(repoRoot),
      encoding: 'utf8',
    });
  } catch {
    return [];
  }
  if (!proc || proc.status !== 0) {
    return [];
  }
  const commits = [];
  for (const line of String(proc.stdout || '').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const space = trimmed.indexOf(' ');
    if (space === -1) {
      commits.push({ sha: trimmed, subject: '', files: relFiles });
    } else {
      commits.push({ sha: trimmed.slice(0, space), subject: trimmed.slice(space + 1), files: relFiles });
    }
  }
  return commits;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let repoRoot;
  try {
    repoRoot = resolveRepoRoot(args.repoRoot, { scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    process.exit(1);
  }

  const { ok: authOk, message: authMsg } = validateAuth(repoRoot, args.dryRun);
  if (!authOk && !args.dryRun) {
    process.exit(1);
  }
  if (!authOk && args.dryRun) {
    console.log(JSON.stringify({
      status: 'skipped',
      reason: authMsg || 'gh auth not configured',
      provider: 'github',
      issue: args.issue,
      keywords: args.keywords,
      pullRequests: [],
      commits: gitLog(repoRoot, args.files),
      repoRoot: '.',
    }, null, 2));
    return 0;
  }

  const prs = [];
  const seen = new Set();
  if (args.issue !== null && args.issue !== undefined) {
    for (const row of searchPrs(repoRoot, `#${args.issue}`, args.dryRun, authOk)) {
      if (!seen.has(row.number)) {
        seen.add(row.number);
        prs.push(row);
      }
    }
  }
  const kw = args.keywords.join(' ').trim();
  if (kw) {
    for (const row of searchPrs(repoRoot, kw, args.dryRun, authOk)) {
      if (!seen.has(row.number)) {
        seen.add(row.number);
        prs.push(row);
      }
    }
    for (const row of searchPrs(repoRoot, `${kw} is:open`, args.dryRun, authOk)) {
      if (!seen.has(row.number)) {
        seen.add(row.number);
        prs.push(row);
      }
    }
  }

  console.log(JSON.stringify({
    status: 'ok',
    provider: 'github',
    issue: args.issue,
    keywords: args.keywords,
    pullRequests: prs,
    commits: gitLog(repoRoot, args.files),
    repoRoot: '.',
  }, null, 2));
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, validateAuth, searchPrs, gitLog };
