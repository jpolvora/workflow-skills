'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { resolveConsumerContext } = require('../../../.agents/skills/ws-shared/scripts/resolve_consumer_root.cjs');
const { scoreLedger } = require('../../../.agents/skills/ws-spec-to-pr/scripts/ac_ledger.cjs');
const {
  resolvePaths,
  loadOracle,
  loadPackageVersion,
  gitSha,
  makeRunId,
  runOutputDir,
} = require('./paths.cjs');
const { buildReport, writeReports } = require('./report-builder.cjs');
const { runJudgeChecks } = require('./judge-checks.cjs');
const { runSensor } = require('./sensor.cjs');

function parseMarkdownScore(sandboxRoot, slug) {
  const plansDir = path.join(sandboxRoot, '.agents/plans', slug);
  if (!fs.existsSync(plansDir)) return null;
  for (const file of fs.readdirSync(plansDir)) {
    if (/\.state\.md$/.test(file)) {
      const text = fs.readFileSync(path.join(plansDir, file), 'utf8');
      const match = text.match(/verifyScore[:\s]+(\d+)/i) || text.match(/score[:\s]+(\d+)\s*\/\s*10/i);
      if (match) return Number(match[1]);
    }
  }
  return null;
}

function verifyScoreFromLedger(sandboxRoot, ledgerPath, acLedgerScript) {
  const result = spawnSync(process.execPath, [
    acLedgerScript,
    'verify',
    '--ledger', ledgerPath,
    '--boundary', 'step5',
    '--repo-root', sandboxRoot,
  ], { cwd: sandboxRoot, encoding: 'utf8' });
  const parsed = JSON.parse((result.stdout || '{}').trim().split(/\n(?=\{)/).at(-1) || '{}');
  return { score: parsed.score, errors: parsed.errors || [], exitCode: result.status };
}

function completenessFromLedger(sandboxRoot, ledger, oracle) {
  const diffResult = spawnSync('git', ['diff', 'HEAD'], { cwd: sandboxRoot, encoding: 'utf8' });
  const diffText = diffResult.stdout || '';
  const oracleAcs = (oracle.acIds || []).map(String);
  const perAc = [];
  let earned = 0;

  for (const acId of oracleAcs) {
    const row = (ledger.acceptanceCriteria || []).find((item) => item.id === acId);
    let score = 0;
    let evidence = 'EXPLICIT ZERO';
    if (row) {
      const hasFileEvidence = (row.files || []).some((file) => {
        const inLedger = file.path && file.lineStart;
        const inDiff = diffText.includes(file.path);
        return inLedger && inDiff;
      });
      if (hasFileEvidence) {
        score = 10;
        evidence = (row.files || []).map((f) => `${f.path}:${f.lineStart}-${f.lineEnd}`).join(', ');
        earned += 1;
      }
    }
    perAc.push({ id: acId, score, evidence });
  }

  const ratio = oracleAcs.length ? earned / oracleAcs.length : 0;
  let completeness = Math.round(ratio * 10);
  if (oracle.expectCompletenessMax != null && completeness > oracle.expectCompletenessMax) {
    completeness = oracle.expectCompletenessMax;
  }
  return { completeness, perAc };
}

function collectRun(options = {}) {
  const paths = resolvePaths(options);
  if (!options.sandbox) throw new Error('collect requires --sandbox <path>');
  const sandboxRoot = path.resolve(options.sandbox);
  const fixtureId = options.fixture;
  if (!fixtureId) throw new Error('collect requires --fixture <id>');

  const oracle = { ...loadOracle(paths.fixturesRoot, fixtureId), fixtureId };
  const slug = oracle.slug || fixtureId.replace(/^fx-/, '');
  const planIndexPath = path.join(sandboxRoot, '.agents/plans', slug, 'plan.index.json');
  const ledgerPath = path.join(sandboxRoot, '.agents/plans', slug, 'ac-ledger.json');

  if (!fs.existsSync(planIndexPath)) throw new Error(`traceability gate: missing ${planIndexPath}`);
  if (!fs.existsSync(ledgerPath)) throw new Error(`traceability gate: missing ${ledgerPath}`);

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const narrativeScore = parseMarkdownScore(sandboxRoot, slug);
  const verifyResult = verifyScoreFromLedger(sandboxRoot, path.relative(sandboxRoot, ledgerPath), paths.acLedgerScript);

  if (narrativeScore != null && narrativeScore !== verifyResult.score) {
    process.stderr.write(`ignoring narrative score ${narrativeScore}; using ledger verify ${verifyResult.score}\n`);
  }

  const { completeness, perAc } = completenessFromLedger(sandboxRoot, ledger, oracle);
  const judge = runJudgeChecks(sandboxRoot, ledgerPath);
  const sensor = runSensor(sandboxRoot, oracle, paths);

  const fromSha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: sandboxRoot, encoding: 'utf8' }).stdout?.trim() || '';
  const context = resolveConsumerContext({ repoRoot: sandboxRoot });
  const models = {};
  if (context.config?.defaults?.currentModel) models.currentModel = context.config.defaults.currentModel;
  if (context.config?.defaults?.modelsPreset) models.modelsPreset = context.config.defaults.modelsPreset;

  const dimensions = {
    completeness,
    verifyScore: verifyResult.score,
    judge: judge.judge,
    discrimination: sensor.discrimination,
    efficiency: null,
    time: null,
    honesty: judge.honesty,
  };

  const report = buildReport({
    meta: {
      packageVersion: loadPackageVersion(paths.packageJsonPath),
      gitSha: gitSha(paths.repoRoot),
      fixtureId,
      mode: 'live',
      orch: oracle.orch || 'lite',
      dryRun: true,
      timestamp: new Date().toISOString(),
      ...(Object.keys(models).length ? { models } : {}),
    },
    dimensions,
    perAc,
    sensor: {
      required: sensor.required,
      injected: sensor.injected,
      killed: sensor.killed,
      porcelainOk: sensor.porcelainOk,
      verdict: sensor.verdict,
    },
    diffRange: { fromSha, toSha: fromSha },
    verdict: sensor.verdict === 'FAIL' ? 'FAIL' : (verifyResult.exitCode === 0 ? 'PASS' : 'FAIL'),
  });

  const runId = options.runId || makeRunId('live');
  const outputDir = runOutputDir(paths.runsRoot, `${runId}-${fixtureId}`);
  writeReports(report, outputDir, paths.schemaPath);
  return { report, outputDir, verifyResult, judge, sensor, narrativeIgnored: narrativeScore != null };
}

module.exports = {
  collectRun,
  verifyScoreFromLedger,
  completenessFromLedger,
  parseMarkdownScore,
};
