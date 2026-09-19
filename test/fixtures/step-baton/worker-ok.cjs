#!/usr/bin/env node
'use strict';
// Fixture worker: healthy turn. Verifies the prompt file + baton envelope,
// writes a receipt, then calls finish for its step before exit.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

const promptPath = arg('prompt');
const cwd = arg('cwd');
const slug = arg('slug');
const step = Number(arg('step'));
const statePath = arg('state');
const updater = arg('updater');
const receiptPath = arg('receipt');
if (!promptPath || !cwd || !slug || !Number.isInteger(step) || !statePath || !updater || !receiptPath) {
  process.stderr.write('worker-ok: missing required args\n');
  process.exit(2);
}
const content = fs.readFileSync(promptPath, 'utf8');
const envelopeMatch = content.match(/```json\n([\s\S]*?)\n```/);
if (!envelopeMatch) {
  process.stderr.write('worker-ok: no baton envelope block in prompt\n');
  process.exit(2);
}
const envelope = JSON.parse(envelopeMatch[1]);
if (envelope.step !== step || !envelope.holder || !envelope.leaseUntil || !envelope.attempt) {
  process.stderr.write(`worker-ok: bad envelope: ${JSON.stringify(envelope)}\n`);
  process.exit(2);
}
const receipt = {
  promptPath,
  promptExists: fs.existsSync(promptPath),
  envelope,
  hasSpecPointer: content.includes('Spec:'),
  hasPlanIndexPointer: content.includes('Plan Index:'),
  hasLedgerPointer: content.includes('AC Ledger:'),
  hasPriorHandoff: content.includes('Prior Handoff:'),
  cwd,
  slug,
  step,
};
fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
fs.appendFileSync(receiptPath, `${JSON.stringify(receipt)}\n`, 'utf8');
const finished = spawnSync(process.execPath, [updater, 'finish', statePath, '--step', String(step), '--repo-root', cwd], {
  encoding: 'utf8',
});
if (finished.status !== 0) {
  process.stderr.write(`worker-ok: finish failed: ${finished.stderr || finished.stdout}\n`);
  process.exit(2);
}
process.exit(0);
