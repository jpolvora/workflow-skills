#!/usr/bin/env node
'use strict';

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
const { resolveConsumerContext, resolveSkillMdPath, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const PIPELINE = [
  'ws-spec-write',
  'ws-plan-write',
  'ws-plan-interview',
  'ws-plan-to-tasks',
  'ws-implement-tasks',
  'ws-plan-verify',
  'ws-code-review',
  'ws-testing',
  'ws-ship-pr',
  'ws-fix-pr',
  'ws-goal-fix-pr',
];

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--json') options.json = true;
    else if (token === '--repo-root') options.repoRoot = argv[++index];
    else if (token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const missing = [];
  for (const id of PIPELINE) {
    let file;
    try {
      file = resolveSkillMdPath(context, id);
    } catch {
      missing.push({ id, reason: 'missing SKILL.md', path: toRepoRelative(context.repoRoot, path.join(context.repoRoot, '.agents', 'skills', id, 'SKILL.md'), { allowOutside: true }) });
      continue;
    }
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('state.handoffs')) {
      missing.push({ id, reason: 'missing state.handoffs substring', path: toRepoRelative(context.repoRoot, file, { allowOutside: true }) });
    }
  }
  const payload = {
    ok: missing.length === 0,
    missing,
  };
  if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else if (payload.ok) process.stdout.write(`check_pipeline_handoff: OK (${PIPELINE.length} skills)\n`);
  else {
    process.stderr.write(`check_pipeline_handoff: missing state.handoffs in ${missing.map((item) => item.id).join(', ')}\n`);
  }
  if (!payload.ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
