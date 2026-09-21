/**
 * AC15 regression: ship verify.cjs preserves native line endings — it never
 * rewrites config files. A fixture .ws/config.json with CRLF endings must be
 * byte-identical after a verify run (F28 guard).
 * Run: node test/test-ship-verify-line-endings.js
 */
import assert from 'node:assert';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VERIFY = path.join(REPO_ROOT, '.agents/skills/ws-ship-pr/scripts/verify.cjs');

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-ship-verify-eol-'));
try {
  fs.mkdirSync(path.join(root, '.ws'), { recursive: true });
  const configPath = path.join(root, '.ws', 'config.json');
  const configObj = {
    project: { name: 'eol-fixture', baseBranch: 'main' },
    verification: { backendBuild: 'node --version', backendTest: 'node --version' },
    plans: { dir: '.agents/plans' },
    fable: { auditVerdictsBlockShip: 'refuted' },
  };
  fs.writeFileSync(configPath, `${JSON.stringify(configObj, null, 2).split('\n').join('\r\n')}\r\n`, 'utf8');
  cp.spawnSync('git', ['init', '-q'], { cwd: root, encoding: 'utf8' });
  const before = sha256(configPath);

  const run = cp.spawnSync(process.execPath, [VERIFY], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, SHIP_PR_BASE: 'main' },
    timeout: 120000,
  });
  assert.strictEqual(sha256(configPath), before, 'verify.cjs must not rewrite .ws/config.json (CRLF preserved)');
  assert.strictEqual(run.status, 0, `verify exits 0 on the no-op fixture (got ${run.status}): ${(run.stdout || '').slice(-400)}${(run.stderr || '').slice(-400)}`);
  assert(/VERIFY_OK/.test(run.stdout || ''), 'verify prints VERIFY_OK');

  // Static guard: verify.cjs contains no file-mutating calls.
  const source = fs.readFileSync(VERIFY, 'utf8');
  for (const banned of ['writeFileSync', 'appendFileSync', 'truncateSync', 'createWriteStream']) {
    assert(!source.includes(banned), `verify.cjs must not call ${banned}`);
  }
  console.log('test-ship-verify-line-endings: ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
