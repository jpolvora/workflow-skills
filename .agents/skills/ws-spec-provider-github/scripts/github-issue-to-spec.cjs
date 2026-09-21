#!/usr/bin/env node
'use strict';

// Port of github-issue-to-spec.py (ws-spec-provider-github):
// Converts JSON from `gh issue view {n} --json ...` into the spec of record.
//
// Usage:
//   gh issue view 1234 --json number,title,body,state,labels,assignees,comments,url \
//     > {plansDir}/us-1234/step-00-us-1234.issue.json
//   node github-issue-to-spec.cjs \
//     --input {plansDir}/us-1234/step-00-us-1234.issue.json \
//     --repo {owner}/{repo}
//
// Output defaults via `resolve_spec_path.cjs --slug {unprefixedSlug}`.
// Promote to workflow copy with ws-spec-provider-local register_local_spec.
//
// `--output` overrides the destination. `--input` also accepts `-` for stdin.
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

const DEFAULT_SPECS_DIR = '.agents/specs';
const MD_IMAGE_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_IMG_RE = /<img[^>]+src=["']([^"']+)["'][^>]*?(?:alt=["']([^"']*)["\'])?[^>]*>/gi;
const GH_USER_ATTACH_RE = /https?:\/\/github\.com\/user-attachments\/[^\s)>\]]+/gi;
const AC_HEADING = /^#{1,6}\s*(crit[eé]rios?\s+de\s+aceite|acceptance\s+criteria|ac[s]?)\b/i;

function printHelp() {
  console.log(`Usage: node github-issue-to-spec.cjs --input <file|-> [options]

Converts JSON from gh issue view into canonical *.spec.md

Options:
  --input FILE           Path to JSON file (gh issue view --json ...) or '-' for stdin
  --output FILE          Output path for *.spec.md (default: resolve_spec_path.cjs --slug {unprefixedSlug})
  --specs-dir DIR        Override plans.specsDir for the default output path
  --repo-root DIR        Project root owning .ws/config.json (default: CWD when it has a hub)
  --repo OWNER/REPO      owner/repo (for issueUrl when missing in JSON)
  --force                Overwrite an existing spec of record when content differs
  --skip-assets          Skip visual attachment ingest (fixture/tests only)
  --fetch-remap-file F   Test fixture: JSON map of allowlisted URL to mock fetch target for ingest helper`);
}

