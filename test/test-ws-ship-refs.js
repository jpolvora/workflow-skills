/**
 * Stay-run ship refs — regression test for the ws-ship-pr shared-head contract.
 *
 * Asserts:
 *  1. resolve_ship_refs.cjs maps head/base/config-base to feature, shared-head,
 *     or push-only (live runs, no fixtures).
 *  2. The helper fails closed (exit 2) on empty refs, a detached HEAD literal,
 *     and unknown flags.
 *  3. The contract surface references the shared-head rule (one shared
 *     definition in ws-ship-pr, inherited by standard, lite, and multi).
 *  4. The helper is read-only (no file-mutating calls).
 *
 * Run: node test/test-ws-ship-refs.js
 */
import assert from 'node:assert';
import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const RESOLVER = path.join(REPO_ROOT, '.agents/skills/ws-ship-pr/scripts/resolve_ship_refs.cjs');

const DOCS = [
  '.agents/skills/ws-ship-pr/SKILL.md',
  '.agents/skills/ws-spec-to-pr/STEP-DISPATCH.md',
  '.agents/skills/ws-spec-to-pr-lite/SKILL.md',
  '.agents/skills/ws-spec-multi/PROTOCOL.md',
  '.agents/skills/ws-spec-multi/STATE.md',
];

function run(args) {
  return cp.spawnSync(process.execPath, [RESOLVER, ...args], { encoding: 'utf8', timeout: 60000 });
}

function jsonOf(args) {
  const proc = run([...args, '--json']);
  assert.strictEqual(proc.status, 0, `resolver exits 0 for ${args.join(' ')} (got ${proc.status}): ${(proc.stderr || '').slice(-300)}`);
  return JSON.parse(proc.stdout);
}

// 1. Mode mapping.
assert.deepStrictEqual(
  jsonOf(['--head', 'feat/us-1', '--base', 'main', '--config-base', 'main']),
  { head: 'feat/us-1', prBase: 'main', mode: 'feature', reason: 'head differs from base' },
  'head != base resolves feature with PR head into base',
);
assert.deepStrictEqual(
  jsonOf(['--head', 'develop', '--base', 'develop', '--config-base', 'main']),
  {
    head: 'develop',
    prBase: 'main',
    mode: 'shared-head',
    reason: 'stay head equals run base; PR head into config base',
  },
  'stay head on run base resolves shared-head with PR head into config base',
);
assert.deepStrictEqual(
  jsonOf(['--head', 'main', '--base', 'main', '--config-base', 'main']).mode,
  'push-only',
  'head equals both bases resolves push-only',
);
assert.strictEqual(
  jsonOf(['--head', 'main', '--base', 'main', '--config-base', 'main']).prBase,
  null,
  'push-only carries no PR base',
);
assert.strictEqual(
  jsonOf(['--head', 'develop', '--base', 'develop']).mode,
  'push-only',
  'stay head with no config base resolves push-only',
);

// 2. Fail closed.
for (const args of [['--base', 'main'], ['--head', 'HEAD', '--base', 'main'], ['--head', 'x', '--base', 'y', '--bogus']]) {
  const proc = run(args);
  assert.strictEqual(proc.status, 2, `resolver exits 2 for ${args.join(' ')} (got ${proc.status})`);
}
assert.match(run(['--base', 'main']).stderr || '', /usage:/, 'fail-closed prints usage');

// 3. Contract surface.
for (const doc of DOCS) {
  const body = fs.readFileSync(path.join(REPO_ROOT, doc), 'utf8');
  assert(body.includes('shared-head'), `${doc} must reference the shared-head rule`);
}

// 4. Read-only helper.
const source = fs.readFileSync(RESOLVER, 'utf8');
for (const banned of ['writeFileSync', 'appendFileSync', 'truncateSync', 'createWriteStream', 'rmSync', 'unlinkSync']) {
  assert(!source.includes(banned), `resolve_ship_refs.cjs must not call ${banned}`);
}

console.log('test-ws-ship-refs: ok');
