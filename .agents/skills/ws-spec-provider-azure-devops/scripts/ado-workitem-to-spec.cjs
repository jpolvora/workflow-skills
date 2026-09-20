#!/usr/bin/env node
'use strict';

// Port of ado-workitem-to-spec.py (ws-spec-provider-azure-devops):
// Fetch or convert an Azure DevOps work item into the spec of record.
//
// Fetch (live API):
//   set ADO_PAT=...
//   node ado-workitem-to-spec.cjs \
//     --org contoso --project MyProject --id 2416 \
//     --snapshot {plansDir}/us-2416/step-00-us-2416.issue.json
//
// Convert (offline JSON from WIT API):
//   node ado-workitem-to-spec.cjs \
//     --input workitem.json \
//     --org contoso --project MyProject
//
// Output defaults via `resolve_spec_path.cjs --slug {unprefixedSlug}`.
// `--skip-assets` skips the shared visual ingest helper (fixture/tests only).

const fs = require('fs');
const os = require('os');
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
const { fetchRetry } = require(path.join(HUB_SCRIPTS_DIR, 'http_retry.cjs'));

const DEFAULT_SPECS_DIR = '.agents/specs';
const WIT_COMMENTS_API_VERSION = '7.1-preview.4';
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const AC_HEADING = /^(?:#{1,6}\s*)?(crit[eé]rios?\s+de\s+aceite|acceptance\s+criteria|ac[s]?)\b\.?$/i;

function printHelp() {
  console.log(`Usage: node ado-workitem-to-spec.cjs [--input <file|-> | --id N --org ORG --project PROJ] [options]

Fetch/convert Azure DevOps work item JSON into canonical *.spec.md

Options:
  --input FILE           Path to WIT JSON file, or '-' for stdin (offline mode)
  --output FILE          Output path for *.spec.md (default: resolve_spec_path.cjs --slug {unprefixedSlug})
  --specs-dir DIR        Override plans.specsDir for the default output path
  --repo-root DIR        Project root owning .ws/config.json (default: CWD when it has a hub)
  --snapshot FILE        Optional path to write raw issue/work-item JSON
  --id N                 Work item id (live fetch mode)
  --org ORG              Azure DevOps organization
  --project PROJ         Azure DevOps project
  --api-base URL         API base URL (default https://dev.azure.com)
  --pat-env NAME         Env var name holding the PAT (default ADO_PAT; also tries AZURE_DEVOPS_PAT)
  --force                Overwrite an existing spec of record when content differs
  --skip-assets          Skip visual attachment ingest (fixture/tests only)`);
}

function parseArgs(argv) {
  const options = {
    input: null, output: null, specsDir: null, repoRoot: null, snapshot: null,
    id: null, org: '', project: '', apiBase: 'https://dev.azure.com',
    patEnv: 'ADO_PAT', force: false, skipAssets: false,
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
    } else if (arg === '--input') options.input = next();
    else if (arg === '--output') options.output = next();
    else if (arg === '--specs-dir') options.specsDir = next();
    else if (arg === '--repo-root') options.repoRoot = next();
    else if (arg === '--snapshot') options.snapshot = next();
    else if (arg === '--id') {
      const raw = next();
      const value = Number(raw);
      if (!Number.isInteger(value)) {
        console.error(`argument --id: invalid int value: '${raw}'`);
        process.exit(2);
      }
      options.id = value;
    } else if (arg === '--org') options.org = next();
    else if (arg === '--project') options.project = next();
    else if (arg === '--api-base') options.apiBase = next();
    else if (arg === '--pat-env') options.patEnv = next();
    else if (arg === '--force') options.force = true;
    else if (arg === '--skip-assets') options.skipAssets = true;
    else if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq === -1) {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
      const key = arg.slice(0, eq);
      const value = arg.slice(eq + 1);
      if (key === '--input') options.input = value;
      else if (key === '--output') options.output = value;
      else if (key === '--specs-dir') options.specsDir = value;
      else if (key === '--repo-root') options.repoRoot = value;
      else if (key === '--snapshot') options.snapshot = value;
      else if (key === '--id') {
        const n = Number(value);
        if (!Number.isInteger(n)) {
          console.error(`argument --id: invalid int value: '${value}'`);
          process.exit(2);
        }
        options.id = n;
      } else if (key === '--org') options.org = value;
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
  return options;
}

function localDateIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// urllib.parse.quote default (safe='/'): encode like Python.
function pyQuote(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/gi, '/');
}

