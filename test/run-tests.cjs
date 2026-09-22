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
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SUITES_FILE = path.join(__dirname, 'test-suites.json');

// AC3/AC6 regression: the suite is side-effect free for the repository's own
// consumer hub config (`.ws/config.json`) and its backup. Snapshot the content
// hash of both before the suite and assert byte-identity after — on both the
// success and the failure path. Hashing the backup (not just its presence) also
// catches a pre-existing `.bak` being overwritten in place.
const HUB_CONFIG_FILES = ['.ws/config.json', '.ws/config.json.bak'];

function hashFileIfPresent(file) {
  return fs.existsSync(file)
    ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : null;
}

function snapshotHubState() {
  return {
    hashes: HUB_CONFIG_FILES.map((rel) => [rel, hashFileIfPresent(path.join(REPO_ROOT, rel))]),
  };
}

function hubStateProblems(before) {
  const problems = [];
  for (const [rel, hash] of before.hashes) {
    const now = hashFileIfPresent(path.join(REPO_ROOT, rel));
    if (now !== hash) problems.push(`${rel} changed (before=${hash} after=${now})`);
  }
  return problems;
}

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

  const hubStateBefore = snapshotHubState();
  let suiteExitCode = 0;

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const label = `${index + 1}/${entries.length} ${entry.join(' ')}`;
    process.stdout.write(`\n=== ${label} ===\n`);
    const result = spawnSync(process.execPath, entry, { cwd: REPO_ROOT, stdio: 'inherit' });
    if (result.error) {
      process.stderr.write(`\nrun-tests: failed to launch ${entry[0]}: ${result.error.message}\n`);
      suiteExitCode = 1;
      break;
    }
    if (result.status !== 0) {
      process.stderr.write(
        `\nrun-tests: ${entry.join(' ')} exited ${result.status} (stopped at ${index + 1}/${entries.length})\n`,
      );
      suiteExitCode = result.status === null ? 1 : result.status;
      break;
    }
  }

  // AC3/AC6: run the hub-mutation guard on the failure path too, so a test that
  // corrupts the repository hub config is reported even when it also fails.
  const hubProblems = hubStateProblems(hubStateBefore);
  if (hubProblems.length) {
    process.stderr.write(
      `\nrun-tests: hub config mutation detected (AC3/AC6): ${hubProblems.join('; ')}\n`,
    );
    suiteExitCode = 1;
  }

  if (suiteExitCode) process.exit(suiteExitCode);

  process.stdout.write(`\nrun-tests: all ${entries.length} entries passed (mode=${mode})\n`);
  process.stdout.write('run-tests: hub config byte-identity verified (no mutation, no leftover backup)\n');
}

main();
