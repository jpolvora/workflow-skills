#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { resolveConsumerContext, toRepoRelative } = require('../../ws-shared/scripts/resolve_consumer_root.cjs');
const { mergeJuryReports, readPayload } = require('./merge_verify_review.cjs');

function parseArgs(argv) {
  const options = { reviews: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'review') options.reviews.push(argv[++index]);
    else options[key] = argv[++index];
  }
  if (options.reviews.length < 2) throw new Error('merge_review_jury requires at least two --review files');
  if (!options.output) throw new Error('--output is required');
  return options;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const reports = options.reviews.map((file, index) => (
    readPayload(path.resolve(context.repoRoot, file), `juror-${index + 1}`)
  ));
  const result = mergeJuryReports(reports);
  const output = path.resolve(context.repoRoot, options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ ...result, output: toRepoRelative(context.repoRoot, output) }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
