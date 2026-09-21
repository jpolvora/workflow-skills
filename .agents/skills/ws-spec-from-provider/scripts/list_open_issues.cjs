#!/usr/bin/env node
'use strict';

// Port of list_open_issues.py (ws-spec-from-provider):
// List open GitHub issues for the configured consumer repo (JSON stdout).
//
//   node list_open_issues.cjs [--repo-root PATH] [--limit N] [--owner ORG] [--repo NAME]
//
// Reads issueTrackers.github from .ws/config.json. Requires `gh` on PATH.
// Uncapped runs use `gh api --paginate` so results are not silently truncated at 1000.

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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function printHelp() {
  console.log(`Usage: node list_open_issues.cjs [--repo-root PATH] [--limit N] [--owner ORG] [--repo NAME]

List open GitHub issues as JSON

Options:
  --repo-root PATH   Project root owning .ws/config.json
  --owner ORG        Override issueTrackers.github.owner
  --repo NAME        Override issueTrackers.github.repo
  --limit N          Max issues (0 = all)`);
}

function parseArgs(argv) {
  const options = { repoRoot: null, owner: '', repo: '', limit: 0 };
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
    } else if (arg === '--repo-root') options.repoRoot = next();
    else if (arg === '--owner') options.owner = next();
    else if (arg === '--repo') options.repo = next();
    else if (arg === '--limit') {
      const raw = next();
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --limit: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.limit = value;
    } else if (arg.startsWith('--repo-root=')) options.repoRoot = arg.slice('--repo-root='.length);
    else if (arg.startsWith('--owner=')) options.owner = arg.slice('--owner='.length);
    else if (arg.startsWith('--repo=')) options.repo = arg.slice('--repo='.length);
    else if (arg.startsWith('--limit=')) {
      const raw = arg.slice('--limit='.length);
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --limit: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.limit = value;
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
}

function loadGithubTracker(repoRoot, config, configPath) {
  const cfg = config || {};
  const trackers = cfg.issueTrackers || {};
  const gh = trackers.github || {};
  const owner = String(gh.owner || '').trim();
  const repo = String(gh.repo || '').trim();
  if (!owner || !repo) {
    console.error('issueTrackers.github.owner and .repo are required in config.json');
    process.exit(1);
  }
  void repoRoot;
  void configPath;
  return { owner, repo };
}

function runGh(cmd) {
  try {
    const proc = spawnSync(cmd[0], cmd.slice(1), { encoding: 'utf8' });
    if (proc.error) {
      if (proc.error.code === 'ENOENT') {
        console.error('Error: `gh` not found on PATH');
        process.exit(1);
      }
      console.error(`Error: gh failed: ${proc.error.message || proc.error}`);
      process.exit(1);
    }
    return proc;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      console.error('Error: `gh` not found on PATH');
      process.exit(1);
    }
    throw error;
  }
  return null;
}

function parsePaginatedIssues(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return [];
  }
  let issues = [];
  if (text.startsWith('[')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        issues = parsed;
      }
    } catch {
      const fixed = text.replace(/\]\[/g, '],[');
      try {
        const pages = JSON.parse(`[${fixed}]`);
        issues = pages.flat();
      } catch (error) {
        console.error(`Error: invalid gh api JSON — ${error.message}`);
        process.exit(1);
      }
    }
  } else {
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let page;
      try {
        page = JSON.parse(trimmed);
      } catch (error) {
        console.error(`Error: invalid gh api JSON — ${error.message}`);
        process.exit(1);
      }
      if (Array.isArray(page)) {
        issues.push(...page);
      } else if (page && typeof page === 'object') {
        issues.push(page);
      }
    }
  }
  return issues.filter(
    (item) => item && typeof item === 'object'
      && !('pull_request' in item)
      && item.number !== null && item.number !== undefined,
  );
}

function listViaApi(owner, repo) {
  const completed = runGh(['gh', 'api', '--paginate', `repos/${owner}/${repo}/issues?state=open&per_page=100`]);
  if ((completed.status ?? 1) !== 0) {
    const err = String(completed.stderr || completed.stdout || '').trim();
    console.error(`Error: gh api issues failed: ${err}`);
    process.exit(completed.status || 1);
  }
  return parsePaginatedIssues(completed.stdout || '');
}

function listViaIssueList(owner, repo, limit) {
  const completed = runGh([
    'gh', 'issue', 'list', '--repo', `${owner}/${repo}`, '--state', 'open',
    '--json', 'number,title,url,state,labels,assignees', '--limit', String(limit),
  ]);
  if ((completed.status ?? 1) !== 0) {
    const err = String(completed.stderr || completed.stdout || '').trim();
    console.error(`Error: gh issue list failed: ${err}`);
    process.exit(completed.status || 1);
  }
  let issues;
  try {
    issues = JSON.parse(completed.stdout || '[]');
  } catch (error) {
    console.error(`Error: invalid gh JSON — ${error.message}`);
    process.exit(1);
  }
  if (!Array.isArray(issues)) {
    return [];
  }
  return issues.filter((item) => item && typeof item === 'object' && item.number !== null && item.number !== undefined);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let ctx;
  try {
    ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  let tracker;
  try {
    tracker = loadGithubTracker(ctx.repoRoot, ctx.config, ctx.configPath);
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }
  let { owner, repo } = tracker;
  if (args.owner.trim()) {
    owner = args.owner.trim();
  }
  if (args.repo.trim()) {
    repo = args.repo.trim();
  }

  const collected = (args.limit && args.limit > 0)
    ? listViaIssueList(owner, repo, args.limit)
    : listViaApi(owner, repo);

  const out = [];
  for (const item of collected) {
    const number = item.number;
    if (number === null || number === undefined) {
      continue;
    }
    out.push({
      id: parseInt(number, 10),
      title: String(item.title || '').trim(),
      url: String(item.url || item.html_url || '').trim(),
      state: String(item.state || '').trim(),
    });
  }

  console.log(JSON.stringify(out, null, 2));
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, parsePaginatedIssues, loadGithubTracker };
