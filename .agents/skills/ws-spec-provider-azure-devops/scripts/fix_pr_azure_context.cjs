#!/usr/bin/env node
'use strict';

// Port of fix_pr_azure_context.py (ws-spec-provider-azure-devops):
// Cross-platform fix-pr helper for Azure DevOps.
//
// Goals:
// - Standardize collection of PR, threads, comments, and work items.
// - Authenticate in a self-contained way without depending on other scripts.
// - Avoid each fix-pr run inventing a different REST call.
//
// Config preference:
//   1. `.ws/config.json` → `issueTrackers.azureDevOps` + env PAT
//   2. Legacy `.agents/skills/azure-devops/azure-devops.config.json` (+ optional `.secret`)
//
// Usage:
//   node fix_pr_azure_context.cjs collect --pr-id 592 --output runs/pr-592/context.json
//   node fix_pr_azure_context.cjs resolve-thread --pr-id 592 --thread-id 4001 --model composer-2.5 --comment "loadList() now preloads row actions so Edit is visible before the extra-actions menu. Fixed in 3dc20274."
//   node fix_pr_azure_context.cjs resolve-thread --dry-run --pr-id 592 --thread-id 4001 --model composer-2.5 --comment "loadList() now preloads row actions so Edit is visible before the extra-actions menu. Fixed in 3dc20274."

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
const { resolveRepoRoot } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { fetchRetry } = require(path.join(HUB_SCRIPTS_DIR, 'http_retry.cjs'));

const ACTIVE_STATUSES = new Set(['active', 'pending']);
const DEFAULT_WORK_ITEM_FIELDS = [
  'System.Id',
  'System.Title',
  'System.State',
  'System.WorkItemType',
  'System.Description',
  'Microsoft.VSTS.Common.AcceptanceCriteria',
].join(',');

function resolvePat(patEnvVar, secretPath) {
  for (const key of [patEnvVar, 'ADO_PAT', 'AZURE_DEVOPS_PAT']) {
    if (!key) {
      continue;
    }
    const value = String(process.env[key] || '').trim();
    if (value) {
      return value;
    }
  }
  if (secretPath && fs.existsSync(secretPath)) {
    const value = fs.readFileSync(secretPath, 'utf8').trim();
    if (value) {
      return value;
    }
  }
  return '';
}

function resolveAzdoLegacyPaths(repoRoot) {
  const skillDir = path.join(String(repoRoot), '.agents', 'skills', 'azure-devops');
  const configPath = path.join(skillDir, 'azure-devops.config.json');
  const secretPath = path.join(skillDir, 'azure-devops.secret');
  if (fs.existsSync(configPath)) {
    return { configPath, secretPath };
  }
  // Compatibility with older location under .agents/
  const legacyDir = path.join(String(repoRoot), '.agents');
  const legacyConfigPath = path.join(legacyDir, 'azure-devops.config.json');
  const legacySecretPath = path.join(legacyDir, 'azure-devops.secret');
  if (fs.existsSync(legacyConfigPath)) {
    return { configPath: legacyConfigPath, secretPath: legacySecretPath };
  }
  return { configPath, secretPath };
}

function loadSpecToPrAdoConfig(repoRoot) {
  const relPaths = [
    path.join('.ws', 'config.json'),
    path.join('.agents', 'skills', 'ws-shared', 'config.json'),
    path.join('.agents', 'skills', 'shared', 'config.json'),
  ];
  let configPath = null;
  for (const rel of relPaths) {
    const candidate = path.join(String(repoRoot), rel);
    if (fs.existsSync(candidate)) {
      configPath = candidate;
      break;
    }
  }
  if (!configPath) {
    return null;
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return null;
  }
  const ado = ((config && config.issueTrackers) || {}).azureDevOps || {};
  if (!ado || typeof ado !== 'object') {
    return null;
  }
  const org = String(ado.org || '').trim();
  const project = String(ado.project || '').trim();
  if (!org || !project) {
    return null;
  }
  return ado;
}

