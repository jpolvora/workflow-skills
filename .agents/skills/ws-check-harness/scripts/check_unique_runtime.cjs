#!/usr/bin/env node
/**
 * Unique-runtime gate: fail when any Python helper ships under the skills
 * tree or bin/. Packaged skill/installer/test runtime is Node 22 only.
 * Exit 1 when hits are found (critical for harness Phase 5a).
 *
 * Usage:
 *   node check_unique_runtime.cjs [--repo-root <path>] [--skills-root <rel>] [--json]
 */
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
const { resolveConsumerContext } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const SKIP_DIR_NAMES = new Set(['node_modules', '.git']);

function argsOf(argv) {
  const options = { repoRoot: null, skillsRoot: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') options.json = true;
    else if (a === '--repo-root') options.repoRoot = argv[++i];
    else if (a === '--skills-root') options.skillsRoot = argv[++i];
    else if (a === '--help' || a === '-h') options.help = true;
    else throw new Error('unknown argument: ' + a);
  }
  return options;
}

function collectPyFiles(dir, out) {
  out = out || [];
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      collectPyFiles(abs, out);
      continue;
    }
    if (!ent.isFile()) continue;
    if (path.extname(ent.name).toLowerCase() === '.py') out.push(abs);
  }
  return out;
}

function main() {
  const options = argsOf(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: node check_unique_runtime.cjs [--repo-root <path>] [--skills-root <rel>] [--json]',
    );
    process.exit(0);
  }

  const context = resolveConsumerContext({
    repoRoot: options.repoRoot || undefined,
    scriptFile: __filename,
  });
  const repoRoot = context.repoRoot;
  const skillsRootRel =
    options.skillsRoot ||
    (context.pathTokens && context.pathTokens.skillsRoot) ||
    '.agents/skills';
  const skillsAbs = path.resolve(repoRoot, skillsRootRel);
  const binAbs = path.resolve(repoRoot, 'bin');

  const hits = collectPyFiles(skillsAbs).concat(collectPyFiles(binAbs));
  const findings = hits.map((abs) => ({
    file: path.relative(repoRoot, abs).replace(/\\/g, '/'),
    reason: 'python-helper-shipped',
  }));

  const payload = {
    ok: findings.length === 0,
    skillsRoot: skillsRootRel.replace(/\\/g, '/'),
    findingCount: findings.length,
    findings: findings,
    remediation:
      'Unique skill script runtime is Node 22: port the helper to a .cjs script (same CLI flags, --json shape, and exit codes) and delete the .py copy. New .py files under .agents/skills/ or bin/ are forbidden (root AGENTS.md).',
  };

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else if (findings.length === 0) {
    console.log('check_unique_runtime: OK (no .py under ' + payload.skillsRoot + ' or bin/)');
  } else {
    console.error(
      'check_unique_runtime: ' + findings.length + ' Python helper(s) shipped (critical)',
    );
    for (const f of findings) console.error('  ' + f.file + ' [' + f.reason + ']');
    console.error(payload.remediation);
  }

  process.exit(findings.length === 0 ? 0 : 1);
}

main();
