#!/usr/bin/env node
'use strict';

// ws-spec-provider-azure-devops: create a new work item (create-issue intent).
//
// Usage:
//   node create_issue.cjs --title "..." --body-file issue.md [--type Bug] [--dry-run]
//
// The body is an actionable, anonymized defect report. Never include consumer
// repository names, local paths, hostnames, secrets, tracker ids, transcripts,
// or customer data.

const fs = require('fs');
const path = require('path');

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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { fetchRetry } = require(path.join(HUB_SCRIPTS_DIR, 'http_retry.cjs'));

const WIT_API_VERSION = '7.1';

function printHelp() {
  console.log(`Usage: node create_issue.cjs --title TITLE [--body-file FILE | --body TEXT] [--type Bug] [options]

Create an ADO work item (create-issue)

Options:
  --title TITLE        Work item title (required)
  --body-file FILE     Description body file
  --body TEXT          Description body inline
  --type NAME          Work item type (default Bug)
  --repo-root DIR      Consumer repo root
  --org ORG            Override issueTrackers.azureDevOps.org
  --project PROJ       Override issueTrackers.azureDevOps.project
  --api-base URL       Override issueTrackers.azureDevOps.apiBase
  --pat-env NAME       Override issueTrackers.azureDevOps.patEnvVar
  --dry-run            Advisory mode; print the payload without creating`);
}

function parseArgs(argv) {
  const options = {
    title: null, bodyFile: null, body: null, type: 'Bug', repoRoot: null,
    org: '', project: '', apiBase: '', patEnv: '', dryRun: false,
  };
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
    else if (arg === '--type') options.type = next();
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
      if (key === '--title') {
        options.title = value;
        hasTitle = true;
      } else if (key === '--body-file') options.bodyFile = value;
      else if (key === '--body') options.body = value;
      else if (key === '--type') options.type = value;
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
  if (!hasTitle || !String(options.title || '').trim()) {
    console.error('argument --title is required');
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

function buildPatch(title, body) {
  return [
    { op: 'add', path: '/fields/System.Title', value: title },
    { op: 'add', path: '/fields/System.Description', value: body },
  ];
}

async function createWorkItem(ado, title, body, pat) {
  const org = ado.org;
  const project = ado.project;
  const type = String(ado.type || 'Bug').trim() || 'Bug';
  const apiBase = String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, '');
  const url = `${apiBase}/${org}/${project}/_apis/wit/workitems/$${encodeURIComponent(type)}?api-version=${WIT_API_VERSION}`;
  const token = Buffer.from(`:${pat}`, 'utf8').toString('base64');
  const response = await fetchRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/json-patch+json',
      Accept: 'application/json',
    },
    body: JSON.stringify(buildPatch(title, body)),
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

async function main() {
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

  const title = args.title.trim();
  const type = String(args.type || 'Bug').trim() || 'Bug';

  if (args.dryRun) {
    console.log(JSON.stringify({
      status: 'dry-run',
      provider: 'azure-devops',
      type,
      title,
      patch: buildPatch(title, body.trim()),
    }));
    return 0;
  }

  let config;
  try {
    const ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
    config = ctx.config || {};
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  const ado = applyCliOverrides(loadAdoConfig(config), args);
  const { ok, message } = validateAuth(ado);
  if (!ok) {
    console.error(message);
    return 1;
  }

  const patEnv = String((ado && ado.patEnvVar) || 'ADO_PAT').trim();
  const pat = resolvePat(patEnv);
  let created;
  try {
    created = await createWorkItem({ ...ado, type }, title, body.trim(), pat);
  } catch (error) {
    if (error && error.status) {
      console.error(`HTTP Error ${error.status}: ${error.detail || ''}`.trim());
    } else {
      console.error(String((error && error.message) || error));
    }
    return 1;
  }

  const result = {
    status: 'ok',
    provider: 'azure-devops',
    type,
    title,
    id: created.id !== undefined ? created.id : null,
    url: created._links && created._links.html ? created._links.html.href : (created.url || null),
  };
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
  parseArgs, loadAdoConfig, resolvePat, validateAuth, applyCliOverrides, buildPatch, createWorkItem,
};
