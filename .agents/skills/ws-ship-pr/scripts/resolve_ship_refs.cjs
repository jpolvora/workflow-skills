#!/usr/bin/env node
/**
 * resolve_ship_refs.cjs — shared-head ship resolution for ws-ship-pr.
 *
 * No host accepts a PR from a branch into itself, so a stay run whose
 * ship head equals its base cannot PR head into base. This helper resolves
 * the executable ship refs from explicit inputs (never from git state):
 *
 *   feature      head differs from base        -> PR head into base
 *   shared-head  head equals base, config base differs -> push head, PR head into config base
 *   push-only    head equals both bases (or no config base) -> push head, no PR
 *
 * Usage:
 *   node resolve_ship_refs.cjs --head <branch> --base <branch> [--config-base <branch>] [--json]
 *
 * Exit 0 prints the resolution (human lines, or one JSON object with --json).
 * Exit 2 fails closed on empty head/base, a detached HEAD literal, or bad flags.
 * Read-only: never touches the worktree.
 */
'use strict';

function usage() {
  return 'usage: resolve_ship_refs.cjs --head <branch> --base <branch> [--config-base <branch>] [--json]';
}

function parse(argv) {
  const out = { head: null, base: null, configBase: '', json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--head' || arg === '--base' || arg === '--config-base') {
      const value = argv[i + 1];
      if (value === undefined || value === null || String(value).startsWith('--')) {
        throw new Error(`missing value for ${arg}`);
      }
      if (arg === '--head') out.head = String(value).trim();
      if (arg === '--base') out.base = String(value).trim();
      if (arg === '--config-base') out.configBase = String(value).trim();
      i += 1;
    } else if (arg === '--json') {
      out.json = true;
    } else {
      throw new Error(`unknown flag ${arg}`);
    }
  }
  return out;
}

function resolve(head, base, configBase) {
  if (!head || !base) throw new Error('head and base must both be non-empty');
  if (head === 'HEAD' || base === 'HEAD') throw new Error('detached HEAD literal is never a ship ref');
  if (head !== base) {
    return { head, prBase: base, mode: 'feature', reason: 'head differs from base' };
  }
  if (configBase && configBase !== head) {
    return { head, prBase: configBase, mode: 'shared-head', reason: 'stay head equals run base; PR head into config base' };
  }
  return { head, prBase: null, mode: 'push-only', reason: 'no distinct PR base exists; same-branch PR is invalid' };
}

function main() {
  let opts;
  try {
    opts = parse(process.argv.slice(2));
    const result = resolve(opts.head, opts.base, opts.configBase);
    if (opts.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    } else {
      process.stdout.write(`mode: ${result.mode}\nhead: ${result.head}\nprBase: ${result.prBase === null ? '(none)' : result.prBase}\nreason: ${result.reason}\n`);
    }
    process.exitCode = 0;
  } catch (err) {
    process.stderr.write(`ERROR: ${err && err.message ? err.message : err}\n${usage()}\n`);
    process.exitCode = 2;
  }
}

if (require.main === module) main();

module.exports = { resolve };