function decodeHtmlEntities(text) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  };
  return String(text)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return _;
      }
    })
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 10));
      } catch {
        return _;
      }
    })
    .replace(/&([a-zA-Z]+);/g, (m, name) => (named[name] !== undefined ? named[name] : m));
}

function imgTagToMarkdown(tag) {
  const src = String(tag).match(/src=["']([^"']+)["']/i);
  if (!src) {
    return '';
  }
  const alt = String(tag).match(/alt=["']([^"']*)["']/i);
  return `![${alt ? alt[1] : ''}](${src[1]})`;
}

function cleanHtml(value) {
  if (!value) {
    return '';
  }
  let text = String(value).replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<img\b[^>]*>/gi, (m) => imgTagToMarkdown(m));
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)\s*>/gi, '\n');
  text = text.replace(/<(p|div|h[1-6]|li|tr)(\s[^>]*)?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function splitBody(body) {
  const normalized = String(body || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { description: '', acItems: [] };
  }
  const lines = normalized.split('\n');
  let acStart = null;
  for (let idx = 0; idx < lines.length; idx += 1) {
    if (AC_HEADING.test(lines[idx].trim())) {
      acStart = idx;
      break;
    }
  }
  if (acStart === null) {
    return { description: normalized, acItems: [] };
  }
  const description = lines.slice(0, acStart).join('\n').trim();
  const acItems = [];
  for (const line of lines.slice(acStart + 1)) {
    const stripped = line.trim();
    if (!stripped) {
      continue;
    }
    if (stripped.startsWith('#')) {
      break;
    }
    let item = stripped.replace(/^(?:[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s+)/, '').trim();
    item = item.replace(/^-?\s*\[[ xX]\]\s*/, '').trim();
    if (item) {
      acItems.push(item);
    }
  }
  return { description, acItems };
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

async function fetchWorkItem(org, project, workItemId, pat, apiBase) {
  const base = String(apiBase).replace(/\/+$/, '');
  const url = `${base}/${pyQuote(org)}/${pyQuote(project)}/_apis/wit/workitems/${workItemId}?$expand=all&api-version=7.1`;
  let response;
  try {
    response = await fetchRetry(url, { method: 'GET', headers: authHeaders(pat) }, { attempts: 3, delay: 500 });
  } catch (error) {
    console.error(`Azure DevOps HTTP error: ${error.message || error}`);
    process.exit(1);
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Azure DevOps HTTP ${response.status}: ${detail}`);
    process.exit(1);
  }
  return response.json();
}

async function fetchComments(org, project, workItemId, pat, apiBase) {
  const base = String(apiBase).replace(/\/+$/, '');
  const url = `${base}/${pyQuote(org)}/${pyQuote(project)}/_apis/wit/workItems/${workItemId}/comments?api-version=${WIT_COMMENTS_API_VERSION}`;
  let response;
  try {
    response = await fetchRetry(url, { method: 'GET', headers: authHeaders(pat) }, { attempts: 3, delay: 500 });
  } catch (error) {
    console.error(`Warning: WIT comments API unavailable (${error.message || error}); comment images skipped.`);
    return [];
  }
  if (!response.ok) {
    console.error(`Warning: WIT comments API unavailable (${response.status}); comment images skipped.`);
    return [];
  }
  const payload = await response.json();
  const comments = payload.comments || payload.value || [];
  return Array.isArray(comments) ? comments : [];
}

function loadWorkItem(raw) {
  const data = JSON.parse(raw);
  if (Array.isArray(data)) {
    const first = data.length > 0 ? data[0] : {};
    if (first === null || typeof first !== 'object' || Array.isArray(first)) {
      throw new Error('Work item JSON must be an object');
    }
    return first;
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Work item JSON must be an object');
  }
  return data;
}

function workItemSlug(workItem) {
  const fields = workItem.fields || {};
  const number = workItem.id || fields['System.Id'];
  return number ? `us-${number}` : 'spec';
}

function addUrl(urls, seen, url, origin, alt = '', filename = '') {
  const cleaned = String(url || '').trim().replace(/^<+|>+$/g, '').trim();
  if (!cleaned || seen.has(cleaned)) {
    return;
  }
  seen.add(cleaned);
  const base = path.basename(cleaned);
  urls.push({
    url: cleaned,
    origin,
    alt: alt || '',
    filename: filename || base,
    caption: alt || filename || base,
  });
}

function extractUrlsFromHtml(htmlValue, origin, urls, seen) {
  if (!htmlValue) {
    return;
  }
  for (const match of String(htmlValue).matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const src = tag.match(/src=["']([^"']+)["']/i);
    const alt = tag.match(/alt=["']([^"']*)["']/i);
    if (src) {
      addUrl(urls, seen, src[1], origin, alt ? alt[1] : '');
    }
  }
  const cleaned = cleanHtml(htmlValue);
  for (const match of cleaned.matchAll(new RegExp(MD_IMAGE_RE.source, 'g'))) {
    addUrl(urls, seen, match[2], origin, match[1]);
  }
}

function extractUrlsFromText(text, origin, urls, seen) {
  if (!text) {
    return;
  }
  for (const match of String(text).matchAll(new RegExp(MD_IMAGE_RE.source, 'g'))) {
    addUrl(urls, seen, match[2], origin, match[1]);
  }
}

function collectVisualUrls(workItem, comments) {
  const urls = [];
  const seen = new Set();
  const fields = workItem.fields || {};
  const descriptionHtml = fields['System.Description'] || fields['Microsoft.VSTS.TCM.ReproSteps'] || '';
  const acHtml = fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';
  extractUrlsFromHtml(descriptionHtml, 'body', urls, seen);
  extractUrlsFromHtml(acHtml, 'body', urls, seen);
  for (const relation of workItem.relations || []) {
    if (String((relation && relation.rel) || '').endsWith('AttachedFile')) {
      addUrl(urls, seen, (relation && relation.url) || '', 'relation', '', ((relation && relation.attributes) || {}).name || '');
    }
  }
  for (const comment of comments || []) {
    const text = (comment && (comment.text || comment.body)) || '';
    extractUrlsFromHtml(text, 'comment', urls, seen);
    extractUrlsFromText(text, 'comment', urls, seen);
  }
  return urls;
}

function buildSpecMd(workItem, org, project) {
  const fields = workItem.fields || {};
  const number = workItem.id || fields['System.Id'];
  const slug = workItemSlug(workItem);
  const title = String(fields['System.Title'] || (number ? `US ${number}` : 'Specification')).trim();
  const state = String(fields['System.State'] || '').trim();
  const workItemType = String(fields['System.WorkItemType'] || '').trim();
  const assigned = fields['System.AssignedTo'] || {};
  const assignee = assigned.displayName || assigned.uniqueName || '';
  const tagsRaw = fields['System.Tags'] || '';
  const tags = typeof tagsRaw === 'string' ? tagsRaw.split(';').map((t) => t.trim()).filter(Boolean) : [];

  const descriptionHtml = fields['System.Description'] || fields['Microsoft.VSTS.TCM.ReproSteps'] || '';
  const descriptionText = cleanHtml(descriptionHtml);
  const acHtml = fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || '';
  const acText = cleanHtml(acHtml);

  let { description } = splitBody(descriptionText);
  const { acItems: acFromDesc } = splitBody(descriptionText);
  let acItems = [];
  if (acText) {
    const probe = AC_HEADING.test(acText) ? acText : `## Acceptance Criteria\n${acText}`;
    const { acItems: acFromField } = splitBody(probe);
    if (acFromField.length > 0) {
      acItems = acFromField;
    } else {
      for (const line of acText.split('\n')) {
        const item = line.trim().replace(/^(?:[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s+)/, '').trim();
        if (item) {
          acItems.push(item);
        }
      }
    }
  }
  if (acItems.length === 0) {
    acItems = acFromDesc;
    if (acFromDesc.length === 0) {
      description = descriptionText;
    }
  }

  let url = '';
  if (org && project && number) {
    url = `https://dev.azure.com/${pyQuote(org)}/${pyQuote(project)}/_workitems/edit/${number}`;
  } else {
    url = workItem.url || (((workItem._links || {}).html || {}).href) || '';
  }

  const fm = [
    '---',
    `id: ${number || 'null'}`,
    `slug: ${slug}`,
    `title: "${title.replace(/"/g, "'")}"`,
    'source: azure-devops',
  ];
  if (state) {
    fm.push(`issueState: ${state}`);
  }
  if (workItemType) {
    fm.push(`workItemType: "${workItemType}"`);
  }
  if (url) {
    fm.push(`issueUrl: "${url}"`);
  }
  if (tags.length > 0) {
    fm.push(`labels: [${tags.join(', ')}]`);
  }
  fm.push(`specDate: ${localDateIso()}`);
  fm.push('---');
  fm.push('');

  const body = [`# Specification — ${title}`, ''];
  const meta = [];
  if (workItemType) {
    meta.push(`**Type:** ${workItemType}`);
  }
  if (state) {
    meta.push(`**State:** ${state}`);
  }
  if (assignee) {
    meta.push(`**Assignee:** ${assignee}`);
  }
  if (tags.length > 0) {
    meta.push(`**Tags:** ${tags.join(', ')}`);
  }
  if (meta.length > 0) {
    body.push(...meta);
    body.push('');
  }

  body.push('## Description');
  body.push('');
  body.push(description || '_No description in the work item._');
  body.push('');

  body.push('## Acceptance Criteria');
  body.push('');
  if (acItems.length > 0) {
    acItems.forEach((ac, idx) => {
      body.push(`- AC${idx + 1}: ${ac}`);
    });
  } else {
    body.push('_No explicit acceptance criteria in the work item — extract/validate during refinement._');
  }
  body.push('');

  body.push('## Original Issue Context');
  body.push('');
  body.push(String(descriptionHtml || '').trim() || '_No description in the work item._');
  if (acHtml) {
    body.push('');
    body.push(String(acHtml).trim());
  }
  body.push('');

  body.push('## Notes');
  body.push('');
  body.push('_Automatically generated from Azure DevOps work item JSON._');
  body.push('');

  return [...fm, ...body].join('\n');
}

function resolveSpecsDir(repoRoot, override) {
  const rel = String(override || '').trim();
  if (!rel) {
    let cfg = {};
    try {
      const ctx = resolveConsumerContext({ repoRoot: String(repoRoot), scriptFile: __filename });
      cfg = ctx.config || {};
    } catch {
      cfg = {};
    }
    const configured = String(((cfg.plans) || {}).specsDir || '').trim() || DEFAULT_SPECS_DIR;
    return path.isAbsolute(configured)
      ? path.resolve(configured)
      : path.resolve(String(repoRoot), configured);
  }
  return path.isAbsolute(rel) ? path.resolve(rel) : path.resolve(String(repoRoot), rel);
}

function resolveDefaultOutput(repoRoot, slug, specsDirOverride) {
  const organizer = path.resolve(__dirname, '..', '..', 'ws-spec-organizer', 'scripts', 'resolve_spec_path.cjs');
  if (fs.existsSync(organizer)) {
    const proc = spawnSync('node', [organizer, '--slug', slug, '--repo-root', String(repoRoot)], {
      encoding: 'utf8',
    });
    if ((proc.status ?? 1) === 0) {
      const rel = String(proc.stdout || '').trim();
      if (rel) {
        return path.resolve(String(repoRoot), rel);
      }
    }
  }
  return path.join(resolveSpecsDir(repoRoot, specsDirOverride), `${slug}.spec.md`);
}

function invokeIngestHelper(specPath, urls, skipAssets, apiBase, authEnv, repoRoot) {
  if (skipAssets || !urls || urls.length === 0) {
    return 0;
  }
  const helper = path.join(HUB_SCRIPTS_DIR, 'ingest_visual_attachments.cjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ado-spec-'));
  const urlsPath = path.join(tmpDir, 'urls.json');
  fs.writeFileSync(urlsPath, JSON.stringify(urls), 'utf8');
  try {
    const cmd = ['node', helper, '--spec-path', String(specPath), '--urls-json', urlsPath,
      '--provider', 'azure-devops', '--api-base', apiBase, '--auth-env', authEnv];
    if (repoRoot !== null && repoRoot !== undefined) {
      cmd.push('--repo-root', String(repoRoot));
    }
    if (skipAssets) {
      cmd.push('--skip-assets');
    }
    const proc = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
    return proc.status ?? 1;
  } finally {
    try {
      fs.unlinkSync(urlsPath);
      fs.rmdirSync(tmpDir);
    } catch {
      // Ignore cleanup failures.
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let workItem;
  let comments = [];

  if (args.input) {
    let raw;
    if (args.input === '-') {
      raw = fs.readFileSync(0, 'utf8');
    } else {
      if (!fs.existsSync(args.input)) {
        console.error(`Error: input file not found: ${args.input}`);
        return 1;
      }
      raw = fs.readFileSync(args.input, 'utf8');
    }
    try {
      workItem = loadWorkItem(raw);
    } catch (error) {
      console.error(`Error: invalid JSON — ${error.message}`);
      return 1;
    }
    comments = workItem.comments || [];
  } else if (args.id !== null && args.id !== undefined) {
    if (!args.org || !args.project) {
      console.error('Error: --org and --project are required for live fetch');
      return 1;
    }
    const pat = resolvePat(args.patEnv);
    workItem = await fetchWorkItem(args.org, args.project, args.id, pat, args.apiBase);
    comments = await fetchComments(args.org, args.project, args.id, pat, args.apiBase);
    if (args.snapshot) {
      const snap = path.resolve(args.snapshot);
      fs.mkdirSync(path.dirname(snap), { recursive: true });
      fs.writeFileSync(snap, `${JSON.stringify(workItem, null, 2)}\n`, 'utf8');
      console.log(`Snapshot written to: ${snap}`);
    }
  } else {
    console.error('Error: provide --input (offline) or --id with --org/--project (live)');
    return 1;
  }

  if (args.snapshot && args.input) {
    const snap = path.resolve(args.snapshot);
    fs.mkdirSync(path.dirname(snap), { recursive: true });
    fs.writeFileSync(snap, `${JSON.stringify(workItem, null, 2)}\n`, 'utf8');
    console.log(`Snapshot written to: ${snap}`);
  }

  const visualUrls = collectVisualUrls(workItem, comments);
  const specMd = buildSpecMd(workItem, args.org || null, args.project || null);

  let repoRoot;
  try {
    const ctx = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
    repoRoot = ctx.repoRoot;
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  const outputPath = args.output
    ? path.resolve(args.output)
    : resolveDefaultOutput(repoRoot, workItemSlug(workItem), args.specsDir);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (fs.existsSync(outputPath) && !args.force) {
    const existing = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
    if (existing !== specMd.replace(/\r\n/g, '\n')) {
      console.error(`ERROR: spec of record exists and differs: ${outputPath}\nPreserve your edits or pass --force to overwrite.`);
      return 1;
    }
  }
  fs.writeFileSync(outputPath, specMd, 'utf8');

  const ingestRc = invokeIngestHelper(outputPath, visualUrls, args.skipAssets, args.apiBase, args.patEnv, repoRoot);
  if (ingestRc !== 0) {
    console.error(`Warning: visual ingest helper exited ${ingestRc}`);
  }

  console.log(`Spec written to: ${outputPath}`);
  console.log('Next: register into the workflow copy via ws-spec-provider-local');
  console.log(`  node {skillsRoot}/ws-spec-provider-local/scripts/register_local_spec.cjs --input ${outputPath} --source azure-devops`);
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
  parseArgs, loadWorkItem, workItemSlug, cleanHtml, splitBody,
  collectVisualUrls, buildSpecMd,
};
