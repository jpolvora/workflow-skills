/**
 * ws-cleanup list/apply enclosure tests.
 * Run: node test/test-ws-cleanup.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const LIST = path.join(REPO_ROOT, '.agents/skills/ws-cleanup/scripts/list_disposable.cjs');
const APPLY = path.join(REPO_ROOT, '.agents/skills/ws-cleanup/scripts/apply_cleanup.cjs');

let failures = 0;
function ok(msg) {
  console.log(`✅ ${msg}`);
}
function fail(msg) {
  console.error(`❌ ${msg}`);
  failures += 1;
}
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

function run(cmd, args, cwd) {
  return cp.spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
  });
}

function git(cwd, ...args) {
  return run('git', args, cwd);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-cleanup-'));
try {
  git(tmp, 'init', '-q');
  git(tmp, 'config', 'user.email', 'test@example.com');
  git(tmp, 'config', 'user.name', 'test');

  const plans = path.join(tmp, '.agents', 'plans');
  const shared = path.join(tmp, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.writeFileSync(
    path.join(shared, 'config.json'),
    JSON.stringify({ plans: { dir: '.agents/plans' } }, null, 2),
    'utf8',
  );

  const shipped = path.join(plans, 'done-slug');
  fs.mkdirSync(path.join(shipped, 'telemetry'), { recursive: true });
  fs.writeFileSync(path.join(shipped, 'telemetry', 'step-01.jsonl'), '{}\n', 'utf8');
  fs.writeFileSync(
    path.join(shipped, 'done-slug-20260101T000000Z.state.md'),
    'status: completed\nslug: done-slug\n',
    'utf8',
  );

  const active = path.join(plans, 'active-slug');
  fs.mkdirSync(path.join(active, '.runtime'), { recursive: true });
  fs.writeFileSync(path.join(active, '.runtime', 'final.md'), 'x', 'utf8');
  fs.writeFileSync(
    path.join(active, 'active-slug-20260101T000000Z.state.md'),
    'status: active\nslug: active-slug\n',
    'utf8',
  );

  // tracked product file must never appear as candidate
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src', 'app.js'), 'console.log(1)\n', 'utf8');
  git(tmp, 'add', 'src/app.js');
  git(tmp, 'commit', '-m', 'init', '-q');

  const listed = run('node', [LIST, '--repo-root', tmp, '--plans-dir', '.agents/plans'], tmp);
  assert(listed.status === 0, 'list_disposable exit 0');
  const json = JSON.parse(listed.stdout);
  assert(json.ok === true, 'list ok');
  const paths = json.candidates.map((c) => c.path);
  assert(
    paths.includes('.agents/plans/done-slug'),
    'shipped plan listed',
  );
  assert(
    !paths.includes('.agents/plans/active-slug'),
    'active plan root not listed',
  );
  assert(
    paths.includes('.agents/plans/active-slug/.runtime'),
    'active plan scratch listed',
  );
  assert(!paths.some((p) => p.startsWith('src/')), 'no product paths');

  const pathsFile = path.join(tmp, 'approved.json');
  fs.writeFileSync(
    pathsFile,
    JSON.stringify({ paths: ['.agents/plans/active-slug/.runtime'] }),
    'utf8',
  );
  const applied = run(
    'node',
    [APPLY, '--repo-root', tmp, '--confirm', '--paths-file', pathsFile],
    tmp,
  );
  assert(applied.status === 0, 'apply_cleanup exit 0');
  const appliedJson = JSON.parse(applied.stdout);
  assert(appliedJson.deleted.includes('.agents/plans/active-slug/.runtime'), 'runtime deleted');
  assert(!fs.existsSync(path.join(active, '.runtime')), 'runtime gone on disk');

  // refuse without --confirm
  const refused = run('node', [APPLY, '--repo-root', tmp, '--paths-file', pathsFile], tmp);
  assert(refused.status !== 0, 'apply refuses without --confirm');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll ws-cleanup tests passed');
