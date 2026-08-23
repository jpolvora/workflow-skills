#!/usr/bin/env node
'use strict';

/**
 * Blank-scan inventory for ws-multi-spec: list only pending/unfinished specs.
 * Usage:
 *   node list_pending_specs.cjs --specs-dir <dir> [--plans-dir <dir>] [--repo-root <dir>] [--json]
 * Prints JSON: { pending[], omitted[], counts }
 */

const fs = require('fs');
const path = require('path');

function usage() {
  console.error(`Usage:
  node list_pending_specs.cjs --specs-dir <dir> [--plans-dir <dir>] [--repo-root <dir>] [--json]
  node list_pending_specs.cjs --help`);
}

function parseArgs(argv) {
  const opts = {
    specsDir: null,
    plansDir: null,
    repoRoot: process.cwd(),
    json: true,
    help: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--specs-dir') opts.specsDir = argv[++i];
    else if (a === '--plans-dir') opts.plansDir = argv[++i];
    else if (a === '--repo-root') opts.repoRoot = argv[++i];
    else if (typeof a === 'string' && a.startsWith('-')) {
      throw new Error(`unknown argument: ${a}`);
    } else {
      throw new Error(`unknown argument: ${a}`);
    }
  }
  return opts;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function readUtf8(abs) {
  return fs.readFileSync(abs, 'utf8').replace(/^\uFEFF/, '');
}

function stripQuotes(value) {
  const v = String(value || '').trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

function extractFrontmatterField(text, field) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const re = new RegExp(
    `^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.+)$`,
    'm',
  );
  const hit = match[1].match(re);
  return hit ? stripQuotes(hit[1]) : null;
}

function walkSpecFiles(dir, acc) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkSpecFiles(abs, acc);
    else if (ent.isFile() && ent.name.endsWith('.spec.md')) acc.push(abs);
  }
  return acc;
}

function isStep00Copy(abs) {
  return /^step-00-/.test(path.basename(abs));
}

function slugFromSpecRef(ref) {
  const base = path.posix.basename(String(ref).trim()).replace(/\.spec\.md$/i, '');
  if (base.startsWith('step-00-')) return base.slice('step-00-'.length);
  return base;
}

function slugFromTick(raw) {
  const t = String(raw || '').trim();
  if (/^\[[ xX~]\]/.test(t)) return null;
  if (t.endsWith('.spec.md')) return slugFromSpecRef(t);
  if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(t)) return t;
  return null;
}

function rank(status) {
  if (status === 'done') return 3;
  if (status === 'partial') return 2;
  if (status === 'todo') return 1;
  return 0;
}

function mergeStatus(map, slug, status) {
  if (!slug || !status) return;
  const prev = map.get(slug);
  if (!prev || rank(status) > rank(prev)) map.set(slug, status);
}

function markFromCheck(ch) {
  const c = String(ch || '').toLowerCase();
  if (c === 'x') return 'done';
  if (c === '~') return 'partial';
  return 'todo';
}

