#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveConsumerContext, resolveSkillMdPath, toRepoRelative } = require('../../ws-shared/scripts/resolve_consumer_root.cjs');

const PIPELINE = [
  'ws-write-spec',
  'ws-write-plan',
  'ws-interview',
  'ws-plan-to-tasks',
  'ws-implement-tasks',
  'ws-verify-plan',
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
    if (!text.includes('handoff/step-')) {
      missing.push({ id, reason: 'missing handoff/step- substring', path: toRepoRelative(context.repoRoot, file, { allowOutside: true }) });
    }
  }
  const payload = {
    ok: missing.length === 0,
    missing,
  };
  if (options.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else if (payload.ok) process.stdout.write(`check_pipeline_handoff: OK (${PIPELINE.length} skills)\n`);
  else {
    process.stderr.write(`check_pipeline_handoff: missing handoff/step- in ${missing.map((item) => item.id).join(', ')}\n`);
  }
  if (!payload.ok) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
