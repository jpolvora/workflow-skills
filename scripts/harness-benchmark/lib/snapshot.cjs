'use strict';

const fs = require('fs');
const path = require('path');
const { resolvePaths } = require('./paths.cjs');
const { validateReport } = require('./report-builder.cjs');

function loadReport(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function snapshotRun(options = {}) {
  const paths = resolvePaths(options);
  if (!options.name) throw new Error('snapshot requires --name <label>');

  let report;
  if (options.run) {
    const runDir = path.join(paths.runsRoot, options.run);
    const reportPath = path.join(runDir, 'report.json');
    if (!fs.existsSync(reportPath)) {
      const nested = fs.readdirSync(runDir).find((name) => fs.existsSync(path.join(runDir, name, 'report.json')));
      if (!nested) throw new Error(`report.json not found under ${runDir}`);
      report = loadReport(path.join(runDir, nested, 'report.json'));
    } else {
      report = loadReport(reportPath);
    }
  } else if (options.from) {
    report = loadReport(path.resolve(options.from));
  } else {
    throw new Error('snapshot requires --run <runId> or --from <report.json>');
  }

  const slim = {
    meta: report.meta,
    dimensions: report.dimensions,
    index: report.index,
    fixtureId: report.meta.fixtureId,
  };

  fs.mkdirSync(paths.baselinesRoot, { recursive: true });
  const outPath = path.join(paths.baselinesRoot, `${options.name}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(slim, null, 2)}\n`, 'utf8');
  return { outPath, slim };
}

module.exports = { snapshotRun, loadReport };
