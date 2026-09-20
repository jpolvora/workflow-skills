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
const { mergeJuryReports, readPayload } = require('./merge_verify_review.cjs');

function parseArgs(argv) {
  const options = { reviews: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (key === 'review') options.reviews.push(argv[++index]);
    else options[key] = argv[++index];
  }
  if (options.reviews.length < 2 && !options.help) throw new Error('merge_review_jury requires at least two --review files');
  if (!options.output && !options.help) throw new Error('--output is required');
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
  if (options.help) {
    process.stdout.write('Usage: merge_review_jury.cjs --review FILE --review FILE --output FILE [--canonical-review-out FILE]\n');
    return;
  }
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
