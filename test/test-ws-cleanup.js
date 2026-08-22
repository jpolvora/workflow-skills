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
    JSON.stringify({
      plans: { dir: '.agents/plans' },
      reviews: { dir: '.agents/codereviews' },
    }, null, 2),
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

  const reviews = path.join(tmp, '.agents', 'codereviews');
  fs.mkdirSync(reviews, { recursive: true });
  fs.writeFileSync(path.join(reviews, 'PR-222-round-1.md'), '# review\n', 'utf8');
  fs.writeFileSync(path.join(reviews, 'notes.md'), 'keep\n', 'utf8');

  // Active plan: new scratch names
  fs.writeFileSync(
    path.join(active, 'audit-active-slug-20260101T000000Z.log.md'),
    '# audit\n',
    'utf8',
  );
  fs.writeFileSync(path.join(active, 'post-bootstrap-commits.md'), 'c1\n', 'utf8');

  // Partially tracked shipped plan: refined plan committed, leftovers untracked
  const partial = path.join(plans, 'partial-shipped');
  fs.mkdirSync(partial, { recursive: true });
  fs.writeFileSync(
    path.join(partial, 'partial-shipped-20260101T000000Z.state.md'),
    'status: completed\nslug: partial-shipped\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(partial, 'step-02-partial-shipped.plan.refined.md'),
    '# refined\n',
    'utf8',
  );
  fs.writeFileSync(path.join(partial, 'step-08-partial-shipped.result.md'), 'done\n', 'utf8');
  fs.writeFileSync(
    path.join(partial, 'audit-partial-shipped-20260101T000000Z.log.md'),
    '# audit\n',
    'utf8',
  );

  // tracked product + partial refined plan
  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src', 'app.js'), 'console.log(1)\n', 'utf8');
  git(tmp, 'add', 'src/app.js', '.agents/plans/partial-shipped/step-02-partial-shipped.plan.refined.md');
  git(tmp, 'commit', '-m', 'init', '-q');

  // root cleanup temp file
  fs.writeFileSync(path.join(tmp, '.tmp-ws-cleanup-approved.json'), '{"paths":[]}\n', 'utf8');

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
  assert(
    paths.includes('.agents/plans/active-slug/audit-active-slug-20260101T000000Z.log.md'),
    'audit log scratch listed',
  );
  assert(
    paths.includes('.agents/plans/active-slug/post-bootstrap-commits.md'),
    'post-bootstrap scratch listed',
  );
  assert(
    !paths.includes('.agents/plans/partial-shipped'),
    'partially tracked shipped root not deleted wholesale',
  );
  assert(
    paths.includes('.agents/plans/partial-shipped/step-08-partial-shipped.result.md'),
    'shipped orphan result listed',
  );
  assert(
    paths.includes('.agents/plans/partial-shipped/partial-shipped-20260101T000000Z.state.md'),
    'shipped orphan state listed',
  );
  assert(
    !paths.includes('.agents/plans/partial-shipped/step-02-partial-shipped.plan.refined.md'),
    'tracked refined plan not listed',
  );
  assert(
    paths.includes('.agents/codereviews/PR-222-round-1.md'),
    'codereview PR*.md listed',
  );
  assert(
    !paths.includes('.agents/codereviews/notes.md'),
    'non-PR review file not listed',
  );
  assert(
    paths.includes('.tmp-ws-cleanup-approved.json'),
    'tmp cleanup approved file listed',
  );
  assert(!paths.some((p) => p.startsWith('src/')), 'no product paths');
  assert(
    json.gitignoreSuggestions.some((g) => g.pattern.endsWith('audit-*.log.md')),
    'gitignore suggests audit log pattern',
  );

  const pathsFile = path.join(tmp, 'approved.json');
  fs.writeFileSync(
    pathsFile,
    JSON.stringify({
      paths: [
        '.agents/plans/active-slug/.runtime',
        '.agents/codereviews/PR-222-round-1.md',
      ],
    }),
    'utf8',
  );
  const hubConfig = path.join(shared, 'config.json');
  const traversalFile = path.join(tmp, 'approved-traversal.json');
  fs.writeFileSync(
    traversalFile,
    JSON.stringify({
      paths: [
        '.tmp-x/../../.agents/skills/ws-shared/config.json',
        '.agents/plans/../../.agents/skills/ws-shared/config.json',
      ],
    }),
    'utf8',
  );
  const traversal = run(
    'node',
    [APPLY, '--repo-root', tmp, '--confirm', '--paths-file', traversalFile],
    tmp,
  );
  assert(traversal.status === 0, 'traversal apply_cleanup exit 0');
  const traversalJson = JSON.parse(traversal.stdout);
  assert(traversalJson.deleted.length === 0, 'traversal paths not deleted');
  assert(
    traversalJson.skipped.every((s) => s.reason === 'outside-enclosure'),
    'traversal skipped as outside-enclosure',
  );
  assert(fs.existsSync(hubConfig), 'hub config survives traversal paths');

  fs.writeFileSync(path.join(plans, 'index.json'), '{"schemaVersion":1,"workflows":[]}\n', 'utf8');
  const indexFile = path.join(tmp, 'approved-index.json');
  fs.writeFileSync(
    indexFile,
    JSON.stringify({ paths: ['.agents/plans/index.json'] }),
    'utf8',
  );
  const indexGuard = run(
    'node',
    [APPLY, '--repo-root', tmp, '--confirm', '--paths-file', indexFile],
    tmp,
  );
  assert(indexGuard.status === 0, 'index.json apply_cleanup exit 0');
  const indexJson = JSON.parse(indexGuard.stdout);
  assert(indexJson.deleted.length === 0, 'plans index not deleted');
  assert(
    indexJson.skipped.some((s) => s.path === '.agents/plans/index.json' && s.reason === 'outside-enclosure'),
    'plans index skipped as outside-enclosure',
  );
  assert(fs.existsSync(path.join(plans, 'index.json')), 'plans index survives cleanup');

  const applied = run(
    'node',
    [APPLY, '--repo-root', tmp, '--confirm', '--paths-file', pathsFile],
    tmp,
  );
  assert(applied.status === 0, 'apply_cleanup exit 0');
  const appliedJson = JSON.parse(applied.stdout);
  assert(appliedJson.deleted.includes('.agents/plans/active-slug/.runtime'), 'runtime deleted');
  assert(appliedJson.deleted.includes('.agents/codereviews/PR-222-round-1.md'), 'PR review deleted');
  assert(!fs.existsSync(path.join(active, '.runtime')), 'runtime gone on disk');
  assert(!fs.existsSync(path.join(reviews, 'PR-222-round-1.md')), 'PR review gone on disk');
  assert(fs.existsSync(path.join(reviews, 'notes.md')), 'non-PR review kept');

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
