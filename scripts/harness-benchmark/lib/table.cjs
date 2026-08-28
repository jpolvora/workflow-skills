'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePaths } = require('./paths.cjs');
const { loadReport } = require('./snapshot.cjs');

function versionKey(version) {
  return String(version || '0.0.0')
    .split(/[.+-]/)
    .map((part) => {
      const n = Number(part);
      return Number.isFinite(n) ? String(n).padStart(8, '0') : part;
    })
    .join('.');
}

function listBaselineFiles(baselinesRoot) {
  if (!fs.existsSync(baselinesRoot)) return [];
  return fs.readdirSync(baselinesRoot)
    .filter((name) => name.endsWith('.json') && name !== '.gitkeep')
    .map((name) => path.join(baselinesRoot, name));
}

function loadRow(filePath) {
  const report = loadReport(filePath);
  const meta = report.meta || {};
  const dimensions = report.dimensions || {};
  return {
    file: path.basename(filePath),
    fixtureId: report.fixtureId || meta.fixtureId || '',
    packageVersion: meta.packageVersion || '',
    gitSha: (meta.gitSha || '').slice(0, 7),
    mode: meta.mode || '',
    orch: meta.orch || '',
    timestamp: meta.timestamp || '',
    wallSec: meta.wallSec == null ? null : Number(meta.wallSec),
    index: report.index?.value ?? null,
    completeness: dimensions.completeness ?? null,
    verifyScore: dimensions.verifyScore ?? null,
    judge: dimensions.judge ?? null,
    discrimination: dimensions.discrimination ?? null,
    efficiency: dimensions.efficiency ?? null,
    time: dimensions.time ?? null,
    honesty: dimensions.honesty ?? null,
  };
}

function filterRows(rows, options) {
  return rows.filter((row) => {
    if (options.fixture && row.fixtureId !== options.fixture) return false;
    if (options.mode && row.mode !== options.mode) return false;
    return true;
  });
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const va = versionKey(a.packageVersion);
    const vb = versionKey(b.packageVersion);
    if (va !== vb) return va.localeCompare(vb);
    return String(a.timestamp).localeCompare(String(b.timestamp));
  });
}

function cell(value) {
  if (value === null || value === undefined || value === '') return 'n/a';
  return String(value);
}

function renderMarkdown(rows) {
  const headers = [
    'version',
    'sha',
    'mode',
    'index',
    'complete',
    'verify',
    'judge',
    'disc',
    'eff',
    'time',
    'honest',
    'wallSec',
  ];
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
  ];
  for (const row of rows) {
    lines.push(`| ${[
      cell(row.packageVersion),
      cell(row.gitSha),
      cell(row.mode),
      cell(row.index),
      cell(row.completeness),
      cell(row.verifyScore),
      cell(row.judge),
      cell(row.discrimination),
      cell(row.efficiency),
      cell(row.time),
      cell(row.honesty),
      cell(row.wallSec),
    ].join(' | ')} |`);
  }
  return `${lines.join('\n')}\n`;
}

function tableReports(options = {}) {
  const paths = resolvePaths(options);
  const rows = sortRows(filterRows(
    listBaselineFiles(paths.baselinesRoot).map(loadRow),
    options,
  ));
  if (!rows.length) {
    throw new Error(`no baselines matched fixture=${options.fixture || '*'} mode=${options.mode || '*'}`);
  }
  const markdown = renderMarkdown(rows);
  if (options.format === 'json') {
    process.stdout.write(`${JSON.stringify({ rows }, null, 2)}\n`);
  } else {
    process.stdout.write(`Harness benchmark table (${rows.length} snapshot${rows.length === 1 ? '' : 's'})\n`);
    if (options.fixture) process.stdout.write(`fixture: ${options.fixture}\n`);
    process.stdout.write(`\n${markdown}`);
  }
  return { rows, markdown };
}

module.exports = {
  tableReports,
  loadRow,
  filterRows,
  sortRows,
  renderMarkdown,
  versionKey,
};
