'use strict';

const fs = require('fs');
const path = require('path');
const { resolveConsumerContext, resolveConfiguredPath } = require('../../../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs');

const INDEX_WEIGHTS = {
  completeness: 20,
  verifyScore: 20,
  judge: 15,
  discrimination: 15,
  efficiency: 15,
  time: 10,
  honesty: 5,
};

function resolvePaths(options = {}) {
  const context = resolveConsumerContext({
    repoRoot: options.repoRoot,
    scriptFile: __filename,
  });
  const repoRoot = context.repoRoot;
  const benchmarksRoot = path.join(repoRoot, 'benchmarks');
  const fixturesRoot = path.join(benchmarksRoot, 'fixtures');
  const schemaPath = path.join(benchmarksRoot, 'schema', 'report.schema.json');
  const baselinesRoot = path.join(benchmarksRoot, 'baselines');
  const runsRoot = path.join(benchmarksRoot, 'runs');
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const measureHarnessScript = path.join(repoRoot, '.agents/skills/ws-check-harness/scripts/measure_harness.cjs');
  const validateSpecScript = path.join(repoRoot, '.agents/skills/ws-spec-format/scripts/validate_spec.cjs');
  const validateSchemaScript = path.join(repoRoot, '.agents/skills/ws-shared/scripts/validate_json_schema.cjs');
  const acLedgerScript = path.join(repoRoot, '.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
  const runSabotageScript = path.join(repoRoot, '.agents/skills/ws-testing/scripts/run_sabotage.py');
  const cliScript = path.join(repoRoot, 'scripts/harness-benchmark/cli.cjs');
  const templateRoot = path.join(fixturesRoot, '_template', 'mini-app');

  return {
    context,
    repoRoot,
    benchmarksRoot,
    fixturesRoot,
    schemaPath,
    baselinesRoot,
    runsRoot,
    packageJsonPath,
    measureHarnessScript,
    validateSpecScript,
    validateSchemaScript,
    acLedgerScript,
    runSabotageScript,
    cliScript,
    templateRoot,
    plansDir: resolveConfiguredPath(repoRoot, context.config?.plans?.dir, '.agents/plans'),
    specsDir: resolveConfiguredPath(repoRoot, context.config?.plans?.specsDir, '.agents/specs'),
  };
}

function listFixtureIds(fixturesRoot) {
  if (!fs.existsSync(fixturesRoot)) return [];
  return fs.readdirSync(fixturesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== '_template')
    .map((entry) => entry.name)
    .sort();
}

function fixtureDir(fixturesRoot, fixtureId) {
  return path.join(fixturesRoot, fixtureId);
}

function loadOracle(fixturesRoot, fixtureId) {
  const file = path.join(fixtureDir(fixturesRoot, fixtureId), 'oracle.json');
  if (!fs.existsSync(file)) throw new Error(`oracle.json missing for fixture ${fixtureId}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadPackageVersion(packageJsonPath) {
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
}

function gitSha(repoRoot) {
  const { spawnSync } = require('child_process');
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) return '0000000';
  return result.stdout.trim();
}

function makeRunId(prefix = 'run') {
  return `${prefix}-${new Date().toISOString().replace(/[:.]/g, '').replace('Z', 'Z')}`;
}

function runOutputDir(runsRoot, runId) {
  const dir = path.join(runsRoot, runId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

module.exports = {
  INDEX_WEIGHTS,
  resolvePaths,
  listFixtureIds,
  fixtureDir,
  loadOracle,
  loadPackageVersion,
  gitSha,
  makeRunId,
  runOutputDir,
};
