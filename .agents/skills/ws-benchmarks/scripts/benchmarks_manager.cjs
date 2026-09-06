#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function hasCli(dir) {
  return fs.existsSync(path.join(dir, 'scripts', 'harness-benchmark', 'cli.cjs'));
}

function findPackageRoot(start = process.cwd()) {
  let dir = path.resolve(start);
  for (;;) {
    if (hasCli(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function parseArgs(argv) {
  const options = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
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

function formatWallSec(sec) {
  if (sec == null || !Number.isFinite(Number(sec))) return 'n/a';
  const s = Math.round(Number(sec));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${s}s (${mins}m ${rem}s)`;
}

function formatTokens(tokens) {
  if (tokens == null || !Number.isFinite(Number(tokens))) return 'n/a';
  return Number(tokens).toLocaleString('en-US');
}

function versionKey(version) {
  return String(version || '0.0.0')
    .split(/[.+-]/)
    .map((part) => {
      const n = Number(part);
      return Number.isFinite(n) ? String(n).padStart(8, '0') : part;
    })
    .join('.');
}

function extractModelString(meta = {}) {
  if (!meta) return 'n/a';
  if (meta.models && typeof meta.models === 'object') {
    if (meta.models.currentModel) return meta.models.currentModel;
    if (meta.models.modelsPreset) return `preset:${meta.models.modelsPreset}`;
    const values = Object.values(meta.models).filter(Boolean);
    if (values.length) return values.join(', ');
  }
  if (meta.model) return String(meta.model);
  return 'n/a';
}

function extractTokenCount(report = {}) {
  const meta = report.meta || {};
  if (meta.tokens && typeof meta.tokens === 'object') {
    if (meta.tokens.total != null) return Number(meta.tokens.total);
  }
  if (meta.telemetry && typeof meta.telemetry === 'object') {
    if (meta.telemetry.totalTokens != null) return Number(meta.telemetry.totalTokens);
  }
  return null;
}

function loadReportSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`WARN: failed to parse ${filePath}: ${err.message}\n`);
    return null;
  }
}

function listBaselines(baselinesRoot) {
  if (!fs.existsSync(baselinesRoot)) return [];
  const entries = fs.readdirSync(baselinesRoot)
    .filter((n) => n.endsWith('.json') && n !== '.gitkeep')
    .sort();
  const rows = [];
  for (const name of entries) {
    const full = path.join(baselinesRoot, name);
    const report = loadReportSafe(full);
    if (!report) continue;
    const meta = report.meta || {};
    const dims = report.dimensions || {};
    const wallSec = meta.wallSec != null ? Number(meta.wallSec) : null;
    const tokens = extractTokenCount(report);
    rows.push({
      file: name,
      kind: 'baseline',
      fixtureId: report.fixtureId || meta.fixtureId || '',
      packageVersion: meta.packageVersion || '',
      gitSha: (meta.gitSha || '').slice(0, 7),
      mode: meta.mode || 'static',
      orch: meta.orch || '',
      timestamp: meta.timestamp || '',
      wallSec,
      wallFormatted: formatWallSec(wallSec),
      tokens,
      tokensFormatted: formatTokens(tokens),
      model: extractModelString(meta),
      index: report.index?.value ?? null,
      dimensions: {
        completeness: dims.completeness ?? null,
        verifyScore: dims.verifyScore ?? null,
        judge: dims.judge ?? null,
        discrimination: dims.discrimination ?? null,
        efficiency: dims.efficiency ?? null,
        time: dims.time ?? null,
        honesty: dims.honesty ?? null,
      },
      verdict: report.verdict || 'PASS',
    });
  }
  return rows;
}

function listRecentRuns(runsRoot, limit = 20) {
  if (!fs.existsSync(runsRoot)) return [];
  const dirs = fs.readdirSync(runsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
    .reverse()
    .slice(0, limit);
  const rows = [];
  for (const dirName of dirs) {
    const reportPath = path.join(runsRoot, dirName, 'report.json');
    if (!fs.existsSync(reportPath)) continue;
    const report = loadReportSafe(reportPath);
    if (!report) continue;
    const meta = report.meta || {};
    const dims = report.dimensions || {};
    const wallSec = meta.wallSec != null ? Number(meta.wallSec) : null;
    const tokens = extractTokenCount(report);
    rows.push({
      file: dirName,
      kind: 'run',
      fixtureId: report.fixtureId || meta.fixtureId || '',
      packageVersion: meta.packageVersion || '',
      gitSha: (meta.gitSha || '').slice(0, 7),
      mode: meta.mode || 'static',
      orch: meta.orch || '',
      timestamp: meta.timestamp || '',
      wallSec,
      wallFormatted: formatWallSec(wallSec),
      tokens,
      tokensFormatted: formatTokens(tokens),
      model: extractModelString(meta),
      index: report.index?.value ?? null,
      dimensions: {
        completeness: dims.completeness ?? null,
        verifyScore: dims.verifyScore ?? null,
        judge: dims.judge ?? null,
        discrimination: dims.discrimination ?? null,
        efficiency: dims.efficiency ?? null,
        time: dims.time ?? null,
        honesty: dims.honesty ?? null,
      },
      verdict: report.verdict || 'PASS',
    });
  }
  return rows;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const va = versionKey(a.packageVersion);
    const vb = versionKey(b.packageVersion);
    if (va !== vb) return va.localeCompare(vb);
    return String(a.timestamp).localeCompare(String(b.timestamp));
  });
}

function cell(val) {
  if (val === null || val === undefined || val === '') return 'n/a';
  return String(val);
}

function renderEvolutionMarkdown(rows, options = {}) {
  const sorted = sortRows(rows);
  const distinctVersions = [...new Set(sorted.map((r) => r.packageVersion).filter(Boolean))];
  const totalSnapshots = sorted.length;
  const passCount = sorted.filter((r) => r.verdict === 'PASS').length;
  const failCount = sorted.filter((r) => r.verdict === 'FAIL').length;
  const generatedAt = new Date().toISOString();

  const lines = [
    '# Harness Benchmark Evolution Report',
    '',
    `**Generated:** ${generatedAt}  `,
    `**Scope:** ${totalSnapshots} snapshots across versions: ${distinctVersions.join(', ')}  `,
    `**Status:** ${passCount} PASS / ${failCount} FAIL`,
    '',
    '## 1. Version-over-Version Evolution Table',
    '',
    '| Version | Commit | Fixture | Mode | Orch | Score | Verify | Exec Time | Tokens | Model | Verdict |',
    '|---|---|---|---|---|---:|---:|---:|---:|---|:---:|',
  ];

  for (const r of sorted) {
    const verifyScore = r.dimensions.verifyScore != null ? r.dimensions.verifyScore : 'n/a';
    lines.push(
      `| ${cell(r.packageVersion)} | \`${cell(r.gitSha)}\` | ${cell(r.fixtureId)} | ${cell(r.mode)} | ${cell(r.orch)} | **${cell(r.index)}** | ${verifyScore} | ${cell(r.wallFormatted)} | ${cell(r.tokensFormatted)} | ${cell(r.model)} | ${r.verdict === 'PASS' ? '✅ PASS' : '❌ FAIL'} |`,
    );
  }

  lines.push(
    '',
    '## 2. Multi-Dimensional Quality Breakdown',
    '',
    '| Version | Fixture | Complete | Verify | Judge | Disc | Eff | Time | Honest | Index |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  );

  for (const r of sorted) {
    const d = r.dimensions;
    lines.push(
      `| ${cell(r.packageVersion)} | ${cell(r.fixtureId)} | ${cell(d.completeness)} | ${cell(d.verifyScore)} | ${cell(d.judge)} | ${cell(d.discrimination)} | ${cell(d.efficiency)} | ${cell(d.time)} | ${cell(d.honesty)} | **${cell(r.index)}** |`,
    );
  }

  lines.push(
    '',
    '## 3. Metrics Legend & Notes',
    '',
    '- **Score (Index)**: Overall weighted score (0–100) calculated from completeness, verifyScore, judge checks, sensor discrimination, efficiency, time, and honesty.',
    '- **Exec Time**: Wall clock duration (`wallSec`). Live runs record total workflow elapsed seconds; static runs are zero-cost static verifications.',
    '- **Tokens**: Prompt + completion tokens logged via workflow state telemetry.',
    '- **Model**: Presets or underlying model identifiers configured during run execution.',
    '- **Fixtures**:',
    '  - `fx-node-helper`: Fast lite fixture with sensor test.',
    '  - `fx-config-merge`: Mid-high standard orchestrator fixture with 10 ACs.',
    '  - `fx-lite-readme`: Fast lite single-file documentation fixture.',
    '  - `fx-incomplete`: Negative test case ensuring incomplete runs cannot achieve full score.',
    '',
  );

  return lines.join('\n');
}

function updateComparisonFiles(repoRoot, options = {}) {
  const baselinesRoot = path.join(repoRoot, 'benchmarks', 'baselines');
  const resultsRoot = path.join(repoRoot, 'benchmarks', 'results');
  fs.mkdirSync(resultsRoot, { recursive: true });

  const baselines = listBaselines(baselinesRoot);
  const markdown = renderEvolutionMarkdown(baselines, options);
  const evolutionFile = path.join(resultsRoot, 'BENCHMARK_EVOLUTION.md');
  fs.writeFileSync(evolutionFile, markdown, 'utf8');

  // Also write per-version table if requested
  const byVersion = {};
  for (const row of baselines) {
    const v = row.packageVersion || 'unversioned';
    if (!byVersion[v]) byVersion[v] = [];
    byVersion[v].push(row);
  }

  const generatedFiles = [evolutionFile];
  for (const [v, rows] of Object.entries(byVersion)) {
    const vMd = renderEvolutionMarkdown(rows, { version: v });
    const vFile = path.join(resultsRoot, `table-${v}.md`);
    fs.writeFileSync(vFile, vMd, 'utf8');
    generatedFiles.push(vFile);
  }

  return {
    evolutionFile,
    generatedFiles,
    snapshotCount: baselines.length,
    versions: Object.keys(byVersion),
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = findPackageRoot(options.repoRoot || process.cwd());

  if (!repoRoot) {
    process.stderr.write('ERROR: cwd is not the workflow-skills package root (scripts/harness-benchmark/cli.cjs missing)\n');
    process.exitCode = 1;
    return;
  }

  const baselinesRoot = path.join(repoRoot, 'benchmarks', 'baselines');
  const runsRoot = path.join(repoRoot, 'benchmarks', 'runs');

  if (options.check) {
    const baselines = listBaselines(baselinesRoot);
    const runs = listRecentRuns(runsRoot, 5);
    process.stdout.write(`${JSON.stringify({
      ok: true,
      repoRoot,
      baselineCount: baselines.length,
      recentRunCount: runs.length,
      cliScript: path.join(repoRoot, 'scripts', 'harness-benchmark', 'cli.cjs'),
    }, null, 2)}\n`);
    return;
  }

  if (options.list) {
    const baselines = listBaselines(baselinesRoot);
    const runs = options.includeRuns ? listRecentRuns(runsRoot) : [];
    const combined = sortRows([...baselines, ...runs]);
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ baselines, runs }, null, 2)}\n`);
    } else {
      process.stdout.write(renderEvolutionMarkdown(combined));
    }
    return;
  }

  if (options.evolution || options.table) {
    const baselines = listBaselines(baselinesRoot);
    const md = renderEvolutionMarkdown(baselines, options);
    process.stdout.write(md);
    return;
  }

  if (options.updateComparison) {
    const res = updateComparisonFiles(repoRoot, options);
    process.stdout.write(`Updated benchmark comparison files (${res.snapshotCount} snapshots across versions: ${res.versions.join(', ')}):\n`);
    for (const f of res.generatedFiles) {
      process.stdout.write(`  - ${path.relative(repoRoot, f)}\n`);
    }
    return;
  }

  if (options.snapshot) {
    const cliScript = path.join(repoRoot, 'scripts', 'harness-benchmark', 'cli.cjs');
    const args = ['snapshot'];
    if (options.run) args.push('--run', options.run);
    if (options.from) args.push('--from', options.from);
    if (options.name) args.push('--name', options.name);
    const result = spawnSync(process.execPath, [cliScript, ...args], { cwd: repoRoot, stdio: 'inherit' });
    process.exitCode = result.status ?? 0;
    return;
  }

  if (options.compare) {
    const cliScript = path.join(repoRoot, 'scripts', 'harness-benchmark', 'cli.cjs');
    const args = ['compare'];
    if (options.from) args.push('--from', options.from);
    if (options.to) args.push('--to', options.to);
    if (options.failIf) args.push('--fail-if', options.failIf);
    if (options.allowRegression) args.push('--allow-regression');
    const result = spawnSync(process.execPath, [cliScript, ...args], { cwd: repoRoot, stdio: 'inherit' });
    process.exitCode = result.status ?? 0;
    return;
  }

  // Default: show summary and menu guide
  const baselines = listBaselines(baselinesRoot);
  const runs = listRecentRuns(runsRoot, 3);
  process.stdout.write([
    'Benchmark Manager (ws-benchmarks)',
    `Repo root: ${repoRoot}`,
    `Baselines: ${baselines.length}`,
    `Recent runs: ${runs.length}`,
    '',
    'Usage:',
    '  node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --evolution',
    '  node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --update-comparison',
    '  node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --check',
    '  node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --list [--include-runs] [--json]',
    '  node .agents/skills/ws-benchmarks/scripts/benchmarks_manager.cjs --compare --from <base> --to <target>',
    '',
  ].join('\n'));
}

module.exports = {
  findPackageRoot,
  listBaselines,
  listRecentRuns,
  renderEvolutionMarkdown,
  updateComparisonFiles,
  formatWallSec,
  formatTokens,
  versionKey,
};

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`ERROR: ${err.message}\n`);
    process.exitCode = 1;
  }
}
