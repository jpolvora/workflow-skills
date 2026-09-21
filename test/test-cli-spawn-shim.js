/**
 * Regression test for PR #377 class-B threads (agentic-code-reviewers WARNING):
 * spec-memo CLI probes switched to `shell: false` (AC3 spaced---cwd fix) must
 * still execute npm-installed Windows launchers (`memo`, `npx -y ...` resolve
 * to `*.cmd` shims). `spawnCliSync` keeps the `shell: false` first attempt on
 * every platform and retries once through ComSpec with a pre-quoted command
 * line on win32 ENOENT only.
 *
 * Cross-platform: native passthrough, spaced-argv, quoting units, and
 * missing-bin surfacing run everywhere; the live `.cmd` shim fixture runs on
 * win32 only (skipped elsewhere with a note, like other platform gates).
 * Run: node test/test-cli-spawn-shim.js
 */
import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const helperPath = path.join(repoRoot, '.agents/skills/ws-shared/runtime/scripts/cli_spawn.cjs');
const { quoteCmdArg, spawnCliSync } = require(helperPath);

function testQuoteCmdArg() {
  assert.strictEqual(quoteCmdArg('plain'), 'plain', 'plain arg untouched');
  assert.strictEqual(quoteCmdArg('--cwd'), '--cwd', 'flag untouched');
  assert.strictEqual(quoteCmdArg('a b'), '"a b"', 'spaced arg quoted');
  assert.strictEqual(quoteCmdArg(''), '""', 'empty arg quoted');
  assert.strictEqual(
    quoteCmdArg('C:\\Users\\test user\\repo'),
    '"C:\\Users\\test user\\repo"',
    'spaced win32 path quoted'
  );
  assert.strictEqual(quoteCmdArg('C:\\repo&whoami'), '"C:\\repo&whoami"', 'ampersand path quoted neutralizing cmd metachar');
  assert.strictEqual(quoteCmdArg('a|b'), '"a|b"', 'pipe arg quoted');
  assert.strictEqual(quoteCmdArg('100%'), '"100%"', 'unpaired percent stays single so batch shims receive it literally');
  assert.strictEqual(quoteCmdArg('C:\\work\\%TEMP%\\repo'), '"C:\\work\\%%TEMP%%\\repo"', 'paired percent expression doubles so cmd cannot expand it');
  assert.strictEqual(quoteCmdArg('(x86)'), '"(x86)"', 'parens quoted: unquoted parens group cmd commands');
  assert.strictEqual(quoteCmdArg('say "hi"'), '"say ""hi"""', 'embedded quotes still double inside metachar quoting');
  console.log('ok quoteCmdArg units');
}

function testNativePassthrough() {
  const run = spawnCliSync(
    process.execPath,
    ['-p', 'JSON.stringify(process.argv.slice(1))', 'spaced arg here'],
    { encoding: 'utf8', timeout: 30000 }
  );
  assert.strictEqual(run.status, 0, 'native exe exits 0, got ' + JSON.stringify(run.error || run.status));
  assert.deepStrictEqual(JSON.parse(run.stdout.trim()), ['spaced arg here'], 'spaced argv arrives intact');
  console.log('ok native passthrough with spaced argv');
}

function testMissingBinSurfaces() {
  const run = spawnCliSync('ws-definitely-missing-bin-xyz', ['a'], { encoding: 'utf8', timeout: 30000 });
  assert.notStrictEqual(run.status, 0, 'missing bin never reports success');
  if (process.platform === 'win32') {
    // First attempt ENOENT falls through to the ComSpec retry, which reports
    // the unknown command via exit code instead of a spawn error.
    const output = `${run.stderr || ''} ${run.stdout || ''} ${(run.error && run.error.code) || ''}`;
    assert.match(output, /not recognized|ENOENT/, 'missing bin surfaces a diagnosable failure, got ' + JSON.stringify(output));
  } else {
    assert.ok(run.error, 'missing bin yields a result error, not a throw');
    assert.strictEqual(run.error.code, 'ENOENT', 'missing bin surfaces ENOENT');
  }
  console.log('ok missing bin surfaces a failure');
}

function testWin32CmdShim() {
  if (process.platform !== 'win32') {
    console.log('skip live .cmd shim fixture (win32 only)');
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-shim-'));
  try {
    fs.writeFileSync(path.join(dir, 'ws-shim-fixture-xyz.cmd'), '@echo off\r\n echo SHIM-ARGS %*\r\n', 'utf8');
    const oldPath = process.env.PATH || '';
    process.env.PATH = `${dir}${path.delimiter}${oldPath}`;
    try {
      const run = spawnCliSync(
        'ws-shim-fixture-xyz',
        ['search', '--cwd', 'C:\\spaced dir\\repo'],
        { encoding: 'utf8', timeout: 30000 }
      );
      assert.strictEqual(run.status, 0, 'shim executes, got ' + JSON.stringify(run.error || run.stderr || run.status));
      assert.ok((run.stdout || '').includes('spaced dir'), 'spaced --cwd survives the shim round-trip: ' + JSON.stringify(run.stdout));
      // Explicit `.cmd` launcher (specMemo.cli as `memo.cmd`): the first
      // shell-free attempt fails with EINVAL, so the same retry must fire.
      const explicit = spawnCliSync(
        'ws-shim-fixture-xyz.cmd',
        ['search', '--cwd', 'C:\\spaced dir\\repo'],
        { encoding: 'utf8', timeout: 30000 }
      );
      assert.strictEqual(explicit.status, 0, 'explicit .cmd launcher executes, got ' + JSON.stringify(explicit.error || explicit.stderr || explicit.status));
      assert.ok((explicit.stdout || '').includes('spaced dir'), 'spaced --cwd survives the explicit .cmd round-trip: ' + JSON.stringify(explicit.stdout));
      // Metacharacter round-trip: quoting must neutralize cmd operators so
      // args arrive literally and no second command executes.
      const meta = spawnCliSync(
        'ws-shim-fixture-xyz',
        ['a&b', '100%x', '(p)q', 'a|b', 'a&echo INJECTED'],
        { encoding: 'utf8', timeout: 30000 }
      );
      assert.strictEqual(meta.status, 0, 'metachar args execute, got ' + JSON.stringify(meta.error || meta.stderr || meta.status));
      for (const want of ['a&b', '100%x', '(p)q', 'a|b', 'a&echo INJECTED']) {
        assert.ok((meta.stdout || '').includes(want), 'metachar arg arrives literally: ' + want + ' in ' + JSON.stringify(meta.stdout));
      }
      assert.ok(!(meta.stdout || '').split('\n').some((l) => l.trim() === 'INJECTED'), 'no injected second command runs');
    } finally {
      process.env.PATH = oldPath;
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log('ok win32 .cmd shim executes with spaced argv');
}

testQuoteCmdArg();
testNativePassthrough();
testMissingBinSurfaces();
testWin32CmdShim();
console.log('test-cli-spawn-shim: PASS');
