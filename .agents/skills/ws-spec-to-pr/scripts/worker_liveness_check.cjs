#!/usr/bin/env node
'use strict';

// Worker liveness evaluator: one deterministic verdict for a dispatched batch
// worker, so the parent can tell a wedged worker from a slow one without
// burning rounds, and never takes over a live one.
//
// Inputs: the step's latest `dispatch` telemetry baseline, the worker liveness
// marker for the batch, and any durable progress recorded after that baseline.
// Verdict order is pinned: no-baseline -> alive -> pending -> wedged, with exit
// 0 for the first three and exit 2 for `wedged` (worker_turn_guard.cjs keeps its
// own ended-turn verdicts); usage errors exit 1. Read-only: it never writes
// state, telemetry, or `.runtime`, so it cannot bump the state revision.
// Single runtime (Node .cjs); synchronous only; no new dependencies.

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  const candidates = [];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(packaged);
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const {
  resolveConsumerContext,
  resolveWorkerLivenessWindowSec,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const VERDICTS = {
  NO_BASELINE: 'no-baseline',
  ALIVE: 'alive',
  PENDING: 'pending',
  WEDGED: 'wedged',
};

const EXIT_CODES = {
  [VERDICTS.NO_BASELINE]: 0,
  [VERDICTS.ALIVE]: 0,
  [VERDICTS.PENDING]: 0,
  [VERDICTS.WEDGED]: 2,
};

// A marker written at the dispatch instant can land a hair before the recorded
// baseline, so freshness tolerates 1 s of filesystem timestamp granularity.
// Durable progress must be strictly after the baseline: the 1 s tolerance
// applies upward only, otherwise the resume fixtures of a frozen run would read
// as progress and a wedge verdict would be unreachable.
const MARKER_TOLERANCE_MS = 1000;
const PROGRESS_TOLERANCE_MS = 1000;
const TELEMETRY_FILE = 'telemetry.jsonl';
const RUNTIME_DIR = '.runtime';
const MARKER_PREFIX = 'worker-started-';
const MARKER_FIELDS = ['step', 'batch', 'dispatchedAt'];
const BOOLEAN_FLAGS = new Set(['json', 'help']);
const KNOWN_FLAGS = new Set(['usDir', 'step', 'batch', 'windowSec', 'telemetry', 'repoRoot', 'json', 'help']);

function inside(child, parent) {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Repo-relative pointer for the verdict record: never an absolute machine path.
// A target outside the resolved repo root degrades to its basename.
function toRelative(repoRoot, value) {
  const resolved = path.resolve(value);
  if (!inside(resolved, repoRoot)) return path.basename(resolved);
  return path.relative(path.resolve(repoRoot), resolved).replace(/\\/g, '/') || '.';
}

function mtimeOf(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch {
    return null;
  }
}

// Malformed or non-object telemetry lines are skipped without aborting, so one
// bad line never hides the real dispatch baseline.
function readTelemetryRecords(file) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const records = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed = null;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    records.push(parsed);
  }
  return records;
}

// Dispatch baseline: the latest parseable `dispatch` record for the evaluated
// step (the telemetry stream carries no batch/round field, so `{batch}` names
// the marker while the baseline stays step-scoped). `dispatchedAt` falls back
// to the record `timestamp`; an unparseable record never becomes a baseline.
function selectDispatchBaseline(records, step) {
  let baseline = null;
  for (const record of records || []) {
    if (!record || record.type !== 'dispatch') continue;
    if (Number(record.step) !== step) continue;
    const ms = Date.parse(record.dispatchedAt || record.timestamp);
    if (!Number.isFinite(ms)) continue;
    if (!baseline || ms >= baseline.dispatchedAtMs) {
      baseline = {
        dispatchedAtMs: ms,
        dispatchedAt: new Date(ms).toISOString(),
        substep: record.substep || null,
      };
    }
  }
  return baseline;
}

