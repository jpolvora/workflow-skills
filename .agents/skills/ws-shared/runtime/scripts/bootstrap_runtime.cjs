#!/usr/bin/env node
'use strict';

// Canonical runtime scripts directory resolver for standalone skill scripts.
// Resolves the managed runtime from:
// 1. WORKFLOW_SKILLS_SHARED_DIR (explicit override)
// 2. Repo-local .agents/skills/ws-shared/runtime/scripts
// 3. Packaged directory relative to callerDir (same-installation coherence)
// 4. Global skills root (WORKFLOW_SKILLS_GLOBAL_DIR or os.homedir()/.agents/skills)

const fs = require('fs');
const os = require('os');
const path = require('path');

function resolveHubScriptsDir(callerDir) {
  const packaged = callerDir
    ? path.resolve(callerDir, '..', '..', 'ws-shared', 'runtime', 'scripts')
    : path.resolve(__dirname);
  // Local-first precedence (explicit override, repo-local, packaged
  // same-installation copy, global root): a consumer-local ws-shared runtime
  // must win over the packaged copy, but the packaged copy — the calling
  // skill's own version-matched runtime — must win over a foreign global
  // install (e.g. repo scripts spawned with a runtime-less cwd).
  const candidates = [];
  const explicitShared = process.env.WORKFLOW_SKILLS_SHARED_DIR;
  if (explicitShared && String(explicitShared).trim()) {
    candidates.push(path.join(path.resolve(String(explicitShared).trim()), 'runtime', 'scripts'));
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
  candidates.push(packaged);
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
