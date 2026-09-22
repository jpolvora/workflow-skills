#!/usr/bin/env node
'use strict';

/**
 * Single-sourced consumer hub-root resolver (spec 0115, AC1).
 *
 * Every consumer of the project hub root — the installer (`bin/cli.js`),
 * `configure_autoload.cjs`, `seed_generated_skill.cjs`, and hub-layout reads —
 * must call this module instead of duplicating hub-root logic.
 *
 * Contract:
 * - Bootstrap discovery ALWAYS reads `<repo>/.ws/config.json` (fixed filename,
 *   fixed parent). `config.json` itself never relocates: it is the only
 *   discovery point for a relocated hub, so a relocated hub keeps its bootstrap
 *   copy there.
 * - When the bootstrap config declares a non-empty string
 *   `pathTokens.sharedDir`, the effective hub root is `<repo>/<sharedDir>`.
 *   Otherwise the hub root is `<repo>/.ws`.
 * - `pathTokens.skillsRoot` is out of scope: the skills install layout stays
 *   fixed (`.agents/skills`).
 *
 * Fail-closed containment (AC5): absolute paths (POSIX, Windows drive, UNC),
 * `~`-prefixed paths, empty / `.` values, and any `..` segment are refused.
 * The resolved hub must stay inside the repository on real paths
 * (`realpathLoose` deepest-ancestor resolution, so symlinked hubs and dangling
 * links fail closed instead of passing a lexical check). The default `.ws`
 * root gets the same realpath gate, so a symlinked-away `.ws` is refused too.
 *
 * Usage from CommonJS scripts:
 *   const { resolveHubRoot } = require('./resolve_hub_root.cjs');
 *   const { hubRoot, hubRel } = resolveHubRoot(repoRoot);
 *
 * Usage from ESM (`bin/cli.js`):
 *   import { createRequire } from 'module';
 *   const require = createRequire(import.meta.url);
 *   const { resolveHubRoot } = require('./resolve_hub_root.cjs'); // package copy
 *
 * CLI:
 *   node resolve_hub_root.cjs --repo-root <dir> [--json]
 *   Prints the hub root (or JSON) on stdout; exits 2 with the refusal on
 *   stderr when the configured root is unusable.
 */

const fs = require('fs');
const path = require('path');

const BOOTSTRAP_HUB_DIR = '.ws';
const BOOTSTRAP_CONFIG_NAME = 'config.json';

function bootstrapConfigPath(repoRoot) {
  return path.join(path.resolve(repoRoot), BOOTSTRAP_HUB_DIR, BOOTSTRAP_CONFIG_NAME);
}

function readBootstrapConfig(repoRoot) {
  const configPath = bootstrapConfigPath(repoRoot);
  if (!fs.existsSync(configPath)) return { config: null, configPath };
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { config: null, configPath };
    return { config: data, configPath };
  } catch {
    return { config: null, configPath };
  }
}

function realpathLoose(candidate) {
  // Resolve symlinks through the deepest existing ancestor so missing-leaf
  // paths still get symlink-resolved parents. Fails closed (null) on
  // unresolvable or dangling links instead of trusting a lexical path.
  const rest = [];
  let existing = candidate;
  for (;;) {
    try {
      fs.lstatSync(existing);
      break;
    } catch {
      // keep walking up past missing leaves
    }
    rest.unshift(path.basename(existing));
    const parent = path.dirname(existing);
    if (parent === existing) return null;
    existing = parent;
  }
  try {
    return path.join(fs.realpathSync(existing), ...rest);
  } catch {
    return null;
  }
}

function hubError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function validateSharedDir(raw) {
  // Returns the normalized relative hub dir, or throws a HUB_* error.
  if (typeof raw !== 'string') {
    throw hubError('HUB_NOT_A_STRING', 'pathTokens.sharedDir must be a string');
  }
  const trimmed = raw.trim().replace(/\\/g, '/');
  if (!trimmed || trimmed === '.') {
    throw hubError('HUB_EMPTY', 'pathTokens.sharedDir must be a non-empty relative directory (not the repository root)');
  }
  if (
    trimmed.startsWith('/') ||
    trimmed.startsWith('~') ||
    /^[A-Za-z]:(\/|$)/.test(trimmed) ||
    trimmed.startsWith('\\\\')
  ) {
    throw hubError('HUB_ABSOLUTE', `pathTokens.sharedDir must be repo-relative, got: ${raw}`);
  }
  const segments = trimmed.split('/').filter((s) => s.length > 0);
  if (segments.length === 0 || segments.some((s) => s === '.' || s === '..')) {
    throw hubError('HUB_TRAVERSAL', `pathTokens.sharedDir must not contain '.' or '..' segments, got: ${raw}`);
  }
  if (segments.some((s) => s === '')) {
    throw hubError('HUB_TRAVERSAL', `pathTokens.sharedDir is not a plain relative directory, got: ${raw}`);
  }
  return segments.join('/');
}

