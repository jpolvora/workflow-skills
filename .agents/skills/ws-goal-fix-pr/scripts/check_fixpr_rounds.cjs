#!/usr/bin/env node
'use strict';

// check_fixpr_rounds.cjs — us-414 AC4 conformance checker for Step 9 convergence.
// Passes when PR <N> has round artifacts ({reviewsDir}/PR-<N>-round-*.md) or an
// explicitly reasoned clean-immediate marker (PR-<N>-round-0-clean-immediate.md
// with a non-empty frontmatter reason). Fails closed otherwise, naming the rule.

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--help' || token === '-h') {
      options.help = true;
      continue;
    }
    if (!token.startsWith('--')) throw new Error(`unknown argument: ${token}`);
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    options[key] = argv[++index];
  }
  return options;
}

function frontmatterReason(file) {
  const text = fs.readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return '';
  const line = match[1].split(/\r?\n/).find((row) => /^\s*reason\s*:/i.test(row));
  if (!line) return '';
  return String(line.split(/:(.*)/s)[1] || '').trim();
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: check_fixpr_rounds.cjs --reviews-dir <dir> --pr <N>\n'
      + 'Verify Step 9 convergence recorded round artifacts (PR-<N>-round-*.md) or a reasoned\n'
      + 'clean-immediate marker (PR-<N>-round-0-clean-immediate.md with a frontmatter reason).\n'
      + 'Example: node check_fixpr_rounds.cjs --reviews-dir .agents/codereviews --pr 421\n');
    return;
  }
  const pr = String(options.pr || '').trim();
  if (!pr) throw new Error('--pr <N> is required');
  if (!options.reviewsDir) throw new Error('--reviews-dir <dir> is required');
  const dir = path.resolve(String(options.reviewsDir));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    throw new Error(`no round artifacts and no clean-immediate reason for PR ${pr} in ${options.reviewsDir} (reviews dir missing)`);
  }
  const prefix = `PR-${pr}-round-`;
  const files = fs.readdirSync(dir).filter((name) => name.startsWith(prefix) && name.endsWith('.md'));
  const rounds = files.filter((name) => !name.endsWith('-clean-immediate.md'));
  if (rounds.length) {
    process.stdout.write(`${JSON.stringify({ ok: true, pr, rounds: rounds.sort() })}\n`);
    return;
  }
  const markers = files.filter((name) => name.endsWith('-clean-immediate.md'));
  const reasoned = markers.filter((name) => frontmatterReason(path.join(dir, name)));
  if (reasoned.length) {
    process.stdout.write(`${JSON.stringify({ ok: true, pr, cleanImmediate: reasoned.sort() })}\n`);
    return;
  }
  if (markers.length) {
    throw new Error(`no round artifacts and no clean-immediate reason for PR ${pr} in ${options.reviewsDir} (clean-immediate marker present but its frontmatter reason is empty)`);
  }
  throw new Error(`no round artifacts and no clean-immediate reason for PR ${pr} in ${options.reviewsDir} (expected PR-${pr}-round-*.md or a reasoned PR-${pr}-round-0-clean-immediate.md)`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`ERROR: ${error.message}\n`);
  process.exitCode = 1;
}
