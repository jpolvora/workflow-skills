#!/usr/bin/env node
'use strict';

/**
 * ws-kanvas move: POST /api/move transition table over index, plan state, and archive.
 * Node 22 stdlib only. Reuses collector parsers; delegates sprint track to ws-spec-index.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const {
  collectBoard,
  getCard,
  isValidSlug,
  resolveInside,
  parseFrontmatter,
  parseIndex,
  readPlanSignals,
  COLUMNS,
} = require('./collect.cjs');

const VALID_TARGETS = new Set(COLUMNS.map((c) => c.id));
const STAGING_REASON = 'staging-not-writable';
const RUN_DIR_BLOCKS_BACKLOG = 'run-directory-exists';
const NO_DELIVERY_EVIDENCE = 'no-delivery-evidence';
const HISTORY_REWRITE = 'history-rewrite-blocked';
const MISSING_PLAN_STATE = 'missing-plan-state';

function normalizeRead(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function writeLf(file, text) {
  const body = normalizeRead(text).replace(/\r\n/g, '\n');
  fs.writeFileSync(file, body, 'utf8');
}

function readText(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return normalizeRead(raw);
}

function treeHash({ specsDir, plansDir, indexPath }) {
  const parts = [];
  function walk(dir) {
    if (!dir || !fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile()) {
        parts.push(full);
        parts.push(crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'));
      }
    }
  }
  walk(specsDir);
  walk(plansDir);
  if (indexPath && fs.existsSync(indexPath)) {
    parts.push(indexPath);
    parts.push(crypto.createHash('sha256').update(fs.readFileSync(indexPath)).digest('hex'));
  }
  return crypto.createHash('sha256').update(parts.join('\0')).digest('hex');
}

function loadTrack() {
  try {
    return require(path.join(__dirname, '..', '..', 'ws-spec-index', 'scripts', 'track_index.cjs'));
  } catch {
    return null;
  }
}

function planDirExists(plansDir, slug) {
  const dir = resolveInside(plansDir, slug);
  return Boolean(dir && fs.existsSync(dir) && fs.statSync(dir).isDirectory());
}

function findPrimaryStateFile(planDir, slug) {
  if (!planDir || !fs.existsSync(planDir)) return null;
  const top = path.join(planDir, `${slug}.state.md`);
  if (fs.existsSync(top)) return top;
  let entries;
  try {
    entries = fs.readdirSync(planDir);
  } catch {
    return null;
  }
  const hit = entries.find((n) => n.endsWith('.state.md'));
  return hit ? path.join(planDir, hit) : null;
}

function hasDeliveryEvidence(plansDir, slug, cwd) {
  const plan = readPlanSignals(plansDir, slug, cwd);
  if (plan.hasShipRecord) return true;
  if (plan.planEvidence) return true;
  return false;
}

function isHistoryRewrite(fromColumn, toColumn, card) {
  if (fromColumn === 'production' && toColumn !== 'abandoned' && toColumn !== 'production') return true;
  if (fromColumn === 'staging' && (toColumn === 'development' || toColumn === 'backlog' || toColumn === 'sprint')) return true;
  if (card.indexStatus === 'done' && toColumn !== 'production' && toColumn !== 'abandoned') return true;
  return false;
}

function slugEsc(slug) {
  return slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeSlugFromIndex(indexText, slug) {
  const esc = slugEsc(slug);
  const lines = indexText.split('\n');
  const out = [];
  for (const line of lines) {
    if (new RegExp('`spec:\\s*(?:[A-Za-z0-9._-]+/)*(?:\\d{4}-)?' + esc + '\\.spec\\.md`', 'i').test(line)) continue;
    if (new RegExp('\\|\\s*`' + esc + '`\\s*\\|').test(line)) continue;
    if (/^Open Next-spec:/i.test(line) && line.includes('`' + slug + '`')) {
      out.push(line.replace(new RegExp(',?\\s*`' + esc + '`', 'g'), '').replace(/\s+$/, ''));
      continue;
    }
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

function flipIndexStatus(indexText, slug, toDone) {
  const esc = slugEsc(slug);
  const mark = toDone ? 'x' : ' ';
  let text = indexText;
  text = text.replace(
    new RegExp('(\\|\\s*`' + esc + '`\\s*\\|\\s*`?)\\[([ x~])\\](`?[^|]*\\|)', 'g'),
    `$1[${mark}]$3`,
  );
  text = text.replace(
    new RegExp('(\\|\\s*`?\\[([ x~])\\]`?[^|]*\\|\\s*`' + esc + '`\\s*\\|)', 'g'),
    (m, _p, ch) => m.replace(`[${ch}]`, `[${mark}]`),
  );
  text = text.replace(
    new RegExp('(-\\s*\\[)([ x~])(\\][^\\n]*\\(\\s*`?spec:\\s*`?(?:[A-Za-z0-9._-]+/)*(?:\\d{4}-)?' + esc + '\\.spec\\.md`?\\s*\\))', 'gi'),
    `$1${mark}$3`,
  );
  return text;
}

function appendDoneLogRow(indexText, slug, title, evidence) {
  if (new RegExp('`\\s*' + slugEsc(slug) + '\\s*`').test(indexText.split(/##\s+.*done log/i)[1] || '')) {
    return indexText;
  }
  const date = new Date().toISOString().slice(0, 10);
  const row = `| ${date} | \`${slug}\` | ${title.replace(/\|/g, '\\|')} | ${evidence || 'board-move'} |`;
  const m = indexText.match(/^##\s+.*done log/im);
  if (!m) return indexText.trimEnd() + `\n\n## Done log\n\n| Date | Slug | Title | PR / Commit |\n|------|------|-------|-------------|\n${row}\n`;
  const idx = m.index + m[0].length;
  const rest = indexText.slice(idx);
  const nextH = rest.search(/\n##\s+/);
  const insertAt = idx + (nextH === -1 ? rest.length : nextH);
  return indexText.slice(0, insertAt).replace(/\s*$/, '') + '\n' + row + '\n' + indexText.slice(insertAt);
}

function appendArchiveRow(indexText, slug, outcome) {
  const esc = slugEsc(slug);
  if (new RegExp('\\|\\s*`?' + esc + '`?\\s*\\|', 'i').test(indexText)) return indexText;
  const row = `| \`${slug}\` | ${outcome} | active | none | board-move |`;
  const m = indexText.match(/^##\s+.*archiv/im);
  if (!m) return indexText.trimEnd() + `\n\n## Archive\n\n| Slug | Outcome | Last state | PR / Commit | Summary |\n|------|---------|------------|-------------|----------|\n${row}\n`;
  const idx = m.index + m[0].length;
  const rest = indexText.slice(idx);
  const nextH = rest.search(/\n##\s+/);
  const insertAt = idx + (nextH === -1 ? rest.length : nextH);
  return indexText.slice(0, insertAt).replace(/\s*$/, '') + '\n' + row + '\n' + indexText.slice(insertAt);
}

function setPlanStatusFile(stateFile, status, injectFail) {
  if (injectFail) throw new Error('injected-writer-failure');
  const text = readText(stateFile);
  const { data, body } = parseFrontmatter(text);
  data.status = status;
  const lines = ['---'];
  for (const [k, v] of Object.entries(data)) lines.push(`${k}: ${v}`);
  lines.push('---');
  writeLf(stateFile, lines.join('\n') + '\n' + body.replace(/^\n/, ''));
}

function executeWrites(writes, injectFail) {
  if (injectFail) throw new Error('injected-writer-failure');
  for (const fn of writes) fn();
}

function moveCard(roots, body, options = {}) {
  const { slug, toColumn } = body || {};
  if (typeof slug !== 'string' || !isValidSlug(slug)) {
    return { status: 400, error: { code: 'bad-request', message: 'Invalid or missing slug.' } };
  }
  if (typeof toColumn !== 'string' || !VALID_TARGETS.has(toColumn)) {
    return { status: 400, error: { code: 'bad-request', message: 'Invalid or missing toColumn.' } };
  }

  const specsDir = path.resolve(roots.specsDir);
  const plansDir = path.resolve(roots.plansDir);
  const indexPath = roots.index ? path.resolve(roots.index) : path.join(specsDir, 'index.PRD');
  const cwd = process.cwd();

  const board = collectBoard({ specsDir, plansDir, indexPath });
  const lookup = getCard(board, slug);
  if (lookup.error) {
    return { status: 404, error: lookup.error };
  }
  const card = lookup.card;
  const fromColumn = card.column;

  if (fromColumn === toColumn) {
    return { status: 200, card, notice: null, writer: 'no-op' };
  }

  const conflict = (reason, message) => ({
    status: 409,
    fromColumn,
    toColumn,
    error: { code: 'conflict', reason, message },
  });

  if (isHistoryRewrite(fromColumn, toColumn, card)) {
    return conflict(HISTORY_REWRITE, 'Move would rewrite shipped history.');
  }

  if (toColumn === 'staging') {
    return conflict(STAGING_REASON, 'Staging has no writable signal in this phase.');
  }

  if (toColumn === 'backlog' && planDirExists(plansDir, slug)) {
    return conflict(RUN_DIR_BLOCKS_BACKLOG, 'Cannot move to backlog while a run directory exists.');
  }

  if (toColumn === 'production' && !hasDeliveryEvidence(plansDir, slug, cwd)) {
    return conflict(NO_DELIVERY_EVIDENCE, 'Production requires delivery evidence.');
  }

  if (toColumn === 'development') {
    const planDir = resolveInside(plansDir, slug);
    const stateFile = planDir ? findPrimaryStateFile(planDir, slug) : null;
    if (!stateFile) {
      return conflict(MISSING_PLAN_STATE, 'Development requires a plan state file.');
    }
  }

  const writes = [];
  let writer = 'none';
  let notice = null;

  if (toColumn === 'backlog') {
    writer = 'index-untrack';
    writes.push(() => {
      if (!fs.existsSync(indexPath)) return;
      const next = removeSlugFromIndex(readText(indexPath), slug);
      writeLf(indexPath, next);
    });
  } else if (toColumn === 'sprint') {
    writer = 'index-track';
    writes.push(() => {
      const track = loadTrack();
      if (!track) throw new Error('track_index unavailable');
      track.track({ specsDir, slug });
    });
    if (!planDirExists(plansDir, slug)) {
      notice = 'tracked — enters Sprint when a workflow run starts';
    }
  } else if (toColumn === 'development') {
    writer = 'plan-status-active';
    const planDir = resolveInside(plansDir, slug);
    const stateFile = findPrimaryStateFile(planDir, slug);
    writes.push(() => setPlanStatusFile(stateFile, 'active', false));
  } else if (toColumn === 'production') {
    writer = 'index-sync';
    const plan = readPlanSignals(plansDir, slug, cwd);
    const evidence = plan.planEvidence || 'board-move';
    writes.push(() => {
      if (!fs.existsSync(indexPath)) throw new Error('index missing');
      let text = readText(indexPath);
      text = flipIndexStatus(text, slug, true);
      text = appendDoneLogRow(text, slug, card.title, evidence);
      writeLf(indexPath, text);
    });
  } else if (toColumn === 'abandoned') {
    const planDir = resolveInside(plansDir, slug);
    const stateFile = planDir ? findPrimaryStateFile(planDir, slug) : null;
    if (stateFile) {
      writer = 'plan-status-cancelled';
      writes.push(() => setPlanStatusFile(stateFile, 'cancelled', false));
    } else {
      writer = 'archive-row';
      writes.push(() => {
        if (!fs.existsSync(indexPath)) throw new Error('index missing');
        const text = appendArchiveRow(readText(indexPath), slug, 'cancelled');
        writeLf(indexPath, text);
      });
    }
  }

  try {
    executeWrites(writes, options.injectWriterFailure);
  } catch (err) {
    return {
      status: 409,
      error: { code: 'conflict', reason: 'write-failed', message: 'Move write failed.' },
    };
  }

  const after = collectBoard({ specsDir, plansDir, indexPath });
  const refreshed = getCard(after, slug);
  const resultCard = refreshed.card || card;
  return { status: 200, card: resultCard, notice, writer, fromColumn, toColumn };
}

function parseMoveBody(raw) {
  if (typeof raw !== 'string' || !raw.trim()) {
    return { error: { code: 'bad-request', message: 'Request body is required.' } };
  }
  let body;
  try {
    body = JSON.parse(normalizeRead(raw));
  } catch {
    return { error: { code: 'bad-request', message: 'Malformed JSON body.' } };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: { code: 'bad-request', message: 'Body must be a JSON object.' } };
  }
  const { slug, toColumn } = body;
  if (typeof slug !== 'string' || typeof toColumn !== 'string') {
    return { error: { code: 'bad-request', message: 'slug and toColumn must be strings.' } };
  }
  if (!VALID_TARGETS.has(toColumn)) {
    return { error: { code: 'bad-request', message: 'Unknown toColumn.' } };
  }
  return { slug, toColumn };
}

function executeMove({ specsDir, plansDir, indexPath, slug, toColumn, injectWriterFailure }) {
  const roots = { specsDir, plansDir, index: indexPath };
  const result = moveCard(roots, { slug, toColumn }, { injectWriterFailure });
  const fromTo = result.fromColumn && result.toColumn ? `${result.fromColumn}→${result.toColumn}` : 'n/a';
  const writer = result.writer || 'n/a';
  const outcome = result.error ? `error:${result.error.code}` : 'ok';
  process.stdout.write(`move slug=${slug} ${fromTo} writer=${writer} result=${outcome}\n`);
  if (result.error) {
    return { status: result.status, body: { error: result.error } };
  }
  const body = { card: result.card };
  if (result.notice) body.notice = result.notice;
  return { status: result.status, body };
}

module.exports = {
  moveCard,
  executeMove,
  parseMoveBody,
  treeHash,
  VALID_TARGETS,
  STAGING_REASON,
  RUN_DIR_BLOCKS_BACKLOG,
  NO_DELIVERY_EVIDENCE,
  HISTORY_REWRITE,
  normalizeRead,
  writeLf,
};
