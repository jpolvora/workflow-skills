/**
 * ws-spec-archive scan/apply enclosure tests.
 * Run: node test/test-ws-spec-archive.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SCAN = path.join(REPO_ROOT, '.agents/skills/ws-spec-archive/scripts/scan_plans.cjs');
const APPLY = path.join(REPO_ROOT, '.agents/skills/ws-spec-archive/scripts/apply_archive.cjs');

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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-spec-archive-'));
try {
  git(tmp, 'init', '-q');
  git(tmp, 'config', 'user.email', 'test@example.com');
  git(tmp, 'config', 'user.name', 'test');

  const plans = path.join(tmp, '.agents', 'plans');
  const specs = path.join(tmp, '.agents', 'specs');
  const shared = path.join(tmp, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(shared, { recursive: true });
  fs.mkdirSync(specs, { recursive: true });
  fs.writeFileSync(
    path.join(shared, 'config.json'),
    JSON.stringify({
      plans: { dir: '.agents/plans', specsDir: '.agents/specs' },
    }, null, 2),
    'utf8',
  );

  const shipped = path.join(plans, 'done-slug');
  fs.mkdirSync(shipped, { recursive: true });
  fs.writeFileSync(
    path.join(shipped, 'done-slug-20260101T000000Z.state.md'),
    [
      '---',
      'slug: done-slug',
      'title: "Shipped feature"',
      'status: completed',
      'currentStep: 8',
      'prNumber: 99',
      'prUrl: https://example.test/pull/99',
      'endedAt: "2026-08-01T00:00:00Z"',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );
  fs.writeFileSync(path.join(shipped, 'step-08-done-slug.result.md'), 'shipped\n', 'utf8');
  fs.writeFileSync(path.join(specs, 'done-slug.spec.md'), '# done-slug\n', 'utf8');

  const active = path.join(plans, 'active-slug');
  fs.mkdirSync(active, { recursive: true });
  fs.writeFileSync(
    path.join(active, 'active-slug-20260101T000000Z.state.md'),
    '---\nslug: active-slug\nstatus: active\ncurrentStep: 4\n---\n',
    'utf8',
  );

  fs.writeFileSync(
    path.join(specs, 'index.PRD'),
    [
      '# Fixture — Specification Index',
      '',
      '## 7. Feature map by phase',
      '',
      '- [ ] Keep this bullet (`spec: done-slug.spec.md`)',
      '',
      '## 10. Done log',
      '',
      '| Date | Slug | Title | PR / Commit |',
      '|------|------|-------|-------------|',
      '',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(
    path.join(plans, 'index.json'),
    JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      generatedAt: '2026-08-01T00:00:00Z',
      workflows: [
        {
          workflowId: 'done-slug-1',
          slug: 'done-slug',
          pipeline: 'standard',
          statePath: '.agents/plans/done-slug/done-slug-20260101T000000Z.state.md',
          stateSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          status: 'completed',
          currentStep: 8,
          updatedAt: '2026-08-01T00:00:00Z',
          runPath: '.agents/plans/done-slug/run.json',
        },
        {
          workflowId: 'active-slug-1',
          slug: 'active-slug',
          pipeline: 'lite',
          statePath: '.agents/plans/active-slug/active-slug-20260101T000000Z.state.md',
          stateSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          status: 'active',
          currentStep: 4,
          updatedAt: '2026-08-01T00:00:00Z',
          runPath: '.agents/plans/active-slug/run.json',
        },
      ],
    }, null, 2),
    'utf8',
  );

  fs.mkdirSync(path.join(tmp, 'src'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'src', 'app.js'), 'console.log(1)\n', 'utf8');
  git(tmp, 'add', 'src/app.js', '.agents/specs/done-slug.spec.md', '.agents/specs/index.PRD');
  git(tmp, 'commit', '-m', 'init done-slug', '-q');

  const scanned = run('node', [
    SCAN,
    '--repo-root', tmp,
    '--plans-dir', '.agents/plans',
    '--specs-dir', '.agents/specs',
  ], tmp);
  assert(scanned.status === 0, 'scan_plans exit 0');
  if (scanned.status !== 0) fail(scanned.stderr || scanned.stdout);
  const inv = JSON.parse(scanned.stdout);
  assert(inv.ok === true, 'scan ok');
  const done = inv.plans.find((p) => p.slug === 'done-slug');
  const live = inv.plans.find((p) => p.slug === 'active-slug');
  assert(Boolean(done) && done.eligible === true, 'completed plan eligible');
  assert(Boolean(live) && live.eligible === false, 'active plan not eligible');
  assert(done && done.outcome === 'shipped', 'completed maps to shipped');
  assert(done && done.specOfRecord === '.agents/specs/done-slug.spec.md', 'spec of record linked');

  const invFile = path.join(tmp, 'inventory.json');
  done.summary = 'Shipped the fixture feature';
  fs.writeFileSync(invFile, JSON.stringify(inv, null, 2), 'utf8');

  const refused = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', invFile,
    '--write-index',
  ], tmp);
  assert(refused.status !== 0, 'apply refuses without --confirm');

  const preview = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', invFile,
    '--write-index',
    '--dry-run',
  ], tmp);
  assert(preview.status === 0, 'dry-run write-index exit 0');
  const previewJson = JSON.parse(preview.stdout);
  assert(previewJson.dryRun === true, 'dry-run flag set');
  assert(
    fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8').includes('Keep this bullet'),
    'dry-run does not rewrite index',
  );

  const written = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', invFile,
    '--write-index',
    '--confirm',
  ], tmp);
  assert(written.status === 0, 'write-index exit 0');
  const index1 = fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8');
  assert(index1.includes('Keep this bullet'), 'feature map preserved');
  assert(index1.includes('`done-slug`'), 'archive row for shipped slug');
  assert(index1.includes('shipped'), 'archive outcome shipped');
  assert(/done-slug/.test(index1.split('## 10. Done log')[1] || ''), 'done log appended');

  const again = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', invFile,
    '--write-index',
    '--confirm',
  ], tmp);
  assert(again.status === 0, 'idempotent write-index exit 0');
  const againJson = JSON.parse(again.stdout);
  assert(againJson.doneLogAppended.length === 0, 'done log not duplicated');

  const slugsFile = path.join(tmp, 'approved.json');
  fs.writeFileSync(slugsFile, JSON.stringify({ slugs: ['done-slug'] }), 'utf8');
  const deleted = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', invFile,
    '--delete-plans',
    '--slugs-file', slugsFile,
    '--confirm',
  ], tmp);
  assert(deleted.status === 0, 'delete-plans exit 0');
  assert(!fs.existsSync(shipped), 'eligible plan dir removed');
  assert(fs.existsSync(active), 'active plan dir kept');
  assert(fs.existsSync(path.join(specs, 'done-slug.spec.md')), 'spec of record kept');
  const plansIndex = JSON.parse(fs.readFileSync(path.join(plans, 'index.json'), 'utf8'));
  assert(
    !plansIndex.workflows.some((w) => w.slug === 'done-slug'),
    'plans index drops deleted slug',
  );
  assert(
    plansIndex.workflows.some((w) => w.slug === 'active-slug'),
    'plans index keeps active slug',
  );

  const trackedSlug = 'tracked-slug';
  const trackedDir = path.join(plans, trackedSlug);
  fs.mkdirSync(trackedDir, { recursive: true });
  fs.writeFileSync(
    path.join(trackedDir, `${trackedSlug}-20260101T000000Z.state.md`),
    [
      '---',
      `slug: ${trackedSlug}`,
      'title: "Tracked shipped"',
      'status: completed',
      'currentStep: 8',
      '---',
      '',
    ].join('\n'),
    'utf8',
  );
  git(tmp, 'add', '-A');
  git(tmp, 'commit', '-q', '-m', 'track plan artifacts');
  const trackedInv = {
    plansDir: '.agents/plans',
    specsDir: '.agents/specs',
    indexPath: '.agents/specs/index.PRD',
    plans: [
      {
        slug: trackedSlug,
        eligible: true,
        status: 'completed',
        relPath: `.agents/plans/${trackedSlug}`,
      },
    ],
  };
  const trackedInvFile = path.join(tmp, 'tracked-inventory.json');
  fs.writeFileSync(trackedInvFile, JSON.stringify(trackedInv), 'utf8');
  const trackedSlugsFile = path.join(tmp, 'tracked-approved.json');
  fs.writeFileSync(trackedSlugsFile, JSON.stringify({ slugs: [trackedSlug] }), 'utf8');
  const trackedDelete = run('node', [
    APPLY,
    '--repo-root', tmp,
    '--inventory-file', trackedInvFile,
    '--delete-plans',
    '--slugs-file', trackedSlugsFile,
    '--confirm',
  ], tmp);
  assert(trackedDelete.status === 0, 'tracked delete-plans exit 0');
  const trackedJson = JSON.parse(trackedDelete.stdout);
  assert(
    trackedJson.skipped.some((s) => s.slug === trackedSlug && s.reason === 'tracked-partial'),
    'tracked plan skipped as tracked-partial',
  );
  assert(fs.existsSync(trackedDir), 'tracked plan dir kept');

  const prefixedTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-spec-archive-prefixed-'));
  try {
    git(prefixedTmp, 'init', '-q');
    git(prefixedTmp, 'config', 'user.email', 'test@example.com');
    git(prefixedTmp, 'config', 'user.name', 'test');
    const prefixedPlans = path.join(prefixedTmp, '.agents', 'plans');
    const prefixedSpecs = path.join(prefixedTmp, '.agents', 'specs');
    const prefixedShared = path.join(prefixedTmp, '.agents', 'skills', 'ws-shared');
    fs.mkdirSync(prefixedShared, { recursive: true });
    fs.mkdirSync(prefixedSpecs, { recursive: true });
    fs.writeFileSync(
      path.join(prefixedShared, 'config.json'),
      JSON.stringify({ plans: { dir: '.agents/plans', specsDir: '.agents/specs' } }, null, 2),
      'utf8',
    );
    const prefixedShipped = path.join(prefixedPlans, 'done-slug');
    fs.mkdirSync(prefixedShipped, { recursive: true });
    fs.writeFileSync(
      path.join(prefixedShipped, 'done-slug-20260101T000000Z.state.md'),
      [
        '---',
        'slug: done-slug',
        'title: "Shipped feature"',
        'status: completed',
        'currentStep: 8',
        'prNumber: 99',
        'prUrl: https://example.test/pull/99',
        'endedAt: "2026-08-01T00:00:00Z"',
        '---',
        '',
      ].join('\n'),
      'utf8',
    );
    fs.writeFileSync(path.join(prefixedSpecs, '0099-done-slug.spec.md'), '# done-slug (prefixed board name)\n', 'utf8');
    git(prefixedTmp, 'add', '.agents/specs/0099-done-slug.spec.md');
    git(prefixedTmp, 'commit', '-m', 'prefixed spec-of-record', '-q');
    const prefixedScan = run('node', [
      SCAN,
      '--repo-root', prefixedTmp,
      '--plans-dir', '.agents/plans',
      '--specs-dir', '.agents/specs',
    ], prefixedTmp);
    assert(prefixedScan.status === 0, 'scan_plans exit 0 with prefixed spec-of-record');
    const prefixedInv = JSON.parse(prefixedScan.stdout);
    const prefixedDone = prefixedInv.plans.find((p) => p.slug === 'done-slug');
    assert(
      prefixedDone && prefixedDone.specOfRecord === '.agents/specs/0099-done-slug.spec.md',
      'specOfRecordPath resolves NNNN-{slug}.spec.md when unprefixed file is absent',
    );
  } finally {
    fs.rmSync(prefixedTmp, { recursive: true, force: true });
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

if (failures) {
  console.error(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nAll ws-spec-archive tests passed');
