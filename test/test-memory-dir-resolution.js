/**
 * Tests for repo-root MEMORY/CHANGELOG defaults (rules.memoryDir / rules.changelogFile).
 * Run: node test/test-memory-dir-resolution.js
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SELF_LEARNING = path.join(REPO_ROOT, '.agents/skills/ws-self-learning/scripts/self_learning.cjs');
const PY_RESOLVER_DIR = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/scripts');
const {
  DEFAULT_CHANGELOG_FILE,
  DEFAULT_MEMORY_DIR,
  resolveMemoryDirValue,
  resolveChangelogFileValue,
  resolveMemoryPaths,
  resolveEffectiveMemoryPaths,
  resolveChangelogPath,
} = await import('../.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs');

let failures = 0;
function ok(msg) {
  console.log(`ok - ${msg}`);
}
function fail(msg) {
  console.error(`FAIL - ${msg}`);
  failures += 1;
}
function assert(cond, msg) {
  if (cond) ok(msg);
  else fail(msg);
}

const tempRoots = [];
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-memdir-'));
  tempRoots.push(root);
  return root;
}
function seedHub(root, config = {}) {
  const shared = path.join(root, '.agents', 'skills', 'ws-shared');
  fs.mkdirSync(path.join(shared, 'templates'), { recursive: true });
  fs.writeFileSync(path.join(shared, 'config.json'), JSON.stringify(config, null, 2), 'utf8');
  return shared;
}
const ENTRY = '### [2026-01-02] Fixture trap\n- **DO NOT**: x\n- **INSTEAD DO**: y\n';
function seedLegacyMemory(shared) {
  const entries = path.join(shared, 'memory');
  fs.mkdirSync(entries, { recursive: true });
  fs.writeFileSync(path.join(entries, '2026-01-02-fixture.md'), `${ENTRY}`, 'utf8');
  fs.writeFileSync(path.join(shared, 'MEMORY.md'), `# Memory\n\n${ENTRY}`, 'utf8');
}
function seedRootMemory(root) {
  const entries = path.join(root, 'memory');
  fs.mkdirSync(entries, { recursive: true });
  fs.writeFileSync(path.join(entries, '2026-01-02-fixture.md'), `${ENTRY}`, 'utf8');
  fs.writeFileSync(path.join(root, 'MEMORY.md'), `# Memory\n\n${ENTRY}`, 'utf8');
}
function ctxFor(root, config) {
  return { repoRoot: root, sharedDir: path.join(root, '.agents', 'skills', 'ws-shared'), config };
}

// --- 1. Value defaults ---
assert(DEFAULT_MEMORY_DIR === '.', 'DEFAULT_MEMORY_DIR is repo root');
assert(DEFAULT_CHANGELOG_FILE === 'CHANGELOG.md', 'DEFAULT_CHANGELOG_FILE is repo-root file');
assert(resolveMemoryDirValue({}) === '.', 'missing rules.memoryDir defaults to root');
assert(resolveMemoryDirValue({ rules: { memoryDir: '' } }) === '.', 'empty rules.memoryDir defaults to root');
assert(resolveMemoryDirValue({ rules: { memoryDir: '  docs/mem ' } }) === 'docs/mem', 'explicit rules.memoryDir trimmed');
assert(resolveChangelogFileValue({}) === 'CHANGELOG.md', 'missing rules.changelogFile defaults to root file');
assert(resolveChangelogFileValue({ rules: { changelogFile: '   ' } }) === 'CHANGELOG.md', 'blank rules.changelogFile defaults to root file');
assert(resolveChangelogFileValue({ rules: { changelogFile: 42 } }) === 'CHANGELOG.md', 'non-string rules.changelogFile defaults to root file');

// --- 2. Configured path shapes ---
{
  const root = fixture();
  const dflt = resolveMemoryPaths(ctxFor(root, {}));
  assert(dflt.dir === root, 'default memory dir resolves to repo root');
  assert(dflt.indexFile === path.join(root, 'MEMORY.md'), 'default memory index is root MEMORY.md');
  assert(dflt.entriesDir === path.join(root, 'memory'), 'default memory entries dir is root memory/');
  const custom = resolveMemoryPaths(ctxFor(root, { rules: { memoryDir: 'docs/mem' } }));
  assert(custom.dir === path.join(root, 'docs', 'mem'), 'explicit relative memoryDir resolves under root');
  const abs = path.join(root, 'elsewhere');
  const absolute = resolveMemoryPaths(ctxFor(root, { rules: { memoryDir: abs } }));
  assert(absolute.dir === abs, 'absolute memoryDir used as-is');
}

// --- 3. Effective memory: fresh / legacy / both / seeded-empty ---
{
  const root = fixture();
  const shared = seedHub(root, {});
  const fresh = resolveEffectiveMemoryPaths(ctxFor(root, {}));
  assert(fresh.source === 'configured' && fresh.dir === root, 'fresh fixture resolves to configured root');
  assert(!fs.existsSync(path.join(root, 'MEMORY.md')), 'resolver creates nothing on fresh fixture');

  seedLegacyMemory(shared);
  const legacy = resolveEffectiveMemoryPaths(ctxFor(root, {}));
  assert(legacy.source === 'legacy' && legacy.dir === shared, 'legacy ws-shared memory wins when root is empty');

  seedRootMemory(root);
  const both = resolveEffectiveMemoryPaths(ctxFor(root, {}));
  assert(both.source === 'configured' && both.dir === root, 'configured root wins once it holds entries');
}
{
  const root = fixture();
  const shared = seedHub(root, {});
  fs.writeFileSync(path.join(shared, 'MEMORY.md'), '# Memory - Anti-Regression Knowledge\n\n---\n', 'utf8');
  fs.mkdirSync(path.join(shared, 'memory'), { recursive: true });
  const seeded = resolveEffectiveMemoryPaths(ctxFor(root, {}));
  assert(seeded.source === 'configured' && seeded.dir === root, 'entry-less legacy seed does not hijack fresh root');
}
{
  const root = fixture();
  const shared = seedHub(root, {});
  seedLegacyMemory(shared);
  const explicit = resolveEffectiveMemoryPaths(
    ctxFor(root, { rules: { memoryDir: '.agents/skills/ws-shared' } }),
  );
  assert(explicit.source === 'configured' && explicit.dir === shared, 'memoryDir pointing at legacy resolves configured');
}

// --- 4. Changelog resolution ---
{
  const root = fixture();
  const shared = seedHub(root, {});
  const fresh = resolveChangelogPath(ctxFor(root, {}));
  assert(fresh.source === 'configured' && fresh.file === path.join(root, 'CHANGELOG.md'), 'fresh changelog resolves to root file');

  fs.writeFileSync(path.join(shared, 'CHANGELOG.md'), `# Changelog\n\n${ENTRY}`, 'utf8');
  const legacy = resolveChangelogPath(ctxFor(root, {}));
  assert(legacy.source === 'legacy' && legacy.file === path.join(shared, 'CHANGELOG.md'), 'legacy changelog wins when root has no entries');

  fs.writeFileSync(path.join(root, 'CHANGELOG.md'), `# Changelog\n\n${ENTRY}`, 'utf8');
  const both = resolveChangelogPath(ctxFor(root, {}));
  assert(both.source === 'configured' && both.file === path.join(root, 'CHANGELOG.md'), 'root changelog wins once it holds entries');

  const explicitEmpty = resolveChangelogPath(ctxFor(root, { rules: { changelogFile: 'docs/HISTORY.md' } }));
  assert(
    explicitEmpty.source === 'legacy',
    'explicit but entry-less changelog still falls back to legacy with entries',
  );

  const freshRoot = fixture();
  seedHub(freshRoot, {});
  const custom = resolveChangelogPath(ctxFor(freshRoot, { rules: { changelogFile: 'docs/HISTORY.md' } }));
  assert(custom.file === path.join(freshRoot, 'docs', 'HISTORY.md'), 'explicit changelogFile respected when legacy is empty');
}

// --- 5. Python mirror parity on identical fixtures ---
function pyResolve(fn, root) {
  const script = [
    'import sys, json',
    `sys.path.insert(0, ${JSON.stringify(PY_RESOLVER_DIR)})`,
    'import resolve_consumer_root as r',
    `print(json.dumps(r.${fn}(${JSON.stringify(root)})[${JSON.stringify('source')}]))`,
  ].join('\n');
  const res = cp.spawnSync('python3', ['-c', script], { encoding: 'utf8' });
  assert(res.status === 0, `python ${fn} exits 0 (${(res.stderr || '').trim()})`);
  return JSON.parse(res.stdout.trim());
}
{
  const root = fixture();
  const shared = seedHub(root, {});
  assert(pyResolve('resolve_effective_memory_paths', root) === 'configured', 'python: fresh memory resolves configured');
  seedLegacyMemory(shared);
  assert(pyResolve('resolve_effective_memory_paths', root) === 'legacy', 'python: legacy memory resolves legacy');
  seedRootMemory(root);
  assert(pyResolve('resolve_effective_memory_paths', root) === 'configured', 'python: populated root resolves configured');

  const root2 = fixture();
  const shared2 = seedHub(root2, {});
  assert(pyResolve('resolve_changelog_path', root2) === 'configured', 'python: fresh changelog resolves configured');
  fs.writeFileSync(path.join(shared2, 'CHANGELOG.md'), `# Changelog\n\n${ENTRY}`, 'utf8');
  assert(pyResolve('resolve_changelog_path', root2) === 'legacy', 'python: legacy changelog resolves legacy');
}

// --- 6. E2E: self_learning --compile writes the effective location ---
function runSelfLearning(args, cwd) {
  return cp.spawnSync(process.execPath, [SELF_LEARNING, ...args], { cwd, encoding: 'utf8' });
}
{
  const root = fixture();
  seedHub(root, {});
  const res = runSelfLearning(['--compile', '--repo-root', root], REPO_ROOT);
  assert(res.status === 0, `fresh --compile exits 0 (${(res.stderr || '').trim()})`);
  assert(fs.existsSync(path.join(root, 'MEMORY.md')), 'fresh --compile writes root MEMORY.md');
  assert(fs.existsSync(path.join(root, 'memory')), 'fresh --compile creates root memory/');
  assert(!fs.existsSync(path.join(root, '.agents', 'skills', 'ws-shared', 'MEMORY.md')), 'fresh --compile writes nothing under ws-shared');
  const header = fs.readFileSync(path.join(root, 'MEMORY.md'), 'utf8');
  assert(header.includes('`memory/`'), 'compiled header names the effective entries dir');
}
{
  const root = fixture();
  const shared = seedHub(root, {});
  seedLegacyMemory(shared);
  const res = runSelfLearning(['--compile', '--repo-root', root], REPO_ROOT);
  assert(res.status === 0, `legacy --compile exits 0 (${(res.stderr || '').trim()})`);
  assert(!fs.existsSync(path.join(root, 'MEMORY.md')), 'legacy --compile writes nothing at root');
  const compiled = fs.readFileSync(path.join(shared, 'MEMORY.md'), 'utf8');
  assert(compiled.includes('Fixture trap'), 'legacy --compile refreshes the legacy index');
}

// --- 7. Alias + template + wizard contract (alias-layer regression guard) ---
{
  const toolsMd = fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/tools.md'), 'utf8');
  const readRow = toolsMd.split('\n').find((line) => line.includes('`read-memory`'));
  const updateRow = toolsMd.split('\n').find((line) => line.includes('`update-memory`'));
  const changelogRow = toolsMd.split('\n').find((line) => line.includes('`update-ws-changelog`'));
  assert(Boolean(readRow) && readRow.includes('{memoryDir}/MEMORY.md'), 'read-memory alias consults {memoryDir}');
  assert(Boolean(updateRow) && updateRow.includes('{memoryDir}/memory/'), 'update-memory alias writes {memoryDir}');
  assert(
    Boolean(changelogRow) && changelogRow.includes('repo-root `CHANGELOG.md`'),
    'update-ws-changelog alias defaults to repo-root CHANGELOG.md',
  );
  assert(toolsMd.includes('| `{memoryDir}` | `rules.memoryDir` |'), 'tools.md declares the {memoryDir} token');

  const example = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.agents/skills/ws-shared/templates/config.json.example'), 'utf8'),
  );
  assert(example.rules.memoryDir === '.', 'config.json.example seeds rules.memoryDir "."');
  assert(example.rules.changelogFile === 'CHANGELOG.md', 'config.json.example seeds root rules.changelogFile');

  const autoConfigure = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-configure-project/scripts/auto_configure.cjs'),
    'utf8',
  );
  assert(autoConfigure.includes("'memoryDir'"), 'auto_configure fills rules.memoryDir gaps');
  assert(autoConfigure.includes('resolveEffectiveMemoryPaths'), 'auto_configure seeds traps at the effective memory dir');

  const gui = fs.readFileSync(
    path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/scripts/Edit-WorkflowSkillsConfig.ps1'),
    'utf8',
  );
  assert(gui.includes("-Key 'memoryDir'"), 'config GUI edits rules.memoryDir');
  assert(gui.includes("-Key 'changelogFile'") && gui.includes("-DefaultVal 'CHANGELOG.md'"), 'config GUI defaults changelogFile to root');
}

for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });

if (failures > 0) {
  console.error(`test-memory-dir-resolution: ${failures} failure(s)`);
  process.exitCode = 1;
} else {
  console.log('test-memory-dir-resolution: ok');
}
