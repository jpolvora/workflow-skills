'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { loadJsonSchema, validateNode } = require('../../../.agents/skills/ws-shared/scripts/validate_json_schema.cjs');
const { INDEX_WEIGHTS } = require('./paths.cjs');

function computeIndex(dimensions) {
  let weighted = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(INDEX_WEIGHTS)) {
    const value = dimensions[key];
    if (value === null || value === undefined) continue;
    weighted += weight * (value / 10);
    totalWeight += weight;
  }
  const value = totalWeight ? Math.round((100 * weighted) / totalWeight) : 0;
  return { value, weights: { ...INDEX_WEIGHTS } };
}

function buildReport({
  meta,
  dimensions,
  perAc = [],
  sensor,
  diffRange,
  verdict,
}) {
  const index = computeIndex(dimensions);
  return {
    meta,
    dimensions,
    index,
    perAc,
    sensor: sensor || {
      required: false,
      injected: 0,
      killed: 0,
      porcelainOk: true,
      verdict: 'SKIP',
    },
    diffRange: diffRange || { fromSha: '', toSha: '' },
    verdict: verdict || 'PASS',
  };
}

function validateReport(report, schemaPath) {
  const schema = loadJsonSchema(schemaPath, 'report schema');
  const errors = validateNode(report, schema, 'report.json');
  if (errors.length) throw new Error(`report schema validation failed: ${errors.join('; ')}`);
}

function renderMarkdown(report) {
  const lines = [
    `# Harness benchmark report — ${report.meta.fixtureId}`,
    '',
    `**Verdict:** ${report.verdict}`,
    '',
    '## Meta',
    '',
    '| Field | Value |',
    '|-------|-------|',
    ...Object.entries(report.meta).map(([key, value]) => `| ${key} | ${typeof value === 'object' ? JSON.stringify(value) : value} |`),
    '',
    '## Dimensions',
    '',
    '| Dimension | Score |',
    '|-----------|------:|',
    ...Object.entries(report.dimensions).map(([key, value]) => `| ${key} | ${value === null ? 'n/a' : value} |`),
    '',
    `**Index:** ${report.index.value}/100`,
    '',
    '## Per-AC evidence',
    '',
  ];
  if (!report.perAc.length) lines.push('- EXPLICIT ZERO');
  else {
    for (const row of report.perAc) {
      lines.push(`- **${row.id}** (${row.score}/10): ${row.evidence || 'EXPLICIT ZERO'}`);
    }
  }
  lines.push(
    '',
    '## Sensor',
    '',
    `Required: ${report.sensor.required}; Injected: ${report.sensor.injected}; Killed: ${report.sensor.killed}; Porcelain OK: ${report.sensor.porcelainOk}; Verdict: ${report.sensor.verdict}`,
    '',
    '## diffRange',
    '',
    `${report.diffRange.fromSha}…${report.diffRange.toSha}`,
    '',
  );
  return `${lines.join('\n')}`;
}

function writeReports(report, outputDir, schemaPath) {
  validateReport(report, schemaPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'report.json');
  const mdPath = path.join(outputDir, 'report.md');
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, renderMarkdown(report), 'utf8');
  return { jsonPath, mdPath };
}

function runMeasureHarness(scriptPath, repoRoot, scenario) {
  const result = spawnSync(process.execPath, [scriptPath, '--json', '--scenario', scenario, '--repo-root', repoRoot], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) throw new Error(`measure_harness failed: ${result.stderr || result.stdout}`);
  return JSON.parse(result.stdout.trim().split(/\n(?=\{)/).at(-1));
}

function scoreEfficiency(measureReport, oracle) {
  const bytes = measureReport.totalHarnessBytes || 0;
  const maxBytes = oracle.maxHarnessBytes || bytes;
  if (bytes <= maxBytes) return 10;
  const ratio = maxBytes / bytes;
  return Math.max(0, Math.min(10, Math.round(ratio * 10)));
}

function countSpecAcs(specPath) {
  const text = fs.readFileSync(specPath, 'utf8');
  const match = text.match(/## Acceptance Criteria\s*([\s\S]*?)(?:\n## |\n# |$)/i);
  if (!match) return [];
  return [...match[1].matchAll(/^-\s*(AC\d+):/gim)].map((m) => m[1]);
}

module.exports = {
  computeIndex,
  buildReport,
  validateReport,
  renderMarkdown,
  writeReports,
  runMeasureHarness,
  scoreEfficiency,
  countSpecAcs,
};
