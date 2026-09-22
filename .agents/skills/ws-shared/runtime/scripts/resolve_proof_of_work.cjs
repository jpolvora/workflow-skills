#!/usr/bin/env node
'use strict';

/**
 * Proof-of-work post-completion decision helper (us-386).
 *
 * Executable contract for [`gates.md`](../gates.md) § Optional post-completion
 * proof-of-work step and [`config-resolution.md`](../config-resolution.md)
 * § Optional post-completion proof-of-work. Pure decision function: reads one
 * config file, writes nothing, prints one JSON line on stdout.
 *
 * Decision order:
 * 1. `defaults.enableOptionalProofOfWork` not explicit `true` → skip `disabled`.
 * 2. `autoMode`: auto-start only when
 *    `defaults.enableAutomaticEvidenceCollectForProofOfWork` is explicit `true`,
 *    else skip `auto-skip`. Never prompts, never blocks.
 * 3. Normal mode with both switches explicit `true` → start checks (no gate).
 * 4. Normal mode manual (`enableOptionalProofOfWork` only) → `--gate-decision
 *    start` runs checks, anything else skips `gate-declined`.
 * 5. Start checks: collector skill absent → skip `collector-missing`; host
 *    without browser capability → skip `no-browser-capability`; else start with
 *    the folder resolved from `defaults.projectRootFolderToSave`
 *    (`{projectRoot}` / `{slug}` tokens; default
 *    `{projectRoot}/.proofOfWork/{slug}`).
 *
 * CLI:
 *   node resolve_proof_of_work.cjs --config <path> --slug <slug>
 *     --project-root <dir> [--auto-mode] [--collector-installed]
 *     [--browser-capable] [--gate-decision start|skip|cancel]
 * Prints `{action:"start",folder}`, `{action:"skip",reason}`, or
 * `{action:"cancel",reason:"gate-cancelled"}` (gate dismissed → caller applies
 * HS-1 STOP and records no completed skip); exits 0 on a decision, 2 on usage
 * error (missing config/slug flags, unreadable config, invalid gate decision,
 * or non-leaf slug).
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_FOLDER = '{projectRoot}/.proofOfWork/{slug}';

function parseArgs(argv) {
  const out = {
    config: null,
    slug: null,
    projectRoot: null,
    autoMode: false,
    collectorInstalled: false,
    browserCapable: false,
    gateDecision: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--auto-mode') out.autoMode = true;
    else if (arg === '--collector-installed') out.collectorInstalled = true;
    else if (arg === '--browser-capable') out.browserCapable = true;
    else if (arg === '--config') out.config = argv[(i += 1)];
    else if (arg === '--slug') out.slug = argv[(i += 1)];
    else if (arg === '--project-root') out.projectRoot = argv[(i += 1)];
    else if (arg === '--gate-decision') out.gateDecision = argv[(i += 1)];
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function readConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('config root must be a JSON object');
  }
  return data;
}

function sanitizeSlug(slug) {
  const base = String(slug).split(/[\\/]/).pop();
  if (!base || base === '.' || base === '..') {
    throw new Error('slug must be a plain path leaf (no separators, empty, or traversal)');
  }
  return base;
}

function resolveFolder(template, projectRoot, slug) {
  const base = typeof template === 'string' && template.length > 0 ? template : DEFAULT_FOLDER;
  return base.split('{projectRoot}').join(projectRoot).split('{slug}').join(sanitizeSlug(slug));
}

function decide(options, config) {
  const defaults = config && typeof config.defaults === 'object' && config.defaults !== null
    ? config.defaults
    : {};
  const enabled = defaults.enableOptionalProofOfWork === true;
  const automatic = defaults.enableAutomaticEvidenceCollectForProofOfWork === true;
  if (!enabled) return { action: 'skip', reason: 'disabled' };

  const startChecks = () => {
    if (!options.collectorInstalled) return { action: 'skip', reason: 'collector-missing' };
    if (!options.browserCapable) return { action: 'skip', reason: 'no-browser-capability' };
    return {
      action: 'start',
      folder: resolveFolder(defaults.projectRootFolderToSave, options.projectRoot, options.slug),
    };
  };

  if (options.autoMode) {
    if (!automatic) return { action: 'skip', reason: 'auto-skip' };
    return startChecks();
  }
  if (automatic) return startChecks();
  if (options.gateDecision === 'start') return startChecks();
  if (options.gateDecision === 'cancel') return { action: 'cancel', reason: 'gate-cancelled' };
  return { action: 'skip', reason: 'gate-declined' };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`resolve_proof_of_work: ${err.message}\n`);
    process.exitCode = 2;
    return;
  }
  if (!options.config || !options.slug || !options.projectRoot) {
    process.stderr.write('resolve_proof_of_work: --config, --slug, and --project-root are required\n');
    process.exitCode = 2;
    return;
  }
  if (options.gateDecision !== null && !['start', 'skip', 'cancel'].includes(options.gateDecision)) {
    process.stderr.write('resolve_proof_of_work: --gate-decision must be start, skip, or cancel\n');
    process.exitCode = 2;
    return;
  }
  try {
    sanitizeSlug(options.slug);
  } catch (err) {
    process.stderr.write(`resolve_proof_of_work: invalid --slug: ${err.message}\n`);
    process.exitCode = 2;
    return;
  }
  let config;
  try {
    config = readConfig(path.resolve(options.config));
  } catch (err) {
    process.stderr.write(`resolve_proof_of_work: cannot read config: ${err.message}\n`);
    process.exitCode = 2;
    return;
  }
  let decision;
  try {
    decision = decide(options, config);
  } catch (err) {
    process.stderr.write(`resolve_proof_of_work: cannot decide: ${err.message}\n`);
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify(decision)}\n`);
}

if (require.main === module) main();

module.exports = { decide, resolveFolder, sanitizeSlug, DEFAULT_FOLDER };
