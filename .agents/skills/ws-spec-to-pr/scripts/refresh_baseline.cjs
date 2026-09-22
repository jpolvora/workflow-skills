#!/usr/bin/env node
'use strict';

/**
 * refresh_baseline.cjs — ownership-scoped baseline advancement (us-401).
 *
 * Refreshes a workflow state's recorded baselineCommit to the current tip of
 * the base ref when the base branch advances mid-run. Forward-only: never
 * resets back to the original baseline, never stages/stashes/reverts/cleans
 * any path, and never executes the rebase itself — it validates, updates
 * state, and prints the re-integration command for the session to run.
 *
 * Foreign-path STOP: upstream paths that changed between the recorded
 * baseline and the new tip are intersected with preExistingDirty paths this
 * session did not edit. A non-empty intersection means another writer is
 * mid-flight → exit 2 with the overlapping paths listed, no state mutation.
 *
 * Refreshing with no new upstream commits is idempotent (exit 0, no write).
 *
 * Usage:
 *   node refresh_baseline.cjs --state {us-dir}/{workflow-id}.state.json --base-ref origin/develop
 *   node refresh_baseline.cjs --state FILE --base-ref develop --remote origin --no-fetch --json
 *
 * Exit codes:
 *   0  refreshed, or unchanged (idempotent no-op)
 *   1  hard failure (bad args, missing state, git failure, fetch failure)
 *   2  STOP — overlapping foreign paths; state untouched
 */

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
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
    // Ignore cwd resolution failures; remaining candidates still apply.
  }
  const globalDir = process.env.WORKFLOW_SKILLS_GLOBAL_DIR;
  const globalRoot = globalDir && String(globalDir).trim()
    ? path.resolve(String(globalDir).trim())
    : path.join(require('os').homedir(), '.agents', 'skills');
  candidates.push(packaged);
  candidates.push(path.join(globalRoot, 'ws-shared', 'runtime', 'scripts'));
  for (const candidate of [...new Set(candidates)]) {
    try {
      require.resolve(path.join(candidate, 'workflow_state.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const { spawnSync } = require('child_process');
const { syncStateDualWrite } = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

function parseArgs(argv) {
  const options = { remote: 'origin', fetch: true, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') { options.help = true; continue; }
    if (token === '--no-fetch') { options.fetch = false; continue; }
    if (token === '--json') { options.json = true; continue; }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[++i];
    if (value === undefined || value.startsWith('--')) throw new Error(`${token} requires a value`);
    options[key] = value;
  }
  return options;
}

function runGit(repoRoot, args) {
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function normalizeList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item).trim().replace(/\\/g, '/')).filter(Boolean))];
}

function shortRef(remote, baseRef) {
  const rem = String(remote || 'origin');
  return baseRef.startsWith(`${rem}/`) ? baseRef.slice(rem.length + 1) : baseRef;
}

function ownPaths(state) {
  const manifest = state.workflowManifest || {};
  const touched = [
    ...normalizeList(manifest.created),
    ...normalizeList(manifest.modified),
    ...normalizeList(manifest.deleted),
  ];
  const handoffs = state.handoffs && typeof state.handoffs === 'object' ? Object.values(state.handoffs) : [];
  for (const handoff of handoffs) {
    for (const item of normalizeList(handoff && handoff.artifactPaths)) touched.push(item);
  }
  return new Set(touched);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: refresh_baseline.cjs --state FILE.state.json --base-ref REF [--remote origin] [--repo DIR] [--no-fetch] [--json]\n');
    return { code: 0, payload: null };
  }
  if (!options.state) throw new Error('--state is required');
  if (!options.baseRef) throw new Error('--base-ref is required');
  if (!String(options.state).endsWith('.state.json')) throw new Error('--state must point at a .state.json file');
  const repoRoot = options.repo ? path.resolve(String(options.repo)) : process.cwd();
  const statePath = path.resolve(repoRoot, String(options.state));
  if (!fs.existsSync(statePath)) throw new Error(`state not found: ${options.state}`);
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const baseRef = String(options.baseRef);

  const remote = String(options.remote || 'origin');
  if (options.fetch) {
    const fetch = runGit(repoRoot, ['fetch', remote, shortRef(remote, baseRef)]);
    if (fetch.status !== 0) throw new Error(`git fetch failed: ${(fetch.stderr || '').trim()}`);
  }
  const tipCp = runGit(repoRoot, ['rev-parse', '--verify', baseRef]);
  if (tipCp.status !== 0) throw new Error(`cannot resolve base ref ${baseRef}: ${(tipCp.stderr || '').trim()}`);
  const tip = (tipCp.stdout || '').trim();
  const previous = typeof state.baselineCommit === 'string' && state.baselineCommit.trim()
    ? state.baselineCommit.trim()
    : null;

  if (previous === tip) {
    return { code: 0, payload: { ok: true, unchanged: true, baselineCommit: tip } };
  }

  if (previous) {
    const ancestry = runGit(repoRoot, ['merge-base', '--is-ancestor', previous, tip]);
    if (ancestry.status !== 0) {
      throw new Error(`base ref did not advance from baseline ${previous} to ${tip}`);
    }
  }

  let changed = [];
  if (previous) {
    const diff = runGit(repoRoot, ['diff', '--name-only', previous, tip]);
    if (diff.status !== 0) throw new Error(`git diff failed: ${(diff.stderr || '').trim()}`);
    changed = (diff.stdout || '').split('\n').map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean);
  }
  const own = ownPaths(state);
  const foreignDirty = normalizeList(state.preExistingDirty).filter((p) => !own.has(p));
  const foreignSet = new Set(foreignDirty);
  const overlapping = changed.filter((p) => foreignSet.has(p));
  if (overlapping.length) {
    return {
      code: 2,
      payload: {
        ok: false, stop: true, reason: 'foreign-path-overlap', overlapping,
        baselineCommit: previous, newTip: tip,
      },
    };
  }

  state.baselineCommit = tip;
  state.baselineSourceRef = baseRef;
  state.revision = Number.isInteger(state.revision) ? state.revision + 1 : 1;
  syncStateDualWrite(statePath, state);
  return {
    code: 0,
    payload: {
      ok: true, unchanged: false, previous, baselineCommit: tip, baselineSourceRef: baseRef,
      reintegrate: `git fetch ${remote} ${shortRef(remote, baseRef)} && git rebase ${tip}`,
    },
  };
}

try {
  const result = main();
  if (result.payload) process.stdout.write(`${JSON.stringify(result.payload)}\n`);
  process.exitCode = result.code;
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
