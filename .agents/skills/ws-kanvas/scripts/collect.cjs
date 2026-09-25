#!/usr/bin/env node
'use strict';

/**
 * ws-kanvas collector: read-only board JSON builder over specs, plans, and index.PRD.
 *
 * Node 22 stdlib only. No writes, no network, no cache. Every consumer directory
 * arrives as a parameter — nothing is hardcoded.
 *
 * Card shape (AC7 — the only contract refs/board.html consumes):
 *   slug, title, column, indexStatus, phase, acCount, planStep, planStatus,
 *   evidence, links { spec, plan, index }
 */

const fs = require('fs');
const path = require('path');

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'sprint', title: 'Sprint' },
  { id: 'development', title: 'Development' },
  { id: 'staging', title: 'Staging' },
  { id: 'production', title: 'Production' },
  { id: 'abandoned', title: 'Abandoned' },
];

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

/** Resolve parts under root; return null when the result escapes root. */
function resolveInside(root, ...parts) {
  const base = path.resolve(root);
  const target = path.resolve(base, ...parts);
  if (target !== base && !target.startsWith(base + path.sep)) return null;
  return target;
}

/** Minimal frontmatter parser: returns { data, body } with flat `key: value` pairs. */
function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n?/g, '\n');
  if (!normalized.startsWith('---')) return { data: {}, body: normalized };
  const end = normalized.indexOf('\n---', 3);
  if (end === -1) return { data: {}, body: normalized };
  const data = {};
  for (const line of normalized.slice(3, end).split('\n')) {
    const m = line.match(/^([A-Za-z][\w-]*)\s*:\s*(.*)$/);
    if (m) data[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return { data, body: normalized.slice(end + 4) };
}

function readFileOrNull(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function listFilesRecursive(dir, ext) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full, ext));
    else if (entry.isFile() && entry.name.endsWith(ext)) out.push(full);
  }
  return out.sort();
}

function toDisplayPath(cwd, file) {
  const rel = path.relative(cwd, file);
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return rel.split(path.sep).join('/');
  return file.split(path.sep).join('/');
}

/** Discover specs of record: every `*.spec.md` under specsDir (recursive). */
function discoverSpecs(specsDir, cwd) {
  const specs = [];
  for (const file of listFilesRecursive(specsDir, '.spec.md')) {
    const text = readFileOrNull(file);
    if (text === null) continue;
    const { data } = parseFrontmatter(text);
    const stem = path.basename(file, '.spec.md').replace(/^\d+-/, '');
    const slug = typeof data.slug === 'string' && data.slug ? data.slug : stem;
    if (!isValidSlug(slug)) continue;
    const acCount = (text.match(/^-\s+AC\d+\s*:/gm) || []).length;
    specs.push({
      slug,
      title: typeof data.title === 'string' && data.title ? data.title : slug,
      acCount,
      file: toDisplayPath(cwd, file),
    });
  }
  specs.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  return specs;
}

/**
 * Parse index.PRD signals:
 * - rows: slug -> { indexStatus: 'done'|'todo', phase }
 *   from Next-specs/Feature-map tables (`slug` + `[x]`/`[ ]`) and `- [x]/[ ]` lists with `(spec: FILE)`.
 * - doneLog: slug -> raw evidence cell (Done log table).
 * - archived: slugs in an Archive section with a dropped/superseded outcome.
 */
