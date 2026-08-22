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
  const re = new RegExp('(?:spec:\\s*)?`?' + esc + '(?:\\.spec\\.md)?`?', 'i');
  return re.test(indexText);
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

function escapeTableCell(value) {
  return String(value || '')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ');
}

function track({ specsDir, slug }) {
  if (!specsDir || !slug) {
    return { status: 'error', reason: 'missing --specs-dir or --slug' };
  }
  const specPath = path.join(specsDir, slug + '.spec.md');
  const indexPath = path.join(specsDir, 'index.PRD');
  if (!fs.existsSync(indexPath)) {
    return { status: 'skipped', reason: 'index.PRD missing', slug };
  }
  if (!fs.existsSync(specPath)) {
    return { status: 'skipped', reason: 'spec missing', slug };
  }
  const title = readTitle(specPath) || slug;
  let indexText = fs.readFileSync(indexPath, 'utf8');
  if (alreadyTracked(indexText, slug)) {
    return { status: 'skipped', reason: 'already tracked', slug, title };
  }

  const bullet = '- [ ] ' + title + ' (`spec: ' + slug + '.spec.md`)';
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

  if (/^Open Next-spec:/m.test(indexText)) {
    indexText = indexText.replace(/^Open Next-spec:/m, row + '\n\nOpen Next-spec:');
  } else if (/^##\s+9\.\s+Inbox/m.test(indexText)) {
    indexText = indexText.replace(/^##\s+9\.\s+Inbox/m, row + '\n\n## 9. Inbox');
  } else {
    indexText = indexText.trimEnd() + '\n' + row + '\n';
  }

  fs.writeFileSync(indexPath, indexText, 'utf8');
  return { status: 'tracked', slug, title, row: n };
}

function main() {
  const result = track(parseArgs(process.argv));
  console.log(JSON.stringify(result));
  if (result.status === 'error') process.exit(2);
}

if (require.main === module) main();

module.exports = { track, alreadyTracked, readTitle, nextRowNumber, escapeTableCell };
