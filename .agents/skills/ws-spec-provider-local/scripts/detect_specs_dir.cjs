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
const {
  resolveConsumerContext,
  resolveConfiguredPath,
  toRepoRelative,
} = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function parseArgs(argv) {
  const args = { json: false, ensure: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--help' || token === '-h') args.help = true;
    else if (token === '--detect' || token === '--validate' || token === '--ensure' || token === '--json') args[token.slice(2)] = true;
    else if (token === '--configure' || token === '--repo-root') args[token.slice(2).replace('-r', 'R')] = argv[++i];
    else throw new Error(`unknown argument: ${token}`);
  }
  if (args.help) return args;
  if (![args.detect, args.validate, Boolean(args.configure)].filter(Boolean).length) throw new Error('choose --detect, --configure, or --validate');
  return args;
}

function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function emit(payload, json) {
  process.stdout.write(json ? `${JSON.stringify(payload, null, 2)}\n` : Object.entries(payload).map(([key, value]) => `${key}: ${value}`).join('\n') + '\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('Usage: detect_specs_dir.cjs --detect|--configure DIR|--validate [--ensure] [--json] [--repo-root DIR]\n');
    return;
  }
  const context = resolveConsumerContext({ repoRoot: args.repoRoot, scriptFile: __filename });
  const configFile = context.localConfig; // bootstrap config home (spec 0115)
  const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
  const fallback = fs.existsSync(path.join(context.repoRoot, 'specs')) ? 'specs' : '.agents/specs';
  let configured = args.configure || config.plans?.specsDir || fallback;
  let specsDir = resolveConfiguredPath(context.repoRoot, configured, fallback);
  let wroteConfig = false;
  let createdDir = false;

  if (args.configure || args.ensure || args.validate) {
    if (!fs.existsSync(specsDir)) {
      fs.mkdirSync(specsDir, { recursive: true });
      createdDir = true;
    }
    if (!fs.statSync(specsDir).isDirectory()) throw new Error(`specsDir is not a directory: ${specsDir}`);
  }
  if ((args.configure || args.ensure) && !config.plans?.specsDir) {
    config.$schema ||= '../.agents/skills/ws-shared/runtime/config.schema.json';
    config.plans ||= {};
    config.plans.specsDir = toRepoRelative(context.repoRoot, specsDir, { allowOutside: true });
    save(configFile, config);
    wroteConfig = true;
  } else if (args.configure) {
    config.plans ||= {};
    config.plans.specsDir = toRepoRelative(context.repoRoot, specsDir, { allowOutside: true });
    save(configFile, config);
    wroteConfig = true;
  }

  const payload = {
    ok: true,
    specsDir: toRepoRelative(context.repoRoot, specsDir, { allowOutside: true }),
    exists: fs.existsSync(specsDir),
    createdDir,
    wroteConfig,
    configPath: toRepoRelative(context.repoRoot, configFile, { allowOutside: true }),
  };
  emit(payload, args.json);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
