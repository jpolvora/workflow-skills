/**
 * Configurable hub root (spec 0115, AC1-AC8).
 * Single resolver resolve_hub_root.cjs + installer/configurator/generator
 * honoring pathTokens.sharedDir, containment fail-closed, bootstrap fixed.
 * Run: node test/test-configurable-hub-root.js
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const { resolveHubRoot } = require('../.agents/skills/ws-shared/runtime/scripts/resolve_hub_root.cjs');
const {
  resolveConsumerContext,
  requireProjectConfig,
} = require('../.agents/skills/ws-shared/runtime/scripts/resolve_consumer_root.cjs');

const CONFIGURE = path.join(REPO_ROOT, '.agents/skills/ws-configure-project/scripts/configure_autoload.cjs');
const SEED = path.join(REPO_ROOT, '.agents/skills/ws-patterns-generator/scripts/seed_generated_skill.cjs');
const CLI = path.join(REPO_ROOT, 'bin/cli.js');
const RUNTIME_AUTOLOAD = path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/autoload.md');
const BIN_GRAPH = path.join(REPO_ROOT, 'bin/skill-dependencies.json');

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`OK ${msg}`);
  else { console.error(`FAIL ${msg}`); failures += 1; }
}

function makeFixture(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}
function rmFixture(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function writeBootstrapConfig(root, sharedDir) {
  fs.mkdirSync(path.join(root, '.ws'), { recursive: true });
  const cfg = { pathTokens: { skillsRoot: '.agents/skills', sharedDir }, defaults: {} };
  fs.writeFileSync(path.join(root, '.ws', 'config.json'), JSON.stringify(cfg, null, 2), 'utf8');
}
function runNode(args, options = {}) {
  return cp.spawnSync(process.execPath, args, { encoding: 'utf8', ...options });
}

// Generator first-run simulation: append the ws-project-patterns row as a
// proper table row (after the separator), the way a generator run would.
function plantPatternsRow(autoload) {
  const head = '| Skill | Path | Trigger |';
  const headAt = autoload.indexOf(head);
  assert(headAt !== -1, 'plant: Always-applied header present');
  const sep = '|-------|------|---------|';
  const sepAt = autoload.indexOf(sep, headAt);
  assert(sepAt !== -1, 'plant: table separator present');
  const row = '| `ws-project-patterns` | `ws-project-patterns/SKILL.md` | Generated project patterns |';
  return autoload.slice(0, sepAt + sep.length) + '\n' + row + autoload.slice(sepAt + sep.length);
}

// --- AC1: resolver unit ------------------------------------------------------
{
  const root = makeFixture('ws-hub-resolver-');
  try {
    let r = resolveHubRoot(root);
    assert(r.hubRelPosix === '.ws' && r.configured === false, 'resolver: missing config defaults to .ws');
    assert(r.bootstrapConfigPath === path.join(root, '.ws', 'config.json'), 'resolver: bootstrap path fixed');

    writeBootstrapConfig(root, '.ws');
    r = resolveHubRoot(root);
    assert(r.hubRoot === path.join(root, '.ws'), 'resolver: explicit .ws resolves to .ws');

    writeBootstrapConfig(root, 'config/hub');
    r = resolveHubRoot(root);
    assert(r.hubRoot === path.join(root, 'config', 'hub'), 'resolver: nested hub resolves under root');
    assert(r.configured === true && r.hubDepth === 2, 'resolver: nested hub reports configured + depth');

    for (const bad of ['../escape', 'a/../../b', '..']) {
      writeBootstrapConfig(root, bad);
      let code = null;
      try { resolveHubRoot(root); } catch (err) { code = err.code; }
      assert(code === 'HUB_TRAVERSAL', `resolver: traversal refused (${bad} -> ${code})`);
    }
    for (const bad of ['/abs/path', 'C:/win', 'C:\\win', '\\\\unc\\share', '~/home']) {
      writeBootstrapConfig(root, bad);
      let code = null;
      try { resolveHubRoot(root); } catch (err) { code = err.code; }
      assert(code === 'HUB_ABSOLUTE', `resolver: absolute refused (${bad} -> ${code})`);
    }
    for (const bad of ['', '.', '  ']) {
      writeBootstrapConfig(root, bad);
      let code = null;
      try { resolveHubRoot(root); } catch (err) { code = err.code; }
      // Blank sharedDir means "not configured" -> default; '.' is refused.
      if (bad.trim() === '' || bad === '  ') {
        assert(code === null, `resolver: blank sharedDir falls back to default (${JSON.stringify(bad)})`);
      } else {
        assert(code === 'HUB_EMPTY', `resolver: dot refused (${bad} -> ${code})`);
      }
    }
    let code = null;
    try { resolveHubRoot(path.join(root, 'no-such-dir')); } catch (err) { code = err.code; }
    assert(code === 'HUB_UNRESOLVABLE', `resolver: missing repo refused (${code})`);
  } finally {
    rmFixture(root);
  }
}

// --- AC5: symlinked hub escape refused ---------------------------------------
{
  const root = makeFixture('ws-hub-symlink-');
  const outside = makeFixture('ws-hub-outside-');
  try {
    const link = path.join(root, 'link-hub');
    let linked = false;
    try {
      fs.symlinkSync(outside, link, 'junction');
      linked = true;
    } catch {
      linked = false;
    }
    if (!linked) {
      console.log('OK symlink escape skipped (links unavailable)');
    } else {
      writeBootstrapConfig(root, 'link-hub');
      let code = null;
      try { resolveHubRoot(root); } catch (err) { code = err.code; }
      assert(code === 'HUB_ESCAPE', `resolver: symlinked escape refused (${code})`);
    }
  } finally {
    rmFixture(root);
    rmFixture(outside);
  }
}

// --- AC1/AC5: runtime resolver reports the effective hub, bootstrap config --
{
  const root = makeFixture('ws-hub-ctx-');
  try {
    writeBootstrapConfig(root, 'config/hub');
    fs.mkdirSync(path.join(root, 'config', 'hub'), { recursive: true });
    const ctx = resolveConsumerContext({ repoRoot: root });
    assert(ctx.sharedDir === path.join(root, 'config', 'hub'), 'context: sharedDir is the effective hub');
    assert(ctx.configPath === path.join(root, '.ws', 'config.json'), 'context: configPath is the bootstrap config');
    assert(ctx.configSource === 'project', 'context: configSource is project');
    assert(ctx.config && ctx.config.pathTokens && ctx.config.pathTokens.sharedDir === 'config/hub', 'context: config loads from bootstrap');
    requireProjectConfig(ctx);
    assert(true, 'requireProjectConfig passes on the bootstrap config');

    writeBootstrapConfig(root, '../escape');
    let code = null;
    try { resolveConsumerContext({ repoRoot: root }); } catch (err) { code = err.code; }
    assert(code === 'HUB_TRAVERSAL', `context: traversal config throws fail-closed (${code})`);
  } finally {
    rmFixture(root);
  }
}

// --- AC3/AC4: configurator + generator round-trip on a nested hub ------------
{
  const root = makeFixture('ws-hub-nested-');
  try {
    writeBootstrapConfig(root, 'config/hub');
    // Minimal local skills tree: runtime template + one skill + package graph.
    const runtimeDir = path.join(root, '.agents', 'skills', 'ws-shared', 'runtime');
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.copyFileSync(RUNTIME_AUTOLOAD, path.join(runtimeDir, 'autoload.md'));
    fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
    fs.copyFileSync(BIN_GRAPH, path.join(root, 'bin', 'skill-dependencies.json'));
    const skillDir = path.join(root, '.agents', 'skills', 'ws-tdah');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# ws-tdah\n', 'utf8');

    let run = runNode([SEED, '--repo-root', root]);
    assert(run.status === 0, `seed exits 0 (got ${run.status}: ${run.stderr || ''})`);
    assert(
      fs.existsSync(path.join(root, 'config', 'hub', 'ws-project-patterns', 'SKILL.md')),
      'seed: body lands under the configured hub',
    );
    assert(!fs.existsSync(path.join(root, '.ws', 'ws-project-patterns')), 'seed: default hub untouched');

    run = runNode([CONFIGURE, '--repo-root', root, '--write-autoload']);
    assert(run.status === 0, `write-autoload exits 0 (got ${run.status}: ${run.stderr || ''})`);
    const autoloadPath = path.join(root, 'config', 'hub', 'autoload.md');
    assert(fs.existsSync(autoloadPath), 'configurator: autoload written under the configured hub');
    assert(!fs.existsSync(path.join(root, '.ws', 'autoload.md')), 'configurator: default hub untouched');
    // Simulate the generator first-run row append, then a configurator refresh.
    // Plant after the table separator (a proper table row, not between header
    // and separator).
    let autoload = fs.readFileSync(autoloadPath, 'utf8');
    autoload = plantPatternsRow(autoload);
    fs.writeFileSync(autoloadPath, autoload, 'utf8');
    run = runNode([CONFIGURE, '--repo-root', root, '--write-autoload']);
    assert(run.status === 0, `write-autoload refresh exits 0 (got ${run.status}: ${run.stderr || ''})`);
    autoload = fs.readFileSync(autoloadPath, 'utf8');
    const kept = autoload.split('\n').filter((l) => l.includes('`ws-project-patterns`'));
    assert(kept.length === 1 && kept[0].includes('`ws-project-patterns/SKILL.md`'), 'configurator: generated row kept exactly once, hub-relative');
    assert(!autoload.includes('.ws/ws-project-patterns'), 'configurator: no stale default-hub row');
    const before = autoload;
    run = runNode([CONFIGURE, '--repo-root', root, '--write-autoload']);
    assert(run.status === 0 && fs.readFileSync(autoloadPath, 'utf8') === before, 'configurator: rerun idempotent');
    // Same-name row outside the hub root must not validate.
    const poisoned = before.replace(
      '`ws-project-patterns/SKILL.md`',
      '../elsewhere/ws-project-patterns/SKILL.md',
    );
    fs.writeFileSync(autoloadPath, poisoned, 'utf8');
    run = runNode([CONFIGURE, '--repo-root', root, '--check']);
    assert(/ws-project-patterns/.test(run.stdout || ''), 'check: same-name row outside the hub root is flagged');
    fs.writeFileSync(autoloadPath, before, 'utf8');

    run = runNode([CONFIGURE, '--repo-root', root, '--write-root-agents']);
    assert(run.status === 0, `write-root-agents exits 0 (got ${run.status}: ${run.stderr || ''})`);
    const rootAgents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
    assert(rootAgents.includes('config/hub/AGENTS.md'), 'root AGENTS.md links the configured hub pointer');
    assert(rootAgents.includes('`config/hub/ws-project-patterns/SKILL.md`'), 'root AGENTS.md generated row is hub-prefixed');
    const pointer = fs.readFileSync(path.join(root, 'config', 'hub', 'AGENTS.md'), 'utf8');
    assert(pointer.includes('(config/hub/)'), 'hub pointer names the configured hub');

    run = runNode([CONFIGURE, '--repo-root', root, '--check']);
    assert(run.status === 0, `check clean on nested hub (got ${run.status}: ${run.stdout || ''}${run.stderr || ''})`);
  } finally {
    rmFixture(root);
  }
}

// --- AC5: escaping hub is a critical check finding + write refusal -----------
{
  const root = makeFixture('ws-hub-escape-');
  try {
    writeBootstrapConfig(root, '../escape');
    let run = runNode([CONFIGURE, '--repo-root', root, '--check']);
    assert(run.status !== 0, 'check exits non-zero on escaping hub');
    assert(/critical/i.test(run.stdout || '') && /pathTokens\.sharedDir/.test(run.stdout || ''), 'check reports critical pathTokens.sharedDir finding');
    run = runNode([CONFIGURE, '--repo-root', root, '--write-autoload']);
    assert(run.status !== 0, 'write-autoload refuses escaping hub');
    run = runNode([SEED, '--repo-root', root]);
    assert(run.status !== 0, 'seed refuses escaping hub');
  } finally {
    rmFixture(root);
  }
}

// --- AC2: installer install/update/uninstall with a configured hub -----------
{
  const root = makeFixture('ws-hub-install-');
  try {
    writeBootstrapConfig(root, 'config/hub');
    // Explicit consumer value must survive scoping untouched.
    const prePath = path.join(root, '.ws', 'config.json');
    const pre = JSON.parse(fs.readFileSync(prePath, 'utf8'));
    pre.rules = { harness: 'docs/keep.md' };
    fs.writeFileSync(prePath, JSON.stringify(pre, null, 2), 'utf8');
    let run = runNode([CLI, 'install', '--skills', 'ws-tdah', '--yes'], { cwd: root, timeout: 300000 });
    assert(run.status === 0, `install exits 0 (got ${run.status}: ${(run.stderr || '').slice(-500)})`);
    const hub = path.join(root, 'config', 'hub');
    for (const name of ['AGENTS.md', 'autoload.md', 'installed-skills.json', 'skill-integrity-local.json', 'STACK.md']) {
      assert(fs.existsSync(path.join(hub, name)), `install: ${name} under the configured hub`);
    }
    const bootstrap = JSON.parse(fs.readFileSync(path.join(root, '.ws', 'config.json'), 'utf8'));
    assert(bootstrap.pathTokens && bootstrap.pathTokens.sharedDir === 'config/hub', 'install: bootstrap config keeps sharedDir');
    assert(bootstrap.rules && bootstrap.rules.stackFile === 'config/hub/STACK.md', 'install: stale rules.stackFile scoped to the configured hub');
    assert(bootstrap.rules.harness === 'docs/keep.md', 'install: explicit rules.harness untouched');
    assert(!fs.existsSync(path.join(root, '.ws', 'autoload.md')), 'install: no autoload at the bootstrap root');
    assert(!fs.existsSync(path.join(root, '.ws', 'installed-skills.json')), 'install: no manifest at the bootstrap root');
    const manifest = JSON.parse(fs.readFileSync(path.join(hub, 'installed-skills.json'), 'utf8'));
    assert(Array.isArray(manifest.skills) && manifest.skills.includes('ws-tdah'), 'install: manifest tracks ws-tdah');

    // Reader/writer parity: installer-rendered links pass the configurator check.
    run = runNode([CONFIGURE, '--repo-root', root, '--check']);
    assert(run.status === 0, `installer autoload passes configurator check (got ${run.status}: ${run.stdout || ''})`);
    // Seeded generator body + row survive an update (stale-refresh path).
    const autoloadPath = path.join(hub, 'autoload.md');
    run = runNode([SEED, '--repo-root', root]);
    assert(run.status === 0, 'seed exits 0 in installed tree');
    let autoload = fs.readFileSync(autoloadPath, 'utf8');
    autoload = plantPatternsRow(autoload);
    // Poison with a retired id to force the stale-refresh path on update.
    autoload = autoload.replace('`ws-tdah`', '`ws-audit`');
    fs.writeFileSync(autoloadPath, autoload, 'utf8');
    run = runNode([CONFIGURE, '--repo-root', root, '--write-autoload']);
    assert(run.status === 0, 'write-autoload exits 0 in installed tree');
    run = runNode([CLI, 'update', '--yes'], { cwd: root, timeout: 300000 });
    assert(run.status === 0, `update exits 0 (got ${run.status}: ${(run.stderr || '').slice(-500)})`);
    const after = fs.readFileSync(autoloadPath, 'utf8');
    const rows = after.split('\n').filter((l) => l.includes('`ws-project-patterns`'));
    assert(rows.length === 1 && rows[0].includes('`ws-project-patterns/SKILL.md`'), 'update: generated row survives stale refresh exactly once, hub-relative');
    assert(!after.includes('ws-audit'), 'update: retired id refreshed away');

    run = runNode([CLI, 'uninstall', '--skills', 'ws-tdah', '--yes'], { cwd: root, timeout: 300000 });
    assert(run.status === 0, `uninstall exits 0 (got ${run.status}: ${(run.stderr || '').slice(-500)})`);
    assert(fs.existsSync(path.join(hub, 'installed-skills.json')), 'uninstall: manifest stays under the configured hub');
    assert(fs.existsSync(path.join(root, '.ws', 'config.json')), 'uninstall: bootstrap config preserved');
  } finally {
    rmFixture(root);
  }
}

// --- AC2b: auto_configure gap-fill scopes hub defaults to the hub -----------
{
  const root = makeFixture('ws-hub-auto-');
  try {
    writeBootstrapConfig(root, 'config/hub');
    const managed = path.join(root, '.agents', 'skills', 'ws-shared');
    fs.mkdirSync(path.join(managed, 'templates'), { recursive: true });
    fs.mkdirSync(path.join(managed, 'runtime'), { recursive: true });
    fs.copyFileSync(
      path.join(REPO_ROOT, '.agents/skills/ws-shared/templates/config.json.example'),
      path.join(managed, 'templates', 'config.json.example'),
    );
    fs.copyFileSync(
      path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/config.schema.json'),
      path.join(managed, 'runtime', 'config.schema.json'),
    );
    fs.copyFileSync(
      path.join(REPO_ROOT, '.agents/skills/ws-shared/runtime/hub-layout.json'),
      path.join(managed, 'runtime', 'hub-layout.json'),
    );
    const run = runNode(
      [path.join(REPO_ROOT, '.agents/skills/ws-configure-project/scripts/auto_configure.cjs'), '--repo-root', root, '--json'],
      { timeout: 300000 },
    );
    assert(run.status === 0, `auto_configure exits 0 (got ${run.status}: ${run.stderr || ''})`);
    const cfg = JSON.parse(fs.readFileSync(path.join(root, '.ws', 'config.json'), 'utf8'));
    assert(cfg.rules && cfg.rules.harness === 'config/hub/AGENTS.md', 'auto: rules.harness gap scoped to the configured hub');
    assert(cfg.rules && cfg.rules.stackFile === 'config/hub/STACK.md', 'auto: rules.stackFile gap scoped to the configured hub');
  } finally {
    rmFixture(root);
  }
}

// --- AC6: global-hybrid run renders hub-relative generator rows --------------
{
  const root = makeFixture('ws-hub-global-');
  const globalRoot = makeFixture('ws-hub-globalroot-');
  try {
    writeBootstrapConfig(root, 'config/hub');
    // No repoRoot/bin graph here: generator-managed ids must resolve from the
    // global dependency graph.
    fs.mkdirSync(path.join(globalRoot, 'ws-shared', 'runtime'), { recursive: true });
    fs.copyFileSync(RUNTIME_AUTOLOAD, path.join(globalRoot, 'ws-shared', 'runtime', 'autoload.md'));
    fs.copyFileSync(BIN_GRAPH, path.join(globalRoot, 'ws-shared', 'runtime', 'skill-dependencies.json'));
    runNode([SEED, '--repo-root', root]);
    let run = runNode([CONFIGURE, '--repo-root', root, '--global-skills-root', globalRoot, '--write-autoload']);
    assert(run.status === 0, `global write-autoload exits 0 (got ${run.status}: ${run.stderr || ''})`);
    const autoloadPath = path.join(root, 'config', 'hub', 'autoload.md');
    let autoload = plantPatternsRow(fs.readFileSync(autoloadPath, 'utf8'));
    fs.writeFileSync(autoloadPath, autoload, 'utf8');
    run = runNode([CONFIGURE, '--repo-root', root, '--global-skills-root', globalRoot, '--write-autoload']);
    assert(run.status === 0, `global refresh exits 0 (got ${run.status}: ${run.stderr || ''})`);
    autoload = fs.readFileSync(autoloadPath, 'utf8');
    const kept = autoload.split('\n').filter((l) => l.includes('`ws-project-patterns`'));
    assert(kept.length === 1 && kept[0].includes('`ws-project-patterns/SKILL.md`'), 'global-hybrid: generator id from the global graph renders a hub-relative row');
    assert(!kept[0] || !kept[0].includes('{skillsRoot}'), 'global-hybrid: no {skillsRoot} token on the generator row');
  } finally {
    rmFixture(root);
    rmFixture(globalRoot);
  }
}

if (failures) {
  console.error(`\ntest-configurable-hub-root: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\ntest-configurable-hub-root: ok');
