'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePaths, loadOracle } = require('./paths.cjs');
const { loadReport } = require('./snapshot.cjs');

const REGRESSION_INDEX_DROP = 5;
const REGRESSION_VERIFY_DROP = 1;

function resolveReportPath(paths, target) {
  const resolved = path.resolve(target);
  if (fs.existsSync(resolved) && resolved.endsWith('.json')) return resolved;
  const baseline = path.join(paths.baselinesRoot, `${target}.json`);
  if (fs.existsSync(baseline)) return baseline;
  const runReport = path.join(paths.runsRoot, target, 'report.json');
  if (fs.existsSync(runReport)) return runReport;
  throw new Error(`cannot resolve report path: ${target}`);
}

function dimensionDeltas(from, to) {
  const lines = [];
  const keys = Object.keys(from.dimensions || {});
  for (const key of keys) {
    const a = from.dimensions[key];
    const b = to.dimensions[key];
    if (a === null && b === null) continue;
    const delta = (b ?? 0) - (a ?? 0);
    lines.push(`${key.padEnd(16)} ${String(a ?? 'n/a').padStart(4)} → ${String(b ?? 'n/a').padStart(4)} (${delta >= 0 ? '+' : ''}${delta})`);
  }
  return lines;
}

function checkFailIf(oracle, toReport) {
  const rules = oracle.failIf || [];
  const failures = [];
  for (const rule of rules) {
    if (rule.dimension && toReport.dimensions[rule.dimension] != null) {
      if (rule.max != null && toReport.dimensions[rule.dimension] > rule.max) {
        failures.push(`${rule.dimension} ${toReport.dimensions[rule.dimension]} > max ${rule.max}`);
      }
      if (rule.min != null && toReport.dimensions[rule.dimension] < rule.min) {
        failures.push(`${rule.dimension} ${toReport.dimensions[rule.dimension]} < min ${rule.min}`);
      }
    }
    if (rule.indexMax != null && toReport.index.value > rule.indexMax) {
      failures.push(`index ${toReport.index.value} > max ${rule.indexMax}`);
    }
    if (rule.expectCompletenessMax != null && toReport.dimensions.completeness > rule.expectCompletenessMax) {
      failures.push(`completeness ${toReport.dimensions.completeness} > expectCompletenessMax ${rule.expectCompletenessMax}`);
    }
  }
  return failures;
}

function checkRegression(from, to, allowRegression) {
  if (allowRegression) return [];
  const failures = [];
  const indexDrop = (from.index?.value ?? 0) - (to.index?.value ?? 0);
  if (indexDrop > REGRESSION_INDEX_DROP) {
    failures.push(`index dropped ${indexDrop} points (threshold ${REGRESSION_INDEX_DROP})`);
  }
  const fromVerify = from.dimensions?.verifyScore;
  const toVerify = to.dimensions?.verifyScore;
  if (fromVerify != null && toVerify != null) {
    const verifyDrop = fromVerify - toVerify;
    if (verifyDrop > REGRESSION_VERIFY_DROP) {
      failures.push(`verifyScore dropped ${verifyDrop} (threshold ${REGRESSION_VERIFY_DROP})`);
    }
  }
  return failures;
}

function writeLessonsTrap(sharedDir, summary) {
  const memoryDir = path.join(sharedDir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const file = path.join(memoryDir, `${date}-harness-benchmark-regression.md`);
  const body = [
    `### [${date}] Harness benchmark regression`,
    '- **Layer**: harness',
    '- **Module**: harness-benchmark / compare',
    '- **Severity**: High',
    '- **PathPattern**: scripts/harness-benchmark/**',
    `- **Scenario / Context**: compare detected regression: ${summary}`,
    '- **DO NOT**: Ship harness refactors without re-running benchmark compare against the named baseline.',
    '- **INSTEAD DO**: Run `npm run benchmark:static` and live collect; use `compare --from <baseline>` before merge.',
    '',
  ].join('\n');
  fs.writeFileSync(file, body, 'utf8');
  const compileScript = path.join(sharedDir, '..', 'ws-self-learning', 'scripts', 'self_learning.cjs');
  if (fs.existsSync(compileScript)) {
    require('child_process').spawnSync(process.execPath, [compileScript, '--compile', '--repo-root', path.dirname(sharedDir)], {
      encoding: 'utf8',
    });
  }
  return file;
}

function compareReports(options = {}) {
  const paths = resolvePaths(options);
  if (!options.from || !options.to) throw new Error('compare requires --from and --to');

  const fromReport = loadReport(resolveReportPath(paths, options.from));
  const toReport = loadReport(resolveReportPath(paths, options.to));
  const deltas = dimensionDeltas(fromReport, toReport);

  process.stdout.write([
    'Harness benchmark compare',
    `from: ${options.from}`,
    `to: ${options.to}`,
    '',
    'Dimension deltas:',
    ...deltas,
    '',
    `Index: ${fromReport.index?.value ?? 'n/a'} → ${toReport.index?.value ?? 'n/a'}`,
    '',
  ].join('\n'));

  let oracle = {};
  try {
    if (toReport.meta?.fixtureId) {
      oracle = loadOracle(paths.fixturesRoot, toReport.meta.fixtureId);
    }
  } catch {
    oracle = {};
  }

  if (options.failIf) {
    const extra = JSON.parse(fs.readFileSync(path.resolve(options.failIf), 'utf8'));
    oracle = { ...oracle, failIf: [...(oracle.failIf || []), ...(extra.failIf || [])] };
  }

  const failures = [
    ...checkFailIf(oracle, toReport),
    ...checkRegression(fromReport, toReport, options.allowRegression),
  ];

  if (failures.length) {
    process.stderr.write(`${failures.map((f) => `REGRESSION: ${f}`).join('\n')}\n`);
    if (options.recordLessons) {
      const trap = writeLessonsTrap(paths.context.sharedDir, failures.join('; '));
      process.stderr.write(`recorded lesson: ${trap}\n`);
    }
    return { ok: false, failures, deltas };
  }

  return { ok: true, failures: [], deltas };
}

module.exports = {
  compareReports,
  dimensionDeltas,
  checkFailIf,
  checkRegression,
  REGRESSION_INDEX_DROP,
  REGRESSION_VERIFY_DROP,
};
