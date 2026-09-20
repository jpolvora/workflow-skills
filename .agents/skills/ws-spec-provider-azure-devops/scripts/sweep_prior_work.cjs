#!/usr/bin/env node
'use strict';

// Port of sweep_prior_work.py (ws-spec-provider-azure-devops):
// Prior-work sweep for Azure DevOps: search PRs and recent commits.
//
// Usage:
//   node sweep_prior_work.cjs --keywords auth login [--issue 1234] [--files path/a]
//   node sweep_prior_work.cjs --dry-run --keywords test
//
// stdout: JSON with repo-relative paths only. validate-auth first.

const fs = require('fs');
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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { fetchRetry } = require(path.join(HUB_SCRIPTS_DIR, 'http_retry.cjs'));

const ADO_STATE_TO_GH = { active: 'OPEN', completed: 'CLOSED', abandoned: 'CLOSED' };

function printHelp() {
  console.log(`Usage: node sweep_prior_work.cjs [--issue N] [--keywords WORD ...] [--files PATH ...] [--repo-root DIR] [--dry-run]

Sweep prior work on Azure DevOps

Options:
  --issue N            Work item number (optional)
  --keywords WORD      Keyword variants for PR search
  --files PATH         Paths for git log (optional)
  --repo-root DIR      Consumer repo root
  --dry-run            Advisory mode; skip remote when auth missing`);
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

function loadAdoConfig(repoRoot, config) {
  const cfg = config || {};
  const trackers = cfg.issueTrackers || {};
  const ado = trackers.azureDevOps || {};
  return (ado && typeof ado === 'object') ? ado : {};
}

function resolvePat(patEnvVar) {
  for (const key of [patEnvVar, 'ADO_PAT', 'AZURE_DEVOPS_PAT']) {
    if (!key) {
      continue;
    }
    const value = String(process.env[key] || '').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function validateAuth(ado, dryRun) {
  const org = String((ado && ado.org) || '').trim();
  const project = String((ado && ado.project) || '').trim();
  const patEnv = String((ado && ado.patEnvVar) || 'ADO_PAT').trim();
  const pat = resolvePat(patEnv);
  if (!org || !project) {
    const msg = 'Missing issueTrackers.azureDevOps org/project in config.json';
    if (dryRun) {
      return { ok: false, message: msg };
    }
    console.error(msg);
    console.error('Fix: configure issueTrackers.azureDevOps (validate-auth)');
    return { ok: false, message: msg };
  }
  if (!pat) {
    const msg = `Missing PAT: set ${patEnv} or ADO_PAT (validate-auth)`;
    if (dryRun) {
      return { ok: false, message: msg };
    }
    console.error(msg);
    console.error('Fix: configure issueTrackers.azureDevOps and set ADO_PAT (validate-auth)');
    return { ok: false, message: msg };
  }
  return { ok: true, message: '' };
}

async function apiGet(url, pat) {
  const token = Buffer.from(`:${pat}`, 'utf8').toString('base64');
  const response = await fetchRetry(url, {
    method: 'GET',
    headers: { Authorization: `Basic ${token}`, Accept: 'application/json' },
  }, { attempts: 3, delay: 500 });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

function prWebUrl(pr) {
  const links = pr._links || {};
  const web = links.web || {};
  if (web.href) {
    return String(web.href);
  }
  return String(pr.url || '');
}

function normalizeHeadRef(ref) {
  if (!ref) {
    return '';
  }
  const value = String(ref).trim();
  const prefix = 'refs/heads/';
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

function prRow(pr, searchText) {
  const pid = pr.pullRequestId;
  const nativeStatus = pr.status;
  const normalizedState = ADO_STATE_TO_GH[String(nativeStatus || '').toLowerCase()] ?? (nativeStatus || '');
  const src = normalizeHeadRef(pr.sourceRefName);
  return {
    number: pid,
    pullRequestId: pid,
    title: pr.title || '',
    state: normalizedState,
    status: nativeStatus,
    url: prWebUrl(pr),
    headRefName: src,
    sourceRefName: src,
    searchText,
  };
}

async function listProjectPrs(ado, pat, top = 100) {
  const org = ado.org;
  const project = ado.project;
  const apiBase = String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, '');
  const url = `${apiBase}/${org}/${project}/_apis/git/pullrequests?searchCriteria.status=all&$top=${top}&api-version=7.1`;
  try {
    const data = await apiGet(url, pat);
    return Array.from((data && data.value) || []);
  } catch {
    return [];
  }
}

async function fetchPrById(ado, pat, pullRequestId) {
  const org = ado.org;
  const project = ado.project;
  const apiBase = String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, '');
  const url = `${apiBase}/${org}/${project}/_apis/git/pullrequests/${pullRequestId}?api-version=7.1`;
  try {
    return await apiGet(url, pat);
  } catch {
    return null;
  }
}

function parsePrIdFromRelation(url) {
  if (!String(url).includes('PullRequestId')) {
    return null;
  }
  const decoded = decodeURIComponent(String(url));
  let match = decoded.match(/PullRequestId[/\\](?:[^/%\\]+[/\\]){2}(\d+)\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  match = decoded.match(/PullRequestId[/\\](\d+)\b/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

async function searchPrsByWorkItem(ado, pat, workItemId) {
  const org = ado.org;
  const project = ado.project;
  const apiBase = String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, '');
  const url = `${apiBase}/${org}/${project}/_apis/wit/workitems/${workItemId}?$expand=relations&api-version=7.1`;
  let data;
  try {
    data = await apiGet(url, pat);
  } catch {
    return [];
  }
  const rows = [];
  const seen = new Set();
  const searchText = String(workItemId);
  for (const rel of (data && data.relations) || []) {
    const prId = parsePrIdFromRelation((rel && rel.url) || '');
    if (prId === null || seen.has(prId)) {
      continue;
    }
    const pr = await fetchPrById(ado, pat, prId);
    if (!pr) {
      continue;
    }
    seen.add(prId);
    rows.push(prRow(pr, searchText));
  }
  return rows;
}

async function searchPrs(ado, pat, searchText) {
  const needle = String(searchText).trim().toLowerCase();
  if (!needle) {
    return [];
  }
  const rows = [];
  for (const pr of await listProjectPrs(ado, pat)) {
    const hay = `${pr.title || ''} ${pr.description || ''}`.toLowerCase();
    if (!hay.includes(needle)) {
      continue;
    }
    rows.push(prRow(pr, searchText));
  }
  return rows;
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
  if (!proc || (proc.status ?? 1) !== 0) {
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

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let repoRoot;
  let config;
  try {
    const ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
    repoRoot = ctx.repoRoot;
    config = ctx.config || {};
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  const ado = loadAdoConfig(repoRoot, config);
  const { ok: authOk, message: authMsg } = validateAuth(ado, args.dryRun);
  if (!authOk && !args.dryRun) {
    return 1;
  }
  if (!authOk && args.dryRun) {
    console.log(JSON.stringify({
      status: 'skipped',
      reason: authMsg || 'ADO auth not configured',
      provider: 'azure-devops',
      issue: args.issue,
      keywords: args.keywords,
      pullRequests: [],
      commits: gitLog(repoRoot, args.files),
      repoRoot: '.',
    }, null, 2));
    return 0;
  }

  const patEnv = String((ado && ado.patEnvVar) || 'ADO_PAT').trim();
  const pat = resolvePat(patEnv);
  const prs = [];
  const seen = new Set();
  if (args.issue !== null && args.issue !== undefined) {
    for (const row of await searchPrsByWorkItem(ado, pat, args.issue)) {
      const pid = row.pullRequestId;
      if (!seen.has(pid)) {
        seen.add(pid);
        prs.push(row);
      }
    }
    for (const row of await searchPrs(ado, pat, String(args.issue))) {
      const pid = row.pullRequestId;
      if (!seen.has(pid)) {
        seen.add(pid);
        prs.push(row);
      }
    }
  }
  const kw = args.keywords.join(' ').trim();
  if (kw) {
    for (const row of await searchPrs(ado, pat, kw)) {
      const pid = row.pullRequestId;
      if (!seen.has(pid)) {
        seen.add(pid);
        prs.push(row);
      }
    }
  }

  console.log(JSON.stringify({
    status: 'ok',
    provider: 'azure-devops',
    issue: args.issue,
    keywords: args.keywords,
    pullRequests: prs,
    commits: gitLog(repoRoot, args.files),
    repoRoot: '.',
  }, null, 2));
  return 0;
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      console.error(String((error && error.message) || error));
      process.exit(1);
    },
  );
}

module.exports = {
  parseArgs, loadAdoConfig, resolvePat, validateAuth, prRow,
  normalizeHeadRef, parsePrIdFromRelation, gitLog,
};
