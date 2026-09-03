#!/usr/bin/env node
'use strict';
/**
 * Compatibility shim — forwards to ws-spec-provider-github canonical script.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const target = path.join(
  __dirname,
  '..',
  '..',
  'ws-spec-provider-github',
  'scripts',
  'resolve_thread.cjs'
);
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status === null ? 1 : result.status);
