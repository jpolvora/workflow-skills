#!/usr/bin/env node
'use strict';

/**
 * verify_child_artifacts.cjs — deterministic child-exit guard for
 * ws-spec-multi standard/lite workers (us-388 AC5).
 *
 * The batch orchestrator must not record an item `shipped` when the dispatched
 * child left no workflow state (machine SoT) or no `step-01-{slug}.plan.md`
 * under `{plansDir}/{slug}/`. This helper mirrors the monitor's `missing-artifact`
 * class: it reads only, names every absent required artifact, and exits non-zero
 * (fail closed) so a `shipped` row without child state cannot be written silently.
 *
 * The reader is intentionally tolerant of the state filename: a child writes its
 * machine SoT as `{workflow-id}.state.json` (workflow id is not derivable from the
 * slug), so presence is a directory scan for any non-empty `*.state.json`
 * (falling back to `*.state.md`). The `step-01` plan has the fixed contract name
 * `step-01-{slug}.plan.md` (AC2: never an ad-hoc `plan.md`).
 *
 * Usage:
 *   node verify_child_artifacts.cjs --slug <slug> [--plans-dir DIR] [--require state,step-01] [--json]
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PLANS_DIR = '.agents/plans';
const REQUIREMENTS = new Set(['state', 'step-01']);
const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// `{plansDir}/ws-spec-multi/` holds the parent batch run state, not a child plan
// dir; a queue item aliasing it must never resolve its child artifacts there.
const RESERVED_PLAN_DIRS = new Set(['ws-spec-multi']);

function parseArgs(argv) {
  const options = { require: 'state,step-01' };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'json') { options.json = true; continue; }
    if (key === 'help' || key === 'h') { options.help = true; continue; }
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) throw new Error(`--${token.slice(2)} requires a value`);
    options[key] = next;
    index += 1;
  }
  return options;
}

function isSafeSlug(value) {
  return typeof value === 'string'
    && SLUG_PATTERN.test(value)
    && !value.includes('..')
    && !RESERVED_PLAN_DIRS.has(value);
}

function isNonEmptyFile(file) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

// The child contract requires the machine SoT `{workflow-id}.state.json` (with
// resumable handoffs); the `.state.md` render alone is NOT a substitute, and a
// truncated or unrelated `.json` is not valid state either.
const REQUIRED_CHILD_STATE_FIELDS = ['stateVersion', 'workflowId', 'slug', 'workflowType', 'status', 'currentStep'];
function isValidChildStateFile(file, expectedSlug) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return false;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
  if (!REQUIRED_CHILD_STATE_FIELDS.every((key) => parsed[key] !== undefined && parsed[key] !== null)) return false;
  // The state must be this item's child, not a stale/foreign state under its dir.
  return expectedSlug === undefined || parsed.slug === expectedSlug;
}

function hasChildState(childDir, expectedSlug) {
  let entries;
  try {
    entries = fs.readdirSync(childDir, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.state.json'))
    .some((entry) => isValidChildStateFile(path.join(childDir, entry.name), expectedSlug));
}

function fail(message, options) {
  if (options.json) process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`);
  else process.stderr.write(`ERROR: ${message}\n`);
  process.exitCode = 1;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node verify_child_artifacts.cjs --slug <slug> [--plans-dir DIR] [--require state,step-01] [--json]\n');
    return;
  }
  const slug = options.slug;
  if (!slug) { fail('--slug is required', options); return; }
  if (!isSafeSlug(slug)) { fail(`invalid slug (expected a plan directory name): ${slug}`, options); return; }

  const requested = String(options.require || 'state,step-01')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const unknown = requested.filter((item) => !REQUIREMENTS.has(item));
  if (unknown.length > 0) { fail(`unsupported --require value(s): ${unknown.join(', ')}`, options); return; }
  if (requested.length === 0) { fail('--require must list at least one requirement', options); return; }

  const plansDir = path.resolve(options.plansDir || DEFAULT_PLANS_DIR);
  const childDir = path.join(plansDir, slug);

  const checked = requested.map((name) => {
    if (name === 'state') {
      return { name, path: childDir, present: hasChildState(childDir, slug), detail: 'child workflow state ({workflow-id}.state.json)' };
    }
    const planFile = path.join(childDir, `step-01-${slug}.plan.md`);
    return { name, path: planFile, present: isNonEmptyFile(planFile), detail: `Step 1 plan (step-01-${slug}.plan.md)` };
  });
  const missing = checked.filter((item) => !item.present).map((item) => item.name);
  const result = {
    ok: missing.length === 0,
    slug,
    childDir: path.relative(process.cwd(), childDir).split(path.sep).join('/'),
    checked,
    missing,
  };

  if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
  else if (result.ok) process.stdout.write(`ok: child artifacts present for ${slug}\n`);
  else process.stderr.write(`missing child artifact(s) for ${slug}: ${missing.join(', ')}\n`);

  if (!result.ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
