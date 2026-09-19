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
const { resolveConsumerContext, toRepoRelative, resolveMinVerifyScore } = require(path.join(HUB_SCRIPTS_DIR, 'resolve_consumer_root.cjs'));

const SEVERITY = { Critical: 0, Warning: 1, Suggestion: 2 };

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
  for (const key of ['verify', 'review', 'output']) if (!options[key] && !options.help) throw new Error(`--${key} is required`);
  return options;
}

function readPayload(file, label) {
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be a JSON object`);
  if (!Array.isArray(value.findings)) throw new Error(`${label}.findings must be an array`);
  return value;
}

function finding(value, source) {
  if (!/^.+$/.test(value.id || '') || !Object.hasOwn(SEVERITY, value.severity)) throw new Error(`${source}: finding requires stable id and severity`);
  if (!value.path || !Number.isInteger(Number(value.line))) throw new Error(`${source}: finding requires path and line`);
  return {
    ...value,
    source,
    path: String(value.path).replace(/\\/g, '/'),
    line: Number(value.line),
  };
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => SEVERITY[a.severity] - SEVERITY[b.severity]
    || a.path.localeCompare(b.path)
    || a.line - b.line
    || a.id.localeCompare(b.id)
    || String(a.source).localeCompare(String(b.source)));
}

function collapseIdentical(findings) {
  const seen = new Set();
  return findings.filter((item) => {
    const key = `${item.id}\0${item.path}\0${item.line}\0${item.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeJuryReports(reports) {
  const findings = collapseIdentical(reports.flatMap((report, index) => (
    report.findings.map((item) => finding(item, `juror-${index + 1}`))
  )));
  return {
    schemaVersion: 1,
    findings: sortFindings(findings),
    requiresFix: findings.some((item) => ['Critical', 'Warning'].includes(item.severity)),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Usage: merge_verify_review.cjs --verify FILE --review FILE --output FILE\n');
    return;
  }
  const context = resolveConsumerContext({ repoRoot: options.repoRoot, scriptFile: __filename });
  const minVerifyScore = resolveMinVerifyScore(context.config);
  const verify = readPayload(path.resolve(context.repoRoot, options.verify), 'verify');
  const review = readPayload(path.resolve(context.repoRoot, options.review), 'review');
  const seen = new Set();
  const findings = sortFindings([
    ...verify.findings.map((item) => finding(item, 'verify')),
    ...review.findings.map((item) => finding(item, 'review')),
  ].filter((item) => {
    const key = `${item.id}\0${item.source}`;
    if (seen.has(key)) throw new Error(`duplicate finding identity: ${item.source}/${item.id}`);
    seen.add(key);
    return true;
  }));
  const result = {
    schemaVersion: 1,
    score: Number(verify.score),
    findings,
    requiresFix: Number(verify.score) < minVerifyScore
      || findings.some((item) => ['Critical', 'Warning'].includes(item.severity)),
  };
  const output = path.resolve(context.repoRoot, options.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ ...result, output: toRepoRelative(context.repoRoot, output) }, null, 2)}\n`);
}

module.exports = {
  finding,
  sortFindings,
  collapseIdentical,
  mergeJuryReports,
  readPayload,
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`ERROR: ${error.message}\n`);
    process.exitCode = 1;
  }
}
