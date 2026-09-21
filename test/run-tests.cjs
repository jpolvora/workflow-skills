#!/usr/bin/env node
/**
 * Test suite runner.
 *
 * Keeps package.json scripts short by owning the ordered test list in
 * test-suites.json. Every entry is an argv array (script path + args) launched
 * with the Node 22 launcher, sequentially and fail-fast (same semantics as the
 * previous `&&`-chained npm scripts).
 *
 * Usage:
 *   node test/run-tests.cjs                     # local install suite + harness-efficiency
 *   node test/run-tests.cjs --remote            # remote/npx install suite + harness-efficiency
 *   node test/run-tests.cjs --harness-efficiency# harness-efficiency suite only
 *   node test/run-tests.cjs --list              # print the resolved entries, run nothing
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUITES_FILE = path.join(__dirname, 'test-suites.json');

function loadSuites() {
  const data = JSON.parse(fs.readFileSync(SUITES_FILE, 'utf8'));
  for (const key of ['local', 'remote', 'harnessEfficiency']) {
    if (!Array.isArray(data[key])) {
      throw new Error(`test-suites.json: "${key}" must be an array`);
    }
  }
  return data;
}

function resolveMode(argv) {
  const flags = new Set(argv);
  if (flags.has('--remote')) return 'remote';
  if (flags.has('--harness-efficiency')) return 'harnessEfficiency';
  return 'local';
}

function listFor(suites, mode) {
  if (mode === 'harnessEfficiency') return suites.harnessEfficiency.slice();
  const base = mode === 'remote' ? suites.remote : suites.local;
  return base.concat(suites.harnessEfficiency);
}

function main() {
  const argv = process.argv.slice(2);
  const suites = loadSuites();
  const mode = resolveMode(argv);
  const entries = listFor(suites, mode);

  if (argv.includes('--list')) {
    for (const entry of entries) process.stdout.write(`${entry.join(' ')}\n`);
    return;
  }

  process.stdout.write(
    `run-tests: mode=${mode} entries=${entries.length} (Node ${process.version})\n`,
  );

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const label = `${index + 1}/${entries.length} ${entry.join(' ')}`;
    process.stdout.write(`\n=== ${label} ===\n`);
    const result = spawnSync(process.execPath, entry, { cwd: REPO_ROOT, stdio: 'inherit' });
    if (result.error) {
      process.stderr.write(`\nrun-tests: failed to launch ${entry[0]}: ${result.error.message}\n`);
      process.exit(1);
    }
    if (result.status !== 0) {
      process.stderr.write(
        `\nrun-tests: ${entry.join(' ')} exited ${result.status} (stopped at ${index + 1}/${entries.length})\n`,
      );
      process.exit(result.status === null ? 1 : result.status);
    }
  }

  process.stdout.write(`\nrun-tests: all ${entries.length} entries passed (mode=${mode})\n`);
}

main();
