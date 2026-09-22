#!/usr/bin/env node
'use strict';

/**
 * retire_superseded_run.cjs — deterministic supersede retirement for
 * ws-spec-multi runs (us-395 AC3).
 *
 * A superseding run records the run it supersedes in its state frontmatter as
 * `supersedesRunId`. This helper resolves that exact run id, verifies the prior
 * run is still active, and atomically writes its terminal status
 * (`cancelled` | `superseded`) plus an advancing `updatedAt`. It fails closed
 * when the named run cannot be resolved, so a superseding run cannot silently
 * leave two active runners on one lineage.
 *
 * Idempotent: a prior run already terminal is a no-op success.
 *
 * Usage:
 *   node retire_superseded_run.cjs --run <superseding.state.md> [--plans-dir DIR] [--status cancelled|superseded] [--timestamp ISO] [--json]
 *   node retire_superseded_run.cjs --supersedes <runId> [--plans-dir DIR] [...]
 */

const fs = require('fs');
const path = require('path');

const TERMINAL = new Set(['completed', 'cancelled', 'superseded', 'stopped', 'failed']);
const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

// A run id is interpolated into a filename; reject anything that could escape
// the ws-spec-multi directory (path separators, drive letters, traversal).
function isSafeRunId(value) {
  return typeof value === 'string' && RUN_ID_PATTERN.test(value) && !value.includes('..');
}

function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now().toString(36)}`;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, file);
}

function containedPath(runDir, name) {
  const target = path.resolve(runDir, name);
  const base = path.resolve(runDir) + path.sep;
  if (!target.startsWith(base)) throw new Error(`refusing to write outside the ws-spec-multi directory: ${name}`);
  return target;
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
  const updated = `---\n${lines.join('\n')}\n---`;
  return text.replace(block.full, updated);
}

function fail(message, options) {
  if (options && options.json) process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  else process.stderr.write(`ERROR: ${message}\n`);
  process.exitCode = 1;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const plansDir = path.resolve(options.plansDir || '.agents/plans');
  const runDir = path.join(plansDir, 'ws-spec-multi');
  const status = options.status || 'cancelled';
  if (!['cancelled', 'superseded'].includes(status)) {
    fail(`--status must be cancelled or superseded (received: ${status})`, options);
    return;
  }
  const timestamp = options.timestamp || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  let supersededRunId = options.supersedes || null;
  let sourceFile = null;
  if (options.run) {
    sourceFile = path.resolve(options.run);
    if (!fs.existsSync(sourceFile)) {
      fail(`superseding run state not found: ${options.run}`, options);
      return;
    }
    supersededRunId = supersededRunId || readField(fs.readFileSync(sourceFile, 'utf8'), 'supersedesRunId');
  }
  if (!supersededRunId) {
    fail('no supersedesRunId found on the superseding run and --supersedes was not provided', options);
    return;
  }
  if (!isSafeRunId(supersededRunId)) {
    fail(`invalid supersedesRunId (expected a run id like ms-YYYYMMDDTHHMMSSZ): ${supersededRunId}`, options);
    return;
  }

  let targetMd;
  let targetJson;
  try {
    targetMd = containedPath(runDir, `${supersededRunId}.state.md`);
    targetJson = containedPath(runDir, `${supersededRunId}.state.json`);
  } catch (error) {
    fail(error.message, options);
    return;
  }
  const hasMd = fs.existsSync(targetMd);
  const hasJson = fs.existsSync(targetJson);
  if (!hasMd && !hasJson) {
    fail(`superseded run state not found under ${runDir}: ${supersededRunId}`, options);
    return;
  }

  const result = { ok: true, supersededRunId, status, timestamp, updated: [], noop: false };
  // Write the JSON mirror first and the Markdown (canonical) state last, both
  // atomically, so an interrupted retirement leaves the canonical .md either
  // untouched or fully written; a re-run is idempotent either way.
  if (hasJson) {
    const json = JSON.parse(fs.readFileSync(targetJson, 'utf8'));
    if (TERMINAL.has(String(json.status))) {
      result.noop = true;
    } else {
      json.status = status;
      json.updatedAt = timestamp;
      atomicWrite(targetJson, `${JSON.stringify(json, null, 2)}\n`);
      result.updated.push(path.relative(process.cwd(), targetJson).split(path.sep).join('/'));
    }
  }
  if (hasMd && !result.noop) {
    const text = fs.readFileSync(targetMd, 'utf8');
    const current = readField(text, 'status');
    if (TERMINAL.has(String(current))) {
      result.noop = true;
    } else {
      let next = setField(text, 'status', status);
      next = setField(next, 'updatedAt', `"${timestamp}"`);
      atomicWrite(targetMd, next);
      result.updated.push(path.relative(process.cwd(), targetMd).split(path.sep).join('/'));
    }
  }
  result.source = sourceFile ? path.relative(process.cwd(), sourceFile).split(path.sep).join('/') : null;

  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else process.stdout.write(`${result.noop ? 'no-op (already terminal)' : 'retired'}: ${supersededRunId} -> ${status}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
