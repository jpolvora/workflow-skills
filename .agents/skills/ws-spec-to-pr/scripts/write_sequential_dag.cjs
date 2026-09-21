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
const { resolveConsumerContext, toRepoRelative } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    options[token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = argv[++index];
  }
  for (const key of ['slug', 'workflowId', 'plan', 'execOut', 'dagOut']) {
    if (!options[key] && !options.help) throw new Error(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)} is required`);
  }
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: write_sequential_dag.cjs --slug SLUG --workflow-id ID --plan FILE --exec-out FILE --dag-out FILE\n');
    return;
  }
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const plan = path.resolve(context.repoRoot, options.plan);
  const execOut = path.resolve(context.repoRoot, options.execOut);
  const dagOut = path.resolve(context.repoRoot, options.dagOut);
  if (!fs.existsSync(plan)) throw new Error(`plan not found: ${options.plan}`);
  const timestamp = options.timestamp || '1970-01-01T00:00:00Z';
  const acRefs = [...new Set(fs.readFileSync(plan, 'utf8').match(/\bAC[1-9][0-9]*\b/g) || [])]
    .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));
  const frontmatter = [
    '---',
    'step: 3',
    `slug: ${options.slug}`,
    `workflowId: ${options.workflowId}`,
    'status: completed',
    `startedAt: ${timestamp}`,
    `endedAt: ${timestamp}`,
    `acRefs: [${acRefs.join(', ')}]`,
    'execMode: sequential',
    'skipReason: dag-disabled',
    '---',
    '',
  ];
  const body = [
    '# Sequential execution plan',
    '',
    `Plan of record: \`${toRepoRelative(context.repoRoot, plan)}\`.`,
    '',
    'Execute implementation tasks in plan order. No task subagents or parallel levels are created.',
    '',
  ];
  const dag = {
    _meta: {
      step: 3,
      slug: options.slug,
      workflowId: options.workflowId,
      status: 'completed',
      startedAt: timestamp,
      endedAt: timestamp,
      acRefs,
    },
    schemaVersion: 1,
    execMode: 'sequential',
    skipReason: 'dag-disabled',
    tasks: [],
    levels: [],
  };
  fs.mkdirSync(path.dirname(execOut), { recursive: true });
  fs.mkdirSync(path.dirname(dagOut), { recursive: true });
  const execTmp = `${execOut}.tmp-${process.pid}-${Date.now()}`;
  const dagTmp = `${dagOut}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(execTmp, `${frontmatter.join('\n')}${body.join('\n')}`, 'utf8');
  fs.writeFileSync(dagTmp, `${JSON.stringify(dag, null, 2)}\n`, 'utf8');
  fs.renameSync(execTmp, execOut);
  fs.renameSync(dagTmp, dagOut);
  process.stdout.write(`${JSON.stringify({ ok: true, execPath: toRepoRelative(context.repoRoot, execOut), dagPath: toRepoRelative(context.repoRoot, dagOut), skipReason: 'dag-disabled' })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
