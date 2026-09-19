#!/usr/bin/env node
'use strict';

/**
 * write_verification_manifest.cjs — mechanical verify reuse manifest.
 * After Step 4 (and after G2), writes .runtime/verification-manifest.json
 * (alias exits, stack scan, sabotage, files_touched hash). Steps 5/6/7 re-run
 * those commands only if files_touched changed; AC scoring, review, and tests
 * still run. Step 8 workflowMode PREPARE credits the pinned SHA.
 */

const crypto = require('crypto');
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
  // Deprecated last resort: read-only legacy consumer-hub copies. Nothing
  // writes managed runtime into .ws (it holds only local config files).
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', '.ws', 'runtime', 'scripts'));
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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

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

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: write_verification_manifest.cjs --us-dir DIR --output FILE [--ledger FILE]\n');
    return;
  }
  if (!options.usDir || !options.output) throw new Error('--us-dir and --output are required');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const usDir = path.resolve(context.repoRoot, options.usDir);
  const output = path.resolve(context.repoRoot, options.output);
  const ledgerPath = options.ledger ? path.resolve(context.repoRoot, options.ledger) : path.join(usDir, 'ac-ledger.json');
  let aliasResults = [];
  let sabotage = null;
  if (fs.existsSync(ledgerPath)) {
    try {
      const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
      aliasResults = ledger.aliasResults || [];
      const rows = ledger.acceptanceCriteria || [];
      const statuses = [...new Set(rows.map((row) => row.sabotage?.status).filter(Boolean))];
      if (statuses.length) sabotage = statuses.join(',');
    } catch {
      // ignore ledger parse failure; manifest still records files hash
    }
  }
  const stateJson = fs.readdirSync(usDir).find((name) => name.endsWith('.state.json'));
  let filesTouched = { created: [], modified: [], deleted: [] };
  if (stateJson) {
    try {
      const state = JSON.parse(fs.readFileSync(path.join(usDir, stateJson), 'utf8'));
      filesTouched = state.workflowManifest || filesTouched;
    } catch {
      // ignore
    }
  }
  const filesHash = sha256(JSON.stringify({
    created: [...(filesTouched.created || [])].sort(),
    modified: [...(filesTouched.modified || [])].sort(),
    deleted: [...(filesTouched.deleted || [])].sort(),
  }));
  const manifest = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    filesTouched: {
      created: [...(filesTouched.created || [])].sort(),
      modified: [...(filesTouched.modified || [])].sort(),
      deleted: [...(filesTouched.deleted || [])].sort(),
    },
    filesHash,
    aliasResults,
    sabotage,
    reuse: 'Steps 5/6/7 re-run alias/stack/sabotage commands only if files_touched changed; AC scoring, review, and tests still run. Compare current workflowManifest sorted hash to filesHash; match means reuse aliasResults/sabotage, mismatch means re-run.',
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const tmp = `${output}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, output);
  process.stdout.write(`${JSON.stringify({ ok: true, manifest: toRepoRelative(context.repoRoot, output), filesHash })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
