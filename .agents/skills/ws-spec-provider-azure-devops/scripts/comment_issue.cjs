#!/usr/bin/env node
'use strict';

// Port of comment_issue.py (ws-spec-provider-azure-devops):
// Post a work-item comment on Azure DevOps (comment-issue intent).
//
// WIT Comments REST api-version=7.1-preview.4 (not PR discussion threads).
//
// The comments resource is still a preview API. `api-version=7.1` returns
// HTTP 400 VssInvalidPreviewVersionException ("The -preview flag must be supplied").

const fs = require('fs');
const path = require('path');

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
const { fetchRetry } = require(path.join(HUB_SCRIPTS_DIR, 'http_retry.cjs'));

const WIT_COMMENTS_API_VERSION = '7.1-preview.4';

function printHelp() {
  console.log(`Usage: node comment_issue.cjs --id <work-item| null> [--body-file FILE | --body TEXT] [options]

Comment on ADO work item (comment-issue)

Options:
  --id ID              Work item id or null
  --body-file FILE     Comment body file
  --body TEXT          Comment body inline
  --repo-root DIR      Consumer repo root
  --org ORG            Override issueTrackers.azureDevOps.org
  --project PROJ       Override issueTrackers.azureDevOps.project
  --api-base URL       Override issueTrackers.azureDevOps.apiBase
  --pat-env NAME       Override issueTrackers.azureDevOps.patEnvVar
  --dry-run            Advisory mode; print the payload without posting`);
}

function parseArgs(argv) {
  const options = {
    id: null, bodyFile: null, body: null, repoRoot: null,
    org: '', project: '', apiBase: '', patEnv: '', dryRun: false,
  };
  let hasId = false;
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
    } else if (arg === '--id') {
      options.id = next();
      hasId = true;
    } else if (arg === '--body-file') options.bodyFile = next();
    else if (arg === '--body') options.body = next();
    else if (arg === '--repo-root') options.repoRoot = next();
    else if (arg === '--org') options.org = next();
    else if (arg === '--project') options.project = next();
    else if (arg === '--api-base') options.apiBase = next();
    else if (arg === '--pat-env') options.patEnv = next();
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (key === '--id') {
        options.id = value;
        hasId = true;
      } else if (key === '--body-file') options.bodyFile = value;
      else if (key === '--body') options.body = value;
      else if (key === '--repo-root') options.repoRoot = value;
      else if (key === '--org') options.org = value;
      else if (key === '--project') options.project = value;
      else if (key === '--api-base') options.apiBase = value;
      else if (key === '--pat-env') options.patEnv = value;
      else {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
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

function loadAdoConfig(config) {
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

function validateAuth(ado) {
  const org = String((ado && ado.org) || '').trim();
  const project = String((ado && ado.project) || '').trim();
  const patEnv = String((ado && ado.patEnvVar) || 'ADO_PAT').trim();
  if (!org || !project) {
    return { ok: false, message: 'Missing issueTrackers.azureDevOps org/project' };
  }
  if (!resolvePat(patEnv)) {
    return { ok: false, message: `Missing PAT: set ${patEnv} or ADO_PAT (validate-auth)` };
  }
  return { ok: true, message: '' };
}

async function postComment(ado, workItemId, body, pat) {
  const org = ado.org;
  const project = ado.project;
  const apiBase = String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, '');
  const url = `${apiBase}/${org}/${project}/_apis/wit/workItems/${workItemId}/comments?api-version=${WIT_COMMENTS_API_VERSION}`;
  const token = Buffer.from(`:${pat}`, 'utf8').toString('base64');
  const response = await fetchRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ text: body }),
  }, { attempts: 3, delay: 500 });
  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`HTTP Error ${response.status}: ${detail || response.statusText}`);
    error.status = response.status;
    error.detail = detail;
    throw error;
  }
  const raw = await response.text();
  if (!raw.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch {
    return {};
  }
}

function applyCliOverrides(ado, args) {
  const out = { ...ado };
  if (String(args.org || '').trim()) {
    out.org = args.org.trim();
  }
  if (String(args.project || '').trim()) {
    out.project = args.project.trim();
  }
  if (String(args.apiBase || '').trim()) {
    out.apiBase = args.apiBase.trim();
  }
  if (String(args.patEnv || '').trim()) {
    out.patEnvVar = args.patEnv.trim();
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const issueRaw = String(args.id).trim().toLowerCase();
  if (issueRaw === 'null' || issueRaw === 'none' || issueRaw === '') {
    console.log(JSON.stringify({ status: 'skipped', reason: 'no tracker id' }));
    return 0;
  }

  const workItemId = Number(args.id);
  if (!Number.isInteger(workItemId)) {
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

  if (args.dryRun) {
    console.log(JSON.stringify({ status: 'dry-run', workItemId, body: body.trim() }));
    return 0;
  }

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
  void repoRoot;

  const ado = applyCliOverrides(loadAdoConfig(config), args);
  const { ok, message } = validateAuth(ado);
  if (!ok) {
    console.error(message);
    return 1;
  }

  const patEnv = String((ado && ado.patEnvVar) || 'ADO_PAT').trim();
  const pat = resolvePat(patEnv);
  let posted;
  try {
    posted = await postComment(ado, workItemId, body.trim(), pat);
  } catch (error) {
    if (error && error.status) {
      console.error(`HTTP Error ${error.status}: ${error.detail || ''}`.trim());
    } else {
      console.error(String((error && error.message) || error));
    }
    return 1;
  }

  const result = { status: 'ok', workItemId };
  const commentId = posted.commentId !== undefined ? posted.commentId : posted.id;
  if (commentId !== undefined && commentId !== null) {
    result.commentId = commentId;
  }
  console.log(JSON.stringify(result));
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
  parseArgs, loadAdoConfig, resolvePat, validateAuth, postComment, applyCliOverrides,
};
