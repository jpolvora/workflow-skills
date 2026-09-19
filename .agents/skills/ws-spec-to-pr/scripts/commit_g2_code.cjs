#!/usr/bin/env node
'use strict';

/**
 * commit_g2_code.cjs — mechanical G2-code helper.
 * Stages path-scoped files_touched (minus plansDir / gitignored),
 * commits with a canonical message, links the SHA into ac-ledger.json only for
 * ACs with file evidence intersecting the staged candidates (or explicit --ac),
 * and appends state.commits. Empty stage → skip log, no commit.
 */

const fs = require('fs');
const path = require('path');
// Managed runtime loads from its skills installation: the project-local
// skills tree ({skillsRoot}/ws-shared) or the global skills tree
// ({globalSkillsRoot}/ws-shared, override via WORKFLOW_SKILLS_GLOBAL_DIR).
// An explicit WORKFLOW_SKILLS_SHARED_DIR selects the shared hub root
// (<hub>/runtime/scripts is used). The project consumer hub (<repo>/.ws)
// holds only local config variable files (config.json, STACK.md, memory,
// changelog) and is not a managed-runtime source.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
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
    : path.join(require('os').homedir(), '.agents', 'skills');
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
const { spawnSync } = require('child_process');
const { resolveConsumerContext, resolveConfiguredPath, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));
const { syncStateDualWrite } = require(path.join(HUB_SCRIPTS_DIR, 'workflow_state.cjs'));

function parseArgs(argv) {
  const options = { ac: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = argv[++i];
    if (key === 'ac') {
      options.ac.push(value);
      continue;
    }
    options[key] = value;
  }
  return options;
}

function runGit(repoRoot, args) {
  return spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
}

function isIgnored(repoRoot, file) {
  const result = runGit(repoRoot, ['check-ignore', '-q', file]);
  return result.status === 0;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: commit_g2_code.cjs --state FILE --step N --message MSG [--ledger FILE] [--slug SLUG] [--ac AC1 --ac AC2]\n');
    return;
  }
  if (!options.state || !options.step || !options.message) throw new Error('--state, --step, and --message are required');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const repoRoot = context.repoRoot;
  const statePath = path.resolve(repoRoot, options.state);
  if (!fs.existsSync(statePath)) throw new Error(`state not found: ${options.state}`);
  const stateJsonPath = statePath.endsWith('.json') ? statePath : statePath.replace(/\.state\.md$/, '.state.json');
  if (!fs.existsSync(stateJsonPath)) throw new Error(`state JSON not found: ${toRepoRelative(repoRoot, stateJsonPath)}`);
  const state = JSON.parse(fs.readFileSync(stateJsonPath, 'utf8'));
  const plansDir = resolveConfiguredPath(repoRoot, context.config?.plans?.dir, '.agents/plans');
  const plansRel = toRepoRelative(repoRoot, plansDir).replace(/\\/g, '/');
  const manifest = state.workflowManifest || {};
  const touched = [...new Set([...(manifest.created || []), ...(manifest.modified || []), ...(manifest.deleted || [])])];
  const candidates = touched.filter((file) => {
    const normalized = String(file).replace(/\\/g, '/');
    if (normalized.startsWith(`${plansRel}/`) || normalized === plansRel) return false;
    if (isIgnored(repoRoot, normalized)) return false;
    return true;
  });
  if (!candidates.length) {
    process.stdout.write(`${JSON.stringify({ ok: true, skipped: true, reason: 'empty-stage' })}\n`);
    try {
      process.stderr.write('g2-code | skip | empty-stage\n');
    } catch { /* ignore */ }
    return;
  }
  const dirty = runGit(repoRoot, ['status', '--porcelain=v1', '--', ...candidates]).stdout || '';
  if (!dirty.trim()) {
    process.stdout.write(`${JSON.stringify({ ok: true, skipped: true, reason: 'empty-stage' })}\n`);
    return;
  }
  let add = runGit(repoRoot, ['add', '--', ...candidates]);
  if (add.status !== 0) throw new Error(`git add failed: ${add.stderr}`);
  const commit = runGit(repoRoot, ['commit', '-m', String(options.message)]);
  if (commit.status !== 0) throw new Error(`git commit failed: ${commit.stderr}`);
  const sha = runGit(repoRoot, ['rev-parse', 'HEAD']).stdout.trim();
  state.commits = Array.isArray(state.commits) ? state.commits : [];
  if (!state.commits.some((item) => item.sha === sha)) state.commits.push({ sha, step: Number(options.step) });
  syncStateDualWrite(statePath, state);
  const ledgerRel = options.ledger || path.join(path.dirname(statePath), 'ac-ledger.json');
  const ledgerPath = path.resolve(repoRoot, ledgerRel);
  let linkedAcs = [];
  if (fs.existsSync(ledgerPath)) {
    let rows = [];
    try {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      rows = ledger.acceptanceCriteria || [];
    } catch {
      rows = [];
    }
    if (Array.isArray(options.ac) && options.ac.length) {
      linkedAcs = [...new Set(options.ac)];
    } else {
      const candidateSet = new Set(candidates.map((f) => String(f).replace(/\\/g, '/').toLowerCase()));
      linkedAcs = rows.filter((row) => Array.isArray(row.files) && row.files.some((f) => candidateSet.has(String(f.path || '').replace(/\\/g, '/').toLowerCase()))).map((row) => row.id);
      if (!linkedAcs.length && rows.length) {
        try {
          process.stderr.write(`WARN: no AC file evidence intersects G2 candidates; linking skipped (use --ac to override)\n`);
        } catch { /* ignore */ }
      }
    }
    if (linkedAcs.length) {
      const link = spawnSync('node', [
        path.join(__dirname, 'ac_ledger.cjs'),
        'link', '--ledger', toRepoRelative(repoRoot, ledgerPath),
        '--event-id', `g2-commit-${sha}`,
        ...linkedAcs.flatMap((id) => ['--ac', id]),
        '--commit', JSON.stringify({ sha, step: Number(options.step) }),
        '--score-boundary', 'pre-step6',
      ], { cwd: repoRoot, encoding: 'utf8' });
      if (link.status !== 0) process.stderr.write(`WARN: ledger link failed: ${link.stderr}\n`);
    }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, sha, step: Number(options.step), linkedAcs })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
