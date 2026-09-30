#!/usr/bin/env node
'use strict';

/**
 * Step 8 close verification (us-474).
 *
 * Fails closed when the index marks a tracked spec completed ([x] feature-map
 * bullet, next-specs [x] cell, or Done-log row) but the spec of record still
 * resolves under pending/. The error names the stale pending/ path. When the
 * index and the tree agree (or the index does not mark the slug done) it exits
 * 0, so the quiet path adds no gate.
 *
 * Usage:
 *   node verify_close_filing.cjs --specs-dir <dir> --slug <slug> \
 *     [--index-file <path>] [--json]
 */

const fs = require('fs');
const path = require('path');

const STATUS_SUBFOLDERS = ['pending', 'completed', 'archived'];

function parseArgs(argv) {
  const out = { specsDir: null, slug: null, indexFile: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: verify_close_filing.cjs --specs-dir <dir> --slug <slug> [--index-file <path>] [--json]');
      process.exit(0);
    } else if (arg === '--specs-dir') out.specsDir = argv[++i];
    else if (arg === '--slug') out.slug = argv[++i];
    else if (arg === '--index-file') out.indexFile = argv[++i];
    else if (arg === '--json') out.json = true;
    else if (arg.startsWith('--specs-dir=')) out.specsDir = arg.slice('--specs-dir='.length);
    else if (arg.startsWith('--slug=')) out.slug = arg.slice('--slug='.length);
    else if (arg.startsWith('--index-file=')) out.indexFile = arg.slice('--index-file='.length);
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

function findSpecFile(specsDir, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefixedRe = new RegExp('^\\d{4}-' + esc + '\\.spec\\.md$');
  for (const location of ['', ...STATUS_SUBFOLDERS]) {
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

function indexMarksCompleted(indexText, slug) {
  const lines = indexText.split(/\r?\n/);
  let section = '';
  const refRe = slugRefRe(slug);
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      section = heading[1].toLowerCase();
      continue;
    }
    if (!refRe.test(line)) continue;
    if (section.includes('done log') || section.includes('delivery archive')) return true;
    if (/^-\s*\[x\]/i.test(line.trim())) return true;
    if (/\|\s*`\[x\]/i.test(line)) return true;
  }
  return false;
}

function verify(options) {
  if (!options.slug) return { ok: false, error: 'missing --slug' };
  if (!isSafeSlug(options.slug)) return { ok: false, error: 'invalid slug', slug: options.slug };
  if (!options.specsDir) return { ok: false, error: 'missing --specs-dir' };

  const specsDir = path.resolve(options.specsDir);
  const indexPath = options.indexFile ? path.resolve(options.indexFile) : path.join(specsDir, 'index.PRD');
  if (!fs.existsSync(indexPath)) {
    return { ok: true, slug: options.slug, indexMarked: false, reason: 'index.PRD missing' };
  }
  const indexText = fs.readFileSync(indexPath, 'utf8');
  const indexMarked = indexMarksCompleted(indexText, options.slug);
  const specPath = findSpecFile(specsDir, options.slug);
  const specRel = specPath ? path.relative(specsDir, specPath).split(path.sep).join('/') : null;

  if (indexMarked && specRel && specRel.startsWith('pending/')) {
    return {
      ok: false,
      slug: options.slug,
      indexMarked: true,
      stalePath: specRel,
      error: `index marks "${options.slug}" completed but the spec still resolves under pending/: ${specRel}`,
    };
  }
  return { ok: true, slug: options.slug, indexMarked, specPath: specRel };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let result;
  try {
    result = verify(options);
  } catch (error) {
    result = { ok: false, error: error.message };
  }
  console.log(JSON.stringify(result));
  if (!result.ok) {
    if (result.stalePath) console.error(`ERROR: index marks completed but spec is stale under pending/: ${result.stalePath}`);
    else console.error(`ERROR: ${result.error}`);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = { verify, indexMarksCompleted, findSpecFile, isSafeSlug };
