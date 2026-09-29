/**
 * Test suite for ws-spec-organizer status subfolders (0135)
 * Run: node test/test-spec-organizer.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const RESOLVE_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-organizer/scripts/resolve_spec_path.cjs');
const ORGANIZE_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-organizer/scripts/organize_specs.cjs');
const TRACK_SCRIPT = path.join(REPO, '.agents/skills/ws-spec-index/scripts/track_index.cjs');

console.log('--- Testing ws-spec-organizer status subfolders ---');

function createTempProject({ enforce = false, statusSubfolders = false, autoOrganizeByStatus = false } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-status-test-'));
  const shared = path.join(tmp, '.ws');
  fs.mkdirSync(shared, { recursive: true });
  const specs = path.join(tmp, '.agents', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  const plans = path.join(tmp, '.agents', 'plans');
  fs.mkdirSync(plans, { recursive: true });

  const config = {
    project: { name: 'test-project', baseBranch: 'main' },
    plans: {
      dir: '.agents/plans',
      specsDir: '.agents/specs',
      enforceSpecPrefixOrdering: enforce,
      statusSubfolders,
      autoOrganizeByStatus,
    },
  };
  fs.writeFileSync(path.join(shared, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
  return { tmp, specs, plans, shared };
}

function writeSpec(dir, fileName, { slug, title, status, issueState, specDate } = {}) {
  let fm = '---\n';
  if (slug) fm += `slug: ${slug}\n`;
  if (title) fm += `title: ${title}\n`;
  if (status) fm += `status: ${status}\n`;
  if (issueState) fm += `issueState: ${issueState}\n`;
  if (specDate) fm += `specDate: ${specDate}\n`;
  fm += '---\n';
  fs.writeFileSync(path.join(dir, fileName), `${fm}\n# ${title || slug || fileName}\n`, 'utf8');
}

// 1. Schema & config example (AC1)
console.log('1. Checking plans.statusSubfolders schema and example');
{
  const schema = JSON.parse(fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/runtime/config.schema.json'), 'utf8'));
  assert.ok(schema.properties.plans.properties.statusSubfolders, 'schema defines plans.statusSubfolders');
  assert.strictEqual(schema.properties.plans.properties.statusSubfolders.type, 'boolean');
  assert.strictEqual(schema.properties.plans.properties.statusSubfolders.default, false);

  const configExample = fs.readFileSync(path.join(REPO, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8');
  assert.match(configExample, /"statusSubfolders":\s*false/, 'config.json.example seeds statusSubfolders false');
  assert.ok(schema.properties.plans.properties.autoOrganizeByStatus, 'schema defines plans.autoOrganizeByStatus');
  assert.strictEqual(schema.properties.plans.properties.autoOrganizeByStatus.type, 'boolean');
  assert.strictEqual(schema.properties.plans.properties.autoOrganizeByStatus.default, false);
  assert.match(configExample, /"autoOrganizeByStatus":\s*false/, 'config.json.example seeds autoOrganizeByStatus false');
}

// 2. resolve_spec_path subfolder search (AC2)
console.log('2. Testing resolve_spec_path subfolder search');
{
  const proj = createTempProject({ enforce: true });
  fs.mkdirSync(path.join(proj.specs, 'pending'), { recursive: true });
  fs.mkdirSync(path.join(proj.specs, 'completed'), { recursive: true });
  writeSpec(path.join(proj.specs, 'pending'), '0003-auth.spec.md', { slug: 'auth', title: 'Auth' });
  writeSpec(path.join(proj.specs, 'completed'), '0001-billing.spec.md', { slug: 'billing', title: 'Billing' });

  const res1 = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'auth', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res1.status, 0);
  assert.strictEqual(res1.stdout.trim(), '.agents/specs/pending/0003-auth.spec.md');

  const res2 = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'billing', '--repo-root', proj.tmp, '--json'], { encoding: 'utf8' });
  assert.strictEqual(res2.status, 0);
  const data = JSON.parse(res2.stdout);
  assert.strictEqual(data.specPath, '.agents/specs/completed/0001-billing.spec.md');
  assert.strictEqual(data.existing, true);

  const resCtx = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'auth', '--context', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resCtx.status, 0);
  assert.strictEqual(resCtx.stdout.trim(), '.agents/specs/pending/0003-auth.context.md');
}

// 2b. resolve_spec_path rejects hostile (traversal) slugs (PR #433 review)
console.log('2b. Testing resolve_spec_path hostile-slug guard');
{
  const proj = createTempProject({ enforce: true });
  for (const bad of ['../../pwned', 'a/b', '..', '.hidden']) {
    const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', bad, '--repo-root', proj.tmp], { encoding: 'utf8' });
    assert.notStrictEqual(res.status, 0, `rejects hostile slug ${bad}`);
  }
  const okRes = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', '0001-good', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(okRes.status, 0, `accepts valid slug (${okRes.stderr || ''})`);
  assert.ok(okRes.stdout.trim().startsWith('.agents/specs/'), 'resolved path stays under specsDir');
}

// 3. New specs under pending/ + explicit --status (AC3)
console.log('3. Testing new-spec status resolution');
{
  const proj = createTempProject({ enforce: false, statusSubfolders: true });
  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'fresh', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '.agents/specs/pending/fresh.spec.md');

  const resStatus = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'fresh', '--status', 'completed', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resStatus.status, 0);
  assert.strictEqual(resStatus.stdout.trim(), '.agents/specs/completed/fresh.spec.md');

  // Explicit --status works even when the flag is false.
  const flat = createTempProject({ enforce: false, statusSubfolders: false });
  const resFlat = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'fresh', '--status', 'archived', '--repo-root', flat.tmp], { encoding: 'utf8' });
  assert.strictEqual(resFlat.status, 0);
  assert.strictEqual(resFlat.stdout.trim(), '.agents/specs/archived/fresh.spec.md');

  // Negative 3: flag false and no --status keeps flat resolution.
  const resNeg = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'fresh', '--repo-root', flat.tmp], { encoding: 'utf8' });
  assert.strictEqual(resNeg.status, 0);
  assert.strictEqual(resNeg.stdout.trim(), '.agents/specs/fresh.spec.md');
}

// 4. Global prefix scan (AC4)
console.log('4. Testing global prefix computation');
{
  const proj = createTempProject({ enforce: true, statusSubfolders: true });
  fs.mkdirSync(path.join(proj.specs, 'completed'), { recursive: true });
  writeSpec(proj.specs, '0001-root.spec.md', { slug: 'root', title: 'Root' });
  writeSpec(path.join(proj.specs, 'completed'), '0007-done.spec.md', { slug: 'done', title: 'Done' });

  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'next', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 0);
  assert.strictEqual(res.stdout.trim(), '.agents/specs/pending/0008-next.spec.md');
}

// 5. Ambiguity + invalid status (Negative 1)
console.log('5. Testing ambiguity and invalid status');
{
  const proj = createTempProject({ enforce: true });
  fs.mkdirSync(path.join(proj.specs, 'pending'), { recursive: true });
  fs.mkdirSync(path.join(proj.specs, 'completed'), { recursive: true });
  writeSpec(path.join(proj.specs, 'pending'), 'dup.spec.md', { slug: 'dup', title: 'Dup A' });
  writeSpec(path.join(proj.specs, 'completed'), '0002-dup.spec.md', { slug: 'dup', title: 'Dup B' });

  const res = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'dup', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(res.status, 2, 'duplicate slug across subfolders exits 2');
  assert.match(res.stderr, /Ambiguous spec of record/);

  const resBad = spawnSync(process.execPath, [RESOLVE_SCRIPT, '--slug', 'x', '--status', 'bogus', '--repo-root', proj.tmp], { encoding: 'utf8' });
  assert.strictEqual(resBad.status, 2, 'invalid --status exits 2');
  assert.match(resBad.stderr, /invalid --status/);
}

// 6. organize --by-status dry-run + apply (AC5, AC6, AC7)
console.log('6. Testing organize --by-status');
{
  const proj = createTempProject({ enforce: true, statusSubfolders: true });
  fs.writeFileSync(
    path.join(proj.specs, 'index.PRD'),
    `# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [ ] Ship It (\`spec: ship-it.spec.md\`)\n- [ ] Old News (\`spec: old-news.spec.md\`)\n- [x] Logged Work (\`spec: logged-work.spec.md\`)\n\n## 10. Done log\n\n| Date | Slug | Title | PR / Commit |\n|------|------|-------|-------------|\n| 2026-09-01 | \`logged-work\` | Logged Work | Implemented |\n`,
    'utf8'
  );
  writeSpec(proj.specs, 'ship-it.spec.md', { slug: 'ship-it', title: 'Ship It', status: 'completed' });
  fs.writeFileSync(path.join(proj.specs, 'ship-it.context.md'), '# ctx\n', 'utf8');
  fs.mkdirSync(path.join(proj.specs, 'ship-it.assets'), { recursive: true });
  fs.writeFileSync(path.join(proj.specs, 'ship-it.assets', 'shot.png'), 'png', 'utf8');
  writeSpec(proj.specs, 'old-news.spec.md', { slug: 'old-news', title: 'Old News', issueState: 'closed' });
  writeSpec(proj.specs, 'logged-work.spec.md', { slug: 'logged-work', title: 'Logged Work' });
  writeSpec(proj.specs, 'wip.spec.md', { slug: 'wip', title: 'Wip', status: 'draft' });

  const resDry = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--by-status', '--dry-run', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resDry.status, 0, 'by-status dry-run exits 0');
  const dry = JSON.parse(resDry.stdout);
  assert.strictEqual(dry.mode, 'by-status');
  assert.strictEqual(dry.dryRun, true);
  assert.strictEqual(dry.specsCount, 4);
  const tos = dry.renames.map((r) => r.to).sort();
  assert.ok(tos.includes('completed/ship-it.spec.md'), 'frontmatter status completed files to completed/');
  assert.ok(tos.includes('completed/ship-it.context.md'), 'companion context moves along');
  assert.ok(tos.includes('completed/ship-it.assets'), 'assets sidecar moves along');
  assert.ok(tos.includes('completed/old-news.spec.md'), 'issueState closed files to completed/');
  assert.ok(tos.includes('completed/logged-work.spec.md'), 'Done-log signal files to completed/');
  assert.ok(tos.includes('pending/wip.spec.md'), 'draft files to pending/');

  const resApply = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--by-status', '--apply', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resApply.status, 0, 'by-status apply exits 0');
  assert.ok(fs.existsSync(path.join(proj.specs, 'completed', 'ship-it.spec.md')), 'spec moved');
  assert.ok(fs.existsSync(path.join(proj.specs, 'completed', 'ship-it.context.md')), 'context moved');
  assert.ok(fs.existsSync(path.join(proj.specs, 'completed', 'ship-it.assets', 'shot.png')), 'assets moved');
  assert.ok(!fs.existsSync(path.join(proj.specs, 'ship-it.spec.md')), 'source removed');
  assert.ok(fs.existsSync(path.join(proj.specs, 'pending', 'wip.spec.md')), 'pending filed');

  const updatedPrd = fs.readFileSync(path.join(proj.specs, 'index.PRD'), 'utf8');
  assert.match(updatedPrd, /`spec: completed\/ship-it\.spec\.md`/, 'index spec: ref rewritten to subfolder');
  assert.match(updatedPrd, /`spec: completed\/logged-work\.spec\.md`/, 'checkbox ref rewritten');

  // Idempotent re-apply.
  const resAgain = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--by-status', '--apply', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resAgain.status, 0);
  assert.strictEqual(JSON.parse(resAgain.stdout).renames.length, 0, 'filed board is stable');
}

// 7. Single-spec transition --slug/--status (AC8 helper path)
console.log('7. Testing single-spec transition');
{
  const proj = createTempProject({ enforce: false, statusSubfolders: true });
  fs.mkdirSync(path.join(proj.specs, 'pending'), { recursive: true });
  fs.writeFileSync(path.join(proj.specs, 'index.PRD'), `# Idx\n\n- [ ] Solo (\`spec: pending/solo.spec.md\`)\n`, 'utf8');
  writeSpec(path.join(proj.specs, 'pending'), 'solo.spec.md', { slug: 'solo', title: 'Solo' });

  const res = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--slug', 'solo', '--status', 'completed', '--apply', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(res.status, 0);
  const data = JSON.parse(res.stdout);
  assert.strictEqual(data.mode, 'single');
  assert.deepStrictEqual(data.renames.map((r) => r.to), ['completed/solo.spec.md']);
  assert.ok(fs.existsSync(path.join(proj.specs, 'completed', 'solo.spec.md')));
  const updatedPrd = fs.readFileSync(path.join(proj.specs, 'index.PRD'), 'utf8');
  assert.match(updatedPrd, /`spec: completed\/solo\.spec\.md`/);

  const resBad = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--slug', 'solo'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(resBad.status, 2, '--slug without --status exits 2');
}

// 8. Dirty overlap fail-closed (AC9 / Negative 2)
console.log('8. Testing dirty-overlap guard');
{
  const proj = createTempProject({ enforce: false, statusSubfolders: true });
  const specFile = path.join(proj.specs, 'dirty-one.spec.md');
  writeSpec(proj.specs, 'dirty-one.spec.md', { slug: 'dirty-one', title: 'Dirty One', status: 'completed' });
  const gitOpts = { cwd: proj.tmp, encoding: 'utf8' };
  assert.strictEqual(spawnSync('git', ['init'], gitOpts).status, 0);
  spawnSync('git', ['config', 'user.email', 'test@example.com'], gitOpts);
  spawnSync('git', ['config', 'user.name', 'Test'], gitOpts);
  spawnSync('git', ['add', '.agents/specs/dirty-one.spec.md'], gitOpts);
  assert.strictEqual(spawnSync('git', ['commit', '-m', 'add spec'], gitOpts).status, 0, 'git commit fixture');
  fs.appendFileSync(specFile, '\n# dirty edit\n', 'utf8');

  const res = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--by-status', '--apply', '--json'],
    { encoding: 'utf8' }
  );
  assert.notStrictEqual(res.status, 0, 'dirty overlap exits non-zero');
  assert.match(res.stderr, /dirty overlapping/);
  assert.ok(fs.existsSync(specFile), 'dirty spec not moved');
  assert.ok(!fs.existsSync(path.join(proj.specs, 'completed', 'dirty-one.spec.md')), 'target not created');
}

// 9. track_index subfolder awareness
console.log('9. Testing track_index with subfolder specs');
{
  const proj = createTempProject({ enforce: true, statusSubfolders: true });
  fs.mkdirSync(path.join(proj.specs, 'pending'), { recursive: true });
  fs.writeFileSync(
    path.join(proj.specs, 'index.PRD'),
    `# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [x] Setup (\`spec: 0001-setup.spec.md\`)\n\n## 8. Next specs\n\n| # | Spec | Status | Target Phase | Notes |\n|---|------|--------|--------------|-------|\n| 1 | \`setup\` | \`[x]\` done | Phase 1 | Initial |\n`,
    'utf8'
  );
  writeSpec(path.join(proj.specs, 'pending'), '0002-subfiled.spec.md', { slug: 'subfiled', title: 'Subfiled Spec' });

  const res = spawnSync(
    process.execPath,
    [TRACK_SCRIPT, '--specs-dir', proj.specs, '--slug', 'subfiled'],
    { encoding: 'utf8', cwd: proj.tmp }
  );
  assert.strictEqual(res.status, 0, 'track exits 0');
  assert.strictEqual(JSON.parse(res.stdout).status, 'tracked');
  const updatedIndex = fs.readFileSync(path.join(proj.specs, 'index.PRD'), 'utf8');
  assert.match(updatedIndex, /- \[ \] Subfiled Spec \(`spec: pending\/0002-subfiled\.spec\.md`\)/, 'bullet links subfolder path');

  const resAgain = spawnSync(
    process.execPath,
    [TRACK_SCRIPT, '--specs-dir', proj.specs, '--slug', 'subfiled'],
    { encoding: 'utf8', cwd: proj.tmp }
  );
  assert.strictEqual(JSON.parse(resAgain.stdout).status, 'skipped', 'subfolder ref counts as tracked');
}

// 10. Default prefix mode ignores subfolders (regression)
console.log('10. Testing prefix-mode regression');
{
  const proj = createTempProject({ enforce: false });
  fs.mkdirSync(path.join(proj.specs, 'pending'), { recursive: true });
  writeSpec(proj.specs, 'root-one.spec.md', { slug: 'root-one', title: 'Root One', specDate: '2026-01-01' });
  writeSpec(path.join(proj.specs, 'pending'), '0009-nested.spec.md', { slug: 'nested', title: 'Nested' });

  const res = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--dry-run', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(res.status, 0);
  const data = JSON.parse(res.stdout);
  assert.strictEqual(data.mode, 'prefix');
  assert.strictEqual(data.specsCount, 1, 'prefix mode scans root only');
  assert.ok(data.renames.every((r) => !r.from.includes('/') && !r.to.includes('/')), 'no subfolder renames in prefix mode');
}

// 11. autoOrganizeByStatus applies by-status without extra flags
console.log('11. Testing plans.autoOrganizeByStatus');
{
  const proj = createTempProject({ statusSubfolders: true, autoOrganizeByStatus: true });
  writeSpec(proj.specs, 'done-one.spec.md', { slug: 'done-one', title: 'Done One', status: 'completed' });
  const res = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', proj.tmp, '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(res.status, 0, res.stderr);
  const data = JSON.parse(res.stdout);
  assert.strictEqual(data.mode, 'by-status');
  assert.strictEqual(data.dryRun, false);
  assert.ok(fs.existsSync(path.join(proj.specs, 'completed', 'done-one.spec.md')), 'auto switch filed completed spec');

  const preview = createTempProject({ statusSubfolders: true, autoOrganizeByStatus: true });
  writeSpec(preview.specs, 'done-two.spec.md', { slug: 'done-two', title: 'Done Two', status: 'completed' });
  const dry = spawnSync(
    process.execPath,
    [ORGANIZE_SCRIPT, '--repo-root', preview.tmp, '--dry-run', '--json'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(dry.status, 0, dry.stderr);
  assert.strictEqual(JSON.parse(dry.stdout).dryRun, true);
  assert.ok(fs.existsSync(path.join(preview.specs, 'done-two.spec.md')), '--dry-run does not move');
}

console.log('--- All ws-spec-organizer status-subfolder tests PASSED ---');
