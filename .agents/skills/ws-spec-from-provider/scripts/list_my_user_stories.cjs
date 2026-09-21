#!/usr/bin/env node
'use strict';

// Port of list_my_user_stories.py (ws-spec-from-provider):
// List open Azure DevOps User Stories assigned to the PAT identity (JSON stdout).
//
//   node list_my_user_stories.cjs [--repo-root PATH] [--limit N]
//
// Reads issueTrackers.azureDevOps from .ws/config.json.
// WIQL: User Story, not Closed/Removed/Done, Assigned To = @Me.

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

const CLOSED_STATES = ['Closed', 'Removed', 'Done'];

function printHelp() {
  console.log(`Usage: node list_my_user_stories.cjs [--repo-root PATH] [--limit N] [--org ORG] [--project PROJ] [--api-base URL] [--pat-env NAME]

List open ADO User Stories assigned to @Me as JSON

Options:
  --repo-root PATH   Project root owning .ws/config.json
  --limit N          Max stories (0 = all)
  --org ORG          Override issueTrackers.azureDevOps.org
  --project PROJ     Override issueTrackers.azureDevOps.project
  --api-base URL     Override issueTrackers.azureDevOps.apiBase
  --pat-env NAME     Override issueTrackers.azureDevOps.patEnvVar`);
}

function parseArgs(argv) {
  const options = {
    repoRoot: null, limit: 0, org: '', project: '', apiBase: '', patEnv: '',
  };
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
    else if (arg === '--limit') {
      const raw = next();
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --limit: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.limit = value;
    } else if (arg === '--org') options.org = next();
    else if (arg === '--project') options.project = next();
    else if (arg === '--api-base') options.apiBase = next();
    else if (arg === '--pat-env') options.patEnv = next();
    else if (arg.startsWith('--repo-root=')) options.repoRoot = arg.slice('--repo-root='.length);
    else if (arg.startsWith('--limit=')) {
      const raw = arg.slice('--limit='.length);
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --limit: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.limit = value;
    } else if (arg.startsWith('--org=')) options.org = arg.slice('--org='.length);
    else if (arg.startsWith('--project=')) options.project = arg.slice('--project='.length);
    else if (arg.startsWith('--api-base=')) options.apiBase = arg.slice('--api-base='.length);
    else if (arg.startsWith('--pat-env=')) options.patEnv = arg.slice('--pat-env='.length);
    else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return options;
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
  console.error(`Missing PAT. Set env var ${patEnvVar || 'ADO_PAT'} (or AZURE_DEVOPS_PAT).`);
  process.exit(1);
  return '';
}

function authHeaders(pat) {
  const token = Buffer.from(`:${pat}`, 'ascii').toString('base64');
  return {
    Authorization: `Basic ${token}`,
    Accept: 'application/json; api-version=7.1',
    'Content-Type': 'application/json',
  };
}

function loadAdoTracker(config) {
  const cfg = config || {};
  const trackers = cfg.issueTrackers || {};
  const ado = trackers.azureDevOps || {};
  const org = String(ado.org || '').trim();
  const project = String(ado.project || '').trim();
  if (!org || !project) {
    console.error('issueTrackers.azureDevOps.org and .project are required in config.json');
    process.exit(1);
  }
  return {
    org,
    project,
    apiBase: String(ado.apiBase || 'https://dev.azure.com').replace(/\/+$/, ''),
    patEnvVar: String(ado.patEnvVar || 'ADO_PAT').trim() || 'ADO_PAT',
  };
}

// urllib.parse.quote default (safe='/'): encode like Python.
function pyQuote(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/gi, '/');
}

function buildWiql(project) {
  const stateClause = CLOSED_STATES.map((state) => `[System.State] <> '${state}'`).join(' AND ');
  return 'SELECT [System.Id], [System.Title], [System.State] '
    + 'FROM WorkItems '
    + `WHERE [System.TeamProject] = '${String(project).replace(/'/g, "''")}' `
    + "AND [System.WorkItemType] = 'User Story' "
    + `AND ${stateClause} `
    + 'AND [System.AssignedTo] = @Me '
    + 'ORDER BY [System.ChangedDate] DESC';
}

