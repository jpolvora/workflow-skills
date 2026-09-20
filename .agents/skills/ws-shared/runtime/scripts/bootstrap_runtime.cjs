#!/usr/bin/env node
'use strict';

// Canonical runtime scripts directory resolver for standalone skill scripts.
// Resolves the managed runtime from:
// 1. WORKFLOW_SKILLS_SHARED_DIR (explicit override)
// 2. Repo-local .agents/skills/ws-shared/runtime/scripts
// 3. Global skills root (WORKFLOW_SKILLS_GLOBAL_DIR or os.homedir()/.agents/skills)
// 4. Packaged directory relative to callerDir

const fs = require('fs');
const os = require('os');
const path = require('path');

function resolveHubScriptsDir(callerDir) {
  const packaged = callerDir
    ? path.resolve(callerDir, '..', '..', 'ws-shared', 'runtime', 'scripts')
    : path.resolve(__dirname);
  const candidates = [packaged];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.unshift(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
  }
  try {
    candidates.push(path.resolve(process.cwd(), '.agents', 'skills', 'ws-shared', 'runtime', 'scripts'));
  } catch {
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(os.homedir(), '.agents', 'skills');
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));

  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(`Failed to resolve ws-shared runtime scripts directory. Checked: ${candidates.join(', ')}`);
}

module.exports = {
  resolveHubScriptsDir,
};
