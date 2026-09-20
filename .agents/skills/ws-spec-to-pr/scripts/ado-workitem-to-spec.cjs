#!/usr/bin/env node
'use strict';

// Port of ado-workitem-to-spec.py (ws-spec-to-pr):
// Thin shim — forwards to the ws-spec-provider-azure-devops canonical script,
// forwarding argv and exit code.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const TARGET = path.resolve(
  __dirname, '..', '..', 'ws-spec-provider-azure-devops', 'scripts', 'ado-workitem-to-spec.cjs',
);

if (!fs.existsSync(TARGET)) {
  console.error(`Canonical script not found: ${TARGET}`);
  process.exit(1);
}

const proc = spawnSync(process.execPath, [TARGET, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(proc.status ?? 1);
