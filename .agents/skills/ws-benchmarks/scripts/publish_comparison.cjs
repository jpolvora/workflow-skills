#!/usr/bin/env node
'use strict';

// Publish a fixed-model comparison benchmark run.
//
// Validates a run directory (prd.md + judge.json + run-manifest.json) against
// the comparison protocol gates, scores binary-check samples, and writes the
// report plus JSON twin under benchmarks/results/. Never executes harnesses
// and never reimplements the benchmark engine: samples reference observed
// artifacts produced by the existing engine commands.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { findPackageRoot, comparisonFingerprint, writeComparisonFile } = require('./benchmarks_manager.cjs');

const COMPARISON_SECTION = '## Fixed-Model Comparison Runs';
const MIN_SAMPLES = 3;

const HELP = `Fixed-model comparison publisher (ws-benchmarks)

Usage:
  node .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs --run <runDir> [--results-dir <dir>] [--repo-root <dir>]

Inputs (under --run):
  prd.md              Frozen PRD bytes (sha256 must match manifest prdSha256)
  judge.json          Binary-check judge definition (sha256 must match manifest judgeSha256)
  run-manifest.json   Columns, models, samples, defaults, exceptions

Gates: PRD frozen · judge frozen · >=3 samples per column · uniform models per
role · strictly binary results · comparator defaults pinned (deviations need a
protocolExceptions entry) · run dir contained in the repo root.
`;

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        options[key] = next;
        i += 1;
      } else {
        options[key] = true;
      }
    } else {
      options._.push(arg);
    }
  }
  return options;
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`${label} missing: ${filePath} (${err.message})`);
  }
  try {
    return { data: JSON.parse(raw), bytes: raw };
  } catch (err) {
    throw new Error(`${label} is not valid JSON: ${filePath} (${err.message})`);
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function stableDeepEqual(a, b) {
  return canonicalize(a) === canonicalize(b);
}

function assertSafeRunId(runId) {
  if (!/^[\w][\w.-]*$/.test(String(runId || ''))) {
    throw new Error(`run manifest runId is not a safe filename segment: ${JSON.stringify(runId)}`);
  }
}

function validateColumn(column, checkIds, exceptions) {
  const name = column.harness || '<unnamed>';
  if (!column.harness || !column.version) {
    throw new Error(`column ${name}: harness and version are required`);
  }
  if (!column.settings || typeof column.settings !== 'object') {
    throw new Error(`column ${name}: settings object is required`);
  }
  if (!column.models || typeof column.models !== 'object' || !Object.keys(column.models).length) {
    throw new Error(`column ${name}: models per role are required`);
  }
  const samples = Array.isArray(column.samples) ? column.samples : [];
  if (samples.length < MIN_SAMPLES) {
    throw new Error(`column ${name}: sample shortfall (${samples.length}/${MIN_SAMPLES}); publication blocked`);
  }
  const roles = Object.keys(column.models);
  const perSample = [];
  samples.forEach((sample, idx) => {
    const label = `${name} sample ${idx + 1}`;
    for (const role of roles) {
      if (!sample.models || sample.models[role] !== column.models[role]) {
        throw new Error(`column ${name}: model mix in ${label} (role ${role}: expected ${column.models[role]}, saw ${sample.models ? sample.models[role] : 'none'})`);
      }
    }
    if (!sample.checks || typeof sample.checks !== 'object') {
      throw new Error(`column ${name}: ${label} has no binary checks`);
    }
    let total = 0;
    for (const id of checkIds) {
      const value = sample.checks[id];
      if (value !== 0 && value !== 1) {
        throw new Error(`column ${name}: ${label} check ${id} is not binary (saw ${JSON.stringify(value)}); no partial credit`);
      }
      total += value;
    }
    for (const id of Object.keys(sample.checks)) {
      if (!checkIds.includes(id)) {
        throw new Error(`column ${name}: ${label} references unknown check ${id}`);
      }
    }
    if (!sample.timestamp) {
      throw new Error(`column ${name}: ${label} is missing its timestamp`);
    }
    perSample.push(total);
  });
  if (column.defaults !== undefined && !stableDeepEqual(column.settings, column.defaults)) {
    const logged = (exceptions || []).some((item) => item && item.harness === name);
    if (!logged) {
      throw new Error(`column ${name}: settings deviate from documented defaults with no protocolExceptions entry; log the deviation or rerun at defaults`);
    }
  }
  const perCheck = {};
  for (const id of checkIds) {
    const sum = samples.reduce((acc, sample) => acc + sample.checks[id], 0);
    perCheck[id] = { passed: sum, total: samples.length, rate: sum / samples.length };
  }
  const grand = perSample.reduce((acc, value) => acc + value, 0);
  return {
    harness: name,
    version: column.version,
    settings: column.settings,
    models: column.models,
    samples,
    perSample,
    aggregate: {
      perCheck,
      total: grand,
      mean: grand / samples.length,
      maxPerSample: checkIds.length,
      sampleCount: samples.length,
    },
  };
}

function renderReport({ manifest, judge, scored, prdHash, judgeHash, runDir }) {
  const generatedAt = new Date().toISOString();
  const checkIds = judge.checks.map((check) => check.id);
  const lines = [
    `# Fixed-Model Comparison — ${manifest.runId}`,
    '',
    `**Generated:** ${generatedAt}  `,
    `**PRD sha256:** \`${prdHash}\`  `,
    `**Judge sha256:** \`${judgeHash}\`  `,
    `**Run dir:** \`${runDir}\``,
    '',
    '## Harnesses',
    '',
    '| Harness | Version | Models | Samples | Mean |',
    '|---|---|---|---:|---:|',
  ];
  for (const col of scored) {
    const models = Object.entries(col.models).map(([role, id]) => `${role}=${id}`).join(', ');
    lines.push(`| ${col.harness} | ${col.version} | ${models} | ${col.aggregate.sampleCount} | ${col.aggregate.mean.toFixed(2)} |`);
  }
  lines.push('', '## Per-sample binary results', '');
  lines.push(`| Harness | Sample | ${checkIds.join(' | ')} | Total | Timestamp |`);
  lines.push(`|---|---|${checkIds.map(() => '---:').join('|')}|---:|---|`);
  for (const col of scored) {
    col.samples.forEach((sample, idx) => {
      const cells = checkIds.map((id) => (sample.checks[id] === 1 ? '1' : '0')).join(' | ');
      lines.push(`| ${col.harness} | ${idx + 1} | ${cells} | ${col.perSample[idx]} | ${sample.timestamp} |`);
    });
  }
  lines.push('', '## Aggregate scores', '');
  lines.push('| Harness | Check | Passed | Total | Rate |');
  lines.push('|---|---|---:|---:|---:|');
  for (const col of scored) {
    for (const id of checkIds) {
      const agg = col.aggregate.perCheck[id];
      lines.push(`| ${col.harness} | ${id} | ${agg.passed} | ${agg.total} | ${agg.rate.toFixed(2)} |`);
    }
  }
  lines.push('', '## Judge definition', '');
  for (const check of judge.checks) {
    lines.push(`- **${check.id}**: ${check.text} (evidence: \`${check.evidence}\`)`);
  }
  const exceptions = Array.isArray(manifest.protocolExceptions) ? manifest.protocolExceptions : [];
  lines.push('', '## Protocol exceptions', '');
  if (!exceptions.length) {
    lines.push('- none');
  } else {
    for (const item of exceptions) {
      lines.push(`- **${item.harness}**: ${item.setting || 'setting'} expected \`${JSON.stringify(item.expected)}\` saw \`${JSON.stringify(item.actual)}\` — ${item.reason || 'logged'}`);
    }
  }
  const pending = Array.isArray(manifest.pendingComparators) ? manifest.pendingComparators : [];
  lines.push('', '## Pending comparators (not scored)', '');
  if (!pending.length) {
    lines.push('- none');
  } else {
    for (const item of pending) {
      lines.push(`- **${item.harness}**: ${item.reason || 'pending'}${item.rerun ? ` (rerun: ${item.rerun})` : ''}`);
    }
  }
  lines.push('', '## Reproduce', '');
  lines.push(`\`node .agents/skills/ws-benchmarks/scripts/publish_comparison.cjs --run ${runDir}\``, '');
  return lines.join('\n');
}

function writeJsonTwin(filePath, payload, jsonText) {
  if (fs.existsSync(filePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const strip = (value) => {
        const { publishedAt, ...rest } = value || {};
        return JSON.stringify(rest);
      };
      if (strip(existing) === strip(payload)) return { wrote: false, path: filePath };
    } catch {
      // Corrupt twin: fall through and rewrite.
    }
  }
  fs.writeFileSync(filePath, jsonText, 'utf8');
  return { wrote: true, path: filePath };
}

function ensureEvolutionLink(resultsDir, runId, reportFile) {
  const evoPath = path.join(resultsDir, 'BENCHMARK_EVOLUTION.md');
  const row = `- [${runId}](./${reportFile})`;
  if (!fs.existsSync(evoPath)) {
    fs.writeFileSync(evoPath, `# Harness Benchmark Evolution Report\n\n${COMPARISON_SECTION}\n\n${row}\n`, 'utf8');
    return { created: true, path: evoPath };
  }
  const existing = fs.readFileSync(evoPath, 'utf8');
  if (existing.includes(row)) return { created: false, path: evoPath, unchanged: true };
  const eol = existing.includes('\r\n') ? '\r\n' : '\n';
  const norm = existing.replace(/\r\n/g, '\n');
  if (norm.includes(COMPARISON_SECTION)) {
    const lines = norm.split('\n');
    const headIdx = lines.findIndex((line) => line.includes(COMPARISON_SECTION));
    let insertAt = headIdx + 1;
    while (insertAt < lines.length && (lines[insertAt].trim() === '' || lines[insertAt].startsWith('- ['))) insertAt += 1;
    lines.splice(insertAt, 0, row);
    fs.writeFileSync(evoPath, `${lines.join(eol).replace(/(\r?\n)*$/, '')}${eol}`, 'utf8');
    return { created: false, path: evoPath };
  }
  const fresh = `${norm.replace(/\s*$/, '')}\n\n${COMPARISON_SECTION}\n\n${row}\n`.replace(/\n/g, eol);
  fs.writeFileSync(evoPath, fresh, 'utf8');
  return { created: false, path: evoPath };
}

function publishComparison({ runDir, resultsDir, repoRoot }) {
  const resolvedRoot = path.resolve(repoRoot);
  const resolvedRun = path.resolve(runDir);
  const rel = path.relative(resolvedRoot, resolvedRun);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`refusing --run outside the repo root (${resolvedRoot}): path containment`);
  }
  const prdPath = path.join(resolvedRun, 'prd.md');
  if (!fs.existsSync(prdPath)) throw new Error(`frozen PRD missing: ${prdPath}`);
  const prdBytes = fs.readFileSync(prdPath);
  const prdHash = sha256Hex(prdBytes);
  const { data: judge, bytes: judgeBytes } = readJson(path.join(resolvedRun, 'judge.json'), 'judge definition');
  const judgeHash = sha256Hex(judgeBytes);
  const { data: manifest } = readJson(path.join(resolvedRun, 'run-manifest.json'), 'run manifest');
  if (!manifest.runId) throw new Error('run manifest is missing runId');
  assertSafeRunId(manifest.runId);
  if (manifest.prdSha256 !== prdHash) {
    throw new Error(`PRD drift: manifest prdSha256 ${manifest.prdSha256} does not match frozen bytes ${prdHash}`);
  }
  if (manifest.judgeSha256 !== judgeHash) {
    throw new Error('judge definition changed after scoring; re-score all samples under the new definition and update judgeSha256');
  }
  const checkIds = (judge.checks || []).map((check) => check.id);
  if (!checkIds.length) throw new Error('judge definition declares no checks');
  if (new Set(checkIds).size !== checkIds.length) throw new Error('judge definition declares duplicate check ids');
  const columns = Array.isArray(manifest.columns) ? manifest.columns : [];
  if (!columns.length) throw new Error('run declares no scored columns');
  const harnessNames = columns.map((column) => column.harness);
  if (new Set(harnessNames).size !== harnessNames.length) {
    throw new Error('run declares duplicate harness names; one scored column per harness');
  }
  columns.forEach((column) => {
    (Array.isArray(column.samples) ? column.samples : []).forEach((sample, idx) => {
      const sampleFile = path.join(resolvedRun, 'samples', String(column.harness), `sample-${idx + 1}.json`);
      if (fs.existsSync(sampleFile)) {
        const onDisk = JSON.parse(fs.readFileSync(sampleFile, 'utf8'));
        if (!stableDeepEqual(onDisk, sample)) {
          throw new Error(`column ${column.harness}: manifest sample ${idx + 1} diverges from ${path.relative(resolvedRoot, sampleFile)}`);
        }
      }
    });
  });
  const exceptions = Array.isArray(manifest.protocolExceptions) ? manifest.protocolExceptions : [];
  for (const item of exceptions) {
    if (!columns.some((col) => col.harness === item.harness)) {
      throw new Error(`protocolExceptions entry names unknown harness ${item.harness}`);
    }
  }
  const scored = columns.map((column) => validateColumn(column, checkIds, exceptions));
  const reportFile = `comparison-${manifest.runId}.md`;
  const jsonFile = `comparison-${manifest.runId}.json`;
  fs.mkdirSync(resultsDir, { recursive: true });
  const runRel = (path.relative(resolvedRoot, resolvedRun) || '.').replace(/\\/g, '/');
  const markdown = renderReport({ manifest, judge, scored, prdHash, judgeHash, runDir: runRel });
  const mdWrite = writeComparisonFile(path.join(resultsDir, reportFile), markdown);
  const payload = {
    runId: manifest.runId,
    prdSha256: prdHash,
    judgeSha256: judgeHash,
    judge,
    columns: scored.map((col) => ({
      harness: col.harness,
      version: col.version,
      settings: col.settings,
      models: col.models,
      samples: col.samples,
      perSample: col.perSample,
      aggregate: col.aggregate,
    })),
    protocolExceptions: exceptions,
    pendingComparators: Array.isArray(manifest.pendingComparators) ? manifest.pendingComparators : [],
    publishedAt: new Date().toISOString(),
  };
  const jsonText = `${JSON.stringify(payload, null, 2)}\n`;
  const jsonWrite = writeJsonTwin(path.join(resultsDir, jsonFile), payload, jsonText);
  const evo = ensureEvolutionLink(resultsDir, manifest.runId, reportFile);
  return {
    runId: manifest.runId,
    reportPath: path.join(resultsDir, reportFile),
    jsonPath: path.join(resultsDir, jsonFile),
    wroteReport: mdWrite.wrote,
    wroteJson: jsonWrite.wrote,
    evolution: evo,
    fingerprint: comparisonFingerprint(markdown),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (!options.run) throw new Error('--run <runDir> is required (see --help)');
  const repoRoot = options.repoRoot ? path.resolve(options.repoRoot) : findPackageRoot(process.cwd());
  if (!repoRoot) {
    throw new Error('cwd is not the workflow-skills package root (scripts/harness-benchmark/cli.cjs missing)');
  }
  const resultsDir = options.resultsDir ? path.resolve(options.resultsDir) : path.join(repoRoot, 'benchmarks', 'results');
  const result = publishComparison({ runDir: options.run, resultsDir, repoRoot });
  if (!result.wroteReport && !result.wroteJson) {
    process.stdout.write(`comparison ${result.runId}: unchanged; skipped rewrite\n`);
    return;
  }
  process.stdout.write(`comparison ${result.runId}: published\n`);
  process.stdout.write(`  - ${path.relative(repoRoot, result.reportPath)}\n`);
  process.stdout.write(`  - ${path.relative(repoRoot, result.jsonPath)}\n`);
}

module.exports = { publishComparison, ensureEvolutionLink, COMPARISON_SECTION, MIN_SAMPLES };

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exitCode = 1;
  }
}
