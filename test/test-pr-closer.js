/**
 * ensure_pr_closer.cjs: PR body carries a GitHub auto-close keyword so merging
 * the PR closes the source issue. Idempotent; no-op for null ids and non-GitHub
 * providers.
 * Run: node test/test-pr-closer.js
 */
import assert from 'node:assert';
import cp from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const CLOSER = path.join(REPO_ROOT, '.agents/skills/ws-ship-pr/scripts/ensure_pr_closer.cjs');

function run(args, cwd) {
  return cp.spawnSync(process.execPath, [CLOSER, ...args], { cwd, encoding: 'utf8' });
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-pr-closer-'));
try {
  // 1. Null tracker id -> skipped, nothing written.
  const empty = path.join(root, 'empty-null.md');
  let res = run(['--body-file', empty, '--id', 'null']);
  assert.strictEqual(res.status, 0, `null id exits 0: ${res.stderr}`);
  assert.strictEqual(JSON.parse(res.stdout).status, 'skipped', 'null id is skipped');
  assert(!fs.existsSync(empty), 'null id does not create the body file');

  // 2. Non-GitHub provider -> skipped, nothing written.
  const ado = path.join(root, 'ado.md');
  res = run(['--body-file', ado, '--id', '42', '--provider', 'azure-devops']);
  assert.strictEqual(res.status, 0, `ado exits 0: ${res.stderr}`);
  assert.strictEqual(JSON.parse(res.stdout).status, 'skipped', 'ado provider is skipped');
  assert(!fs.existsSync(ado), 'ado provider does not write the body file');

  // 3. Missing body file + valid id -> created with the closer.
  const created = path.join(root, 'nested', 'created.md');
  res = run(['--body-file', created, '--id', '42']);
  assert.strictEqual(res.status, 0, `create exits 0: ${res.stderr}`);
  const createdJson = JSON.parse(res.stdout);
  assert.strictEqual(createdJson.status, 'ok', 'create status ok');
  assert.strictEqual(createdJson.added, true, 'create added flag');
  assert.strictEqual(createdJson.created, true, 'create created flag');
  assert(/Closes #42/.test(fs.readFileSync(created, 'utf8')), 'created body carries Closes #42');

  // 4. Existing body -> closer appended; byte-idempotent on re-run.
  const body = path.join(root, 'rich.md');
  fs.writeFileSync(body, '## Summary\n\nShipped the thing.\n', 'utf8');
  res = run(['--body-file', body, '--id', '7']);
  assert.strictEqual(res.status, 0, `append exits 0: ${res.stderr}`);
  const appended = fs.readFileSync(body, 'utf8');
  assert(/Closes #7/.test(appended), 'closer appended to existing body');
  assert(/Shipped the thing\./.test(appended), 'existing body content preserved');
  const afterFirst = fs.readFileSync(body);
  res = run(['--body-file', body, '--id', '7']);
  assert.strictEqual(JSON.parse(res.stdout).status, 'unchanged', 'second run unchanged');
  assert(afterFirst.equals(fs.readFileSync(body)), 're-run is byte-identical');

  // 5. Existing keyword (Fixes/Resolves, case-insensitive) -> unchanged.
  for (const keyword of ['Fixes #9', 'resolves #9', 'Closes: #9']) {
    const file = path.join(root, `kw-${keyword.replace(/[^a-z]/gi, '')}.md`);
    fs.writeFileSync(file, `Body\n\n${keyword}\n`, 'utf8');
    const before = fs.readFileSync(file);
    res = run(['--body-file', file, '--id', '9']);
    assert.strictEqual(JSON.parse(res.stdout).status, 'unchanged', `${keyword} recognized as a closer`);
    assert(before.equals(fs.readFileSync(file)), `${keyword} leaves body byte-identical`);
  }

  // 6. A closer for a different id does not satisfy the requested id.
  const other = path.join(root, 'other.md');
  fs.writeFileSync(other, 'Body\n\nCloses #1\n', 'utf8');
  res = run(['--body-file', other, '--id', '2']);
  assert.strictEqual(JSON.parse(res.stdout).status, 'ok', 'different id still appends');
  assert(/Closes #2/.test(fs.readFileSync(other, 'utf8')), 'adds the requested id');

  // 7. dry-run never writes.
  const dry = path.join(root, 'dry.md');
  res = run(['--body-file', dry, '--id', '5', '--dry-run']);
  assert.strictEqual(res.status, 0, `dry-run exits 0: ${res.stderr}`);
  const dryJson = JSON.parse(res.stdout);
  assert.strictEqual(dryJson.status, 'dry-run', 'dry-run status');
  assert(/Closes #5/.test(dryJson.body || ''), 'dry-run prints the planned body');
  assert(!fs.existsSync(dry), 'dry-run does not create the file');

  // 8. Invalid id -> skipped.
  const invalid = path.join(root, 'invalid.md');
  res = run(['--body-file', invalid, '--id', 'abc']);
  assert.strictEqual(JSON.parse(res.stdout).status, 'skipped', 'invalid id is skipped');
  assert(!fs.existsSync(invalid), 'invalid id does not write');

  // 9. Missing --body-file -> arg error.
  res = run(['--id', '3']);
  assert.strictEqual(res.status, 2, 'missing --body-file is an arg error');

  console.log('test-pr-closer: ok');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