function parseArgs(argv) {
  const options = {
    input: null, output: null, specsDir: null, repoRoot: null,
    repo: '', force: false, skipAssets: false, fetchRemapFile: null,
  };
  let hasInput = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (arg === '--input') {
      options.input = argv[++i];
      if (options.input === undefined) {
        console.error('argument --input: expected one argument');
        process.exit(2);
      }
      hasInput = true;
    } else if (arg === '--output') {
      options.output = argv[++i];
      if (options.output === undefined) {
        console.error('argument --output: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--specs-dir') {
      options.specsDir = argv[++i];
      if (options.specsDir === undefined) {
        console.error('argument --specs-dir: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--repo-root') {
      options.repoRoot = argv[++i];
      if (options.repoRoot === undefined) {
        console.error('argument --repo-root: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--repo') {
      options.repo = argv[++i];
      if (options.repo === undefined) {
        console.error('argument --repo: expected one argument');
        process.exit(2);
      }
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--skip-assets') {
      options.skipAssets = true;
    } else if (arg === '--fetch-remap-file') {
      options.fetchRemapFile = argv[++i];
      if (options.fetchRemapFile === undefined) {
        console.error('argument --fetch-remap-file: expected one argument');
        process.exit(2);
      }
    } else if (arg.startsWith('--input=')) {
      options.input = arg.slice('--input='.length);
      hasInput = true;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg.startsWith('--specs-dir=')) {
      options.specsDir = arg.slice('--specs-dir='.length);
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else if (arg.startsWith('--repo=')) {
      options.repo = arg.slice('--repo='.length);
    } else if (arg.startsWith('--fetch-remap-file=')) {
      options.fetchRemapFile = arg.slice('--fetch-remap-file='.length);
    } else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  if (!hasInput) {
    console.error('argument --input is required');
    process.exit(2);
  }
  return options;
}

function localDateIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
    const organizerArgs = [organizer, '--slug', slug, '--repo-root', String(repoRoot)];
    if (String(specsDirOverride || '').trim()) organizerArgs.push('--specs-dir', String(specsDirOverride));
    const proc = spawnSync('node', organizerArgs, {
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

function loadIssue(raw) {
  let data = JSON.parse(raw);
  if (Array.isArray(data)) {
    data = data.length > 0 ? data[0] : {};
  }
  return data || {};
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

function issueSlug(issue) {
  const number = issue.number;
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

function extractUrlsFromText(text, origin, urls, seen) {
  if (!text) {
    return;
  }
  for (const match of String(text).matchAll(new RegExp(MD_IMAGE_RE.source, 'g'))) {
    addUrl(urls, seen, match[2], origin, match[1]);
  }
  for (const match of String(text).matchAll(new RegExp(HTML_IMG_RE.source, 'gi'))) {
    addUrl(urls, seen, match[1], origin, match[2] || '');
  }
  for (const match of String(text).matchAll(new RegExp(GH_USER_ATTACH_RE.source, 'gi'))) {
    addUrl(urls, seen, match[0], origin);
  }
}

function collectVisualUrls(issue) {
  const urls = [];
  const seen = new Set();
  extractUrlsFromText(issue.body || '', 'body', urls, seen);
  for (const comment of issue.comments || []) {
    extractUrlsFromText((comment && comment.body) || '', 'comment', urls, seen);
  }
  return urls;
}

function buildSpecMd(issue, repo) {
  const number = issue.number;
  const slug = issueSlug(issue);
  const title = String(issue.title || (number ? `US ${number}` : 'Specification')).trim();
  const state = String(issue.state || '').toLowerCase();
  const url = issue.url || (repo && number ? `https://github.com/${repo}/issues/${number}` : '');
  const labels = ((issue.labels) || []).map((l) => l && l.name).filter(Boolean);
  const assignees = ((issue.assignees) || []).map((a) => a && a.login).filter(Boolean);

  const { description, acItems } = splitBody(issue.body || '');
  const rawBody = String(issue.body || '').trim();

  const fm = [
    '---',
    `id: ${number || 'null'}`,
    `slug: ${slug}`,
    `title: "${title.replace(/"/g, "'")}"`,
    'source: github',
  ];
  if (state) {
    fm.push(`issueState: ${state}`);
  }
  if (url) {
    fm.push(`issueUrl: "${url}"`);
  }
  if (labels.length > 0) {
    fm.push(`labels: [${labels.join(', ')}]`);
  }
  fm.push(`specDate: ${localDateIso()}`);
  fm.push('---');
  fm.push('');

  const bodyLines = [`# Specification — ${title}`, ''];
  const meta = [];
  if (state) {
    meta.push(`**State:** ${state}`);
  }
  if (assignees.length > 0) {
    meta.push(`**Assignees:** ${assignees.join(', ')}`);
  }
  if (labels.length > 0) {
    meta.push(`**Labels:** ${labels.join(', ')}`);
  }
  if (meta.length > 0) {
    bodyLines.push(...meta);
    bodyLines.push('');
  }

  bodyLines.push('## Description');
  bodyLines.push('');
  bodyLines.push(description || '_No description in the issue._');
  bodyLines.push('');

  bodyLines.push('## Acceptance Criteria');
  bodyLines.push('');
  if (acItems.length > 0) {
    acItems.forEach((ac, idx) => {
      bodyLines.push(`- AC${idx + 1}: ${ac}`);
    });
  } else {
    bodyLines.push('_No explicit acceptance criteria in the issue — extract/validate during refinement._');
  }
  bodyLines.push('');

  bodyLines.push('## Original Issue Context');
  bodyLines.push('');
  bodyLines.push(rawBody || '_No description in the issue._');
  bodyLines.push('');
  const comments = issue.comments || [];
  if (comments.length > 0) {
    bodyLines.push('### Comments');
    bodyLines.push('');
    for (const c of comments) {
      const author = ((c && c.author) || {}).login || '?';
      const text = String((c && c.body) || '').trim();
      if (text) {
        bodyLines.push(`- **${author}:** ${text}`);
      }
    }
    bodyLines.push('');
  }

  bodyLines.push('## Notes');
  bodyLines.push('');
  bodyLines.push('_Automatically generated from gh issue view JSON (GitHub)._');
  bodyLines.push('');

  return [...fm, ...bodyLines].join('\n');
}

function invokeIngestHelper(specPath, urls, skipAssets, repoRoot, fetchRemapFile) {
  if (skipAssets || !urls || urls.length === 0) {
    return 0;
  }
  const helper = path.join(HUB_SCRIPTS_DIR, 'ingest_visual_attachments.cjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-spec-'));
  const urlsPath = path.join(tmpDir, 'urls.json');
  fs.writeFileSync(urlsPath, JSON.stringify(urls), 'utf8');
  try {
    const cmd = ['node', helper, '--spec-path', String(specPath), '--urls-json', urlsPath, '--provider', 'github'];
    if (repoRoot !== null && repoRoot !== undefined) {
      cmd.push('--repo-root', String(repoRoot));
    }
    if (fetchRemapFile !== null && fetchRemapFile !== undefined) {
      cmd.push('--fetch-remap-file', String(fetchRemapFile));
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

function main() {
  const args = parseArgs(process.argv.slice(2));

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

  let issue;
  try {
    issue = loadIssue(raw);
  } catch (error) {
    console.error(`Error: invalid JSON — ${error.message}`);
    return 1;
  }

  const specMd = buildSpecMd(issue, args.repo || null);
  const visualUrls = collectVisualUrls(issue);

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
    : resolveDefaultOutput(repoRoot, issueSlug(issue), args.specsDir);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  if (fs.existsSync(outputPath) && !args.force) {
    const existing = fs.readFileSync(outputPath, 'utf8').replace(/\r\n/g, '\n');
    if (existing !== specMd.replace(/\r\n/g, '\n')) {
      console.error(`ERROR: spec of record exists and differs: ${outputPath}\nPreserve your edits or pass --force to overwrite.`);
      return 1;
    }
  }
  fs.writeFileSync(outputPath, specMd, 'utf8');

  const ingestRc = invokeIngestHelper(
    outputPath,
    visualUrls,
    args.skipAssets,
    repoRoot,
    args.fetchRemapFile || null,
  );
  if (ingestRc !== 0) {
    console.error(`Warning: visual ingest helper exited ${ingestRc}`);
  }

  console.log(`Spec written to: ${outputPath}`);
  console.log('Next: register into the workflow copy via ws-spec-provider-local');
  console.log(`  node {skillsRoot}/ws-spec-provider-local/scripts/register_local_spec.cjs --input ${outputPath} --source github`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { parseArgs, loadIssue, splitBody, issueSlug, collectVisualUrls, buildSpecMd };
