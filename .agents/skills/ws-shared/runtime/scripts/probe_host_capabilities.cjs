#!/usr/bin/env node
/**
 * probe_host_capabilities.cjs — detect common native tools and cache them.
 *
 * Resolves a host shape through the static pre-map (host-tool-map.json), merges
 * host-declared tools, degrades unknown hosts to the minimal safe set, and upserts
 * only the current `hostId::orchestratorModel` key into the consumer-local cache
 * (default: ws-shared/host-capabilities.json). Never fails startup: unknown hosts
 * and unreadable caches degrade gracefully with exit 0.
 *
 * Usage:
 *   node probe_host_capabilities.cjs --key <hostId::model> [--host-shape <name>]
 *     [--declare token=name,token=name] [--cache <path>] [--map <path>]
 *     [--refresh] [--probe-log <path>] [--json]
 *
 * Host shape resolves from --host-shape, else is inferred from the host-id
 * segment of --key; unknown hosts degrade to the minimal safe set.
 * Default cache resolves to the consumer shared dir ({sharedDir}); explicit
 * --cache overrides. Unknown flags fail loudly (exit 2), never silent defaults.
 * Non-empty --declare forces a fresh probe (host-declared tools rank highest).
 *
 * Invoke with an explicit `node` launcher; never rely on shebang alone.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveConsumerContext } = require('./resolve_consumer_root.cjs');

const TOKENS = ['readFile', 'writeFile', 'editFile', 'shellExec', 'dispatchAgent', 'askQuestion', 'browserVerify'];

const MINIMAL = {
  readFile: 'none',
  writeFile: 'none',
  editFile: 'none',
  shellExec: 'shell',
  dispatchAgent: 'none',
  askQuestion: 'none',
  browserVerify: 'none',
};

function parseArgs(argv) {
  const out = { key: '', hostShape: '', declare: '', cache: '', map: '', refresh: false, probeLog: '', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--refresh') out.refresh = true;
    else if (a === '--json') out.json = true;
    else if (a.startsWith('--')) {
      const k = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (!Object.prototype.hasOwnProperty.call(out, k)) {
        process.stderr.write(`unknown flag: ${a}\n`);
        process.exit(2);
      }
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : '';
      out[k] = v;
      if (v) i += 1;
    }
  }
  return out;
}

function loadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function parseDeclared(raw) {
  const declared = {};
  for (const pair of String(raw || '').split(',')) {
    const idx = pair.indexOf('=');
    if (idx < 1) continue;
    const token = pair.slice(0, idx).trim();
    const name = pair.slice(idx + 1).trim();
    if (TOKENS.includes(token) && name) declared[token] = name;
  }
  return declared;
}

function defaultCachePath(scriptDir) {
  try {
    const context = resolveConsumerContext({ scriptFile: __filename });
    if (context && context.sharedDir) return path.join(context.sharedDir, 'host-capabilities.json');
  } catch {
    // Consumer-hub resolution failed (e.g. global cwd without a target repo):
    // fall back to the legacy script-relative default; startup never fails.
  }
  return path.join(scriptDir, '..', '..', 'host-capabilities.json');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scriptDir = __dirname;
  const mapPath = args.map || path.join(scriptDir, '..', 'host-tool-map.json');
  const cachePath = args.cache || defaultCachePath(scriptDir);

  const startedAt = new Date().toISOString();
  let cache = loadJson(cachePath);
  if (cache === null || typeof cache !== 'object' || Array.isArray(cache)) cache = {};

  const key = args.key || 'generic::unknown';
  const cachedEntry = cache[key];
  const hasCapabilities = cachedEntry && typeof cachedEntry === 'object'
    && cachedEntry.capabilities && typeof cachedEntry.capabilities === 'object';
  // Explicit --declare carries live host tool names and outranks the pre-map, so it
  // must not be short-circuited by the cache (see host-capability-tokens.md precedence).
  const hasDeclarations = String(args.declare || '').trim() !== '';
  // Legacy entries written before capabilities existed are treated as a miss so
  // the probe runs once and backfills the token map instead of staying inert.
  if (!args.refresh && !hasDeclarations && hasCapabilities) {
    const payload = { ok: true, cached: true, key, capabilities: cachedEntry.capabilities };
    output(args.json, payload, `cache hit | ${key}`);
    return 0;
  }

  // Actual probe: runs at most once per key until --refresh.
  const map = loadJson(mapPath);
  const shapes = (map && map.shapes) || {};
  // Explicit --host-shape wins; otherwise infer the shape from the host-id
  // segment of --key so the documented --key-only invocation still reaches
  // host-tool-map.json instead of degrading every host to the minimal set.
  const rawHostId = String(key.split('::')[0] || '').toLowerCase();
  const inferredShape = Object.keys(shapes).find((name) => {
    if (name === 'generic') return false;
    const base = name.replace(/-like$/, '');
    return rawHostId === name || rawHostId === base
      || rawHostId.startsWith(`${base}-`) || rawHostId.endsWith(base);
  });
  const shapeEntry = shapes[args.hostShape || inferredShape] || null;
  const declared = parseDeclared(args.declare);

  // Re-probes must not discard data this probe does not own (e.g. binding
  // extras like supportedModels) or degrade previously detected tools the
  // current invocation has no new information about.
  const priorEntry = (cachedEntry && typeof cachedEntry === 'object') ? cachedEntry : {};
  const priorBinding = (priorEntry.binding && typeof priorEntry.binding === 'object') ? priorEntry.binding : {};
  const priorCaps = (priorEntry.capabilities && typeof priorEntry.capabilities === 'object') ? priorEntry.capabilities : {};

  // Host-declared tools outrank the static pre-map; persist them so re-probes
  // that omit --declare (e.g. --refresh) do not downgrade live declarations.
  const priorDeclared = {};
  if (priorEntry.declared && typeof priorEntry.declared === 'object') {
    for (const token of TOKENS) {
      if (typeof priorEntry.declared[token] === 'string' && priorEntry.declared[token]) {
        priorDeclared[token] = priorEntry.declared[token];
      }
    }
  }
  const effectiveDeclared = { ...priorDeclared, ...declared };

  const capabilities = {};
  for (const token of TOKENS) {
    if (effectiveDeclared[token]) {
      capabilities[token] = effectiveDeclared[token];
      continue;
    }
    if (shapeEntry) {
      const variants = shapeEntry[token] || [];
      capabilities[token] = variants.length > 0 ? variants[0] : MINIMAL[token];
      continue;
    }
    capabilities[token] = (typeof priorCaps[token] === 'string' && priorCaps[token])
      ? priorCaps[token]
      : MINIMAL[token];
  }

  const first = (names) => (Array.isArray(names) && names.length > 0 ? names[0] : 'none');
  const shapeNames = (token) => (shapeEntry && shapeEntry[token]) || [];
  const priorBound = (alias) => (
    typeof priorBinding[alias] === 'string' && priorBinding[alias] && priorBinding[alias] !== 'none'
      ? priorBinding[alias]
      : null
  );
  // Mirror the capabilities fallback: a known shape with no variant is fresh
  // negative information ('none'); with no shape and no declaration, keep the
  // previously bound alias instead of degrading to 'none'.
  const aliasFor = (token, alias) => {
    if (effectiveDeclared[token]) return effectiveDeclared[token];
    if (shapeEntry) return first(shapeNames(token)) || 'none';
    return priorBound(alias) || 'none';
  };
  const binding = {
    askQuestionTool: aliasFor('askQuestion', 'askQuestionTool'),
    subagentTool: aliasFor('dispatchAgent', 'subagentTool'),
    backgroundTaskTool: priorBound('backgroundTaskTool') || 'none',
    browserTool: aliasFor('browserVerify', 'browserTool'),
  };

  const effectiveShape = args.hostShape || inferredShape || 'generic';
  cache[key] = {
    // Preserve fields this probe does not own (e.g. supportedModels) and refresh tool bindings.
    binding: { ...priorBinding, ...binding },
    capabilities,
    declared: effectiveDeclared,
    hostShape: shapeEntry ? effectiveShape : (priorEntry.hostShape || 'generic'),
    knownShape: Boolean(shapeEntry) || priorEntry.knownShape === true,
    probedAt: startedAt,
    hostAdapterMode: 'auto',
  };

  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, 'utf8');
  } catch {
    // Cache write failure degrades to stdout-only; startup never fails.
    const payload = { ok: true, cached: false, key, capabilities, cacheWrite: 'skipped' };
    output(args.json, payload, `probe ok, cache write skipped | ${key}`);
    return 0;
  }

  if (args.probeLog) {
    try {
      fs.appendFileSync(args.probeLog, `${startedAt} probe | ${key}\n`, 'utf8');
    } catch {
      // Probe logging is observability-only; ignore failures.
    }
  }

  const payload = { ok: true, cached: false, key, capabilities };
  output(args.json, payload, `probe ok | ${key}`);
  return 0;
}

function output(asJson, payload, text) {
  if (asJson) process.stdout.write(`${JSON.stringify(payload)}\n`);
  else process.stdout.write(`${text}\n`);
}

process.exit(main());
