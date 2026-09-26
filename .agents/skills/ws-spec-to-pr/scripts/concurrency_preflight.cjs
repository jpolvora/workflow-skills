#!/usr/bin/env node
'use strict';

// concurrency_preflight.cjs — bootstrap concurrency preflight (warn-only).
//
// Detects parallel writers sharing this branch/worktree BEFORE a workflow
// run starts mutating: other active workflow states under {plansDir} and
// foreign dirty paths in the worktree. Prints a non-blocking warning and a
// machine-readable report the bootstrap records into state.
//
// This preflight NEVER blocks, resets, cleans, or stashes: exit code is
// always 0 (git failures degrade to a note + proceed).
//
// Usage: node concurrency_preflight.cjs --state {us-dir}/{workflow-id}.state.json
//   [--repo-root <dir>] [--json]

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
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
      require.resolve(path.join(candidate, 'resolve_consumer_root.cjs'));
      return candidate;
    } catch {
      // Try the next candidate.
    }
  }
  return packaged;
})();
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const MAX_LISTED = 20;

function parseArgs(argv) {
  const options = { state: null, repoRoot: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write('Usage: concurrency_preflight.cjs --state {us-dir}/{workflow-id}.state.json [--repo-root <dir>] [--json]\n');
      process.exit(0);
    } else if (arg === '--state') options.state = argv[++index];
    else if (arg === '--repo-root') options.repoRoot = argv[++index];
    else if (arg === '--json') options.json = true;
    else if (arg.startsWith('--state=')) options.state = arg.slice('--state='.length);
    else if (arg.startsWith('--repo-root=')) options.repoRoot = arg.slice('--repo-root='.length);
    else {
      process.stderr.write(`WARNING: unknown argument ignored: ${arg}\n`);
    }
  }
  return options;
}

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function scanActiveStates(plansDir, selfId) {
  const found = [];
  let top;
  try {
    top = fs.readdirSync(plansDir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of top) {
    if (!entry.isDirectory()) continue;
    const usDir = path.join(plansDir, entry.name);
    let files;
    try {
      files = fs.readdirSync(usDir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith('.state.json')) continue;
      const state = readJsonSafe(path.join(usDir, file));
      if (!state || typeof state !== 'object') continue;
      if (state.workflowId === selfId) continue;
      if (state.status !== 'active' && state.status !== 'paused') continue;
      found.push({
        workflowId: state.workflowId || file,
        slug: state.slug || entry.name,
        branch: state.branch || null,
        status: state.status,
        updatedAt: state.updatedAt || null,
      });
    }
  }
  return found.sort((a, b) => String(a.workflowId).localeCompare(String(b.workflowId)));
}

function scanForeignDirty(repoRoot) {
  let result;
  try {
    result = spawnSync('git', ['status', '--porcelain', '-u'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: 'pipe',
    });
  } catch (error) {
    return { paths: [], note: `git status unavailable (${error.message}); proceeding` };
  }
  if (result.status !== 0) {
    return { paths: [], note: 'not a git worktree or git failed; proceeding' };
  }
  const paths = [];
  for (const raw of String(result.stdout || '').split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const code = raw.slice(0, 2);
    if (code === '!!') continue;
    const rel = raw.slice(3).trim().replace(/^"|"$/g, '');
    if (rel) paths.push(rel);
  }
  // At bootstrap the run owns nothing yet: every dirty path is foreign or
  // pre-existing and must be tolerated, never cleaned.
  return { paths: paths.sort() };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const plansRel = (context.config && context.config.plans && context.config.plans.dir) || '.agents/plans';
  const plansDir = path.resolve(context.repoRoot, plansRel);
  let selfId = null;
  if (options.state) {
    const selfAbs = path.isAbsolute(options.state) ? options.state : path.resolve(context.repoRoot, options.state);
    const self = readJsonSafe(selfAbs);
    if (self && typeof self.workflowId === 'string') selfId = self.workflowId;
  }
  const otherActive = scanActiveStates(plansDir, selfId);
  const dirty = scanForeignDirty(context.repoRoot);
  const recommendation = (otherActive.length || dirty.paths.length)
    ? 'Parallel writers detected: keep commits path-scoped to own files_touched, never reset/clean/stash foreign paths, and consider plans.useWorktrees (or a separate worktree/branch) for isolation. Record preExistingDirty at bootstrap.'
    : null;
  const report = {
    ok: true,
    blocking: false,
    selfWorkflowId: selfId,
    otherActive,
    foreignDirty: dirty.paths.slice(0, MAX_LISTED),
    foreignDirtyCount: dirty.paths.length,
    foreignDirtyTruncated: dirty.paths.length > MAX_LISTED,
    note: dirty.note || null,
    recommendation,
  };
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report)}\n`);
    return;
  }
  if (!otherActive.length && !dirty.paths.length) {
    process.stdout.write('concurrency preflight: clear (no other active workflows, clean tree)\n');
    return;
  }
  process.stdout.write('WARNING: concurrency preflight found parallel writers (non-blocking):\n');
  for (const other of otherActive) {
    process.stdout.write(`  - active workflow ${other.workflowId} (slug: ${other.slug}, branch: ${other.branch || 'n/a'}, status: ${other.status})\n`);
  }
  if (dirty.paths.length) {
    process.stdout.write(`  - foreign dirty paths: ${dirty.paths.slice(0, MAX_LISTED).join(', ')}${dirty.paths.length > MAX_LISTED ? ` (+${dirty.paths.length - MAX_LISTED} more)` : ''}\n`);
  }
  if (dirty.note) process.stdout.write(`  - note: ${dirty.note}\n`);
  process.stdout.write(`  - ${recommendation}\n`);
}

try {
  main();
} catch (error) {
  // Fail-open by design: the preflight must never block a run.
  process.stderr.write(`WARNING: concurrency preflight failed (${error.message}); proceeding\n`);
  process.exitCode = 0;
}