function parseIndex(indexText) {
  const rows = new Map();
  const doneLog = new Map();
  const archived = new Set();
  if (!indexText) return { rows, doneLog, archived };

  const lines = indexText.split('\n');
  let section = '';
  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      section = heading[1].toLowerCase();
      continue;
    }
    // Done log row: | date | `slug` | title | PR / Commit | (no checkbox cell).
    if (/done log/i.test(section)) {
      const dm = line.match(/^\|\s*[^|]*\|\s*`([^`]+)`\s*\|\s*[^|]*\|\s*([^|]*)\|/);
      if (dm && isValidSlug(dm[1])) {
        const cell = dm[2].trim();
        doneLog.set(dm[1], cell && !/^implemented$/i.test(cell) ? cell : null);
        continue;
      }
    }
    // Table row: | n | `slug` | `[x]` done | phase | ... |
    let m = line.match(/^\|\s*[^|]*\|\s*`([^`]+)`\s*\|\s*`?\[([ x])\]`?/);
    if (m && isValidSlug(m[1])) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      const phase = cells.length >= 4 ? cells[3].replace(/`/g, '') : null;
      rows.set(m[1], { indexStatus: m[2] === 'x' ? 'done' : 'todo', phase: phase || null });
      if (/done log/i.test(section)) {
        const evidenceCell = cells.length >= 4 ? cells[cells.length - 1] : '';
        doneLog.set(m[1], evidenceCell || null);
      }
      if (/archiv/i.test(section) && /drop|supersede|abandon|cancel/i.test(line)) {
        archived.add(m[1]);
      }
      continue;
    }
    // Checkbox list: - [x] Title (`spec: NNNN-slug.spec.md`)
    m = line.match(/^-\s*\[([ x])\]\s+.*\(spec:\s*([^)]+)\)/);
    if (m) {
      const slug = m[2].replace(/\.spec\.md$/, '').replace(/^\d+-/, '');
      if (isValidSlug(slug) && !rows.has(slug)) {
        rows.set(slug, { indexStatus: m[1] === 'x' ? 'done' : 'todo', phase: null });
      }
    }
  }
  return { rows, doneLog, archived };
}

/** Read plan signals for one slug: run dir, state status/step/evidence, step-08 presence. */
function readPlanSignals(plansDir, slug, cwd) {
  const planDir = resolveInside(plansDir, slug);
  const signals = { planDir: null, planStatus: null, planStep: null, planEvidence: null, hasShipRecord: false };
  if (!planDir || !fs.existsSync(planDir) || !fs.statSync(planDir).isDirectory()) return signals;
  signals.planDir = toDisplayPath(cwd, planDir);
  const states = listFilesRecursive(planDir, '.state.md');
  // Prefer the top-level `<slug>.state.md` when several exist.
  states.sort((a, b) => {
    const aTop = path.dirname(a) === planDir && path.basename(a) === `${slug}.state.md` ? 0 : 1;
    const bTop = path.dirname(b) === planDir && path.basename(b) === `${slug}.state.md` ? 0 : 1;
    return aTop - bTop;
  });
  for (const stateFile of states) {
    const text = readFileOrNull(stateFile);
    if (text === null) continue;
    const { data } = parseFrontmatter(text);
    if (typeof data.status === 'string' && data.status) signals.planStatus = data.status;
    if (signals.planStep === null && data.currentStep !== undefined && data.currentStep !== '') {
      const n = Number(data.currentStep);
      signals.planStep = Number.isInteger(n) ? n : data.currentStep;
    }
    if (!signals.planEvidence && typeof data.prUrl === 'string' && data.prUrl) {
      signals.planEvidence = data.prUrl;
    }
    if (signals.planStatus) break;
  }
  if (signals.planStatus === null && states.length > 0) signals.planStatus = 'unknown';
  let entries;
  try {
    entries = fs.readdirSync(planDir);
  } catch {
    entries = [];
  }
  signals.hasShipRecord = entries.some((n) => /^step-08-.*\.result\.md$/.test(n));
  return signals;
}

function placeColumn({ indexEntry, plan, archived }) {
  // First match wins, top-down per spec Description.
  if ((plan.planStatus && /^(cancelled|failed)$/i.test(plan.planStatus)) || archived) return 'abandoned';
  if (indexEntry && indexEntry.indexStatus === 'done') return 'production';
  if (plan.hasShipRecord) return 'staging';
  if (plan.planStatus && /^(active|implemented)$/i.test(plan.planStatus)) return 'development';
  if (indexEntry && indexEntry.indexStatus === 'todo' && plan.planDir) return 'sprint';
  return 'backlog';
}

/**
 * Build the board. Never throws for missing/unreadable inputs: those yield
 * an empty board with a named warning banner entry instead.
 */
function collectBoard({ specsDir, plansDir, indexPath } = {}) {
  const cwd = process.cwd();
  const warnings = [];
  const resolvedSpecs = specsDir ? path.resolve(specsDir) : path.join(cwd, '.agents', 'specs');
  const resolvedPlans = plansDir ? path.resolve(plansDir) : path.join(cwd, '.agents', 'plans');
  const resolvedIndex = indexPath ? path.resolve(indexPath) : path.join(resolvedSpecs, 'index.PRD');

  let specs = [];
  if (!fs.existsSync(resolvedSpecs)) {
    warnings.push({ code: 'specs-dir-missing', detail: toDisplayPath(cwd, resolvedSpecs) });
  } else {
    specs = discoverSpecs(resolvedSpecs, cwd);
    if (specs.length === 0) warnings.push({ code: 'specs-dir-empty', detail: toDisplayPath(cwd, resolvedSpecs) });
  }

  let indexText = null;
  if (!fs.existsSync(resolvedIndex)) {
    warnings.push({ code: 'index-missing', detail: toDisplayPath(cwd, resolvedIndex) });
  } else {
    indexText = readFileOrNull(resolvedIndex);
    if (indexText === null) warnings.push({ code: 'index-unreadable', detail: toDisplayPath(cwd, resolvedIndex) });
  }
  const { rows, doneLog, archived } = parseIndex(indexText);

  if (!fs.existsSync(resolvedPlans)) {
    warnings.push({ code: 'plans-dir-missing', detail: toDisplayPath(cwd, resolvedPlans) });
  }

  const cards = specs.map((spec) => {
    const indexEntry = rows.get(spec.slug) || null;
    const plan = readPlanSignals(resolvedPlans, spec.slug, cwd);
    const column = placeColumn({ indexEntry, plan, archived: archived.has(spec.slug) });
    const doneEvidence = doneLog.get(spec.slug) || null;
    return {
      slug: spec.slug,
      title: spec.title,
      column,
      indexStatus: indexEntry ? indexEntry.indexStatus : 'untracked',
      phase: indexEntry ? indexEntry.phase : null,
      acCount: spec.acCount,
      planStep: plan.planStep,
      planStatus: plan.planStatus,
      evidence: doneEvidence || plan.planEvidence,
      links: {
        spec: spec.file,
        plan: plan.planDir,
        index: indexText === null ? null : toDisplayPath(cwd, resolvedIndex),
      },
    };
  });

  const columns = COLUMNS.map((col) => ({
    ...col,
    count: cards.filter((c) => c.column === col.id).length,
  }));

  return {
    generatedAt: new Date().toISOString(),
    specsDir: toDisplayPath(cwd, resolvedSpecs),
    plansDir: toDisplayPath(cwd, resolvedPlans),
    warnings,
    columns,
    cards,
  };
}

/** Typed card lookup: { card } or { error: { code: 'not-found', ... } }. Never throws. */
function getCard(board, slug) {
  if (!isValidSlug(slug)) {
    return { error: { code: 'not-found', slug: String(slug), message: 'Unknown card slug.' } };
  }
  const card = (board.cards || []).find((c) => c.slug === slug) || null;
  if (!card) return { error: { code: 'not-found', slug, message: 'Unknown card slug.' } };
  return { card };
}

function printHelp() {
  console.log('Usage: collect.cjs [--specs-dir DIR] [--plans-dir DIR] [--index FILE] [--slug SLUG] [--json]');
  console.log('  --json prints the board JSON; --slug SLUG prints one card (or typed not-found).');
}

function main(argv) {
  const args = { specsDir: undefined, plansDir: undefined, index: undefined, slug: undefined, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--specs-dir') args.specsDir = argv[(i += 1)];
    else if (a === '--plans-dir') args.plansDir = argv[(i += 1)];
    else if (a === '--index') args.index = argv[(i += 1)];
    else if (a === '--slug') args.slug = argv[(i += 1)];
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      return 0;
    } else {
      console.error(`Unknown argument: ${a}`);
      printHelp();
      return 2;
    }
  }
  const board = collectBoard({ specsDir: args.specsDir, plansDir: args.plansDir, indexPath: args.index });
  if (args.slug) {
    const result = getCard(board, args.slug);
    console.log(JSON.stringify(result));
  } else {
    console.log(JSON.stringify(board));
  }
  return 0;
}

module.exports = { collectBoard, getCard, isValidSlug, resolveInside, parseFrontmatter, parseIndex, COLUMNS };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
