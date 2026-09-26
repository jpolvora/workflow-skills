/**
 * Shared-artifact writer tests (0138 AC9/AC10): spec-index, wiki,
 * self-learning, and changelog writers update owned rows/sections, preserve
 * concurrent foreign edits, and re-run idempotently over unchanged content.
 * Run: node test/test-shared-artifact-writers.js
 */
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const TRACK = path.join(REPO_ROOT, '.agents', 'skills', 'ws-spec-index', 'scripts', 'track_index.cjs');
const WIKI_SYNC = path.join(REPO_ROOT, '.agents', 'skills', 'ws-wiki', 'scripts', 'sync_wiki_index.cjs');
const COMPILE = path.join(REPO_ROOT, '.agents', 'skills', 'ws-self-learning', 'scripts', 'self_learning.cjs');
const CHANGELOG = path.join(REPO_ROOT, '.agents', 'skills', 'ws-changelog', 'scripts', 'append_changelog.cjs');

console.log('--- Testing shared-artifact writers ---');

const tmpRoots = [];
function mkTmp(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(dir);
  return dir;
}
function run(script, args, cwd) {
  return cp.spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}
function writeConsumer(dir, extra = {}) {
  fs.mkdirSync(path.join(dir, '.ws'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.ws', 'config.json'),
    JSON.stringify({ project: { name: 't', baseBranch: 'main' }, ...extra }, null, 2),
    'utf8',
  );
}

// 1. spec-index: foreign rows preserved, re-track idempotent.
console.log('1. spec-index track preserves foreign rows');
{
  const dir = mkTmp('ws-writers-index-');
  const specs = path.join(dir, '.agents', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  writeConsumer(dir, { plans: { dir: '.agents/plans', specsDir: '.agents/specs' } });
  fs.writeFileSync(
    path.join(specs, 'index.PRD'),
    '# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [x] Setup (`spec: 0001-setup.spec.md`)\n\n## 8. Next specs\n\n| # | Spec | Status | Target Phase | Notes |\n|---|------|--------|--------------|-------|\n| 1 | `setup` | `[x]` done | Phase 1 | Initial |\n',
    'utf8',
  );
  fs.writeFileSync(path.join(specs, 'alpha.spec.md'), '---\nslug: alpha\ntitle: Alpha\n---\n', 'utf8');
  const r1 = run(TRACK, ['--specs-dir', specs, '--slug', 'alpha'], dir);
  assert.strictEqual(JSON.parse(r1.stdout).status, 'tracked');
  const afterAlpha = fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8');

  // Foreign writer appends its own bullet + row directly.
  const foreignBullet = '- [ ] Foreign (`spec: foreign.spec.md`)\n';
  const foreignRow = '| 99 | `foreign` | `[ ]` todo | Phase 1 | Foreign |\n';
  fs.writeFileSync(
    path.join(specs, 'index.PRD'),
    afterAlpha.replace('- [x] Setup', `${foreignBullet}- [x] Setup`) + foreignRow,
    'utf8',
  );
  fs.writeFileSync(path.join(specs, 'beta.spec.md'), '---\nslug: beta\ntitle: Beta\n---\n', 'utf8');
  const r2 = run(TRACK, ['--specs-dir', specs, '--slug', 'beta'], dir);
  assert.strictEqual(JSON.parse(r2.stdout).status, 'tracked');
  const afterBeta = fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8');
  assert.ok(afterBeta.includes(foreignBullet.trim()), 'foreign bullet preserved');
  assert.ok(afterBeta.includes('`foreign`'), 'foreign row preserved');
  assert.ok(afterBeta.includes('(`spec: beta.spec.md`)'), 'own bullet added');
  assert.ok(afterBeta.includes('| `beta` |'), 'own row added');
  const rowNumbers = [...afterBeta.matchAll(/^\| (\d+) \|/gm)].map((m) => m[1]);
  assert.strictEqual(new Set(rowNumbers).size, rowNumbers.length, 'row numbers unique');

  // Re-track is idempotent.
  const r3 = run(TRACK, ['--specs-dir', specs, '--slug', 'alpha'], dir);
  assert.strictEqual(JSON.parse(r3.stdout).status, 'skipped');
  assert.strictEqual(fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8'), afterBeta, 're-track writes nothing');
}

// 2. wiki: owned-link replace, foreign bullets preserved, idempotent.
console.log('2. wiki sync preserves foreign bullets');
{
  const dir = mkTmp('ws-writers-wiki-');
  writeConsumer(dir, { plans: { dir: '.agents/plans', wikiDir: '.agents/specs/wiki' } });
  const wikiDir = path.join(dir, '.agents', 'specs', 'wiki');
  const sync = (feature, domain = 'core') => run(WIKI_SYNC, [
    '--repo-root', dir, '--wiki-dir', wikiDir, '--domain', domain,
    '--feature', feature, '--title', `Title ${feature}`, '--description', `Desc ${feature}`,
  ], dir);
  assert.strictEqual(sync('alpha').status, 0);
  const indexFile = path.join(wikiDir, 'index.wiki.md');
  // Foreign writer adds its own bullet directly.
  fs.appendFileSync(indexFile, '- [Foreign](core/foreign.md): Desc foreign\n', 'utf8');
  assert.strictEqual(sync('beta').status, 0);
  const content = fs.readFileSync(indexFile, 'utf8');
  assert.ok(content.includes('[Foreign](core/foreign.md)'), 'foreign bullet preserved');
  assert.ok(content.includes('[Title alpha](core/alpha.md)'), 'own alpha bullet present');
  assert.ok(content.includes('[Title beta](core/beta.md)'), 'own beta bullet present');
  // Re-sync over unchanged content is byte-identical.
  assert.strictEqual(sync('beta').status, 0);
  const again = fs.readFileSync(indexFile, 'utf8');
  assert.strictEqual(again, content, 're-sync is byte-identical');
  assert.strictEqual(content.match(/Title beta/g).length, 1, 'no duplicate bullets');
}

// 3. self-learning: foreign entries preserved and included; compile idempotent.
console.log('3. self-learning compile preserves foreign entries');
{
  const dir = mkTmp('ws-writers-memory-');
  writeConsumer(dir, { enableMemoryFiles: true, rules: { memoryDir: '.' } });
  const memDir = path.join(dir, 'memory');
  fs.mkdirSync(memDir, { recursive: true });
  const entry = (date, topic) => `### [${date}] ${topic}\n- **Layer**: tests\n- **Module**: writers\n- **Severity**: low\n- **PathPattern**: \`x\`\n- **Scenario**: s.\n- **DO NOT**: bad.\n- **INSTEAD DO**: good.\n`;
  fs.writeFileSync(path.join(memDir, '2026-09-25-alpha.md'), entry('2026-09-25', 'Alpha'), 'utf8');
  assert.strictEqual(run(COMPILE, ['--compile', '--repo-root', dir], dir).status, 0);
  const indexFile = path.join(dir, 'MEMORY.md');
  const first = fs.readFileSync(indexFile, 'utf8');
  assert.ok(first.includes('Alpha'), 'own entry compiled');
  // Foreign writer adds its own entry file.
  fs.writeFileSync(path.join(memDir, '2026-09-26-foreign.md'), entry('2026-09-26', 'Foreign'), 'utf8');
  assert.strictEqual(run(COMPILE, ['--compile', '--repo-root', dir], dir).status, 0);
  const second = fs.readFileSync(indexFile, 'utf8');
  assert.ok(second.includes('Alpha'), 'own entry still compiled');
  assert.ok(second.includes('Foreign'), 'foreign entry included');
  assert.ok(fs.existsSync(path.join(memDir, '2026-09-25-alpha.md')), 'own source preserved');
  // Re-compile over unchanged sources is byte-identical.
  assert.strictEqual(run(COMPILE, ['--compile', '--repo-root', dir], dir).status, 0);
  assert.strictEqual(fs.readFileSync(indexFile, 'utf8'), second, 're-compile is byte-identical');
}

// 4. changelog: owned blocks only, foreign entries preserved, dedupe idempotent.
console.log('4. changelog append preserves foreign entries');
{
  const dir = mkTmp('ws-writers-changelog-');
  writeConsumer(dir, { rules: { changelogFile: 'CHANGELOG.md' } });
  const append = (prompt, done, result, agent = 'tester') => run(CHANGELOG, [
    '--repo-root', dir, '--prompt', prompt, '--done', done, '--result', result,
    '--agent', agent, '--date', '2026-09-26 10:00',
  ], dir);
  assert.strictEqual(append('ship A', 'built A', 'A done').status, 0);
  const file = path.join(dir, 'CHANGELOG.md');
  // Foreign writer prepends its own entry through the same helper.
  assert.strictEqual(append('ship B', 'built B', 'B done', 'foreign-agent').status, 0);
  assert.strictEqual(append('ship C', 'built C', 'C done').status, 0);
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('built A') && content.includes('built B') && content.includes('built C'), 'all entries present');
  assert.ok(content.indexOf('built C') < content.indexOf('built B'), 'newest entry on top');
  assert.ok(content.includes('# Changelog'), 'header intact');
  // Exact-duplicate re-append is a no-op.
  const dup = run(CHANGELOG, [
    '--repo-root', dir, '--prompt', 'ship A', '--done', 'built A', '--result', 'A done',
    '--agent', 'tester', '--date', '2026-09-26 10:00', '--json',
  ], dir);
  assert.strictEqual(dup.status, 0);
  assert.strictEqual(JSON.parse(dup.stdout).skipped, 'duplicate-block');
  assert.strictEqual(fs.readFileSync(file, 'utf8'), content, 'duplicate append writes nothing');
}

// 5. changelog: concurrent parallel writers must not clobber each other
// (PR #433 review — read-modify-write compare-and-swap retry).
console.log('5. changelog concurrent appends preserve every entry');
{
  const dir = mkTmp('ws-writers-changelog-concurrent-');
  writeConsumer(dir, { rules: { changelogFile: 'CHANGELOG.md' } });
  const file = path.join(dir, 'CHANGELOG.md');
  const ids = ['w1', 'w2', 'w3', 'w4'];
  const writers = ids.map((id) => new Promise((resolve) => {
    const child = cp.spawn(process.execPath, [
      CHANGELOG, '--repo-root', dir, '--prompt', `p-${id}`, '--done', `built-${id}`,
      '--result', `r-${id}`, '--agent', id, '--date', '2026-09-26 10:00', '--json',
    ], { cwd: dir, encoding: 'utf8' });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('close', (code) => resolve({ id, code, out }));
  }));
  const results = await Promise.all(writers);
  for (const r of results) {
    assert.strictEqual(r.code, 0, `writer ${r.id} exits 0: ${r.out}`);
    assert.strictEqual(JSON.parse(r.out).ok, true, `writer ${r.id} reports ok`);
  }
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(content.includes('# Changelog'), 'header intact after concurrent appends');
  for (const id of ids) {
    assert.ok(content.includes(`built-${id}`), `concurrent entry ${id} preserved`);
  }
}

// 6. spec-index: concurrent `track` invocations must not clobber each other
// (PR #433 review — shared lock on the index.PRD read-modify-write).
console.log('6. spec-index concurrent track preserves every entry');
{
  const dir = mkTmp('ws-writers-index-concurrent-');
  const specs = path.join(dir, '.agents', 'specs');
  fs.mkdirSync(specs, { recursive: true });
  writeConsumer(dir, { plans: { dir: '.agents/plans', specsDir: '.agents/specs' } });
  fs.writeFileSync(
    path.join(specs, 'index.PRD'),
    '# Spec Index\n\n## 7. Feature map by phase\n\n### Phase 1: Core\n- [x] Setup (`spec: 0001-setup.spec.md`)\n\n## 8. Next specs\n\n| # | Spec | Status | Target Phase | Notes |\n|---|------|--------|--------------|-------|\n| 1 | `setup` | `[x]` done | Phase 1 | Initial |\n',
    'utf8',
  );
  const ids = ['s1', 's2', 's3', 's4'];
  for (const id of ids) {
    fs.writeFileSync(path.join(specs, `${id}.spec.md`), `---\nslug: ${id}\ntitle: ${id}\n---\n`, 'utf8');
  }
  const writers = ids.map((id) => new Promise((resolve) => {
    const child = cp.spawn(process.execPath, [TRACK, '--specs-dir', specs, '--slug', id], { cwd: dir, encoding: 'utf8' });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('close', (code) => resolve({ id, code, out }));
  }));
  const results = await Promise.all(writers);
  for (const r of results) {
    assert.strictEqual(r.code, 0, `track ${r.id} exits 0: ${r.out}`);
    assert.strictEqual(JSON.parse(r.out).status, 'tracked', `track ${r.id} reports tracked`);
  }
  const content = fs.readFileSync(path.join(specs, 'index.PRD'), 'utf8');
  for (const id of ids) {
    assert.ok(content.includes(`\`${id}\``), `concurrent track row ${id} preserved`);
    assert.ok(content.includes(`\`spec: ${id}.spec.md\``), `concurrent track bullet ${id} preserved`);
  }
  const rowNumbers = [...content.matchAll(/^\| (\d+) \|/gm)].map((m) => m[1]);
  assert.strictEqual(new Set(rowNumbers).size, rowNumbers.length, 'row numbers unique after concurrent track');
}

for (const dir of tmpRoots) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

console.log('--- All shared-artifact-writer tests PASSED ---');