function loadAzdoConfig(repoRoot) {
  const { secretPath: legacySecretPath } = resolveAzdoLegacyPaths(repoRoot);

  const ado = loadSpecToPrAdoConfig(repoRoot);
  if (ado !== null && ado !== undefined) {
    const organization = String(ado.org || '').trim();
    const project = String(ado.project || '').trim();
    const patEnvVar = String(ado.patEnvVar || 'ADO_PAT').trim() || 'ADO_PAT';
    const pat = resolvePat(patEnvVar, legacySecretPath);
    if (!pat) {
      console.error(`Missing PAT. Set env var ${patEnvVar} (or ADO_PAT / AZURE_DEVOPS_PAT).`);
      process.exit(1);
    }
    return { organization, project, pat };
  }

  // Legacy fallback only
  const { configPath, secretPath } = resolveAzdoLegacyPaths(repoRoot);
  if (!fs.existsSync(configPath)) {
    console.error('Configure issueTrackers.azureDevOps (org, project) in '
      + '.ws/config.json, or create legacy '
      + '.agents/skills/azure-devops/azure-devops.config.json.');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const organization = config.organization;
  const project = config.project;
  const pat = resolvePat('ADO_PAT', secretPath);
  if (!pat) {
    console.error('Missing PAT. Set ADO_PAT or AZURE_DEVOPS_PAT, or create '
      + '.agents/skills/azure-devops/azure-devops.secret.');
    process.exit(1);
  }
  return { organization, project, pat };
}

// urllib.parse.quote default (safe='/'): encode like Python.
function pyQuote(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%2F/gi, '/');
}

function baseUrl(organization, project) {
  return `https://dev.azure.com/${organization}/${pyQuote(project)}`;
}

function prWebUrl(pr) {
  const links = pr._links || {};
  const web = links.web || {};
  if (web.href) {
    return String(web.href);
  }
  return String(pr.url || '');
}

function gitUrl(organization, project, repository, suffix) {
  return `${baseUrl(organization, project)}/_apis/git/repositories/${pyQuote(repository)}/${suffix}`;
}

function authHeaders(pat, contentType = 'application/json') {
  const token = Buffer.from(`:${pat}`, 'ascii').toString('base64');
  return {
    Authorization: `Basic ${token}`,
    Accept: 'application/json; api-version=7.1',
    'Content-Type': contentType,
  };
}

