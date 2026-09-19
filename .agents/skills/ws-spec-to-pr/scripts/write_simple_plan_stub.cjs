#!/usr/bin/env node
'use strict';

/**
 * write_simple_plan_stub.cjs — scripted stub plan for complexityClass: simple.
 * Writes step-01-{slug}.plan.md (goal + files + AC checklist) so pre-advance 4
 * accepts the stub without a refined plan. Orch then runs plan_index build,
 * skips 2/3 with canonical reasons, and advances to Step 4.
 */

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

function acRows(spec) {
  return [...spec.matchAll(/^- (AC[1-9][0-9]*):\s*(.+)$/gm)].map((m) => ({ id: m[1], text: m[2].trim() }));
}

function pathRefs(spec) {
  const refs = new Set();
  for (const m of spec.matchAll(/`([^`\n]+)`/g)) {
    const candidate = m[1].trim();
    if (candidate.includes('/') || candidate.startsWith('.') || /\.(md|json|js|cjs|ts|tsx|py|yml|yaml)$/i.test(candidate)) {
      refs.add(candidate.replace(/\\/g, '/'));
    }
  }
  return [...refs].sort();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: write_simple_plan_stub.cjs --spec FILE --plan FILE --slug SLUG\n');
    return;
  }
  if (!options.spec || !options.plan || !options.slug) throw new Error('--spec, --plan, and --slug are required');
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const specPath = path.resolve(context.repoRoot, options.spec);
  const planPath = path.resolve(context.repoRoot, options.plan);
  if (!fs.existsSync(specPath)) throw new Error(`spec not found: ${options.spec}`);
  const spec = fs.readFileSync(specPath, 'utf8');
  const titleMatch = spec.match(/^title:\s*(.+)$/m);
  const title = (titleMatch ? titleMatch[1].trim() : options.slug).replace(/^['"]|['"]$/g, '');
  const acs = acRows(spec);
  if (!acs.length) throw new Error('stub requires at least one AC in the spec');
  const files = pathRefs(spec);
  const now = new Date().toISOString();
  const lines = [
    '---',
    `slug: ${options.slug}`,
    'complexityClass: simple',
    `sourceSpec: ${toRepoRelative(context.repoRoot, specPath)}`,
    `createdAt: ${now}`,
    '---',
    '',
    `# Stub plan — ${title}`,
    '',
    '> Script stub for `complexityClass: simple`. No interview or DAG. Orch runs `plan_index.cjs build`, skips Steps 2/3, and advances to Step 4.',
    '',
    '## Goal',
    '',
    `Implement ${title} per spec acceptance criteria below.`,
    '',
    '## Files',
    '',
    ...(files.length ? files.map((f) => `- \`${f}\``) : ['- _(no path refs in spec)_']),
    '',
    '## AC checklist',
    '',
    ...acs.map((ac) => `- [ ] ${ac.id}: ${ac.text}`),
    '',
  ];
  for (const ac of acs) {
    lines.push(`## ${ac.id}`, '', `${ac.text}`, '', `Tasks: implement ${ac.id} per spec; verify with configured aliases.`, '');
  }
  fs.mkdirSync(path.dirname(planPath), { recursive: true });
  fs.writeFileSync(planPath, lines.join('\n'), 'utf8');
  process.stdout.write(`${JSON.stringify({ ok: true, plan: toRepoRelative(context.repoRoot, planPath), acs: acs.length })}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