async function wiqlQuery(org, project, apiBase, pat, wiql) {
  const base = String(apiBase).replace(/\/+$/, '');
  const url = `${base}/${pyQuote(org)}/${pyQuote(project)}/_apis/wit/wiql?api-version=7.1`;
  let response;
  try {
    response = await fetchRetry(url, {
      method: 'POST',
      headers: authHeaders(pat),
      body: JSON.stringify({ query: wiql }),
    }, { attempts: 3, delay: 500 });
  } catch (error) {
    console.error(`Azure DevOps WIQL error: ${error.message || error}`);
    process.exit(1);
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Azure DevOps WIQL HTTP ${response.status}: ${detail}`);
    process.exit(1);
  }
  const payload = await response.json();
  const ids = [];
  for (const row of (payload && payload.workItems) || []) {
    if (row && row.id !== null && row.id !== undefined) {
      ids.push(parseInt(row.id, 10));
    }
  }
  return ids;
}

async function fetchWorkItemsBatch(org, project, apiBase, pat, ids) {
  if (!ids || ids.length === 0) {
    return [];
  }
  const base = String(apiBase).replace(/\/+$/, '');
  // WIT batch get supports up to 200 ids per call
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const idCsv = chunk.join(',');
    const url = `${base}/${pyQuote(org)}/${pyQuote(project)}`
      + `/_apis/wit/workitems?ids=${idCsv}`
      + '&fields=System.Id,System.Title,System.State'
      + '&api-version=7.1';
    let response;
    try {
      response = await fetchRetry(url, { method: 'GET', headers: authHeaders(pat) }, { attempts: 3, delay: 500 });
    } catch (error) {
      console.error(`Azure DevOps workitems error: ${error.message || error}`);
      process.exit(1);
    }
    if (!response.ok) {
      const detail = await response.text();
      console.error(`Azure DevOps workitems HTTP ${response.status}: ${detail}`);
      process.exit(1);
    }
    const payload = await response.json();
    out.push(...((payload && payload.value) || []));
  }
  return out;
}

function workItemUrl(apiBase, org, project, workItemId) {
  // Prefer board UI URL shape used by consumers
  const host = String(apiBase).replace(/\/+$/, '');
  return `${host}/${org}/${pyQuote(project)}/_workitems/edit/${workItemId}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let ctx;
  try {
    ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  const tracker = loadAdoTracker(ctx.config);
  const org = args.org.trim() || tracker.org;
  const project = args.project.trim() || tracker.project;
  const apiBase = args.apiBase.trim() || tracker.apiBase;
  const patEnv = args.patEnv.trim() || tracker.patEnvVar;
  const pat = resolvePat(patEnv);

  let ids = await wiqlQuery(org, project, apiBase, pat, buildWiql(project));
  if (args.limit && args.limit > 0) {
    ids = ids.slice(0, args.limit);
  }

  const items = await fetchWorkItemsBatch(org, project, apiBase, pat, ids);
  const byId = new Map();
  for (const w of items) {
    if (w && w.id !== null && w.id !== undefined) {
      byId.set(parseInt(w.id, 10), w);
    }
  }

  const out = [];
  for (const wid of ids) {
    const wi = byId.get(wid) || {};
    const fields = wi.fields || {};
    out.push({
      id: wid,
      title: String(fields['System.Title'] || '').trim(),
      url: workItemUrl(apiBase, org, project, wid),
      state: String(fields['System.State'] || '').trim(),
    });
  }

  console.log(JSON.stringify(out, null, 2));
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

module.exports = { parseArgs, buildWiql, workItemUrl, loadAdoTracker, resolvePat };