async function azdoRequest(method, url, pat, body, contentType = 'application/json') {
  let data = null;
  if (body !== undefined && body !== null) {
    data = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetchRetry(url, {
      method,
      headers: authHeaders(pat, contentType),
      body: data,
    }, { attempts: 3, delay: 500 });
  } catch (error) {
    console.error(`Azure DevOps HTTP error: ${error.message || error}`);
    process.exit(1);
  }
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Azure DevOps HTTP ${response.status}: ${detail}`);
    process.exit(1);
  }
  const raw = await response.text();
  if (!raw) {
    return null;
  }
  return JSON.parse(raw);
}

async function runAzureDevopsSmokeCheck(organization, project, pat) {
  const url = `${baseUrl(organization, project)}/_apis/wit/fields/System.State?api-version=7.1`;
  try {
    await azdoRequest('GET', url, pat);
    return {
      status: 'success',
      message: 'Azure DevOps authentication and connectivity validated successfully.',
    };
  } catch (error) {
    console.error('Failed to validate Azure DevOps connection/authentication.\n'
      + `Error: ${error.message || error}`);
    process.exit(1);
  }
  return null;
}

function decodeHtmlEntities(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
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

function cleanHtml(value) {
  if (!value) {
    return '';
  }
  let text = String(value).replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p\s*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeHtmlEntities(text);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

function detectRepository(repoRoot) {
  const gitConfig = path.join(String(repoRoot), '.git', 'config');
  if (!fs.existsSync(gitConfig)) {
    console.error('Pass --repository; could not read .git/config.');
    process.exit(1);
  }
  const content = fs.readFileSync(gitConfig, 'utf8');
  const urls = [];
  for (const match of content.matchAll(/^\s*url\s*=\s*(.+)$/gm)) {
    urls.push(match[1]);
  }
  for (const url of urls) {
    const match = String(url).match(/\/_git\/([^/\s]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  for (const url of urls) {
    let cleaned = String(url).trim().replace(/\/+$/, '');
    if (cleaned.endsWith('.git')) {
      cleaned = cleaned.slice(0, -4);
    }
    const match = cleaned.match(/(?:[:/])([^/:]+)$/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  console.error('Pass --repository; Azure DevOps remote not found in .git/config.');
  process.exit(1);
  return '';
}

function normalizeThread(thread, includeSystem) {
  const comments = [];
  for (const comment of thread.comments || []) {
    if (comment.isDeleted) {
      continue;
    }
    const commentType = comment.commentType;
    if (!includeSystem && commentType === 'system') {
      continue;
    }
    const content = cleanHtml(comment.content);
    if (!content) {
      continue;
    }
    comments.push({
      id: comment.id,
      type: commentType,
      author: (comment.author || {}).displayName,
      content,
      publishedDate: comment.publishedDate,
    });
  }
  if (comments.length === 0) {
    return null;
  }
  const context = thread.threadContext || {};
  const prContext = thread.pullRequestThreadContext || {};
  const rightStart = context.rightFileStart || {};
  const rightEnd = context.rightFileEnd || {};
  const leftStart = context.leftFileStart || {};
  const leftEnd = context.leftFileEnd || {};
  return {
    threadId: thread.id,
    status: thread.status,
    path: prContext.filePath || context.filePath,
    rightLine: rightStart.line || rightEnd.line,
    leftLine: leftStart.line || leftEnd.line,
    isDeleted: thread.isDeleted,
    comments,
  };
}

async function getPrContext(repoRoot, prId, repository, includeSystem) {
  const { organization, project, pat } = loadAzdoConfig(repoRoot);
  const smoke = await runAzureDevopsSmokeCheck(organization, project, pat);

  const pr = await azdoRequest(
    'GET',
    gitUrl(organization, project, repository, `pullRequests/${prId}?api-version=7.1`),
    pat,
  );
  const threadsPayload = await azdoRequest(
    'GET',
    gitUrl(organization, project, repository, `pullRequests/${prId}/threads?api-version=7.1`),
    pat,
  );
  const workItemsPayload = await azdoRequest(
    'GET',
    gitUrl(organization, project, repository, `pullRequests/${prId}/workitems?api-version=7.1`),
    pat,
  );
  const workItemRefs = (workItemsPayload && workItemsPayload.value) || [];

  const workItems = [];
  const ids = workItemRefs.map((item) => String(item.id));
  if (ids.length > 0) {
    const itemsUrl = `${baseUrl(organization, project)}/_apis/wit/workitems`
      + `?ids=${ids.join(',')}&fields=${pyQuote(DEFAULT_WORK_ITEM_FIELDS)}&api-version=7.1`;
    const itemsPayload = await azdoRequest('GET', itemsUrl, pat);
    for (const item of (itemsPayload && itemsPayload.value) || []) {
      const fields = item.fields || {};
      workItems.push({
        id: item.id,
        type: fields['System.WorkItemType'],
        state: fields['System.State'],
        title: fields['System.Title'],
        description: cleanHtml(fields['System.Description']),
        acceptanceCriteria: cleanHtml(fields['Microsoft.VSTS.Common.AcceptanceCriteria']),
        url: `${baseUrl(organization, project)}/_workitems/edit/${item.id}`,
      });
    }
  }

  const threads = ((threadsPayload && threadsPayload.value) || [])
    .map((thread) => normalizeThread(thread, includeSystem))
    .filter((thread) => thread !== null);
  const activeThreads = threads.filter(
    (thread) => ACTIVE_STATUSES.has(String(thread.status || '').toLowerCase()) && thread.comments,
  );

  return {
    source: {
      helper: __filename,
      azureDevOpsScript: null,
      azureDevOpsScriptSmoke: smoke,
    },
    organization,
    project,
    repository,
    pullRequest: {
      id: pr.pullRequestId,
      title: pr.title,
      status: pr.status,
      sourceRefName: pr.sourceRefName,
      targetRefName: pr.targetRefName,
      createdBy: (pr.createdBy || {}).displayName,
      url: prWebUrl(pr),
    },
    workItems,
    threads,
    activeThreads,
  };
}

const MODEL_FOOTER_PREFIX = 'LLM model:';
const MIN_RESOLUTION_SUBSTANCE_CHARS = 40;
const THIN_RESOLUTION_ERROR = 'resolve-thread: comment must describe the correction (what changed and why), '
  + 'not only a commit hash or LLM model footer.';
const HTML_COMMENT_RE = /<!--.*?-->/gs;
const HASH_STATUS_PREFIX_RE = /^(?:corrigido|fixed|resolved|closed|done)(?:\s+(?:em|in|at|no))?(?:\s+commit)?[:\s]+[0-9a-f]{7,40}\.?\s*/i;
const SHA_ONLY_RE = /^[0-9a-f]{7,40}\.?$/i;
const METADATA_LINE_RE = /^(?:defectClass|sourcesConsulted|proactiveFixed|proactiveSkipped)\s*:/i;
const WORD_TOKEN_RE = /\b[a-zA-Z]{4,}\b/g;

function resolutionCommentSubstance(comment) {
  let text = String(comment || '').replace(HTML_COMMENT_RE, '');
  text = text.replace(/\n---\s*\nLLM model:[\s\S]*$/i, '');
  text = text.replace(/^LLM model:\s*.+$/gim, '');
  const parts = [];
  for (const raw of text.split('\n')) {
    let line = raw.trim();
    if (!line || line === '---' || line === '-') {
      continue;
    }
    if (METADATA_LINE_RE.test(line)) {
      continue;
    }
    line = line.replace(HASH_STATUS_PREFIX_RE, '').trim();
    if (!line || SHA_ONLY_RE.test(line)) {
      continue;
    }
    parts.push(line);
  }
  return parts.join(' ');
}

function hasLexicalWord(substance) {
  const words = String(substance || '').match(WORD_TOKEN_RE) || [];
  return words.some((word) => new Set(word.toLowerCase()).size >= 2);
}

function assertResolutionComment(comment) {
  const substance = resolutionCommentSubstance(comment);
  if (substance.length < MIN_RESOLUTION_SUBSTANCE_CHARS || !hasLexicalWord(substance)) {
    console.error(THIN_RESOLUTION_ERROR);
    process.exit(1);
  }
}

function formatResolutionComment(comment, model) {
  const body = String(comment).trim();
  const id = String(model || '').trim();
  if (!id) {
    return body;
  }
  if (body.toLowerCase().includes(MODEL_FOOTER_PREFIX.toLowerCase())) {
    return body;
  }
  return `${body}\n\n---\n${MODEL_FOOTER_PREFIX} ${id}`;
}

async function resolveThread(repoRoot, prId, repository, threadId, comment, model, dryRun) {
  assertResolutionComment(comment);
  const formattedComment = formatResolutionComment(comment, model);
  if (dryRun) {
    return {
      dryRun: true,
      threadId,
      status: 'would_mark_fixed',
      commentId: null,
      comment: formattedComment,
      model,
      message: 'Dry-run: no comment was posted and the thread was not changed in Azure DevOps.',
    };
  }

  const { organization, project, pat } = loadAzdoConfig(repoRoot);
  await runAzureDevopsSmokeCheck(organization, project, pat);

  const commentsSuffix = `pullRequests/${prId}/threads/${threadId}/comments?api-version=7.1`;
  const patchSuffix = `pullRequests/${prId}/threads/${threadId}?api-version=7.1`;

  const posted = await azdoRequest(
    'POST',
    gitUrl(organization, project, repository, commentsSuffix),
    pat,
    { content: formattedComment, commentType: 1 },
  );
  const patched = await azdoRequest(
    'PATCH',
    gitUrl(organization, project, repository, patchSuffix),
    pat,
    { status: 'fixed' },
  );

  return {
    threadId,
    status: patched ? patched.status : 'fixed',
    commentId: posted ? posted.id : null,
    model,
  };
}

function printTopHelp() {
  console.log(`Usage: node fix_pr_azure_context.cjs [--repo-root DIR] [--repository NAME] {collect|resolve-thread} ...

Azure DevOps helper for fix-pr.

Options:
  --repo-root DIR     Repository root. Default: autodetect.
  --repository NAME   Azure DevOps repository name. Default: autodetect.

Commands:
  collect             Collect PR, threads, comments, and work items.
  resolve-thread      Comment and mark a thread as fixed.`);
}

function printCollectHelp() {
  console.log(`Usage: node fix_pr_azure_context.cjs collect --pr-id N [--include-system] [--output FILE] [--repo-root DIR] [--repository NAME]

Collect PR, threads, comments, and work items.

Options:
  --pr-id N           Pull request id (required)
  --include-system    Include system comments
  --output FILE       Output JSON file. Default: stdout.
  --repo-root DIR     Repository root. Default: autodetect.
  --repository NAME   Azure DevOps repository name. Default: autodetect.`);
}

function printResolveHelp() {
  console.log(`Usage: node fix_pr_azure_context.cjs resolve-thread --pr-id N --thread-id M --comment TEXT [--model ID] [--dry-run] [--repo-root DIR] [--repository NAME]

Comment and mark a thread as fixed.

Options:
  --pr-id N           Pull request id (required)
  --thread-id M       Thread id (required)
  --comment TEXT      What changed and why (commit hash allowed; hash-only bodies are rejected).
  --model ID          Optional session model id for the resolution footer (host metadata, not a new intent).
  --dry-run           Simulate resolution locally without posting a comment or changing status in Azure DevOps.
  --repo-root DIR     Repository root. Default: autodetect.
  --repository NAME   Azure DevOps repository name. Default: autodetect.`);
}

function parseIntOption(name, raw) {
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    console.error(`argument ${name}: invalid int value: '${raw}'`);
    process.exit(2);
  }
  return value;
}

function parseArgs(argv) {
  let repoRoot = '';
  let repository = '';
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      if (rest.length > 0) {
        // Defer to the action parser so `<action> --help` prints action help.
        rest.push(arg);
        continue;
      }
      printTopHelp();
      process.exit(0);
    } else if (arg === '--repo-root') {
      const value = argv[++i];
      if (value === undefined) {
        console.error('argument --repo-root: expected one argument');
        process.exit(2);
      }
      repoRoot = value;
    } else if (arg === '--repository') {
      const value = argv[++i];
      if (value === undefined) {
        console.error('argument --repository: expected one argument');
        process.exit(2);
      }
      repository = value;
    } else if (arg.startsWith('--repo-root=')) {
      repoRoot = arg.slice('--repo-root='.length);
    } else if (arg.startsWith('--repository=')) {
      repository = arg.slice('--repository='.length);
    } else {
      rest.push(arg);
    }
  }

  const action = rest[0];
  if (!action) {
    printTopHelp();
    console.error('argument action is required: {collect,resolve-thread}');
    process.exit(2);
  }
  const tail = rest.slice(1);

  if (action === 'collect') {
    const options = { action, repoRoot, repository, prId: null, includeSystem: false, output: '' };
    for (let i = 0; i < tail.length; i += 1) {
      const arg = tail[i];
      if (arg === '--help' || arg === '-h') {
        printCollectHelp();
        process.exit(0);
      } else if (arg === '--pr-id') {
        options.prId = parseIntOption('--pr-id', tail[++i]);
      } else if (arg === '--include-system') {
        options.includeSystem = true;
      } else if (arg === '--output') {
        const value = tail[++i];
        if (value === undefined) {
          console.error('argument --output: expected one argument');
          process.exit(2);
        }
        options.output = value;
      } else if (arg === '--repo-root') {
        options.repoRoot = tail[++i] ?? '';
      } else if (arg === '--repository') {
        options.repository = tail[++i] ?? '';
      } else if (arg.startsWith('--pr-id=')) {
        options.prId = parseIntOption('--pr-id', arg.slice('--pr-id='.length));
      } else if (arg.startsWith('--output=')) {
        options.output = arg.slice('--output='.length);
      } else if (arg.startsWith('--repo-root=')) {
        options.repoRoot = arg.slice('--repo-root='.length);
      } else if (arg.startsWith('--repository=')) {
        options.repository = arg.slice('--repository='.length);
      } else {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
    }
    if (options.prId === null || options.prId === undefined) {
      console.error('argument --pr-id is required');
      process.exit(2);
    }
    return options;
  }

  if (action === 'resolve-thread') {
    const options = {
      action, repoRoot, repository, prId: null, threadId: null,
      comment: null, model: '', dryRun: false,
    };
    for (let i = 0; i < tail.length; i += 1) {
      const arg = tail[i];
      if (arg === '--help' || arg === '-h') {
        printResolveHelp();
        process.exit(0);
      } else if (arg === '--pr-id') {
        options.prId = parseIntOption('--pr-id', tail[++i]);
      } else if (arg === '--thread-id') {
        options.threadId = parseIntOption('--thread-id', tail[++i]);
      } else if (arg === '--comment') {
        const value = tail[++i];
        if (value === undefined) {
          console.error('argument --comment: expected one argument');
          process.exit(2);
        }
        options.comment = value;
      } else if (arg === '--model') {
        options.model = tail[++i] ?? '';
      } else if (arg === '--dry-run') {
        options.dryRun = true;
      } else if (arg === '--repo-root') {
        options.repoRoot = tail[++i] ?? '';
      } else if (arg === '--repository') {
        options.repository = tail[++i] ?? '';
      } else if (arg.startsWith('--pr-id=')) {
        options.prId = parseIntOption('--pr-id', arg.slice('--pr-id='.length));
      } else if (arg.startsWith('--thread-id=')) {
        options.threadId = parseIntOption('--thread-id', arg.slice('--thread-id='.length));
      } else if (arg.startsWith('--comment=')) {
        options.comment = arg.slice('--comment='.length);
      } else if (arg.startsWith('--model=')) {
        options.model = arg.slice('--model='.length);
      } else if (arg.startsWith('--repo-root=')) {
        options.repoRoot = arg.slice('--repo-root='.length);
      } else if (arg.startsWith('--repository=')) {
        options.repository = arg.slice('--repository='.length);
      } else {
        console.error(`unknown argument: ${arg}`);
        process.exit(2);
      }
    }
    for (const key of ['prId', 'threadId', 'comment']) {
      if (options[key] === null || options[key] === undefined) {
        console.error(`argument --${key === 'threadId' ? 'thread-id' : key === 'prId' ? 'pr-id' : key} is required`);
        process.exit(2);
      }
    }
    return options;
  }

  console.error(`unknown action: ${action} (choose from collect, resolve-thread)`);
  process.exit(2);
  return null;
}

function printCollectSummary(payload) {
  const threads = payload.threads || [];
  const active = payload.activeThreads || [];
  const statuses = {};
  for (const thread of threads) {
    const status = thread.status;
    const key = status !== null && status !== undefined ? String(status) : 'null';
    statuses[key] = (statuses[key] || 0) + 1;
  }
  const summary = {
    threads: threads.length,
    activeThreads: active.length,
    statuses,
    topKeys: Object.keys(payload).sort(),
  };
  console.error(`collect-summary: ${JSON.stringify(summary)}`);
}

async function main(argv) {
  const args = parseArgs(argv);
  let repoRoot;
  try {
    repoRoot = resolveRepoRoot(args.repoRoot || null, { scriptFile: __filename });
  } catch (error) {
    console.error(String((error && error.message) || error));
    return 1;
  }

  let repository;
  if (args.action === 'resolve-thread' && args.dryRun) {
    repository = args.repository || 'dry-run';
  } else {
    repository = args.repository || detectRepository(repoRoot);
  }

  if (args.action === 'collect') {
    const payload = await getPrContext(repoRoot, args.prId, repository, args.includeSystem);
    const text = JSON.stringify(payload, null, 2);
    if (args.output) {
      const outputPath = path.resolve(args.output);
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, `${text}\n`, 'utf8');
    } else {
      console.log(text);
    }
    printCollectSummary(payload);
    return 0;
  }

  if (args.action === 'resolve-thread') {
    const payload = await resolveThread(
      repoRoot,
      args.prId,
      repository,
      args.threadId,
      args.comment,
      args.model,
      args.dryRun,
    );
    console.log(JSON.stringify(payload, null, 2));
    return 0;
  }

  console.error(`Unknown action: ${args.action}`);
  return 1;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(String((error && error.message) || error));
      process.exit(1);
    },
  );
}

module.exports = {
  parseArgs, resolvePat, resolveAzdoLegacyPaths, loadSpecToPrAdoConfig,
  loadAzdoConfig, baseUrl, prWebUrl, gitUrl, authHeaders, cleanHtml,
  detectRepository, normalizeThread, resolutionCommentSubstance,
  hasLexicalWord, formatResolutionComment,
};
