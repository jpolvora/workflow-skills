#!/usr/bin/env node
'use strict';

/**
 * ws-retro opt-in decision helper (issue #490).
 *
 * Executable contract for the optional post-convergence retro step documented
 * in [`ws-spec-to-pr`](../../ws-spec-to-pr/SKILL.md) and
 * [`gates.md`](../gates.md). Pure decision function: reads one config file,
 * writes nothing, prints one JSON line on stdout.
 *
 * Decision order:
 * 1. `retro.enabled` explicit `true` → run (`enabled`).
 * 2. `retro` block or `enabled` key absent (or config unreadable/malformed) → skip (`missing`).
 * 3. Anything else (`false`, non-boolean) → skip (`disabled`).
 *
 * CLI:
 *   node retro_hook.cjs should-run --config <path> [--json]
 * Prints `{"run":true|false,"reason":"enabled|disabled|missing","key":"retro.enabled"}`.
 * Exits 0 on a decision, 2 on usage error (missing flag or unknown operation).
 */

const fs = require('fs');

function parseArgs(argv) {
  const out = { operation: null, config: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') out.json = true;
    else if (arg === '--config') out.config = argv[(index += 1)];
    else if (arg.startsWith('--')) throw new Error(`unknown flag: ${arg}`);
    else if (!out.operation) out.operation = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return out;
}

function readConfig(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decide(config) {
  if (!config || typeof config !== 'object' || !config.retro || typeof config.retro !== 'object' || Array.isArray(config.retro)) {
    return { run: false, reason: 'missing', key: 'retro.enabled' };
  }
  if (!Object.prototype.hasOwnProperty.call(config.retro, 'enabled')) {
    return { run: false, reason: 'missing', key: 'retro.enabled' };
  }
  if (config.retro.enabled === true) {
    return { run: true, reason: 'enabled', key: 'retro.enabled' };
  }
  return { run: false, reason: 'disabled', key: 'retro.enabled' };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`retro_hook: ${error.message}\n`);
    process.stderr.write('Usage: node retro_hook.cjs should-run --config <path> [--json]\n');
    process.exitCode = 2;
    return;
  }
  if (options.operation !== 'should-run') {
    process.stderr.write(`retro_hook: unknown operation: ${options.operation || '(none)'}\n`);
    process.stderr.write('Usage: node retro_hook.cjs should-run --config <path> [--json]\n');
    process.exitCode = 2;
    return;
  }
  if (!options.config) {
    process.stderr.write('retro_hook: --config is required\n');
    process.stderr.write('Usage: node retro_hook.cjs should-run --config <path> [--json]\n');
    process.exitCode = 2;
    return;
  }
  const decision = decide(readConfig(options.config));
  process.stdout.write(`${JSON.stringify(decision)}\n`);
  process.exitCode = 0;
}

if (require.main === module) {
  main();
}

module.exports = { decide, parseArgs };
