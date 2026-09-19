#!/usr/bin/env node
'use strict';
// Fixture worker: finishes, then bumps the state revision out-of-band to
// simulate an external edit racing the coordinator (NS6).
const fs = require('fs');
const { spawnSync } = require('child_process');

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const cwd = arg('cwd');
const step = Number(arg('step'));
const statePath = arg('state');
const updater = arg('updater');
const finished = spawnSync(process.execPath, [updater, 'finish', statePath, '--step', String(step), '--repo-root', cwd], {
  encoding: 'utf8',
});
if (finished.status !== 0) {
  process.stderr.write(`worker-bump: finish failed: ${finished.stderr || finished.stdout}\n`);
  process.exit(2);
}
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
state.revision = Number(state.revision || 0) + 5;
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
process.exit(0);
