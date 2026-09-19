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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--repo-root') args.repoRoot = argv[++index];
    else if (argv[index] === '--json') args.json = true;
    else throw new Error(`unknown argument: ${argv[index]}`);
  }
  return args;
}

function matcher(glob) {
  const normalized = glob.replace(/\\/g, '/');
  let pattern = '';
  for (let index = 0; index < normalized.length; index += 1) {
    const character = normalized[index];
    if (character === '*' && normalized[index + 1] === '*' && normalized[index + 2] === '/') {
      pattern += '(?:.*/)?';
      index += 2;
    } else if (character === '*' && normalized[index + 1] === '*') {
      pattern += '.*';
      index += 1;
    } else if (character === '*') pattern += '[^/]*';
    else if (character === '?') pattern += '[^/]';
    else pattern += character.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${pattern}$`);
}

function walk(root) {
  try {
    const { spawnSync } = require('child_process');
    const ls = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 });
    if (ls.status === 0 && ls.stdout && ls.stdout.length) {
      return String(ls.stdout).split('\0').filter(Boolean).map((file) => path.join(root, file)).filter((full) => {
        try {
          return fs.existsSync(full) && fs.statSync(full).isFile();
        } catch {
          return false;
        }
      });
    }
  } catch {
    // fall through to filesystem walk
  }
  const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', 'benchmarks']);
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  return files;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
  const aliases = Object.entries(context.config?.verification || {})
    .filter(([key, value]) => /Test$/.test(key) && typeof value === 'string' && value.trim())
    .map(([key, command]) => ({ key, command }));
  const globs = context.config?.defaults?.testGlobs || [
    'test/**/*.js',
    'tests/**/*',
    '**/*.test.*',
    '**/*.spec.*',
  ];
  const expressions = globs.map(matcher);
  const matches = walk(context.repoRoot)
    .map((file) => toRepoRelative(context.repoRoot, file))
    .filter((file) => expressions.some((expression) => expression.test(file)))
    .sort();
  const payload = {
    schemaVersion: 1,
    hasTestSurface: aliases.length > 0 || matches.length > 0,
    aliases,
    globs,
    matches,
    skipReason: aliases.length === 0 && matches.length === 0 ? 'no-test-surface' : null,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
