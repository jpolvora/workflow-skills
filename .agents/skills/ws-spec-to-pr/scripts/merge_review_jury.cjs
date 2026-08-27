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

function formatCanonicalReviewMarkdown(result, slug) {
  const lines = [
    '---',
    'artifactType: review',
    'step: 6',
    '---',
    '',
    `# Code review (merged jury) — ${slug || 'step-06'}`,
    '',
  ];
  if (!result.findings.length) {
    lines.push('No feedback');
  } else {
    for (const finding of result.findings) {
      const line = Number(finding.line) || 1;
      lines.push(`### ${finding.id} [${finding.severity}] open ${finding.path}:L${line}-L${line}`);
      lines.push(`Merged from review jury (${finding.severity}).`);
      lines.push('');
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const expectedSize = Number(context.config?.defaults?.reviewJury?.size || 0);
  if (expectedSize > 1 && options.reviews.length !== expectedSize) {
    throw new Error(`merge_review_jury expected ${expectedSize} juror files, got ${options.reviews.length}`);
  }
  const reports = options.reviews.map((file, index) => (
    readPayload(path.resolve(context.repoRoot, file), `juror-${index + 1}`)
  ));
  const result = mergeJuryReports(reports);
  const output = path.resolve(context.repoRoot, options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  if (options.canonicalReviewOut) {
    const canonicalPath = path.resolve(context.repoRoot, options.canonicalReviewOut);
    fs.mkdirSync(path.dirname(canonicalPath), { recursive: true });
    fs.writeFileSync(canonicalPath, formatCanonicalReviewMarkdown(result, options.slug), 'utf8');
  }
  process.stdout.write(`${JSON.stringify({ ...result, output: toRepoRelative(context.repoRoot, output) }, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
