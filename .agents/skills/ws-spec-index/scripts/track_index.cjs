#!/usr/bin/env node
'use strict';

/**
 * Deterministic index.PRD track helper for ws-spec-index mode `track`.
 * Usage: node track_index.cjs --specs-dir <dir> --slug <slug>
 * Prints JSON: { status: 'tracked'|'skipped'|'error', reason?, slug, title? }
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = { specsDir: null, slug: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--specs-dir') out.specsDir = argv[++i];
    else if (a === '--slug') out.slug = argv[++i];
  }
  return out;
}

function readTitle(specPath) {
  const text = fs.readFileSync(specPath, 'utf8');
  const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fm) return null;
  const m = fm[1].match(/^title:\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function alreadyTracked(indexText, slug) {
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Exact slug cell or `spec: [NNNN-]slug.spec.md` — not a substring of another slug.
  const re = new RegExp(
    '(?:`spec:\\s*(?:\\d{4}-)?' + esc + '\\.spec\\.md`|\\|\\s*`' + esc + '`\\s*\\|)',
    'i',
  );
  return re.test(indexText);
}

function findSpecFile(specsDir, slug) {
  const exact = resolveUnder(specsDir, slug + '.spec.md');
  if (exact && fs.existsSync(exact)) return exact;
  let names;
  try {
    names = fs.readdirSync(specsDir);
  } catch {
    return null;
  }
  const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^\\d{4}-' + esc + '\\.spec\\.md$');
  const hit = names.find((name) => re.test(name));
  return hit ? resolveUnder(specsDir, hit) : null;
}

function lastPhaseLabel(indexText) {
  const matches = [...indexText.matchAll(/^###\s+Phase[^\n]*/gm)];
  if (!matches.length) return 'Feature map';
  return matches[matches.length - 1][0].replace(/^###\s+/, '').trim();
}

function nextRowNumber(indexText) {
  let max = 0;
  for (const m of indexText.matchAll(/^\|\s*(\d+)\s*\|/gm)) {
    max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

function escapeInlineMarkdown(value) {
  return String(value || '')
    .replace(/`/g, "'")
    .replace(/\[/g, '(')
    .replace(/\]/g, ')');
}

function escapeTableCell(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/`/g, "'")
    .replace(/[\r\n]+/g, ' ');
}

function isSafeSlug(slug) {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(slug);
}

function resolveUnder(specsDir, fileName) {
  const root = path.resolve(specsDir);
  const abs = path.resolve(root, fileName);
  const rel = path.relative(root, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    return null;
  }
  return abs;
}

function insertTableRow(indexText, row) {
  const openIdx = indexText.search(/^Open Next-spec:/m);
  if (openIdx !== -1) {
    const before = indexText.slice(0, openIdx);
    const after = indexText.slice(openIdx);
    const lines = before.split(/\r?\n/);
    let lastTableRow = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\|.+\|\s*$/.test(lines[i])) {
        lastTableRow = i;
        break;
      }
    }
    if (lastTableRow !== -1) {
      lines.splice(lastTableRow + 1, 0, row);
      // Keep a single blank line before Open Next-spec when present.
      while (lines.length && lines[lines.length - 1] === '') lines.pop();
      return lines.join('\n') + '\n\n' + after;
    }
    return before.replace(/\s*$/, '') + '\n' + row + '\n\n' + after;
  }
  if (/^##\s+9\.\s+Inbox/m.test(indexText)) {
    return indexText.replace(/^##\s+9\.\s+Inbox/m, row + '\n\n## 9. Inbox');
  }
  return indexText.trimEnd() + '\n' + row + '\n';
}

function track({ specsDir, slug }) {
  if (!specsDir || !slug) {
    return { status: 'error', reason: 'missing --specs-dir or --slug' };
  }
  if (!isSafeSlug(slug)) {
    return { status: 'error', reason: 'invalid slug', slug };
  }
  const specPath = findSpecFile(specsDir, slug);
  const indexPath = resolveUnder(specsDir, 'index.PRD');
  if (!indexPath) {
    return { status: 'error', reason: 'slug escapes specs-dir', slug };
  }
  if (!fs.existsSync(indexPath)) {
    return { status: 'skipped', reason: 'index.PRD missing', slug };
  }
  if (!specPath || !fs.existsSync(specPath)) {
    return { status: 'skipped', reason: 'spec missing', slug };
  }
  const title = readTitle(specPath) || slug;
  let indexText = fs.readFileSync(indexPath, 'utf8');
  if (alreadyTracked(indexText, slug)) {
    return { status: 'skipped', reason: 'already tracked', slug, title };
  }

  const specFileName = path.basename(specPath);
  const bullet =
    '- [ ] ' + escapeInlineMarkdown(title) + ' (`spec: ' + specFileName + '`)';
  const phaseRe = /^###\s+Phase[^\n]*$/gm;
  const phases = [...indexText.matchAll(phaseRe)];
  if (phases.length) {
    const last = phases[phases.length - 1];
    const start = last.index + last[0].length;
    const rest = indexText.slice(start);
    const nextHeading = rest.search(/\n##\s+/);
    const insertAt = start + (nextHeading === -1 ? rest.length : nextHeading);
    const block = indexText.slice(start, insertAt);
    const trimmedEnd = block.replace(/\s*$/, '');
    indexText =
      indexText.slice(0, start) +
      trimmedEnd +
      '\n' +
      bullet +
      '\n' +
      indexText.slice(start + trimmedEnd.length);
  } else {
    const fm = indexText.search(/^##\s+7\.\s+Feature map/m);
    if (fm === -1) {
      indexText = indexText.trimEnd() + '\n\n' + bullet + '\n';
    } else {
      const after = indexText.indexOf('\n', fm);
      indexText = indexText.slice(0, after + 1) + bullet + '\n' + indexText.slice(after + 1);
    }
  }

  const n = nextRowNumber(indexText);
  const phase = lastPhaseLabel(indexText);
  const row =
    '| ' +
    n +
    ' | `' +
    slug +
    '` | `[ ]` todo | ' +
    escapeTableCell(phase) +
    ' | ' +
    escapeTableCell(title) +
    ' |';

  const openRe = /^Open Next-spec:.*$/m;
  if (openRe.test(indexText)) {
    indexText = indexText.replace(openRe, (line) => {
      if (line.includes('`' + slug + '`')) return line;
      if (/\.\s*$/.test(line)) return line.replace(/\.\s*$/, ', `' + slug + '`.');
      return line.replace(/\s*$/, '') + ', `' + slug + '`';
    });
  }

  indexText = insertTableRow(indexText, row);

  fs.writeFileSync(indexPath, indexText, 'utf8');
  return { status: 'tracked', slug, title, row: n };
}

function main() {
  const result = track(parseArgs(process.argv));
  console.log(JSON.stringify(result));
  if (result.status === 'error') process.exit(2);
}

if (require.main === module) main();

module.exports = {
  track,
  alreadyTracked,
  readTitle,
  nextRowNumber,
  escapeTableCell,
  isSafeSlug,
  insertTableRow,
};
