#!/usr/bin/env node
'use strict';

/**
 * record_child_outcome.cjs — executable queue-transition path for ws-spec-multi
 * (us-388 AC5/AC8).
 *
 * The batch orchestrator records an item's terminal outcome by calling this
 * helper instead of hand-editing the run table. On `--status shipped` it invokes
 * the fail-closed child-exit guard `verify_child_artifacts.cjs` and refuses to
 * write `shipped` when the child state (machine SoT) or `step-01-{slug}.plan.md`
 * is absent — so a `shipped` row without child state cannot be recorded. This is
 * the runtime caller the guard contract needs.
 *
 * It also enforces the #393 queue invariants: one row per spec (keyed in place),
 * a fail-closed duplicate guard, a frozen row count, an advancing `updatedAt`,
 * and idempotent, non-regressing terminal transitions.
 *
 * The run state is Markdown-canonical (`{runId}.state.md`); the transition is a
 * single atomic write (temp file + rename). Read-only when it refuses.
 *
 * Usage:
 *   node record_child_outcome.cjs --run {plansDir}/ws-spec-multi/{runId}.state.md \
 *     --slug <slug> --status shipped|failed|skipped \
 *     [--plans-dir DIR] [--pr-number N] [--pr-url U] [--reason TEXT] [--timestamp ISO] [--json]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TERMINAL_STATUSES = new Set(['shipped', 'skipped', 'failed']);
const TARGET_STATUSES = new Set(['shipped', 'skipped', 'failed']);
const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// `{plansDir}/ws-spec-multi/` holds the parent batch run state, not a child plan
// dir; a queue item aliasing it must never resolve its child artifacts there.
const RESERVED_PLAN_DIRS = new Set(['ws-spec-multi']);

function isSafeSlug(value) {
  return typeof value === 'string'
    && SLUG_PATTERN.test(value)
    && !value.includes('..')
    && !RESERVED_PLAN_DIRS.has(value);
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'json') { options.json = true; continue; }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`--${token.slice(2)} requires a value`);
    options[key] = next;
    index += 1;
  }
  return options;
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now().toString(36)}`;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, file);
}

function frontmatterBlock(text) {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  return { full: match[0], body: match[1] };
}

function readField(text, field) {
  const block = frontmatterBlock(text);
  if (!block) return null;
  const match = block.body.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, '');
}

function setField(text, field, value) {
  const block = frontmatterBlock(text);
  if (!block) throw new Error('state file has no frontmatter block');
  const lines = block.body.split(/\r?\n/);
  const pattern = new RegExp(`^${field}:`);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index === -1) lines.push(`${field}: ${value}`);
  else lines[index] = `${field}: ${value}`;
  return text.replace(block.full, `---\n${lines.join('\n')}\n---`);
}

function fail(message, options) {
  if (options && options.json) process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  else process.stderr.write(`ERROR: ${message}\n`);
  process.exitCode = 1;
}

// Parses the queue markdown table. Returns null when no table is present.
function parseTable(text) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => /^\s*\|.*\|\s*$/.test(line) && /\|\s*#\s*\|\s*slug\s*\|/i.test(line));
  if (headerIndex === -1) return null;
  const headerCells = lines[headerIndex].split('|').slice(1, -1).map((cell) => cell.trim());
  const columns = headerCells.map((cell) => cell.toLowerCase());
  const rowIndexes = [];
  for (let i = headerIndex + 2; i < lines.length; i += 1) {
    if (!/^\s*\|.*\|\s*$/.test(lines[i])) break;
    rowIndexes.push(i);
  }
  return { lines, headerIndex, columns, rowIndexes };
}

function findColumnIndex(columns, ...names) {
  for (const name of names) {
    const index = columns.indexOf(name);
    if (index !== -1) return index;
  }
  return -1;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const status = options.status;
  if (!status) { fail('--status is required (shipped|skipped|failed)', options); return; }
  if (!TARGET_STATUSES.has(status)) { fail(`--status must be shipped, skipped, or failed (received: ${status})`, options); return; }
  if (!options.slug) { fail('--slug is required', options); return; }
  if (!isSafeSlug(options.slug)) { fail(`invalid slug: ${options.slug}`, options); return; }
  if (!options.run) { fail('--run is required (path to {runId}.state.md)', options); return; }

  const runFile = path.resolve(options.run);
  if (!fs.existsSync(runFile)) { fail(`run state not found: ${options.run}`, options); return; }
  const runDir = path.dirname(runFile);
  // The batch run lives at {plansDir}/ws-spec-multi/, so the plans dir is its parent.
  const plansDir = path.resolve(options.plansDir || path.dirname(runDir));

  const text = fs.readFileSync(runFile, 'utf8');
  const table = parseTable(text);
  if (!table) { fail('run state has no queue table', options); return; }

  const slugIndex = findColumnIndex(table.columns, 'slug');
  const statusIndex = findColumnIndex(table.columns, 'status');
  if (slugIndex === -1 || statusIndex === -1) { fail('queue table lacks slug/status columns', options); return; }
  const rowIndexFor = (columns) => ({
    prNumber: findColumnIndex(columns, 'prnumber'),
    prUrl: findColumnIndex(columns, 'prurl'),
    reason: findColumnIndex(columns, 'reason'),
    updatedAt: findColumnIndex(columns, 'updatedat'),
  });
  const idx = rowIndexFor(table.columns);

  const matched = table.rowIndexes.filter((lineIndex) => {
    const cells = table.lines[lineIndex].split('|').slice(1, -1).map((cell) => cell.trim());
    return cells[slugIndex] === options.slug;
  });
  if (matched.length === 0) { fail(`no queue row for slug: ${options.slug}`, options); return; }
  if (matched.length > 1) {
    fail(`duplicate queue rows for slug ${options.slug}; refusing to write (fail-closed duplicate guard)`, options);
    return;
  }
  const lineIndex = matched[0];
  let cells = table.lines[lineIndex].split('|').slice(1, -1).map((cell) => cell.trim());
  const currentStatus = cells[statusIndex];
  if (TERMINAL_STATUSES.has(currentStatus) && currentStatus !== status) {
    fail(`refusing to regress terminal row ${options.slug} (${currentStatus} -> ${status})`, options);
    return;
  }

  // AC5: the executable fail-closed child-exit guard, invoked only for `shipped`.
  if (status === 'shipped' && currentStatus !== 'shipped') {
    const guard = path.join(__dirname, 'verify_child_artifacts.cjs');
    const result = spawnSync(process.execPath, [guard, '--slug', options.slug, '--plans-dir', plansDir, '--json'], { encoding: 'utf8' });
    if (result.status !== 0) {
      let detail = (result.stdout || result.stderr || '').trim();
      try { detail = JSON.parse(result.stdout).missing.join(', ') || detail; } catch { /* keep raw */ }
      fail(`cannot record shipped for ${options.slug}: child artifact(s) missing (${detail})`, options);
      return;
    }
  }

  const timestamp = options.timestamp || new Date().toISOString();
  const previousUpdatedAt = Date.parse(readField(text, 'updatedAt') || '');
  const nextUpdatedAt = Date.parse(timestamp);
  if (!Number.isFinite(nextUpdatedAt)) { fail('invalid timestamp', options); return; }
  const effectiveTimestamp = Number.isFinite(previousUpdatedAt) && nextUpdatedAt <= previousUpdatedAt
    ? new Date(previousUpdatedAt + 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
    : timestamp;

  const setCell = (index, value) => {
    if (index !== -1) cells[index] = value;
  };
  cells[statusIndex] = status;
  if (options.prNumber !== undefined) setCell(idx.prNumber, options.prNumber);
  if (options.prUrl !== undefined) setCell(idx.prUrl, options.prUrl);
  if (options.reason !== undefined) setCell(idx.reason, options.reason);
  setCell(idx.updatedAt, effectiveTimestamp);
  table.lines[lineIndex] = `| ${cells.join(' | ')} |`;

  let next = table.lines.join('\n');
  next = setField(next, 'updatedAt', `"${effectiveTimestamp}"`);
  atomicWrite(runFile, next);

  const result = {
    ok: true,
    slug: options.slug,
    status,
    previousStatus: currentStatus,
    noop: currentStatus === status,
    timestamp: effectiveTimestamp,
    runFile: path.relative(process.cwd(), runFile).split(path.sep).join('/'),
  };
  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.noop ? 'no-op (already terminal)' : 'recorded'}: ${options.slug} -> ${status}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
