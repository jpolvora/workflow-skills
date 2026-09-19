#!/usr/bin/env node
'use strict';
// Fixture worker: reports failure through the finish operation
// (exit 0 with `finish --status failed`) instead of a non-zero exit.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const cwd = arg('cwd');
const step = Number(arg('step'));
const statePath = arg('state');
const updater = arg('updater');
const receiptPath = arg('receipt');
if (!cwd || !Number.isInteger(step) || !statePath || !updater || !receiptPath) {
  process.stderr.write('worker-failed-finish: missing required args\n');
  process.exit(2);
}
const finished = spawnSync(process.execPath, [updater, 'finish', statePath, '--step', String(step), '--repo-root', cwd, '--status', 'failed'], {
  encoding: 'utf8',
});
if (finished.status !== 0) {
  process.stderr.write(`worker-failed-finish: finish failed: ${finished.stderr || finished.stdout}\n`);
  process.exit(2);
}
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.appendFileSync(receiptPath, `${JSON.stringify({ step, status: 'failed' })}\n`, 'utf8');
process.exit(0);
