'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  resolvePaths,
  listFixtureIds,
  fixtureDir,
  loadOracle,
  loadPackageVersion,
  gitSha,
  makeRunId,
  runOutputDir,
} = require('./paths.cjs');
const {
  buildReport,
  writeReports,
  runMeasureHarness,
  scoreEfficiency,
  countSpecAcs,
} = require('./report-builder.cjs');

function validateFixtureSpec(validateSpecScript, specPath) {
  const result = spawnSync(process.execPath, [validateSpecScript, specPath, '--mode=authoring'], {
    encoding: 'utf8',
  });
  return result.status === 0;
}

function staticCompleteness(specPath, oracle) {
  const specAcs = countSpecAcs(specPath);
  const oracleAcs = (oracle.acIds || []).map(String);
  if (!oracleAcs.length) return 0;
  const matched = oracleAcs.filter((id) => specAcs.includes(id)).length;
  const ratio = matched / oracleAcs.length;
  const score = Math.round(ratio * 10);
  if (oracle.expectCompletenessMax != null && score > oracle.expectCompletenessMax) {
    return oracle.expectCompletenessMax;
  }
  return score;
}

function buildPerAcStatic(specPath, oracle) {
  const specAcs = new Set(countSpecAcs(specPath));
  return (oracle.acIds || []).map((id) => ({
    id: String(id),
    score: specAcs.has(String(id)) ? 10 : 0,
    evidence: specAcs.has(String(id)) ? 'spec AC present' : 'EXPLICIT ZERO',
  }));
}

function runStaticFixture(paths, fixtureId, runId) {
  const oracle = loadOracle(paths.fixturesRoot, fixtureId);
  const specPath = path.join(fixtureDir(paths.fixturesRoot, fixtureId), 'spec.md');
  if (!fs.existsSync(specPath)) throw new Error(`spec.md missing for ${fixtureId}`);

  const specValid = validateFixtureSpec(paths.validateSpecScript, specPath);
  const measure = runMeasureHarness(paths.measureHarnessScript, paths.repoRoot, oracle.orch || 'lite');
  const efficiency = scoreEfficiency(measure, oracle);
  const completeness = specValid ? staticCompleteness(specPath, oracle) : 0;

  const dimensions = {
    completeness,
    verifyScore: null,
    judge: null,
    discrimination: null,
    efficiency,
    time: null,
    honesty: null,
  };

  const report = buildReport({
    meta: {
      packageVersion: loadPackageVersion(paths.packageJsonPath),
      gitSha: gitSha(paths.repoRoot),
      fixtureId,
      mode: 'static',
      orch: oracle.orch || 'lite',
      dryRun: true,
      timestamp: new Date().toISOString(),
    },
    dimensions,
    perAc: buildPerAcStatic(specPath, oracle),
    sensor: {
      required: false,
      injected: 0,
      killed: 0,
      porcelainOk: true,
      verdict: 'SKIP',
    },
    diffRange: { fromSha: gitSha(paths.repoRoot), toSha: gitSha(paths.repoRoot) },
    verdict: specValid && efficiency >= 0 ? 'PASS' : 'FAIL',
  });

  const outputDir = runOutputDir(paths.runsRoot, `${runId}-${fixtureId}`);
  writeReports(report, outputDir, paths.schemaPath);
  return { report, outputDir, measure };
}

function runStatic(options = {}) {
  const paths = resolvePaths(options);
  const fixtureIds = options.fixture
    ? [options.fixture]
    : listFixtureIds(paths.fixturesRoot);
  if (!fixtureIds.length) throw new Error('no fixtures found');

  const runId = options.runId || makeRunId('static');
  const results = [];
  for (const fixtureId of fixtureIds) {
    results.push(runStaticFixture(paths, fixtureId, runId));
  }
  return { runId, results, paths };
}

module.exports = { runStatic, runStaticFixture, staticCompleteness, validateFixtureSpec };
