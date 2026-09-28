/**
 * Regression coverage for unconfigured verification aliases.
 * Empty or whitespace-only aliases must be logged as skipped and must never
 * reach either child-process runner, including the frontend-touched branch.
 */
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFY = path.join(REPO_ROOT, '.agents', 'skills', 'ws-ship-pr', 'scripts', 'verify.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-ship-verify-empty-'));
const configPath = path.join(root, '.ws', 'config.json');
const originalSpawnSync = childProcess.spawnSync;
const originalExecSync = childProcess.execSync;
const originalLog = console.log;
const originalCwd = process.cwd();
const originalBase = process.env.SHIP_PR_BASE;
const originalExit = process.exit;
const logs = [];
const spawnedShellCommands = [];
const executedShellCommands = [];

try {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({
    verification: {
      backendBuild: '  ',
      backendTest: '',
      frontendBuild: '\t',
      frontendTest: '   ',
    },
    stack: { frontend: { sourceDir: 'web' } },
  }), 'utf8');

  childProcess.spawnSync = (command, argsOrOptions, maybeOptions) => {
    const options = Array.isArray(argsOrOptions) ? (maybeOptions || {}) : (argsOrOptions || {});
    if (options.shell) {
      spawnedShellCommands.push(String(command));
      if (!String(command).trim()) throw new Error('empty shell command reached spawnSync');
      if (command === 'fail-check') return { status: 7, stdout: '', stderr: '' };
      return { status: 0, stdout: '', stderr: '' };
    }
    const args = Array.isArray(argsOrOptions) ? argsOrOptions : [];
    if (command === 'git' && args[0] === 'rev-parse') {
      return { status: 0, stdout: `${process.cwd()}\n`, stderr: '' };
    }
    if (command === 'git' && args[0] === 'diff') {
      return { status: 0, stdout: 'web/app.js\n', stderr: '' };
    }
    return { status: 0, stdout: '', stderr: '' };
  };
  childProcess.execSync = (command, options = {}) => {
    executedShellCommands.push(String(command));
    if (!String(command).trim()) throw new Error('empty shell command reached execSync');
    return Buffer.from('');
  };
  console.log = (...args) => logs.push(args.join(' '));
  process.env.SHIP_PR_BASE = 'main';

  const { main } = require(VERIFY);
  process.chdir(root);
  main();

  assert.deepEqual(spawnedShellCommands, [], 'empty aliases must not reach spawnSync');
  assert.deepEqual(executedShellCommands, [], 'empty frontend test must not reach execSync');
  for (const alias of ['backendBuild', 'backendTest', 'frontendTest', 'frontendBuild']) {
    assert(logs.includes(`==> ${alias} (skipped: not configured)`), `missing skip note for ${alias}`);
  }
  assert(logs.includes('VERIFY_OK'), 'empty aliases should still finish successfully');

  const failingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-ship-verify-failing-'));
  fs.mkdirSync(path.join(failingRoot, '.ws'), { recursive: true });
  fs.writeFileSync(path.join(failingRoot, '.ws', 'config.json'), JSON.stringify({
    verification: { backendBuild: 'fail-check', backendTest: 'node --version' },
  }), 'utf8');
  let exitCode = null;
  process.exit = (code) => {
    exitCode = code;
    throw new Error(`verify exited ${code}`);
  };
  try {
    process.chdir(failingRoot);
    assert.throws(() => main(), /verify exited 1/);
  } finally {
    process.exit = originalExit;
    process.chdir(originalCwd);
    fs.rmSync(failingRoot, { recursive: true, force: true });
  }
  assert.equal(exitCode, 1, 'a failing non-empty alias must retain exit code 1');
  assert(spawnedShellCommands.includes('fail-check'), 'non-empty failing alias must execute');

  console.log = originalLog;
  originalLog('test-ship-verify-empty-aliases: ok');
} finally {
  childProcess.spawnSync = originalSpawnSync;
  childProcess.execSync = originalExecSync;
  console.log = originalLog;
  process.exit = originalExit;
  process.chdir(originalCwd);
  if (originalBase === undefined) delete process.env.SHIP_PR_BASE;
  else process.env.SHIP_PR_BASE = originalBase;
  fs.rmSync(root, { recursive: true, force: true });
}
