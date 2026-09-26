/**
 * Tests for subagent task dispatch CLI + API (0137).
 * Run: node test/test-subagent-dispatch.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const requireCjs = createRequire(import.meta.url);
const SCRIPT = path.join(REPO_ROOT, '.agents', 'skills', 'ws-shared', 'runtime', 'scripts', 'dispatch_subagent_task.cjs');
const CLI = path.join(REPO_ROOT, 'bin', 'cli.js');
const { dispatchSubagentTask, ValidationError } = requireCjs(SCRIPT);

console.log('--- Testing subagent task dispatch ---');

const tmpRoots = [];
function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}

// Echo runner fixture: prints the --prompt envelope back on stdout.
function writeEchoRunner(dir) {
  const file = path.join(dir, 'echo-runner.cjs');
  fs.writeFileSync(
    file,
    `'use strict';\nconst i = process.argv.indexOf('--prompt');\nprocess.stdout.write(i === -1 ? '' : String(process.argv[i + 1] ?? ''));\n`,
    'utf8',
  );
  return file;
}

function writeConsumer(dir, cliTemplate) {
  fs.mkdirSync(path.join(dir, '.ws'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.ws', 'config.json'),
    JSON.stringify({ defaults: { hostAdapter: { mode: 'auto', cliTemplate } } }, null, 2),
    'utf8',
  );
}

function runCli(args, cwd) {
  return cp.spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });
}

// AC2: missing required args exit 1 with stderr errors.
console.log('1. CLI required-arg validation');
{
  const dir = mkTmp('ws-dispatch-req-');
  const r1 = runCli(['--task', 'do work'], dir);
  assert.strictEqual(r1.status, 1, 'missing --subagent exits 1');
  assert.match(r1.stderr, /--subagent/, 'missing --subagent names the flag');
  const r2 = runCli(['--subagent', 'worker'], dir);
  assert.strictEqual(r2.status, 1, 'missing --task exits 1');
  assert.match(r2.stderr, /--task/, 'missing --task names the flag');
}

// AC3: invalid JSON payload fails fast.
console.log('2. CLI payload JSON validation');
{
  const dir = mkTmp('ws-dispatch-json-');
  const r = runCli(['--subagent', 'w', '--task', 't', '--payload', '{invalid-json}'], dir);
  assert.strictEqual(r.status, 1, 'invalid payload exits 1');
  assert.match(r.stderr, /--payload/, 'invalid payload error names the flag');
  const rArr = runCli(['--subagent', 'w', '--task', 't', '--payload', '[1,2]'], dir);
  assert.strictEqual(rArr.status, 1, 'non-object payload exits 1');
}

// AC4/AC5/AC8: payload forwarded intact, default {}, JSON envelope.
console.log('3. CLI dispatch through a fixture runner');
{
  const dir = mkTmp('ws-dispatch-ok-');
  const echo = writeEchoRunner(dir);
  writeConsumer(dir, `node "${echo}" --prompt "{prompt}"`);
  const r = runCli(
    ['--subagent', 'reviewer', '--task', 'summarize diff', '--payload', '{"pr":12,"deep":true}', '--json', '--repo-root', dir],
    dir,
  );
  assert.strictEqual(r.status, 0, `fixture dispatch exits 0 (${r.stderr || r.stdout})`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.subagent, 'reviewer');
  assert.strictEqual(out.task, 'summarize diff');
  assert.deepStrictEqual(out.payload, { pr: 12, deep: true });
  // The runner received the full envelope through {prompt}.
  assert.deepStrictEqual(JSON.parse(out.output), { subagent: 'reviewer', task: 'summarize diff', payload: { pr: 12, deep: true } });

  const rDefault = runCli(['--subagent', 'w', '--task', 't', '--json', '--repo-root', dir], dir);
  assert.strictEqual(rDefault.status, 0, 'omitted payload still dispatches');
  assert.deepStrictEqual(JSON.parse(rDefault.stdout).payload, {});
}

// AC8: errors as JSON on stdout in --json mode.
console.log('4. CLI JSON error envelope');
{
  const dir = mkTmp('ws-dispatch-errjson-');
  const r = runCli(['--subagent', 'w', '--json'], dir);
  assert.strictEqual(r.status, 1);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.ok, false);
  assert.match(out.error, /--task/);
}

// AC10: traversal / illegal identifiers rejected fail-closed.
console.log('5. Identifier validation');
{
  const dir = mkTmp('ws-dispatch-id-');
  for (const bad of ['../../evil', '..\\evil', 'a/b', 'has space', 'semi;colon', 'dash-ok..dot']) {
    const r = runCli(['--subagent', bad, '--task', 't', '--repo-root', dir], dir);
    assert.strictEqual(r.status, 1, `CLI rejects ${JSON.stringify(bad)}`);
    assert.match(r.stderr, /invalid subagent/, 'rejection names the cause');
  }
  await assert.rejects(
    dispatchSubagentTask({ subagent: '../../evil', task: 't' }),
    (e) => e instanceof ValidationError && /invalid subagent/.test(e.message),
    'API rejects traversal with ValidationError',
  );
}

// AC6/AC7: async API resolves on success, rejects on invalid args.
console.log('6. Programmatic API');
{
  const seen = [];
  const result = await dispatchSubagentTask(
    { subagent: 'worker-1', task: 'do the thing', payload: { a: 1 } },
    { executor: async (envelope) => { seen.push(envelope); return 'done-mark'; } },
  );
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(seen, [{ subagent: 'worker-1', task: 'do the thing', payload: { a: 1 } }]);
  assert.strictEqual(result.output, 'done-mark');

  await assert.rejects(dispatchSubagentTask({ task: 't' }), ValidationError, 'missing subagent rejects');
  await assert.rejects(dispatchSubagentTask({ subagent: 'w' }), ValidationError, 'missing task rejects');
  await assert.rejects(dispatchSubagentTask({ subagent: 'w', task: '' }), ValidationError, 'empty task rejects');
  await assert.rejects(
    dispatchSubagentTask({ subagent: 'w', task: 't', payload: [1] }),
    ValidationError,
    'non-object payload rejects',
  );
}

// AC9: executor faults surface as structured failures (no unhandled rejection).
console.log('7. Executor fault containment');
{
  const result = await dispatchSubagentTask(
    { subagent: 'w', task: 't' },
    { executor: async () => { throw new Error('boom-fault'); } },
  );
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.error, 'boom-fault');
}

// AC9: timeout kills the child (no orphan keeps running).
console.log('8. Runner timeout kills the child');
{
  const dir = mkTmp('ws-dispatch-timeout-');
  const alive = path.join(dir, 'alive.mark');
  const done = path.join(dir, 'done.mark');
  const sleeper = path.join(dir, 'sleeper.cjs');
  fs.writeFileSync(
    sleeper,
    `'use strict';\nconst fs = require('fs');\n`
      + `fs.writeFileSync(${JSON.stringify(alive)}, 'alive');\n`
      + `setTimeout(() => fs.writeFileSync(${JSON.stringify(done)}, 'done'), 2000);\n`,
    'utf8',
  );
  writeConsumer(dir, `node "${sleeper}"`);
  const started = Date.now();
  const result = await dispatchSubagentTask({ subagent: 'sleeper', task: 'nap' }, { repoRoot: dir, timeoutMs: 400 });
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.timedOut, true);
  assert.match(result.error, /timed out/);
  assert.ok(fs.existsSync(alive), 'child started before the kill');
  await new Promise((resolve) => { setTimeout(resolve, 2500); });
  assert.ok(!fs.existsSync(done), 'killed child never finished (no orphan)');
  assert.ok(Date.now() - started < 20000, 'test did not wait out the sleeper');
}

// Honest default: no runner configured fails closed with guidance.
console.log('9. No-runner fail-closed');
{
  const dir = mkTmp('ws-dispatch-norunner-');
  writeConsumer(dir, '');
  const r = runCli(['--subagent', 'w', '--task', 't', '--repo-root', dir], dir);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /no subagent runner configured/);
  const api = await dispatchSubagentTask({ subagent: 'w', task: 't' }, { repoRoot: dir });
  assert.strictEqual(api.ok, false);
  assert.strictEqual(api.code, 'NO_RUNNER');
}

// bin/cli.js passthrough: `workflow-skills dispatch …`.
console.log('10. CLI passthrough');
{
  const dir = mkTmp('ws-dispatch-bin-');
  const echo = writeEchoRunner(dir);
  writeConsumer(dir, `node "${echo}" --prompt "{prompt}"`);
  const r = cp.spawnSync(
    process.execPath,
    [CLI, 'dispatch', '--subagent', 'w', '--task', 'via-bin', '--json'],
    { cwd: dir, encoding: 'utf8' },
  );
  assert.strictEqual(r.status, 0, `bin dispatch exits 0 (${r.stderr || ''})`);
  const out = JSON.parse(r.stdout);
  assert.strictEqual(out.ok, true);
  assert.strictEqual(out.task, 'via-bin');
  const help = cp.spawnSync(process.execPath, [CLI, 'dispatch', '--help'], { cwd: dir, encoding: 'utf8' });
  assert.strictEqual(help.status, 0);
  assert.match(help.stdout, /--subagent/);
}

for (const dir of tmpRoots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

console.log('--- All subagent-dispatch tests PASSED ---');
