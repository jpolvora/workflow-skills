#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
// us-351: managed runtime loads from its installed location: the upstream
// package / global skills tree (<skills>/ws-shared) or the project consumer
// hub (<repo>/.ws). Mirrors resolveConsumerContext runtimeSource precedence.
const HUB_SCRIPTS_DIR = (() => {
  const packaged = path.resolve(__dirname, '..', '..', 'ws-shared', 'runtime', 'scripts');
  try {
    require.resolve(path.join(packaged, 'resolve_consumer_root.cjs'));
    return packaged;
  } catch {
    return path.resolve(__dirname, '..', '..', '..', '..', '.ws', 'runtime', 'scripts');
  }
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