// Lenient frontmatter parse (`key: value`), mirroring the state/round-N.md
// convention. A marker counts only with non-empty `step`, `batch`, and
// `dispatchedAt`; anything else is a file, not evidence.
function parseMarkerFields(text) {
  const fields = {};
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(line.trim());
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

function readMarker(file) {
  let stat = null;
  try {
    stat = fs.statSync(file);
  } catch {
    return { present: false, valid: false, missing: [], mtimeMs: null };
  }
  if (!stat.isFile()) return { present: false, valid: false, missing: [], mtimeMs: null };
  const fields = parseMarkerFields(fs.readFileSync(file, 'utf8'));
  const missing = MARKER_FIELDS.filter((key) => !fields[key]);
  return { present: true, valid: missing.length === 0, missing, mtimeMs: stat.mtimeMs };
}

// Deepest-existing-ancestor containment for the `.runtime` target: the leaf
// need not exist, but every existing segment must resolve inside the run
// directory, so a symlinked or dangling escape fails closed instead of reading
// a foreign path. Returns the lexical target used for all reads and output.
function resolveRuntimeDir(usDir) {
  const target = path.join(usDir, RUNTIME_DIR);
  if (!inside(target, usDir)) throw new Error(`refusing ${RUNTIME_DIR} outside --us-dir: ${target}`);
  const realUsDir = fs.realpathSync(usDir);
  let deepest = target;
  while (!fs.existsSync(deepest)) {
    const parent = path.dirname(deepest);
    if (parent === deepest) break;
    deepest = parent;
  }
  if (!inside(fs.realpathSync(deepest), realUsDir)) {
    throw new Error(`refusing ${RUNTIME_DIR} outside --us-dir: ${target}`);
  }
  let stat = null;
  try {
    stat = fs.statSync(target);
  } catch {
    stat = null;
  }
  if (stat && !stat.isDirectory()) throw new Error(`refusing non-directory ${RUNTIME_DIR}: ${target}`);
  return target;
}

// Durable progress after the baseline: any one channel is enough, and every
// channel is echoed as a repo-relative evidence pointer. Telemetry records
// carry only step/substep, so this is parent-observable run activity rather
// than batch-authored proof: ambient sibling progress can delay a wedge
// verdict, never authorize a takeover (a wedge presumes a frozen run). The
// evaluated marker is excluded - a stale same-name marker is not progress.
function collectProgressEvidence({ records, usDir, runtimeDir, markerFile, baseline, repoRoot }) {
  const evidence = [];
  const after = (mtimeMs) => Number.isFinite(mtimeMs) && mtimeMs > baseline.dispatchedAtMs + PROGRESS_TOLERANCE_MS;

  const fresh = (records || []).filter((record) => after(Date.parse(record.timestamp)));
  if (fresh.length) {
    const first = fresh[0];
    const stamp = new Date(Date.parse(first.timestamp)).toISOString();
    evidence.push(`telemetry:${first.type}@${stamp}${fresh.length > 1 ? `(+${fresh.length - 1})` : ''}`);
  }

  let usDirEntries = [];
  try {
    usDirEntries = fs.readdirSync(usDir, { withFileTypes: true });
  } catch {
    usDirEntries = [];
  }
  for (const entry of usDirEntries) {
    if (!entry.isFile() || !entry.name.endsWith('.state.json')) continue;
    const file = path.join(usDir, entry.name);
    const mtimeMs = mtimeOf(file);
    if (after(mtimeMs)) evidence.push(`state:${toRelative(repoRoot, file)}@${new Date(mtimeMs).toISOString()}`);
  }

  let runtimeEntries = [];
  try {
    runtimeEntries = fs.readdirSync(runtimeDir, { withFileTypes: true });
  } catch {
    runtimeEntries = [];
  }
  for (const entry of runtimeEntries) {
    if (!entry.isFile()) continue;
    const file = path.join(runtimeDir, entry.name);
    if (path.resolve(file) === path.resolve(markerFile)) continue;
    const mtimeMs = mtimeOf(file);
    if (after(mtimeMs)) evidence.push(`runtime:${toRelative(repoRoot, file)}@${new Date(mtimeMs).toISOString()}`);
  }

  return evidence;
}

// One verdict, pinned precedence: no-baseline -> alive (fresh marker or durable
// progress) -> pending (window not elapsed) -> wedged. Unknown baseline always
// fails open; marker absence alone never authorizes a takeover.
function evaluateLiveness({ baselinePresent, markerFresh, progressEvidence = [], ageSec, windowSec }) {
  if (!baselinePresent) {
    return {
      verdict: VERDICTS.NO_BASELINE,
      reason: 'no dispatch event for the step in telemetry; the check fails open and never wedges an unknown baseline',
    };
  }
  if (markerFresh) {
    return {
      verdict: VERDICTS.ALIVE,
      reason: 'fresh liveness marker for this dispatch (marker mtime is at or after the resolved baseline)',
    };
  }
  if (progressEvidence.length) {
    return {
      verdict: VERDICTS.ALIVE,
      reason: `durable progress after the resolved baseline: ${progressEvidence.join(', ')}`,
    };
  }
  if (ageSec < windowSec) {
    return {
      verdict: VERDICTS.PENDING,
      reason: `window not elapsed (age ${ageSec}s of ${windowSec}s); no fresh marker and no durable progress yet`,
    };
  }
  return {
    verdict: VERDICTS.WEDGED,
    reason: `window elapsed (age ${ageSec}s of ${windowSec}s) with no fresh marker and no durable progress after dispatch`,
  };
}

function describeMarker({ marker, markerFresh, baselinePresent }) {
  if (!marker.present) return '';
  if (!marker.valid) return `; marker present but not valid evidence (missing ${marker.missing.join(', ')})`;
  if (!baselinePresent) return '; marker present (no dispatch baseline to compare)';
  if (!markerFresh) return '; marker present but stale: it predates the resolved baseline';
  return '';
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (!KNOWN_FLAGS.has(key)) throw new Error(`unknown flag: ${token}`);
    if (BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`${token} requires a value`);
    options[key] = value;
    index += 1;
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: node worker_liveness_check.cjs --us-dir DIR --step N --batch ID [--window-sec N] [--telemetry FILE] [--repo-root DIR] [--json]\n');
    return { exitCode: 0 };
  }
  if (!options.usDir) throw new Error('--us-dir is required');
  if (options.step === undefined) throw new Error('--step is required');
  if (!options.batch) throw new Error('--batch is required');
  const step = Number(options.step);
  if (!Number.isInteger(step) || step < 0) throw new Error('--step must be an integer >= 0');
  const batch = String(options.batch).trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(batch)) {
    throw new Error('--batch must be a round id or node id (letters, digits, dot, dash, underscore)');
  }
  const usDir = path.resolve(String(options.usDir));
  let usDirStat = null;
  try {
    usDirStat = fs.statSync(usDir);
  } catch {
    usDirStat = null;
  }
  if (!usDirStat || !usDirStat.isDirectory()) throw new Error(`--us-dir is not a readable directory: ${usDir}`);
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const repoRoot = context.repoRoot;
  let windowSec = resolveWorkerLivenessWindowSec(context.config);
  if (options.windowSec !== undefined) {
    const override = Number(options.windowSec);
    if (!Number.isInteger(override) || override < 1) throw new Error('--window-sec must be an integer >= 1');
    windowSec = override;
  }

  const runtimeDir = resolveRuntimeDir(usDir);
  const markerFile = path.join(runtimeDir, `${MARKER_PREFIX}${step}-${batch}.md`);
  const telemetryFile = options.telemetry
    ? path.resolve(String(options.telemetry))
    : path.join(usDir, TELEMETRY_FILE);

  const records = readTelemetryRecords(telemetryFile);
  const baseline = selectDispatchBaseline(records, step);
  const marker = readMarker(markerFile);
  const ageSec = baseline ? Math.round((Date.now() - baseline.dispatchedAtMs) / 1000) : null;
  const markerFresh = Boolean(
    baseline && marker.valid && marker.mtimeMs >= baseline.dispatchedAtMs - MARKER_TOLERANCE_MS,
  );
  const progressEvidence = baseline
    ? collectProgressEvidence({ records, usDir, runtimeDir, markerFile, baseline, repoRoot })
    : [];
  const outcome = evaluateLiveness({
    baselinePresent: Boolean(baseline),
    markerFresh,
    progressEvidence,
    ageSec,
    windowSec,
  });

  const record = {
    schemaVersion: 1,
    verdict: outcome.verdict,
    step,
    batch,
    substep: baseline ? baseline.substep : null,
    dispatchedAt: baseline ? baseline.dispatchedAt : null,
    ageSec,
    windowSec,
    markerPath: toRelative(repoRoot, markerFile),
    markerPresent: marker.present,
    markerFresh,
    progressEvidence,
    reason: `${outcome.reason}${describeMarker({ marker, markerFresh, baselinePresent: Boolean(baseline) })}`,
    exitCode: EXIT_CODES[outcome.verdict],
  };

  process.stdout.write(`${JSON.stringify(record, null, options.json ? 0 : 2)}\n`);
  if (!options.json) {
    const age = ageSec === null ? 'n/a' : `${ageSec}s`;
    process.stderr.write(`worker liveness: ${outcome.verdict} (step ${step}, batch ${batch}, age ${age} of ${windowSec}s)\n`);
  }
  return { exitCode: EXIT_CODES[outcome.verdict] };
}

if (require.main === module) {
  try {
    const result = main();
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`ERROR: ${error && error.message ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  VERDICTS,
  evaluateLiveness,
  selectDispatchBaseline,
};
