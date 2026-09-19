#!/usr/bin/env node
'use strict';
// Fixture worker: flaky turn. First attempt exits clean without finish;
// later attempts (receipt from a prior attempt exists) finish normally.
// Proves the consecutive-failure counter resets on advance.
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
const marker = `${receiptPath || 'missing'}.flaky-${step}`;
if (!receiptPath) {
  process.stderr.write('worker-flaky: missing --receipt\n');
  process.exit(2);
}
fs.mkdirSync(path.dirname(marker), { recursive: true });
if (!fs.existsSync(marker)) {
  fs.writeFileSync(marker, 'attempted\n', 'utf8');
  process.exit(0);
}
const finished = spawnSync(process.execPath, [updater, 'finish', statePath, '--step', String(step), '--repo-root', cwd], {
  encoding: 'utf8',
});
process.exit(finished.status === 0 ? 0 : 2);