function sectionAfter(text, headingRe) {
  const m = text.match(headingRe);
  if (!m) return '';
  const start = m.index + m[0].length;
  const rest = text.slice(start);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function parseIndex(text) {
  const bySlug = new Map();

  const bulletRe = /^-\s*\[([ xX~])\][^\n]*\(`spec:\s*([^`]+)`\)/gm;
  for (const m of text.matchAll(bulletRe)) {
    mergeStatus(bySlug, slugFromSpecRef(m[2]), markFromCheck(m[1]));
  }

  for (const line of text.split(/\r?\n/)) {
    if (!/^\|/.test(line) || /^\|\s*-+/.test(line)) continue;
    const check = line.match(/`\[([ xX~])\]`|\[([ xX~])\]/);
    if (!check) continue;
    const mark = markFromCheck(check[1] || check[2]);
    for (const tick of line.matchAll(/`([^`]+)`/g)) {
      mergeStatus(bySlug, slugFromTick(tick[1]), mark);
    }
  }

  const doneish = `${sectionAfter(text, /^##\s+10\.\s+Done log\b/m)}\n${sectionAfter(text, /^##\s+Archive\b/m)}`;
  for (const tick of doneish.matchAll(/`([^`]+)`/g)) {
    const slug = slugFromTick(tick[1]);
    if (slug) mergeStatus(bySlug, slug, 'done');
  }

  return bySlug;
}

function walkFilesNamed(dir, matcher, acc) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFilesNamed(abs, matcher, acc);
    else if (ent.isFile() && matcher(ent.name)) acc.push(abs);
  }
  return acc;
}

function hasMergedDelivery(plansDir, slug) {
  if (!plansDir) return false;
  const slugDir = path.join(plansDir, slug);
  if (!fs.existsSync(slugDir)) return false;
  const results = walkFilesNamed(slugDir, (name) => /^step-08-.+\.result\.md$/i.test(name), []);
  for (const file of results) {
    const text = readUtf8(file);
    if (
      /\bmerged:\s*true\b/i.test(text) ||
      /\bstate:\s*MERGED\b/i.test(text) ||
      /\bmerged PR\b/i.test(text) ||
      /^status:\s*completed\b/im.test(text)
    ) {
      return true;
    }
  }
  return false;
}

function listPending(opts) {
  const specsAbs = path.resolve(opts.repoRoot, opts.specsDir);
  const plansAbs = opts.plansDir ? path.resolve(opts.repoRoot, opts.plansDir) : null;
  const files = walkSpecFiles(specsAbs, []).sort((a, b) => a.localeCompare(b));
  const indexPath = path.join(specsAbs, 'index.PRD');
  const indexMap = fs.existsSync(indexPath) ? parseIndex(readUtf8(indexPath)) : new Map();
  const pending = [];
  const omitted = [];

  for (const abs of files) {
    const specPath = toPosix(path.relative(opts.repoRoot, abs));
    if (isStep00Copy(abs)) {
      omitted.push({
        slug: slugFromSpecRef(path.basename(abs)),
        specPath,
        reason: 'step-00-copy',
      });
      continue;
    }
    const fileSlug = path.basename(abs).replace(/\.spec\.md$/i, '');
    let slug = null;
    try {
      slug = extractFrontmatterField(readUtf8(abs), 'slug');
    } catch {
      slug = null;
    }
    if (!slug) slug = fileSlug;

    if (hasMergedDelivery(plansAbs, slug) || hasMergedDelivery(plansAbs, fileSlug)) {
      omitted.push({ slug, specPath, reason: 'already-implemented' });
      continue;
    }

    const indexStatus = indexMap.get(slug) ?? indexMap.get(fileSlug);
    if (indexStatus === 'done') {
      omitted.push({ slug, specPath, reason: 'index-done' });
      continue;
    }

    const status = indexStatus || 'untracked';
    pending.push({ slug, specPath, status });
  }

  pending.sort((a, b) => a.specPath.localeCompare(b.specPath));
  omitted.sort((a, b) => a.specPath.localeCompare(b.specPath));
  return {
    specsDir: toPosix(path.relative(opts.repoRoot, specsAbs) || opts.specsDir),
    indexPath: fs.existsSync(indexPath)
      ? toPosix(path.relative(opts.repoRoot, indexPath))
      : null,
    pending,
    omitted,
    counts: {
      scanned: files.length,
      pending: pending.length,
      omitted: omitted.length,
    },
  };
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    usage();
    console.error(String(err.message || err));
    process.exit(2);
    return;
  }
  if (opts.help) {
    usage();
    process.exit(0);
    return;
  }
  if (!opts.specsDir) {
    usage();
    console.error('missing --specs-dir');
    process.exit(2);
    return;
  }
  const result = listPending(opts);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  main(process.argv);
}

module.exports = { listPending, parseIndex, parseArgs };
