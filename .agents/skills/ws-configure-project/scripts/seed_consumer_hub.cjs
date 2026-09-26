#!/usr/bin/env node
'use strict';

/**
 * Missing-only consumer hub seed (us-429): STACK.md, AGENTS.md, autoload.md,
 * .gitignore under the effective hub root. Never copies runtime/ or templates/
 * into the hub; never writes installer metadata.
 */

const fs = require('fs');
const path = require('path');
const {
  hubRootFor,
  hubRelPosixFor,
  tryHubRootFor,
  renderConsumerAutoload,
  localHubPointerMd,
} = require('./configure_autoload.cjs');

const SCRIPT_FILE = __filename;

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
    // ignore
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
      // try next
    }
  }
  return packaged;
})();

const {
  resolveConsumerContext,
  toRepoRelative,
  resolveGlobalSkillsRoot,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function resolveRuntimeAutoloadSource(ctx, repoRoot, globalSkillsRoot) {
  const resolvedGlobal =
    globalSkillsRoot || ctx.globalSkillsRoot || resolveGlobalSkillsRoot();
  const candidates = [
    path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'autoload.md'),
    path.join(ctx.runtimeSource, 'autoload.md'),
    path.join(resolvedGlobal, 'ws-shared', 'runtime', 'autoload.md'),
    path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'autoload.md'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

/**
 * @param {object} options
 * @param {string} [options.repoRoot]
 * @param {boolean} [options.dryRun]
 * @param {string|null} [options.globalSkillsRoot]
 */
function seedConsumerHub(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || process.cwd());
  const dryRun = Boolean(options.dryRun);
  const hubAttempt = tryHubRootFor(repoRoot);
  if (!hubAttempt.ok) {
    const err = hubAttempt.error;
    err.seedConsumerHub = true;
    throw err;
  }

  const ctx = resolveConsumerContext({ repoRoot, scriptFile: SCRIPT_FILE });
  const hubRoot = hubRootFor(repoRoot);
  const hubRelPosix = hubRelPosixFor(repoRoot);
  const created = [];
  const skipped = [];

  const rel = (abs) => toRepoRelative(repoRoot, abs, { allowOutside: false });

  // Refuse managed trees before any create (Negative 4 / AC4). Install quarantine
  // may remove them first; configure must not seed and then fail.
  for (const banned of ['runtime', 'templates']) {
    const stale = path.join(hubRoot, banned);
    if (fs.existsSync(stale)) {
      const err = new Error(`refusing seed: hub must not contain ${banned}/ (${rel(stale)})`);
      err.code = 'SEED_MANAGED_IN_HUB';
      throw err;
    }
  }

  const autoloadPath = path.join(hubRoot, 'autoload.md');
  const needsAutoload = !fs.existsSync(autoloadPath);
  const autoloadSource = needsAutoload
    ? resolveRuntimeAutoloadSource(ctx, repoRoot, options.globalSkillsRoot || null)
    : null;
  if (needsAutoload && !fs.existsSync(autoloadSource)) {
    const err = new Error(`missing autoload seed ${autoloadSource} (install hub runtime)`);
    err.code = 'SEED_AUTOLOAD_MISSING';
    throw err;
  }

  if (!dryRun) {
    fs.mkdirSync(hubRoot, { recursive: true });
  }

  const stackPath = path.join(hubRoot, 'STACK.md');
  if (fs.existsSync(stackPath)) {
    skipped.push(rel(stackPath));
  } else {
    const example = path.join(ctx.templateSource, 'STACK.md.example');
    if (fs.existsSync(example)) {
      if (!dryRun) fs.copyFileSync(example, stackPath);
      created.push(rel(stackPath));
    }
  }

  const gitignorePath = path.join(hubRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    skipped.push(rel(gitignorePath));
  } else {
    const template = path.join(ctx.templateSource, 'hub.gitignore');
    if (fs.existsSync(template)) {
      if (!dryRun) fs.copyFileSync(template, gitignorePath);
      created.push(rel(gitignorePath));
    }
  }

  const agentsPath = path.join(hubRoot, 'AGENTS.md');
  if (fs.existsSync(agentsPath)) {
    skipped.push(rel(agentsPath));
  } else {
    const content = localHubPointerMd(hubRelPosix);
    if (!dryRun) fs.writeFileSync(agentsPath, content, 'utf8');
    created.push(rel(agentsPath));
  }

  if (!needsAutoload) {
    skipped.push(rel(autoloadPath));
  } else {
    const rendered = renderConsumerAutoload(fs.readFileSync(autoloadSource, 'utf8'), { repoRoot });
    if (!dryRun) fs.writeFileSync(autoloadPath, rendered, 'utf8');
    created.push(rel(autoloadPath));
  }

  return {
    hubRoot: rel(hubRoot),
    hubRelPosix,
    created,
    skipped,
    dryRun,
  };
}

function main() {
  const args = process.argv.slice(2);
  let repoRoot = process.cwd();
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--repo-root') repoRoot = args[++i];
    else if (args[i] === '--dry-run') dryRun = true;
    else if (args[i] === '--json') { /* default */ }
    else {
      console.error(`ERROR: unknown argument ${args[i]}`);
      process.exit(2);
    }
  }
  try {
    const result = seedConsumerHub({ repoRoot, dryRun });
    console.log(JSON.stringify(result));
  } catch (err) {
    const code = err && err.code ? String(err.code) : '';
    if (code.startsWith('HUB_') || code === 'SEED_AUTOLOAD_MISSING' || code === 'SEED_MANAGED_IN_HUB') {
      console.error(`ERROR: hub seed: ${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}

if (require.main === module) main();

module.exports = { seedConsumerHub };
