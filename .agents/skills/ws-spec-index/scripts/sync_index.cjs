#!/usr/bin/env node
'use strict';

/**
 * Deterministic ws-spec-index `sync` helper (us-474).
 *
 * On E1 ship evidence, updates the index status ([ ] -> [x], Done log) and,
 * when plans.statusSubfolders is true, files the spec of record into
 * completed/ with its sidecars via the ws-spec-organizer. The organizer also
 * rewrites index.PRD `spec:` refs in the same apply, so status and on-disk
 * location cannot disagree silently. When filing cannot happen the run is
 * reported as outstanding (non-zero exit) instead of succeeding.
 *
 * Usage:
 *   node sync_index.cjs --specs-dir <dir> --slug <slug> \
 *     [--delivery-commit <sha>] [--pr-url <url>] [--result <step-08 result>] \
 *     [--repo-root <dir>] [--json]
 *
 * Prints JSON: { status: synced|outstanding|skipped|error, slug, updated[],
 *   moved[], filingOutstanding, stalePendingPath?, reason? }
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

const { acquireFileLock } = require(path.join(HUB_SCRIPTS_DIR, 'file_lock.cjs'));
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const STATUS_SUBFOLDERS = ['pending', 'completed', 'archived'];
const ORGANIZE_SCRIPT = path.resolve(__dirname, '..', '..', 'ws-spec-organizer', 'scripts', 'organize_specs.cjs');

function parseArgs(argv) {
  const out = {
    specsDir: null,
    slug: null,
    deliveryCommit: null,
    prUrl: null,
    result: null,
    repoRoot: null,
    json: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: sync_index.cjs --specs-dir <dir> --slug <slug> [--delivery-commit <sha>] [--pr-url <url>] [--result <path>] [--repo-root <dir>] [--json]');
      process.exit(0);
    } else if (arg === '--specs-dir') out.specsDir = argv[++i];
    else if (arg === '--slug') out.slug = argv[++i];
    else if (arg === '--delivery-commit') out.deliveryCommit = argv[++i];
    else if (arg === '--pr-url') out.prUrl = argv[++i];
    else if (arg === '--result') out.result = argv[++i];
    else if (arg === '--repo-root') out.repoRoot = argv[++i];
    else if (arg === '--json') out.json = true;
    else if (arg.startsWith('--specs-dir=')) out.specsDir = arg.slice('--specs-dir='.length);
    else if (arg.startsWith('--slug=')) out.slug = arg.slice('--slug='.length);
    else if (arg.startsWith('--delivery-commit=')) out.deliveryCommit = arg.slice('--delivery-commit='.length);
    else if (arg.startsWith('--pr-url=')) out.prUrl = arg.slice('--pr-url='.length);
    else if (arg.startsWith('--result=')) out.result = arg.slice('--result='.length);
    else if (arg.startsWith('--repo-root=')) out.repoRoot = arg.slice('--repo-root='.length);
    else {
      console.error(`unknown argument: ${arg}`);
      process.exit(2);
    }
  }
  return out;
}

function isSafeSlug(slug) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug || '');
}

function resolveUnder(rootDir, fileName) {
  const root = path.resolve(rootDir);
  const abs = path.resolve(root, fileName);
  const rel = path.relative(root, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return abs;
}

function readTitle(specPath) {
  try {
    const text = fs.readFileSync(specPath, 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return null;
    const m = fm[1].match(/^title:\s*(.+)$/m);
    if (!m) return null;
    return m[1].trim().replace(/^['"]|['"]$/g, '');
  } catch {
    return null;
  }
}

function specRelOf(specsDir, specPath) {
  return path.relative(path.resolve(specsDir), specPath).split(path.sep).join('/');
}

// Scan root plus known status subfolders for the spec of record (existing wins).
function findSpecFile(specsDir, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixedRe = new RegExp('^\\d{4}-' + esc + '\\.spec\\.md$');
  const locations = ['', ...STATUS_SUBFOLDERS];
  for (const location of locations) {
    const dir = location ? path.join(specsDir, location) : specsDir;
    const exact = resolveUnder(dir, slug + '.spec.md');
    if (exact && fs.existsSync(exact)) return exact;
    let names;
    try {
      names = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const hit = names.find((name) => prefixedRe.test(name));
    if (hit) {
      const resolved = resolveUnder(dir, hit);
      if (resolved && fs.existsSync(resolved)) return resolved;
    }
  }
  return null;
}

function slugRefRe(slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    '`spec:\\s*(?:[A-Za-z0-9._-]+/)*(?:\\d{4}-)?' + esc + '\\.spec\\.md`|\\|\\s*`' + esc + '`\\s*\\|',
    'i',
  );
}

function lineReferencesSlug(line, slug) {
  return slugRefRe(slug).test(line);
}

function readEvidence(options) {
  let commit = options.deliveryCommit || null;
  let prUrl = options.prUrl || null;
  if ((!commit || !prUrl) && options.result && fs.existsSync(options.result)) {
    let text = '';
    try {
      text = fs.readFileSync(options.result, 'utf8');
    } catch {
      text = '';
    }
    if (!prUrl) {
      const m = text.match(/https?:\/\/[^\s)]+\/pull\/\d+/i);
      if (m) prUrl = m[0];
    }
    if (!commit) {
      const m = text.match(/\b[0-9a-f]{7,40}\b/i);
      if (m) commit = m[0];
    }
  }
  return { hasEvidence: Boolean(commit || prUrl), commit, prUrl };
}

function updateIndexStatus(indexText, slug, title, evidence) {
  const updated = [];
  const lines = indexText.split('\n');
  const refRe = slugRefRe(slug);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!refRe.test(line)) continue;
    if (/^(\s*-\s*)\[ \]/.test(line)) {
      lines[i] = line.replace(/^(\s*-\s*)\[ \]/, '$1[x]');
      updated.push('feature-map');
    } else if (/`\[ \]`/.test(line)) {
      lines[i] = line.replace(/`\[ \]`/, '`[x]`');
      updated.push('next-specs');
    }
  }
  let text = lines.join('\n');
  const doneLog = appendDoneLogRow(text, slug, title, evidence);
  if (doneLog.changed) updated.push('done-log');
  text = doneLog.text;
  return { text, updated };
}

function appendDoneLogRow(indexText, slug, title, evidence) {
  const headingRe = /^##[^\n]*Done log[^\n]*$/im;
  const heading = indexText.match(headingRe);
  if (!heading) return { text: indexText, changed: false };
  const start = heading.index + heading[0].length;
  const rest = indexText.slice(start);
  const nextHeading = rest.search(/\n##\s+/);
  const end = start + (nextHeading === -1 ? rest.length : nextHeading);
  const section = indexText.slice(start, end);
  if (slugRefRe(slug).test(section)) return { text: indexText, changed: false };

  const date = new Date().toISOString().slice(0, 10);
  const cite = evidence.prUrl || evidence.commit || 'implemented';
  const row = `| ${date} | \`${slug}\` | ${title || slug} | ${cite} |`;

  const sectionLines = section.split('\n');
  let lastTableRow = -1;
  for (let i = sectionLines.length - 1; i >= 0; i -= 1) {
    if (/^\|.*\|\s*$/.test(sectionLines[i])) {
      lastTableRow = i;
      break;
    }
  }
  if (lastTableRow === -1) {
    const insertion = `\n${row}\n`;
    return { text: indexText.slice(0, start) + insertion + indexText.slice(start), changed: true };
  }
  sectionLines.splice(lastTableRow + 1, 0, row);
  return { text: indexText.slice(0, start) + sectionLines.join('\n') + indexText.slice(end), changed: true };
}

function fileViaOrganizer({ repoRoot, slug }) {
  const res = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', repoRoot, '--slug', slug, '--status', 'completed', '--apply', '--json'],
    { encoding: 'utf8', cwd: repoRoot },
  );
  if (res.status !== 0) {
    const detail = String(res.stderr || res.stdout || '').trim();
    throw new Error(detail || `organize_specs.cjs exited ${res.status}`);
  }
  let payload = {};
  try {
    payload = JSON.parse(res.stdout);
  } catch {
    payload = {};
  }
  return Array.isArray(payload.renames) ? payload.renames : [];
}

function sync(options) {
  if (!options.slug) return { status: 'error', reason: 'missing --slug' };
  if (!isSafeSlug(options.slug)) return { status: 'error', reason: 'invalid slug', slug: options.slug };

  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const repoRoot = context.repoRoot;
  const plans = (context.config && context.config.plans) || {};
  const specsDir = options.specsDir
    ? path.resolve(repoRoot, options.specsDir)
    : path.resolve(repoRoot, plans.specsDir || '.agents/specs');

  const indexPath = resolveUnder(specsDir, 'index.PRD');
  if (!indexPath || !fs.existsSync(indexPath)) {
    return { status: 'skipped', reason: 'index.PRD missing', slug: options.slug };
  }
  const specPath = findSpecFile(specsDir, options.slug);
  if (!specPath) return { status: 'skipped', reason: 'spec missing', slug: options.slug };

  const evidence = readEvidence(options);
  if (!evidence.hasEvidence) {
    return { status: 'skipped', reason: 'no ship evidence', slug: options.slug };
  }

  const title = readTitle(specPath) || options.slug;

  // File first: the index is only marked done once the spec + sidecars are
  // actually under completed/ (and the organizer rewrote the spec: refs). A
  // failed filing leaves the index untouched and is reported outstanding, so
  // status and tree never disagree silently.
  let moved = [];
  if (plans.statusSubfolders === true) {
    const specRel = specRelOf(specsDir, specPath);
    if (!specRel.startsWith('completed/')) {
      try {
        const renames = fileViaOrganizer({ repoRoot, slug: options.slug });
        moved = renames
          .filter((r) => r.type === 'spec' || r.type === 'context' || r.type === 'assets')
          .map((r) => `${r.from} -> ${r.to}`);
      } catch (error) {
        return {
          status: 'outstanding',
          slug: options.slug,
          updated: [],
          moved: [],
          filingOutstanding: true,
          stalePendingPath: specRel,
          reason: error.message,
        };
      }
    }
  }

  const release = acquireFileLock(indexPath, { prefix: 'ws-index' });
  let updated = [];
  try {
    const indexText = fs.readFileSync(indexPath, 'utf8');
    const result = updateIndexStatus(indexText, options.slug, title, evidence);
    updated = result.updated;
    if (result.text !== indexText) fs.writeFileSync(indexPath, result.text, 'utf8');
  } finally {
    release();
  }

  const status = updated.length || moved.length ? 'synced' : 'skipped';
  return {
    status,
    slug: options.slug,
    updated,
    moved,
    filingOutstanding: false,
    reason: status === 'skipped' ? 'already in sync' : undefined,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let result;
  try {
    result = sync(options);
  } catch (error) {
    result = { status: 'error', reason: error.message };
  }
  console.log(JSON.stringify(result));
  if (result.status === 'error' || result.status === 'outstanding') process.exit(2);
}

if (require.main === module) main();

module.exports = {
  sync,
  findSpecFile,
  updateIndexStatus,
  appendDoneLogRow,
  isSafeSlug,
};
