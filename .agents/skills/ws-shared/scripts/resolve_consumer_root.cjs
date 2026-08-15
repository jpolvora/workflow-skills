#!/usr/bin/env node
'use strict';

/**
 * Resolve consumer project root for hybrid/global skill installs (JS twin).
 * See resolve_consumer_root.py for precedence rules.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const HUB_REL = path.join('.agents', 'skills', 'ws-shared');
const HUB_CONFIG = path.join(HUB_REL, 'config.json');
const HUB_CONFIG_EXAMPLE = path.join(HUB_REL, 'config.json.example');

function resolveGlobalSkillsRoot() {
  const env = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  if (env) return path.resolve(env);
  return path.resolve(os.homedir(), '.agents', 'skills');
}

function consumerHubExists(repoRoot) {
  const root = path.resolve(repoRoot);
  return (
    fs.existsSync(path.join(root, HUB_CONFIG)) ||
    fs.existsSync(path.join(root, HUB_CONFIG_EXAMPLE))
  );
}

function sharedDir(repoRoot) {
  return path.join(path.resolve(repoRoot), HUB_REL);
}

function scriptInGlobalSkills(scriptFile) {
  const scriptPath = path.resolve(scriptFile);
  const globalRoot = resolveGlobalSkillsRoot();
  const rel = path.relative(globalRoot, scriptPath);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function resolveRepoRoot(override, { scriptFile } = {}) {
  if (override) return path.resolve(override);

  const cwd = process.cwd();
  if (consumerHubExists(cwd)) return path.resolve(cwd);

  if (scriptFile) {
    const scriptPath = path.resolve(scriptFile);
    if (!scriptInGlobalSkills(scriptPath)) {
      let candidate = scriptPath;
      for (let i = 0; i < 4; i += 1) {
        candidate = path.dirname(candidate);
      }
      if (consumerHubExists(candidate)) return candidate;
    }
  }

  return path.resolve(cwd);
}

module.exports = {
  HUB_REL,
  HUB_CONFIG,
  HUB_CONFIG_EXAMPLE,
  resolveGlobalSkillsRoot,
  consumerHubExists,
  sharedDir,
  resolveRepoRoot,
};
