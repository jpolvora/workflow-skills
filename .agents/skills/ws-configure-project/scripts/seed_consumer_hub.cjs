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

const { resolveConsumerContext, toRepoRelative } = require(path.join(
  HUB_SCRIPTS_DIR,
  'resolve_consumer_root.cjs',
));

function resolveRuntimeAutoloadSource(ctx, repoRoot, globalSkillsRoot) {
  const local = path.join(repoRoot, '.agents', 'skills', 'ws-shared', 'runtime', 'autoload.md');
  if (fs.existsSync(local)) return local;
  const groot = globalSkillsRoot || path.join(require('os').homedir(), '.agents', 'skills');
  const globalPath = path.join(groot, 'ws-shared', 'runtime', 'autoload.md');
  if (fs.existsSync(globalPath)) return globalPath;
  return path.join(ctx.runtimeSource, 'autoload.md');
}

/**
 * @param {object} options
 * @param {string} [options.repoRoot]
 * @param {boolean} [options.dryRun]
 * @param {boolean} [options.isGlobalScope]
 * @param {() => string} [options.globalHubPointerMd]
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

  if (!dryRun) {
    fs.mkdirSync(hubRoot, { recursive: true });
  }

  const rel = (abs) => toRepoRelative(repoRoot, abs, { allowOutside: false });

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
    const content = options.isGlobalScope && typeof options.globalHubPointerMd === 'function'
      ? options.globalHubPointerMd()
      : localHubPointerMd(hubRelPosix);
    if (!dryRun) fs.writeFileSync(agentsPath, content, 'utf8');
    created.push(rel(agentsPath));
  }

  const autoloadPath = path.join(hubRoot, 'autoload.md');
  if (fs.existsSync(autoloadPath)) {
    skipped.push(rel(autoloadPath));
  } else {
    const source = resolveRuntimeAutoloadSource(ctx, repoRoot, options.globalSkillsRoot || null);
    if (!fs.existsSync(source)) {
      const err = new Error(`missing autoload seed ${source} (install hub runtime)`);
      err.code = 'SEED_AUTOLOAD_MISSING';
      throw err;
    }
    const rendered = renderConsumerAutoload(fs.readFileSync(source, 'utf8'), { repoRoot });
    if (!dryRun) fs.writeFileSync(autoloadPath, rendered, 'utf8');
    created.push(rel(autoloadPath));
  }

  for (const banned of ['runtime', 'templates']) {
    const stale = path.join(hubRoot, banned);
    if (fs.existsSync(stale)) {
      const err = new Error(`refusing seed: hub must not contain ${banned}/ (${rel(stale)})`);
      err.code = 'SEED_MANAGED_IN_HUB';
      throw err;
    }
  }

  return {
    hubRoot: rel(hubRoot),
    hubRelPosix,
    created,
    skipped,
    dryRun,
  };
}

module.exports = { seedConsumerHub };
