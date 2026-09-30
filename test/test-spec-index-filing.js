/**
 * Fixture coverage for the deterministic spec-index sync filing + close
 * verification + harness gate (us-474).
 * Run: node test/test-spec-index-filing.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SYNC = path.join(REPO, '.agents/skills/ws-spec-index/scripts/sync_index.cjs');
const VERIFY = path.join(REPO, '.agents/skills/ws-spec-index/scripts/verify_close_filing.cjs');
const CHECK = path.join(REPO, '.agents/skills/ws-check-harness/scripts/check_spec_filing.cjs');

function createProject({ statusSubfolders = true } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-filing-'));
  fs.mkdirSync(path.join(tmp, '.ws'), { recursive: true });
  fs.mkdirSync(path.join(tmp, '.agents', 'specs', 'pending'), { recursive: true });
  const config = { plans: { specsDir: '.agents/specs', statusSubfolders, autoOrganizeByStatus: false } };
  fs.writeFileSync(path.join(tmp, '.ws', 'config.json'), JSON.stringify(config, null, 2), 'utf8');
  return tmp;
}

function writeSpec(dir, fileName, { slug, title } = {}) {
  const fm = `---\nslug: ${slug}\ntitle: ${title || slug}\nspecDate: 2026-09-30\n---\n\n# ${title || slug}\n`;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), fm, 'utf8');
}

const INDEX = `# Spec Index

## 7. Feature map by phase

### Phase 1: Core
- [ ] Shipped Spec (\`spec: pending/0005-us-474.spec.md\`)

## 8. Next specs

| # | Spec | Status | Target Phase | Notes |
|---|------|--------|--------------|-------|
| 1 | \`us-474\` | \`[ ]\` todo | Phase 1 | Shipped Spec |

## 10. Done log

| Date | Slug | Title | PR / Commit |
|------|------|-------|-------------|
`;

function run(script, args, cwd = REPO) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd });
}

// AC1 + AC2: sync files spec + sidecars to completed and rewrites refs.
function testSyncFilesSpecAndSidecarsToCompleted() {
  const tmp = createProject();
  writeSpec(path.join(tmp, '.agents/specs/pending'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(path.join(tmp, '.agents/specs/pending/0005-us-474.context.md'), '# ctx\n', 'utf8');
  fs.mkdirSync(path.join(tmp, '.agents/specs/pending/0005-us-474.assets'), { recursive: true });
  fs.writeFileSync(path.join(tmp, '.agents/specs/pending/0005-us-474.assets/shot.png'), 'png', 'utf8');
  fs.writeFileSync(path.join(tmp, '.agents/specs/index.PRD'), INDEX, 'utf8');

  const res = run(SYNC, ['--repo-root', tmp, '--slug', 'us-474', '--delivery-commit', 'a'.repeat(40)]);
  assert.strictEqual(res.status, 0, res.stderr || res.stdout);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.status, 'synced', 'status synced');
  assert.ok(fs.existsSync(path.join(tmp, '.agents/specs/completed/0005-us-474.spec.md')), 'spec filed to completed/');
  assert.ok(fs.existsSync(path.join(tmp, '.agents/specs/completed/0005-us-474.context.md')), 'context sidecar filed');
  assert.ok(fs.existsSync(path.join(tmp, '.agents/specs/completed/0005-us-474.assets/shot.png')), 'assets sidecar filed');
  assert.ok(!fs.existsSync(path.join(tmp, '.agents/specs/pending/0005-us-474.spec.md')), 'pending copy removed');
  const idx = fs.readFileSync(path.join(tmp, '.agents/specs/index.PRD'), 'utf8');
  assert.match(idx, /- \[x\] Shipped Spec \(`spec: completed\/0005-us-474\.spec\.md`\)/, 'bullet checked + ref rewritten');
  assert.match(idx, /\|\s*`\[x\]`/, 'next-specs status cell checked');
  assert.match(idx, /\|\s*`us-474`\s*\|\s*Shipped Spec\s*\|/, 'done-log row appended');
}

// AC3: filing failure is reported outstanding (dirty overlap), never silent.
function testSyncReportsOutstandingWhenFilingFails() {
  const tmp = createProject();
  writeSpec(path.join(tmp, '.agents/specs/pending'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(path.join(tmp, '.agents/specs/index.PRD'), INDEX, 'utf8');
  const gitOpts = { cwd: tmp, encoding: 'utf8' };
  assert.strictEqual(spawnSync('git', ['init'], gitOpts).status, 0);
  spawnSync('git', ['config', 'user.email', 'test@example.com'], gitOpts);
  spawnSync('git', ['config', 'user.name', 'Test'], gitOpts);
  spawnSync('git', ['add', '-A'], gitOpts);
  assert.strictEqual(spawnSync('git', ['commit', '-m', 'seed'], gitOpts).status, 0);
  fs.appendFileSync(path.join(tmp, '.agents/specs/pending/0005-us-474.spec.md'), '\n# dirty\n', 'utf8');

  const res = run(SYNC, ['--repo-root', tmp, '--slug', 'us-474', '--delivery-commit', 'b'.repeat(40)]);
  assert.strictEqual(res.status, 2, 'outstanding exits non-zero');
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.status, 'outstanding');
  assert.strictEqual(out.filingOutstanding, true);
  assert.strictEqual(out.stalePendingPath, 'pending/0005-us-474.spec.md');
  assert.match(String(out.reason), /dirty overlapping/);
  assert.ok(fs.existsSync(path.join(tmp, '.agents/specs/pending/0005-us-474.spec.md')), 'spec not moved on failure');
  assert.strictEqual(fs.readFileSync(path.join(tmp, '.agents/specs/index.PRD'), 'utf8'), INDEX, 'index untouched when filing outstanding');
}

// AC4 + AC5 + NS1: close verification fails closed naming the stale path.
function testCloseVerifyFailsClosedOnPendingSpec() {
  const tmp = createProject();
  writeSpec(path.join(tmp, '.agents/specs/pending'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(
    path.join(tmp, '.agents/specs/index.PRD'),
    '# Spec Index\n\n- [x] Shipped Spec (`spec: pending/0005-us-474.spec.md`)\n',
    'utf8',
  );
  const res = run(VERIFY, ['--specs-dir', path.join(tmp, '.agents/specs'), '--slug', 'us-474']);
  assert.strictEqual(res.status, 2, 'fails closed');
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.ok, false);
  assert.strictEqual(out.stalePath, 'pending/0005-us-474.spec.md');
  assert.match(res.stderr, /pending\/0005-us-474\.spec\.md/, 'names the stale pending path');
}

// AC7: already-filed / in-agreement is quiet (no re-file, no duplicate Done log).
function testSyncQuietWhenAlreadyFiled() {
  const tmp = createProject();
  writeSpec(path.join(tmp, '.agents/specs/completed'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(
    path.join(tmp, '.agents/specs/index.PRD'),
    `# Spec Index\n\n- [x] Shipped Spec (\`spec: completed/0005-us-474.spec.md\`)\n\n## 10. Done log\n\n| Date | Slug | Title | PR / Commit |\n|------|------|-------|-------------|\n| 2026-09-30 | \`us-474\` | Shipped Spec | abc |\n`,
    'utf8',
  );
  const before = fs.readFileSync(path.join(tmp, '.agents/specs/index.PRD'), 'utf8');
  const res = run(SYNC, ['--repo-root', tmp, '--slug', 'us-474', '--delivery-commit', 'c'.repeat(40)]);
  assert.strictEqual(res.status, 0, res.stderr || res.stdout);
  const out = JSON.parse(res.stdout);
  assert.strictEqual(out.status, 'skipped', 'already in sync');
  assert.strictEqual(out.moved.length, 0, 'no re-file churn');
  assert.strictEqual(fs.readFileSync(path.join(tmp, '.agents/specs/index.PRD'), 'utf8'), before, 'index unchanged');
  const verifyRes = run(VERIFY, ['--specs-dir', path.join(tmp, '.agents/specs'), '--slug', 'us-474']);
  assert.strictEqual(verifyRes.status, 0, 'close verify quiet when agree');
}

// AC6 + NS2: harness gate flags an index [x] ref under pending/, passes a clean board.
function testHarnessFlagsDoneRowWithPendingRef() {
  const dirty = createProject();
  fs.mkdirSync(path.join(dirty, '.agents/specs/pending'), { recursive: true });
  writeSpec(path.join(dirty, '.agents/specs/pending'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(
    path.join(dirty, '.agents/specs/index.PRD'),
    '# Spec Index\n\n- [x] Shipped Spec (`spec: pending/0005-us-474.spec.md`)\n',
    'utf8',
  );
  const flagged = run(CHECK, ['--json', '--repo-root', dirty]);
  assert.strictEqual(flagged.status, 1, 'flags the pending ref');
  const payload = JSON.parse(flagged.stdout);
  assert.strictEqual(payload.ok, false);
  assert.ok(payload.findings.some((f) => f.kind === 'index-ref-pending'), 'reports index-ref-pending');

  const clean = createProject();
  writeSpec(path.join(clean, '.agents/specs/completed'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(
    path.join(clean, '.agents/specs/index.PRD'),
    '# Spec Index\n\n- [x] Shipped Spec (`spec: completed/0005-us-474.spec.md`)\n',
    'utf8',
  );
  const cleanRes = run(CHECK, ['--json', '--repo-root', clean]);
  assert.strictEqual(cleanRes.status, 0, 'clean board passes');
  assert.strictEqual(JSON.parse(cleanRes.stdout).ok, true);

  const doneLog = createProject();
  writeSpec(path.join(doneLog, '.agents/specs/pending'), '0005-us-474.spec.md', { slug: 'us-474', title: 'Shipped Spec' });
  fs.writeFileSync(
    path.join(doneLog, '.agents/specs/index.PRD'),
    '# Spec Index\n\n## 10. Done log\n\n| Date | Slug | Title | PR / Commit |\n|------|------|-------|-------------|\n| 2026-09-30 | `us-474` | Shipped Spec | abc |\n',
    'utf8',
  );
  const doneRes = run(CHECK, ['--json', '--repo-root', doneLog]);
  assert.strictEqual(doneRes.status, 1, 'flags done-log pending entry');
  assert.ok(JSON.parse(doneRes.stdout).findings.some((f) => f.kind === 'done-log-pending'));
}

// NS3: safety — invalid slug rejected; helpers contain no Python.
function testRejectsUnsafeSlug() {
  const tmp = createProject();
  const bad = run(SYNC, ['--repo-root', tmp, '--slug', '../pwned']);
  assert.strictEqual(bad.status, 2, 'traversal slug rejected');
  assert.strictEqual(JSON.parse(bad.stdout).reason, 'invalid slug');
}

testSyncFilesSpecAndSidecarsToCompleted();
testSyncReportsOutstandingWhenFilingFails();
testCloseVerifyFailsClosedOnPendingSpec();
testSyncQuietWhenAlreadyFiled();
testHarnessFlagsDoneRowWithPendingRef();
testRejectsUnsafeSlug();

console.log('All spec-index filing tests passed');