function resolveHubRoot(repoRoot, { config = undefined } = {}) {
  const root = path.resolve(repoRoot);
  let rootStat = null;
  try {
    rootStat = fs.statSync(root);
  } catch {
    rootStat = null;
  }
  if (!rootStat || !rootStat.isDirectory()) {
    throw hubError('HUB_UNRESOLVABLE', `Not a directory: ${repoRoot}`);
  }
  let loaded = config;
  let configPath = bootstrapConfigPath(root);
  if (loaded === undefined) {
    const read = readBootstrapConfig(root);
    loaded = read.config;
    configPath = read.configPath;
  }
  const raw = loaded && typeof loaded === 'object'
    ? loaded.pathTokens && loaded.pathTokens.sharedDir
    : undefined;
  const configured = typeof raw === 'string' && raw.trim() !== '';
  const hubRel = configured ? validateSharedDir(raw) : BOOTSTRAP_HUB_DIR;
  const hubRoot = path.join(root, ...hubRel.split('/'));

  // Realpath containment, including the default root: a symlinked hub that
  // resolves outside the repository (or a dangling link) is refused.
  let rootReal;
  try {
    rootReal = fs.realpathSync(root);
  } catch {
    throw hubError('HUB_UNRESOLVABLE', `Could not resolve repository root: ${root}`);
  }
  const hubReal = realpathLoose(hubRoot);
  if (!hubReal || !(hubReal === rootReal || hubReal.startsWith(rootReal + path.sep))) {
    const code = configured ? 'HUB_ESCAPE' : 'HUB_UNRESOLVABLE';
    throw hubError(code, configured
      ? `Refusing hub root outside the repository (traversal or symlink): ${raw}`
      : `Refusing unresolvable hub root: ${hubRoot}`);
  }
  return {
    hubRoot,
    hubReal,
    hubRel: hubRel.split('/').join(path.sep),
    hubRelPosix: hubRel,
    hubDepth: hubRel.split('/').length,
    configured,
    sharedDir: configured ? hubRel : BOOTSTRAP_HUB_DIR,
    bootstrapConfigPath: configPath,
    root,
    rootReal,
  };
}

function parseArgs(argv) {
  const options = { repoRoot: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--repo-root') {
      options.repoRoot = argv[i + 1];
      i += 1;
    } else if (arg.startsWith('--repo-root=')) {
      options.repoRoot = arg.slice('--repo-root='.length);
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: node resolve_hub_root.cjs --repo-root <dir> [--json]\n');
      process.exit(0);
    } else {
      process.stderr.write(`Unknown flag: ${arg}\n`);
      process.exit(2);
    }
  }
  if (!options.repoRoot || !String(options.repoRoot).trim()) {
    process.stderr.write('Missing required --repo-root <dir>\n');
    process.exit(2);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  try {
    const resolved = resolveHubRoot(options.repoRoot);
    if (options.json) {
      process.stdout.write(JSON.stringify({
        hubRoot: resolved.hubRoot,
        hubRel: resolved.hubRelPosix,
        configured: resolved.configured,
        bootstrapConfigPath: resolved.bootstrapConfigPath,
      }, null, 2) + '\n');
    } else {
      process.stdout.write(`${resolved.hubRoot}\n`);
    }
  } catch (err) {
    process.stderr.write(`${err.code || 'HUB_ERROR'}: ${err.message}\n`);
    process.exit(2);
  }
}

if (require.main === module) main();

module.exports = {
  resolveHubRoot,
  bootstrapConfigPath,
  readBootstrapConfig,
  realpathLoose,
  BOOTSTRAP_HUB_DIR,
  BOOTSTRAP_CONFIG_NAME,
};
