#!/usr/bin/env node
/**
 * Extract a YAML frontmatter field from one or more markdown files.
 * Avoids fragile nested-quote python -c one-liners.
 *
 * Usage:
 *   node extract_frontmatter_field.cjs --file <path> [--field slug]
 *   node extract_frontmatter_field.cjs --dir <path> [--field slug] [--glob "*.md"]
 *   node extract_frontmatter_field.cjs --file a.md --file b.md --field slug --json
 */
'use strict';

const fs = require('fs');
const path = require('path');

function usage() {
  console.error(`Usage:
  node extract_frontmatter_field.cjs --file <path> [--field slug]
  node extract_frontmatter_field.cjs --dir <path> [--field slug] [--glob "*.md"]
  node extract_frontmatter_field.cjs --file a.md --file b.md --field slug [--json]`);
}

function parseArgs(argv) {
  const opts = { files: [], dir: null, field: 'slug', glob: '*.md', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--file') opts.files.push(argv[++i]);
    else if (a === '--dir') opts.dir = argv[++i];
    else if (a === '--field') opts.field = argv[++i];
    else if (a === '--glob') opts.glob = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else throw new Error(`unknown argument: ${a}`);
  }
  return opts;
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

function extractField(text, field) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const block = match[1];
  const re = new RegExp(
    `^${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*(.+)$`,
    'm',
  );
  const hit = block.match(re);
  if (!hit) return null;
  return stripQuotes(hit[1]);
}

function matchGlob(name, pattern) {
  // Minimal * and ? glob for basename matching.
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`, 'i').test(name);
}

function collectFiles(opts) {
  const out = [];
  for (const f of opts.files) out.push(path.resolve(f));
  if (opts.dir) {
    const dir = path.resolve(opts.dir);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
      throw new Error(`--dir is not a directory: ${opts.dir}`);
    }
    for (const name of fs.readdirSync(dir)) {
      if (!matchGlob(name, opts.glob)) continue;
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isFile()) out.push(abs);
    }
  }
  return out;
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`Error: ${e.message}`);
    usage();
    process.exit(2);
  }
  if (opts.help) {
    usage();
    process.exit(0);
  }
  if (!opts.field) {
    console.error('Error: --field required');
    process.exit(2);
  }
  const files = collectFiles(opts);
  if (files.length === 0) {
    console.error('Error: provide --file and/or --dir with matching files');
    process.exit(2);
  }

  const rows = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const value = extractField(text, opts.field);
    rows.push({
      file: file.replace(/\\/g, '/'),
      name: path.basename(file),
      field: opts.field,
      value: value == null ? null : value,
    });
  }

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, rows }, null, 2));
    return;
  }
  for (const row of rows) {
    console.log(`${row.value == null ? '?' : row.value} | ${row.name}`);
  }
}

main();
