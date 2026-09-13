#!/usr/bin/env node
'use strict';

/**
 * commit_g2_code.cjs — mechanical G2-code helper.
 * Stages path-scoped files_touched (minus plansDir / gitignored / preExistingDirty),
 * commits with a canonical message, links the SHA into ac-ledger.json (persisting
 * scoreState pre-step6), and appends state.commits. Empty stage → skip log, no commit.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext, resolveConfiguredPath, toRepoRelative } = require('../../ws-shared/runtime/scripts/resolve_consumer_root.cjs');

function parseArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    options[token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++i];
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
    process.stdout.write('Usage: commit_g2_code.cjs --state FILE --step N --message MSG [--ledger FILE] [--slug SLUG]\n');
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
  fs.writeFileSync(stateJsonPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  const ledgerRel = options.ledger || path.join(path.dirname(statePath), 'ac-ledger.json');
  const ledgerPath = path.resolve(repoRoot, ledgerRel);
  if (fs.existsSync(ledgerPath)) {
    const acIds = (state.acLedger?.acceptanceCriteria || JSON.parse(fs.readFileSync(ledgerPath, 'utf8')).acceptanceCriteria || []).map((row) => row.id);
    if (acIds.length) {
      const link = spawnSync('node', [
        path.join(__dirname, 'ac_ledger.cjs'),
        'link', '--ledger', toRepoRelative(repoRoot, ledgerPath),
        '--event-id', `g2-commit-${sha}`,
        ...acIds.flatMap((id) => ['--ac', id]),
        '--commit', JSON.stringify({ sha, step: Number(options.step) }),
      ], { cwd: repoRoot, encoding: 'utf8' });
      if (link.status !== 0) process.stderr.write(`WARN: ledger link failed: ${link.stderr}\n`);
    }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, sha, step: Number(options.step) })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
